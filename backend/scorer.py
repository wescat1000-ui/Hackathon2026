"""Same model, index fields, and final scoring formula as origin/main compare_notes.py.

Does not import that interactive script, print notes, or recreate the speech index.
"""
import os
from threading import Lock

class ScoringUnavailable(Exception):
    pass

class ElasticScorer:
    def __init__(self):
        self.model = None
        self.lock = Lock()

    def score(self, notes, talk_id):
        from elasticsearch import Elasticsearch
        url = os.getenv('ELASTIC_URL', 'http://localhost:9200')
        api_key = os.getenv('ELASTIC_API_KEY')
        password = os.getenv('ELASTIC_PASSWORD')
        if not (api_key or password):
            raise ScoringUnavailable('Add ELASTIC_PASSWORD or ELASTIC_API_KEY to the backend .env file.')
        client = Elasticsearch(url, request_timeout=30, **({'api_key': api_key} if api_key else {'basic_auth': (os.getenv('ELASTIC_USERNAME', 'elastic'), password)}))
        try:
            with self.lock:
                if self.model is None:
                    from sentence_transformers import SentenceTransformer
                    self.model = SentenceTransformer('all-MiniLM-L6-v2')
                vector = self.model.encode(notes).tolist()
            def search(kind, count):
                return client.search(index=os.getenv('ELASTIC_INDEX', 'speech'), knn={
                    'field': 'section_vector', 'query_vector': vector, 'k': count,
                    'num_candidates': 10 if count == 1 else 50,
                    'filter': {'bool': {'filter': [{'term': {'type': kind}}, {'term': {'speech_id': talk_id}}]}}},
                    _source=False)['hits']['hits']
            macro = search('full_speech', 1)
            if not macro:
                raise ScoringUnavailable('This talk has no indexed transcript. Ask the backend owner to index it first.')
            micro = search('paragraph', 3)
            score = macro[0]['_score'] + (sum(hit['_score'] for hit in micro) / len(micro) * 0.2 if micro else 0)
            return round(score, 6)
        except ScoringUnavailable:
            raise
        except Exception:
            raise ScoringUnavailable('Scoring is unavailable. Check Elasticsearch, the model dependencies, and the indexed transcript.') from None
        finally:
            client.close()
