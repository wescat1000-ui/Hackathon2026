"""Import a bounded set of public English TED transcripts, preserving TED paragraphs.

Fetches public page data; does not bypass access controls. Writes attribution,
plain text, and paragraph JSON. Imported talks remain hidden until vectorized.
"""
import html
import json
import re
import subprocess
from datetime import datetime, timezone
from pathlib import Path
from backend.catalog import CATALOG, ROOT

SLUGS = [
    'ken_robinson_do_schools_kill_creativity',
    'simon_sinek_how_great_leaders_inspire_action',
    'tim_urban_inside_the_mind_of_a_master_procrastinator',
]
LICENSE_URL = 'https://www.ted.com/about/our-organization/our-policies-terms/ted-talks-usage-policy'

def extract_page(page):
    match = re.search(r'<script id="__NEXT_DATA__"[^>]*>(.*?)</script>', page, re.S)
    if not match:
        raise ValueError('No public embedded transcript data found')
    props = json.loads(match.group(1))['props']['pageProps']
    translation = props['transcriptData']['translation']
    if translation['language']['internalLanguageCode'] != 'en':
        raise ValueError('English transcript required')
    paragraphs = []
    for paragraph in translation['paragraphs']:
        cues = paragraph['cues']
        text = ' '.join(html.unescape(cue['text']).strip() for cue in cues).strip()
        if text:
            paragraphs.append({'index': len(paragraphs), 'text': text, 'start_ms': cues[0].get('time')})
    if len(paragraphs) < 3 or sum(len(p['text']) for p in paragraphs) < 1000:
        raise ValueError('Transcript appears incomplete')
    return props['videoData'], paragraphs

def main():
    catalog = json.loads(CATALOG.read_text())
    folder = ROOT / 'data' / 'transcripts'
    folder.mkdir(exist_ok=True)
    for slug in SLUGS:
        url = 'https://www.ted.com/talks/' + slug + '?language=en&view=transcript'
        page = subprocess.check_output(['curl','--fail','--location','--silent','--show-error','--max-time','30',url]).decode()
        video, paragraphs = extract_page(page)
        talk_id = 'ted_' + str(video['id'])
        metadata = {
            'id': talk_id, 'title': video['title'], 'speaker': video['presenterDisplayName'],
            'time': '', 'topic': 'TED talk · English transcript',
            'source_url': 'https://www.ted.com/talks/' + slug,
            'license': 'CC BY-NC-ND 4.0 (TED usage policy applies)', 'license_url': LICENSE_URL,
            'attribution': video['presenterDisplayName'] + ' / TED Conferences LLC',
            'retrieved_at': datetime.now(timezone.utc).isoformat(),
            'transcript_path': 'data/transcripts/' + slug + '.txt',
            'paragraphs_path': 'data/transcripts/' + slug + '.json',
            'paragraph_count': len(paragraphs), 'indexed': False,
        }
        (folder / (slug+'.txt')).write_text('\n\n'.join(p['text'] for p in paragraphs)+'\n')
        (folder / (slug+'.json')).write_text(json.dumps({'talk': metadata, 'paragraphs': paragraphs},ensure_ascii=False,indent=2)+'\n')
        # Re-imports stay hidden until the refreshed text is vectorized.
        catalog = [item for item in catalog if item['id'] != talk_id]
        catalog.append(metadata)
        print('Imported: '+metadata['title']+' ('+str(len(paragraphs))+' paragraphs)',flush=True)
    temporary = CATALOG.with_suffix('.tmp')
    temporary.write_text(json.dumps(catalog,ensure_ascii=False,indent=2)+'\n')
    temporary.replace(CATALOG)

if __name__ == '__main__':
    main()
