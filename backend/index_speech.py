"""Vectorize catalog transcripts without deleting the index or existing talks.

Run all catalog talks: python -m backend.index_speech
Run only newly imported talks: python -m backend.index_speech --pending
"""
import argparse
import json
import os
from dotenv import load_dotenv
from elasticsearch import Elasticsearch, helpers
from backend.catalog import CATALOG, ROOT


def split_paragraphs(text):
    paragraphs = [part.strip() for part in text.split('\n\n') if part.strip()]
    if len(paragraphs) <= 1:
        paragraphs = [part.strip() for part in text.splitlines() if part.strip()]
    return paragraphs


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--pending', action='store_true', help='Only index newly imported talks')
    args = parser.parse_args()
    load_dotenv(ROOT / '.env.elasticsearch')
    load_dotenv(ROOT / '.env')
    password, api_key = os.getenv('ELASTIC_PASSWORD'), os.getenv('ELASTIC_API_KEY')
    if not (password or api_key):
        raise SystemExit('Missing Elasticsearch credentials.')
    client = Elasticsearch(os.getenv('ELASTIC_URL', 'http://localhost:9200'), request_timeout=60,
        **({'api_key': api_key} if api_key else {'basic_auth': (os.getenv('ELASTIC_USERNAME', 'elastic'), password)}))
    try:
        index = os.getenv('ELASTIC_INDEX', 'speech')
        client.info()
        if not client.indices.exists(index=index):
            client.indices.create(index=index, mappings={'properties': {
                'speech_id': {'type': 'keyword'}, 'section_index': {'type': 'integer'},
                'section_text': {'type': 'text'}, 'type': {'type': 'keyword'},
                'section_vector': {'type': 'dense_vector', 'dims': 384, 'index': True, 'similarity': 'cosine'},
            }})
        catalog = json.loads(CATALOG.read_text())
        selected = [talk for talk in catalog if not args.pending or not talk.get('indexed')]
        if not selected:
            print('No talks need indexing.', flush=True)
            return
        from sentence_transformers import SentenceTransformer
        print('Loading the original embedding model...', flush=True)
        model = SentenceTransformer('all-MiniLM-L6-v2')
        for talk in selected:
            paragraphs = split_paragraphs((ROOT / talk['transcript_path']).read_text())
            if not paragraphs:
                raise ValueError('Empty transcript for ' + talk['id'])
            texts = paragraphs + [' '.join(paragraphs)]
            vectors = model.encode(texts, batch_size=32).tolist()
            documents = []
            for position, (content, vector) in enumerate(zip(texts, vectors)):
                full = position == len(paragraphs)
                documents.append({'_index': index, '_id': talk['id']+'-'+('full' if full else str(position)), '_source': {
                    'speech_id': talk['id'], 'section_index': -1 if full else position,
                    'section_text': content, 'type': 'full_speech' if full else 'paragraph',
                    'section_vector': vector, 'source_url': talk.get('source_url',''),
                    'talk_title': talk['title'], 'speaker': talk['speaker'],
                }})
            helpers.bulk(client, documents, refresh='wait_for')
            count = client.count(index=index, query={'term': {'speech_id': talk['id']}})['count']
            if count != len(texts):
                raise ValueError('Unexpected document count for ' + talk['id'] + '; catalog not published')
            talk['indexed'] = True
            talk['paragraph_count'] = len(paragraphs)
            talk['vector_dimensions'] = 384
            temporary = CATALOG.with_suffix('.tmp')
            temporary.write_text(json.dumps(catalog,ensure_ascii=False,indent=2)+'\n')
            temporary.replace(CATALOG)
            print('Indexed '+talk['title']+': '+str(len(paragraphs))+' paragraph vectors + 1 full-text vector',flush=True)
        print('Done. Existing talks and scores were preserved.',flush=True)
    finally:
        client.close()

if __name__ == '__main__':
    main()
