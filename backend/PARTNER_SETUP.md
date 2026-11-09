# Run scoring on the backend owner's computer

Both frontends must point at this one API so they share the same leaderboard database. Elasticsearch stays on the backend owner's machine; do not expose port 9200.

## Get the integration code

Fetch origin in GitHub Desktop. The integration is on `codex/frontend-leaderboard`. Open it in a separate checkout/worktree if you have uncommitted backend edits. Do not discard your existing work or environment file.

From that repository folder:

```sh
python3 -m venv .venv
.venv/bin/python -m pip install -r backend/requirements.txt
```

On Windows use `.venv\Scripts\python` instead of `.venv/bin/python`.

Keep your working Elasticsearch credentials in `.env.elasticsearch` or your existing `.env`. The former is loaded first. If both ELASTIC_API_KEY and ELASTIC_PASSWORD are populated, the API key is used. Use a valid key, or remove the stale key to use the password. Keep the same `speech` index with speech ID `dan_palotta`; do not rerun the vectorizer unless you intend to recreate its index.

## Same Wi-Fi

Run this on the backend owner's computer:

```sh
.venv/bin/python -m uvicorn backend.app:app --host 0.0.0.0 --port 8000
```

Keep that terminal running. Find your computer's private Wi-Fi IPv4 address in network settings, for example `192.168.1.42`. Give Liam the API address `http://192.168.1.42:8000` (use your actual address). `0.0.0.0` is the listening address, not the address to share.

On Liam's computer, visit `<API address>/api/health`. It should return a JSON response with `status: ok`. If unreachable, check the backend computer's firewall and conference Wi-Fi client isolation. Do not change router port forwarding. The API allows Liam's current frontend origins (`http://127.0.0.1:5173` and `http://localhost:5173`) by default.

Once reachable, set Liam's ignored `.env.local`:

```dotenv
VITE_API_ORIGIN=http://192.168.1.42:8000
```

Use the actual address, preserve the other settings, and restart Vite. His frontend stays at `http://127.0.0.1:5173`; only the backend destination changes.

Submit typed notes for the charity talk. API health alone doesn't validate Elasticsearch: the first successful score checks the model, index, credentials, and save operation. Both browsers should see the same leaderboard within five seconds. Scores persist in `backend/data/scores.sqlite3` on the backend computer. Do not copy this database while the API is writing it.

## Different networks / isolated conference Wi-Fi

The backend needs a reachable shared deployment or a tunnel/access service. Choose and configure that route together before changing the frontend address. This API currently has demo browser identities and no authentication; a public tunnel would expose its read/write endpoints. Prefer an access-restricted route. Do not publish Elasticsearch credentials or expose Elasticsearch itself.

## Troubleshooting

- 401/403 from Elasticsearch: check the credentials for the local container and whether a stale API key takes precedence over the password.
- No indexed transcript: the backend must have the full-speech document with `speech_id=dan_palotta`.
- CORS: add the exact browser frontend origin to FRONTEND_ORIGINS and restart the API. This is the frontend's origin, not the backend IP.
- Model download: the first scoring request needs network access and may take longer.
- Same names: identity is based on a browser UUID, so two browsers with the same display name are different attendees. This is a hackathon demo identity, not a login.
