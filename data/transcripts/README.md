# TED transcript sources and attribution

These English transcripts were obtained from the public transcript views on TED.com for this noncommercial hackathon learning demonstration. The speakers and TED Conferences LLC retain rights to the content. TED's stated CC BY-NC-ND 4.0 license and usage policy apply; this directory does not grant additional rights.

- Sir Ken Robinson — Do schools kill creativity? https://www.ted.com/talks/ken_robinson_do_schools_kill_creativity
- Simon Sinek — How great leaders inspire action https://www.ted.com/talks/simon_sinek_how_great_leaders_inspire_action
- Tim Urban — Inside the mind of a master procrastinator https://www.ted.com/talks/tim_urban_inside_the_mind_of_a_master_procrastinator

Usage policy: https://www.ted.com/about/our-organization/our-policies-terms/ted-talks-usage-policy
License: https://creativecommons.org/licenses/by-nc-nd/4.0/

Each `.txt` file contains the transcript in its original paragraph order, separated by blank lines. Each `.json` file records source metadata, retrieval date, numbered paragraph text, and the first cue timestamp in milliseconds. Cue text is joined with spaces and HTML entities decoded; no summaries or invented transcript text are used. Follow the source links to watch the original talks in conjunction with these transcripts.

The import script fetches only the three explicit talks listed above; it does not crawl TED. The `data/talks.json` catalog is published to the API only for entries marked indexed after successful vector ingestion. The full transcript is retained, but the existing embedding model truncates long inputs to its context length; the single full-talk vector follows the original backend behavior and is not an exhaustive representation of every idea. Natural paragraph texts are stored in full even when a long paragraph exceeds the model context.
