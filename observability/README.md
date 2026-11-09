# Rally + Dash0: activation and backend handoff

## What is wired now

The frontend initializes `@dash0/sdk-web` before React renders, only when explicitly enabled and fully configured. It records Leaderboard/Sessions views, web vitals, fetch/XHR timings, and three custom demo events:

- `rally.notes.files_selected`: total attachment count and validation-message count.
- `rally.notes.reviewed`: attachment count and whether typed notes exist.
- `rally.notes.demo_saved`: same metadata, explicitly tagged `rally.mode=demo`.

These are frontend interactions, not successful uploads or completed scoring. No real notes API exists in this frontend yet. No telemetry is sent with the checked-in defaults.

Session replay, interaction capture, and automatic error capture are not enabled. Custom events only accept allowlisted counts/booleans; they omit names, note text, talk titles, search text, filenames, and error messages. Automatic request telemetry includes URLs: never put notes or personal data in URL paths/query strings. Do not enable request/header/body logging for note content.

## 1. Dash0 account setup (both developers)

In Dash0, retrieve the regional **OTLP HTTP endpoint** and choose a dataset. Create separate ingest tokens for the browser and backend. The browser token must be limited to Ingesting on the intended dataset. A browser token is public in compiled JS, even when supplied via `.env.local`. Never use a backend/admin token in a `VITE_` variable.

Dash0 reference: https://www.dash0.com/docs/dash0/miscellaneous/tooling/web-sdk/overview

## 2. Frontend activation (Liam)

1. Copy the repository's `.env.example` to `.env.local` (ignored by Git).
2. Set `VITE_DASH0_ENABLED=true`, the endpoint, dedicated browser token, and dataset.
3. Leave `VITE_API_ORIGIN` empty until a real API exists. Later set its exact origin, e.g. `http://localhost:8000`, after backend CORS is configured.
4. Restart `npm run dev`. Build/deploy environments need these values at build time too.
5. Open Leaderboard, then Sessions, add sample notes, review, and save. In Dash0, find service `rally-frontend`; look for page views and `rally.notes.demo_saved` under **Web Events → Custom Events**. Browser events are shown in Web Events, not the ordinary Logging list. Export is batched, so allow a short delay. A demo save is not a backend success.

If telemetry fails, the app still renders. Check endpoint/dataset/token and browser Network requests for OTLP responses. Local activation was verified in Dash0 Web Events with `rally.notes.reviewed` and `rally.notes.demo_saved`. Credentials remain local and are not part of the repository. Transport compression is disabled because ingress preflight did not allow Content-Encoding during local checks.

## 3. Backend activation (backend owner)

The `origin/main` snapshot inspected during this work contains CLI scripts (`compare_notes.py`, `leaderboard.py`, `testapp.py`), not an HTTP API. They are not present on the frontend branch and were not modified. Merge/integrate the branches before running those files alongside this helper.

In your backend virtual environment, install the observability dependency alongside your existing requirements:

```sh
python -m pip install -r observability/requirements.txt
```

Copy `observability/backend.env.example` to `observability/backend.env.local` and fill the endpoint and separate backend ingest token locally. Export the settings **before** launching instrumentation (loading dotenv from inside Python is too late):

```sh
set -a
source observability/backend.env.local
set +a
opentelemetry-instrument python compare_notes.py
```

The launcher instruments supported installed libraries. Explicit scoring spans are more useful than relying only on automatic Elasticsearch instrumentation, and make the model/search/save stages easy to find:

```python
from observability.scoring import scoring_step

# Wrap the existing scoring flow, retaining its real inputs and return values.
with scoring_step("score_submission"):
    with scoring_step("embed_notes"):
        query_vector = model.encode(content).tolist()
    with scoring_step("search_transcript"):
        # Existing Elasticsearch lookup(s) go here.
        ...
    with scoring_step("calculate_score"):
        # Existing scoring arithmetic goes here.
        ...
    with scoring_step("save_score"):
        update_leaderboard(note_id, macro_score)
```

Also available: `extract_text` and `load_leaderboard`. This helper is prepared for integration; it is not yet called by your partner's scripts. It marks failures with a fixed message and re-raises the original exception without recording its potentially private text. Avoid adding note or transcript content as span attributes. The API is a no-op without an initialized OTel provider.

Start with traces only. The existing CLI prints note content; exporting its logs would risk sending that text. Review auto-instrumentation settings before enabling any content capture or log exporter. Backend runtime/export verification remains with the backend virtual environment and Dash0 account.

Python setup reference: https://www.dash0.com/docs/dash0/opentelemetry/distributions/python/getting-started

## 4. Connect the real flow (both developers)

When the backend exposes notes submission and leaderboard endpoints:

- Instrument that HTTP server and run it with the same OpenTelemetry launcher.
- Allow the frontend's specific origin and `traceparent` in backend CORS, including OPTIONS responses. Continue allowing any content/auth headers the API needs. Do not use a wildcard trace-propagation pattern for third-party services.
- Set `VITE_API_ORIGIN` in the frontend. Its exact-origin matcher sends trace context only to that API; same-origin requests are automatically correlated by the SDK.
- Replace demo submissions and rankings with real API calls. Nest scoring spans under the incoming request, or propagate trace context through a queue if processing asynchronously.
- Verify a single submission's browser request and backend scoring stages share a trace ID in Dash0. Confirm the saved score then appears through the leaderboard API.

Only after that should a dashboard report completed submissions, scoring failures, and scoring duration. Frontend demo-save event counts must not be presented as successfully processed notes. Build that dashboard from actual server spans/metrics once the API contract exists.

Correlation reference: https://www.dash0.com/docs/dash0/miscellaneous/tooling/web-sdk/configuration

## Checks

`npm test` verifies configuration gating, exact-origin trace propagation, and event payload filtering. `npm run build` checks frontend integration. No test sends telemetry to Dash0.
