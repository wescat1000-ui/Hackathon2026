"""Read the locally indexed talk catalog on each request."""
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
CATALOG = ROOT / 'data' / 'talks.json'

def load_talks():
    return [talk for talk in json.loads(CATALOG.read_text()) if talk.get('indexed')]
