import math
import os
import sqlite3
from pathlib import Path
from typing import Callable, Optional
from uuid import UUID
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field
from dotenv import load_dotenv
from backend.scorer import ElasticScorer, ScoringUnavailable

ROOT = Path(__file__).resolve().parent.parent
load_dotenv(ROOT / '.env.elasticsearch')
load_dotenv(ROOT / '.env')  # Existing partner setup; environment values take precedence.
TALKS = [{'id': 'dan_palotta', 'title': 'Rethinking charity', 'speaker': 'Dan Pallotta', 'time': '', 'topic': 'The nonprofit sector, social innovation, and how we think about giving.'}]

class Submission(BaseModel):
    attendee_id: UUID
    attendee_name: str = Field(min_length=1, max_length=60)
    talk_id: str = Field(min_length=1, max_length=100)
    notes: str = Field(min_length=1, max_length=50000)

class ScoreStore:
    def __init__(self, path):
        self.path = str(path)
        Path(path).parent.mkdir(parents=True, exist_ok=True)
        with self.connect() as db:
            db.execute('CREATE TABLE IF NOT EXISTS scores (attendee_id TEXT, attendee_name TEXT, talk_id TEXT, score REAL, points INTEGER, PRIMARY KEY(attendee_id,talk_id))')

    def connect(self):
        return sqlite3.connect(self.path, timeout=15)

    def save(self, submission, score, points):
        with self.connect() as db:
            db.execute('UPDATE scores SET attendee_name=? WHERE attendee_id=?', (submission.attendee_name.strip(), str(submission.attendee_id)))
            db.execute('INSERT INTO scores VALUES(?,?,?,?,?) ON CONFLICT(attendee_id,talk_id) DO UPDATE SET attendee_name=excluded.attendee_name,score=excluded.score,points=excluded.points', (str(submission.attendee_id), submission.attendee_name.strip(), submission.talk_id, score, points))

    def leaderboard(self):
        with self.connect() as db:
            rows = db.execute('SELECT attendee_id,attendee_name,talk_id,score,points FROM scores ORDER BY attendee_name,attendee_id').fetchall()
        people = {}
        for attendee_id, name, talk_id, score, points in rows:
            person = people.setdefault(attendee_id, {'id': attendee_id, 'name': name, 'scores': {}})
            person['scores'][talk_id] = {'score': score, 'points': points}
        return list(people.values())

def create_app(db_path=None, scorer: Optional[Callable] = None):
    app = FastAPI(title='Rally notes and leaderboard API')
    store = ScoreStore(db_path or os.getenv('RALLY_DB_PATH', str(ROOT / 'backend' / 'data' / 'scores.sqlite3')))
    score_notes = scorer or ElasticScorer().score
    app.add_middleware(CORSMiddleware, allow_origins=os.getenv('FRONTEND_ORIGINS', 'http://127.0.0.1:5173,http://localhost:5173').split(','), allow_methods=['GET','POST'], allow_headers=['Content-Type','traceparent','tracestate'])

    @app.exception_handler(RequestValidationError)
    async def validation_error(request, exc):
        # Do not echo submitted note content in error responses or telemetry.
        return JSONResponse(status_code=422, content={'detail': 'Provide a valid attendee ID, attendee name, talk, and notes (up to 50,000 characters).'})

    @app.get('/api/health')
    def health():
        return {'status': 'ok', 'identity_mode': 'demo-browser-identity'}

    @app.get('/api/talks')
    def talks():
        return {'talks': TALKS}

    @app.get('/api/leaderboard')
    def leaderboard():
        return {'attendees': store.leaderboard()}

    @app.post('/api/notes')
    def submit(data: Submission):
        if data.talk_id not in {talk['id'] for talk in TALKS}:
            raise HTTPException(422, 'Choose an available talk.')
        if not data.notes.strip() or not data.attendee_name.strip():
            raise HTTPException(422, 'Add your attendee name and typed notes.')
        try:
            score = float(score_notes(data.notes.strip(), data.talk_id))
        except ScoringUnavailable as error:
            raise HTTPException(503, str(error)) from None
        except Exception:
            raise HTTPException(503, 'Scoring failed. Your notes were not saved; try again.') from None
        if not math.isfinite(score) or score < 0:
            raise HTTPException(503, 'The scoring service returned an invalid score.')
        # Explicit display conversion: preserve the backend similarity score, use 1000x for points.
        points = round(score * 1000)
        try:
            store.save(data, score, points)
        except sqlite3.Error:
            raise HTTPException(503, 'The score could not be saved. Try again.') from None
        return {'talk_id': data.talk_id, 'score': score, 'points': points, 'saved': True, 'identity_mode': 'demo-browser-identity'}
    return app

app = create_app()
