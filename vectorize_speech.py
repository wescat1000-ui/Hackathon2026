import os
from dotenv import load_dotenv
from elasticsearch import Elasticsearch
from sentence_transformers import SentenceTransformer

# Force reload .env
load_dotenv(override=True)

ELASTIC_URL = os.getenv("ELASTIC_URL", "http://localhost:9200")
ELASTIC_PASSWORD = os.getenv("ELASTIC_PASSWORD", "2Z6L225U")

# Connect using username 'elastic' and the password from your .env
es = Elasticsearch(ELASTIC_URL, basic_auth=("elastic", ELASTIC_PASSWORD))

# Ping to test connectivity before doing anything else
if not es.ping():
  print("Could not connect to Elasticsearch. Verify Docker is running.")
  exit(1)

print("Connected to Elasticsearch successfully!")

INDEX_NAME = "speech"

# 2. Re-create the index cleanly
if es.indices.exists(index=INDEX_NAME):
  es.indices.delete(index=INDEX_NAME)
  print(f"Deleted existing index '{INDEX_NAME}'")

es.indices.create(
    index=INDEX_NAME,
    mappings={
        "properties": {
            "speech_id": {"type": "keyword"},
            "section_index": {"type": "integer"},
            "section_text": {"type": "text"},
            "type": {"type": "keyword"},  # Helps distinguish paragraph vs full_speech
            "section_vector": {
                "type": "dense_vector",
                "dims": 384,
                "index": True,
                "similarity": "cosine",
            },
        }
    },
)
print(f"Created fresh index: '{INDEX_NAME}'")

# 3. Load model
print("Loading model...")
model = SentenceTransformer("all-MiniLM-L6-v2")

# 4. Read text file
file_path = os.path.join("data", "speech_original.txt")
if not os.path.exists(file_path):
  print(f"ERROR: Could not find file at {file_path}")
  exit(1)

with open(file_path, "r", encoding="utf-8") as f:
  full_text = f.read()

# Group by double line breaks (paragraphs) instead of every single newline
paragraphs = [p.strip() for p in full_text.split("\n\n") if p.strip()]

# Fallback if the text file uses single line breaks everywhere
if len(paragraphs) <= 1:
  paragraphs = [p.strip() for p in full_text.split("\n") if p.strip()]

print(f"Grouped into {len(paragraphs)} clean sections/paragraphs.")

# 5. Index each paragraph
for idx, text in enumerate(paragraphs):
  vector = model.encode(text).tolist()

  doc = {
      "speech_id": "dan_palotta",
      "section_index": idx,
      "section_text": text,
      "type": "paragraph",
      "section_vector": vector,
  }

  es.index(index=INDEX_NAME, document=doc)
  print(f"Indexed section {idx + 1}/{len(paragraphs)}")

# 6. Index the ENTIRE speech as a single monolithic document
print("Indexing full speech document...")
full_speech_text = " ".join(paragraphs)
full_speech_vector = model.encode(full_speech_text).tolist()

full_doc = {
    "speech_id": "dan_palotta",
    "section_index": -1,  # Special flag for the full document
    "section_text": full_speech_text,
    "type": "full_speech",
    "section_vector": full_speech_vector,
}

es.index(index=INDEX_NAME, document=full_doc)
print("Indexed full speech document successfully!")

print(
    "\nAll sections and the full speech successfully indexed into"
    " Elasticsearch!"
)