import os
from dotenv import load_dotenv
from elasticsearch import Elasticsearch
from sentence_transformers import SentenceTransformer

load_dotenv()

# 1. Connect to local Elasticsearch
es = Elasticsearch(
    os.getenv("ELASTIC_URL", "http://localhost:9200"),
    api_key=os.getenv("ELASTIC_API_KEY")
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