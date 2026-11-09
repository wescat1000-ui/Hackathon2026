import sys
from types import SimpleNamespace
import pytest
from backend.scorer import ElasticScorer, ScoringUnavailable

def test_existing_formula_and_talk_filter(monkeypatch):
    monkeypatch.setenv('ELASTIC_PASSWORD','test-only')
    searches=[]
    class Client:
        def __init__(self,*args,**kwargs): pass
        def search(self,**kwargs):
            searches.append(kwargs)
            return {'hits':{'hits':[{'_score':0.8}]} if kwargs['knn']['k']==1 else {'hits':[{'_score':0.6},{'_score':0.9}]}}
        def close(self): pass
    monkeypatch.setitem(sys.modules,'elasticsearch',SimpleNamespace(Elasticsearch=Client))
    scorer=ElasticScorer()
    scorer.model=SimpleNamespace(encode=lambda notes:SimpleNamespace(tolist=lambda:[0.1]*384))
    assert scorer.score('private notes','dan_palotta')==0.95
    assert len(searches)==2
    for search in searches:
        assert {'term':{'speech_id':'dan_palotta'}} in search['knn']['filter']['bool']['filter']

def test_missing_credentials_fails_before_model_loading(monkeypatch):
    monkeypatch.delenv('ELASTIC_API_KEY',raising=False)
    monkeypatch.delenv('ELASTIC_PASSWORD',raising=False)
    with pytest.raises(ScoringUnavailable,match='ELASTIC_PASSWORD'):
        ElasticScorer().score('notes','dan_palotta')
