import json
import pytest
from backend.import_ted import extract_page
from backend.index_speech import split_paragraphs

def page(language='en'):
    props={'videoData':{'id':'test'},'transcriptData':{'translation':{
        'language':{'internalLanguageCode':language},
        'paragraphs':[{'cues':[{'text':'A &amp; B. '*50,'time':0},{'text':'Second cue.','time':1000}]},
                      {'cues':[{'text':'Next paragraph. '*50,'time':2000}]},
                      {'cues':[{'text':'Last paragraph. '*50,'time':3000}]}]}}}
    return '<script id="__NEXT_DATA__" type="application/json">'+json.dumps({'props':{'pageProps':props}})+'</script>'

def test_preserves_paragraph_boundaries_and_cue_text():
    video,paragraphs=extract_page(page())
    assert len(paragraphs)==3
    assert paragraphs[0]['text'].startswith('A & B.')
    assert paragraphs[0]['text'].endswith('Second cue.')
    assert paragraphs[1]['start_ms']==2000
    assert split_paragraphs('\n\n'.join(p['text'] for p in paragraphs))==[p['text'] for p in paragraphs]

def test_rejects_missing_or_non_english_transcript():
    with pytest.raises(ValueError):extract_page('<html>Unavailable</html>')
    with pytest.raises(ValueError,match='English'):extract_page(page('es'))
