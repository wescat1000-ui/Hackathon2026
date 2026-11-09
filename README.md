# Rally — conference companion

A responsive React frontend for capturing session notes and comparing learning points on a leaderboard. Rally is a working name.

## Run locally

Requires Node.js 22.12+ (Node 24 recommended).

```sh
npm install
npm run dev
```

Open the local URL printed by Vite. To check a production build, run `npm run build` and then `npm run preview`.

## Frontend structure

- `src/main.jsx`: app shell and navigation; opens on Leaderboard.
- `src/Leaderboard.jsx`: sample session scores, rankings, talk filter, attendee search, and current attendee standing.
- `src/SessionNotes.jsx`: session draft, file attachment controls, image previews, review, and demo submission.
- `src/styles.css`: responsive layout and styling.

## Backend handoff

Everything is currently demo data. Notes live only in React memory and reset on refresh. Leaderboard scores are fictional fixtures. Notes are not scored. Other attendees are fictional sample records. There is no authentication or API connection yet.

Agree on endpoints for talks, notes submission, and rankings before connecting the backend. Keep Elasticsearch credentials on the backend; do not put them in frontend code or commit `.env` files.

Google Fonts supplies the optional DM Sans and Manrope fonts; system fonts are used when unavailable.

## Session notes uploads

Open **Sessions** or choose **Add your session notes** from the leaderboard. Enter the talk title, optionally enter the speaker, and attach files and/or type notes. Review the draft and save the demo submission.

- Any file type can be selected, including images, PDFs, and documents. This does not imply that every format can be extracted by the future backend.
- Up to 10 files, 20 MB each. Empty files are rejected; duplicates with the same name, size, and modification time are skipped.
- Images have local previews where the browser supports the format. SVG files are attached without a preview.
- Drafts survive navigation between app tabs but reset on browser refresh. No network upload, OCR, text extraction, or scoring currently occurs.

### Proposed backend contract (not implemented)

Use a multipart notes submission with a conference talk ID, optional typed notes, and repeated file attachments. Replace the manual talk title with a talk selector once the backend supplies the schedule and IDs. The backend should validate actual file types and sizes, extract text/OCR supported formats, and return clear unsupported-format errors.

A submission should return an ID and processing status; subsequent results should include the understanding score, earned learning points, and key ideas covered/missed. Award points only after a successful server result. Keep activity points separate from learning points and prevent duplicate rewards for the same talk. Confirm the API shape with the backend owner before implementation.

## Leaderboard demo

The app now focuses on **Leaderboard** and **Sessions**. Activity features and the Overview screen are no longer exposed. Score receipts and History remain deferred.

The leaderboard opens by default. Choose all sessions for summed learning points or a sample talk for its scores. Search filters the table without changing ranks; Find me clears search and scrolls to the highlighted attendee. Attendees without a score are excluded from individual talk rankings. Ties share competition rank (1, 1, 3). The current attendee has no score for the third sample talk, demonstrating that state. All names, scores, and talks are illustrative, not live backend data.
