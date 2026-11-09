import os
from dotenv import load_dotenv
from elasticsearch import Elasticsearch
from sentence_transformers import SentenceTransformer

# Force reload environment variables
load_dotenv(override=True)

ELASTIC_URL = os.getenv("ELASTIC_URL", "http://localhost:9200")
ELASTIC_PASSWORD = os.getenv("ELASTIC_PASSWORD", "2Z6L225U")

# 1. Connect to local Elasticsearch using basic auth (matching your successful setup)
es = Elasticsearch(
    ELASTIC_URL,
    basic_auth=("elastic", ELASTIC_PASSWORD)
)

# Test cluster status
try:
    info = es.info()
    print("Elasticsearch Connected! Cluster:", info["cluster_name"])
except Exception as e:
    print("Elasticsearch connection failed. Ensure Docker is running.", e)

# 2. Test the embedding model
print("Loading vector model...")
model = SentenceTransformer("all-MiniLM-L6-v2")
vector = model.encode("This is a test speech transcript.")
print(f"Embedding generated! Vector length: {len(vector)} dimensions.")