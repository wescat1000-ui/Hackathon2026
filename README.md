# Rally — conference notes and leaderboard

React frontend with a local FastAPI adapter around the Elasticsearch scoring approach in `origin/main` (`compare_notes.py`, commit `3b62ccd`). The live flow is: choose the indexed talk → submit typed notes → save a score → refresh the leaderboard immediately. Other clients poll every five seconds.

## Run

Frontend (Node 22.12+):

```sh
npm install
npm run dev
```

Backend (run from the repository root, in a separate terminal):

```sh
python3 -m venv .venv
.venv/bin/python -m pip install -r backend/requirements.txt
.venv/bin/python -m uvicorn backend.app:app --host 127.0.0.1 --port 8000
```

Copy the settings from `backend/.env.example` into a repository-root `.env.elasticsearch` and fill in Elasticsearch credentials privately. Restart the backend after changing `.env.elasticsearch`. The API defaults to `http://127.0.0.1:8000`; set `VITE_API_ORIGIN` in `.env.local` for a different API origin and restart Vite. The backend must allow that frontend origin through `FRONTEND_ORIGINS`.

Both `.env.elasticsearch` and `.env.local` are ignored. A partner's `localhost` URL refers to their machine, not yours. You need credentials for your own local Elasticsearch or a shared reachable service, with the `speech` index already populated. This adapter does not run the original vectorizer because that script deletes/recreates the index.

## Scoring integration

- `GET /api/talks`: the supported indexed speech (`speech_id=dan_palotta`). Title: Rethinking charity; speaker: Dan Pallotta. More talks need transcript IDs and indexed vectors first.
- `POST /api/notes`: `{attendee_id, attendee_name, talk_id, notes}`. Returns `{talk_id, score, points, saved, identity_mode}`.
- `GET /api/leaderboard`: saved attendee scores grouped by talk.
- `GET /api/health`: API liveness (does not prove Elasticsearch readiness).

The adapter uses `all-MiniLM-L6-v2`, the same 384-dimensional vector field and full-speech/paragraph queries as the original scripts. Final score = full-speech similarity + 0.2 × average of up to three matching paragraph scores. Queries also filter by speech ID so talks cannot be mixed. The final score is saved once. Display points = round(score × 1000). This preserves the raw similarity as a separate value; it is not an understanding percentage. Review/calibrate this scoring policy with the backend owner.

`backend/scorer.py` adapts the existing formula without importing the interactive CLI or modifying the partner's files. `backend/app.py` adds HTTP endpoints and stores scores in ignored `backend/data/scores.sqlite3`. Each attendee/talk has one saved result; resubmission replaces it. SQLite transactions prevent concurrent writes from corrupting the store. Existing `leaderboard.json` entries are not imported: that file keys scores by note ID and does not identify attendees/talks reliably. Retain it for the original CLI.

## Demo identity and current limits

Attendees enter a display name. A UUID is saved in browser local storage and sent with the request; different browsers remain separate even if names match. This is a demo identity, not authentication. Do not expose this API as a production service without real server-verified accounts. All attendees must use the same API/database to share a leaderboard.

Only typed notes are scored. Attachments remain a UI preview; remove them to enable submission. Notes stay in the form during errors, and no points are awarded on scoring failure. A timeout may happen after a server save; the polling leaderboard will reflect that save, and retries replace the same attendee/talk result rather than duplicate points. The first scoring request may download/load the model. Scores persist across server restarts, while note drafts reset on refresh. Notes themselves are not stored by this adapter.

History, receipts, keyword highlights, real accounts, and OCR are deferred. The earlier `ScoringPreview` and sample schedule files are retained but not used in the live flow. No sample attendees are inserted into the live database.

## Files

- `src/SessionNotes.jsx`: attendee name, talk selection, typed notes, API submission, results/errors.
- `src/Leaderboard.jsx`, `src/rankings.js`: dynamic rankings, podium, filters, per-talk dropdowns.
- `src/api.js`, `src/main.jsx`: API requests, browser identity, shared state, polling and immediate refresh.
- `backend/app.py`, `backend/scorer.py`: persistence/API and Elasticsearch scoring adapter.

## Verification

```sh
npm test
npm run build
.venv/bin/python -m pip install pytest httpx
.venv/bin/python -m pytest tests/test_api.py tests/test_scorer.py -q
```

Tests inject a fixed scorer into a separate temporary database to verify submit/save/read, replacement, failure, validation, persistence, CORS, and the existing scoring formula. The isolated browser integration test also used a fixed scorer; it did not verify real Elasticsearch/model output. Real scoring remains pending local Elasticsearch credentials and an indexed transcript.

## Dash0

See [observability/README.md](observability/README.md). Browser monitoring is configured separately through `.env.local`; the local backend origin can be traced when `VITE_API_ORIGIN` is set and CORS allows `traceparent`. Earlier `rally.notes.demo_saved` events belong to the previous demo-save flow; they are not emitted as successful live scores. To instrument the API, configure the backend telemetry environment first and launch uvicorn under OpenTelemetry. Never export notes/transcripts or credentials in telemetry.

## Run everything on this Mac

Use your own container's credentials in the ignored `.env.elasticsearch`, not your partner's local credentials. After dependencies are installed, load the restored transcript with:

```sh
.venv/bin/python -m backend.index_speech
```

This creates the speech index if missing and indexes documents with stable IDs; it never deletes an index. Keep `.env.local` set to `VITE_API_ORIGIN=http://127.0.0.1:8000`, then run the local backend and frontend using the commands above. Dash0 requires its separate browser-token settings to be restored if `.env.local` was removed.

## Additional TED talks

`data/talks.json` now drives the backend's live talk list. `backend/import_ted.py` imports a bounded list of three English TED talks, preserving the source paragraph boundaries in both `.txt` and paragraph-level `.json` files. Source links and attribution are in `data/transcripts/README.md`. Only successfully indexed catalog entries are returned by `/api/talks`; Sessions and leaderboard filters use that API automatically.

```sh
.venv/bin/python -m backend.import_ted
.venv/bin/python -m backend.index_speech --pending
```

The indexer creates one 384-dimensional vector per paragraph and one for the full talk, using the original embedding model. It uses per-talk IDs and never deletes the speech index or score database. Scoring queries filter by the selected talk ID. Re-index the full catalog without `--pending` when installing on a fresh Elasticsearch instance. Restart the API after code changes; catalog updates themselves are read on each request. The single full-talk embedding retains the original model's truncation behavior; paragraph comparisons provide additional local matches.

## Hackathon tool integrations

- Elasticsearch: actively used for per-talk transcript vector matching.
- Dash0: browser instrumentation exists; local activation requires restoring its dedicated ingest token in `.env.local`. Current local settings leave it disabled.
- SonarQube Cloud: `sonar-project.properties` and `.github/workflows/sonar.yml` are prepared. Follow `docs/SONAR.md` to create/import the cloud project and configure the token/project keys. No cloud scan has been verified yet.
- Skyhook Radar: official CLI installed locally, with a real Kubernetes gateway manifest at `deploy/kubernetes/rally-gateway.yaml`. Follow `docs/RADAR.md`. No local cluster exists yet, so Radar monitoring is not active. The working direct frontend/API/Elasticsearch setup is preserved.
