from uuid import uuid4
import pytest
from fastapi.testclient import TestClient
from backend.app import create_app

@pytest.fixture
def client(tmp_path):
    return TestClient(create_app(tmp_path / 'scores.sqlite3', scorer=lambda notes, talk: 0.85 if notes=='first notes' else 0.95))

def payload(attendee=None, notes='first notes'):
    return {'attendee_id': str(attendee or uuid4()), 'attendee_name': 'Test attendee', 'talk_id': 'dan_palotta', 'notes': notes}

def test_submit_then_retrieve_and_replace(client):
    attendee = uuid4()
    assert client.get('/api/leaderboard').json() == {'attendees': []}
    result = client.post('/api/notes', json=payload(attendee)).json()
    assert result['saved'] and result['points'] == 850
    client.post('/api/notes', json=payload(attendee, 'better notes'))
    people = client.get('/api/leaderboard').json()['attendees']
    assert len(people) == 1
    assert people[0]['scores']['dan_palotta']['points'] == 950

def test_same_name_different_browsers_are_separate(client):
    client.post('/api/notes',json=payload())
    client.post('/api/notes',json=payload())
    assert len(client.get('/api/leaderboard').json()['attendees']) == 2

def test_failure_never_saves(tmp_path):
    def fail(*args): raise RuntimeError('private details')
    client=TestClient(create_app(tmp_path / 'scores.sqlite3',scorer=fail))
    response=client.post('/api/notes',json=payload())
    assert response.status_code == 503
    assert 'private details' not in response.text
    assert not client.get('/api/leaderboard').json()['attendees']

def test_validation_and_talk(client):
    data=payload();data['talk_id']='unknown'
    assert client.post('/api/notes',json=data).status_code==422
    data=payload();data['notes']='   '
    assert client.post('/api/notes',json=data).status_code==422
    data=payload();data['attendee_id']='private note content'
    response=client.post('/api/notes',json=data)
    assert response.status_code==422 and 'private note content' not in response.text

def test_scores_survive_restart(tmp_path):
    path=tmp_path / 'scores.sqlite3'
    first=TestClient(create_app(path,scorer=lambda *args:0.9))
    first.post('/api/notes',json=payload())
    second=TestClient(create_app(path,scorer=lambda *args:0.9))
    assert second.get('/api/leaderboard').json()['attendees'][0]['scores']['dan_palotta']['points']==900

def test_cors_allows_frontend_trace_context(client):
    response=client.options('/api/notes',headers={'Origin':'http://127.0.0.1:5173','Access-Control-Request-Method':'POST','Access-Control-Request-Headers':'content-type,traceparent'})
    assert response.status_code==200
    assert response.headers['access-control-allow-origin']=='http://127.0.0.1:5173'
