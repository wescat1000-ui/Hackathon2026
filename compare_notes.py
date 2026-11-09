import json
import os
from leaderboard import update_leaderboard, display_leaderboard
from dotenv import load_dotenv
from elasticsearch import Elasticsearch
from sentence_transformers import SentenceTransformer

# 1. Load credentials from .env
load_dotenv(override=True)
ELASTIC_URL = os.getenv("ELASTIC_URL", "http://localhost:9200")
ELASTIC_PASSWORD = os.getenv("ELASTIC_PASSWORD", "2Z6L225U")

es = Elasticsearch(ELASTIC_URL, basic_auth=("elastic", ELASTIC_PASSWORD))

# 2. Load the embedding model
print("Loading vector model...")
model = SentenceTransformer("all-MiniLM-L6-v2")

INDEX_NAME = "speech"

# Prompt user for note input
note_id = "input_note"
topic = "User Input"

print("Please enter your note (press Enter twice to finish):")
lines = []
while True:
    line = input()
    if line:
        lines.append(line)
    else:
        break

content = "\n".join(lines)

if not content.strip():
    print("No content provided.")
else:
    print("\n" + "=" * 70)
    print(f"EVALUATING NOTE [{note_id} - {topic}]:")
    print(f'"{content}"')
    print("=" * 70)

    # Embed the user's note
    query_vector = model.encode(content).tolist()

    # A. Check Macro Alignment against the entire speech
    macro_res = es.search(
        index=INDEX_NAME,
        knn={
            "field": "section_vector",
            "query_vector": query_vector,
            "k": 1,
            "num_candidates": 10,
            "filter": {"term": {"type": "full_speech"}},
        },
        _source=["section_text"],
    )

    macro_score = 0.0
    if macro_res["hits"]["hits"]:
        macro_score = macro_res["hits"]["hits"][0]["_score"]
    print(f"\n>> OVERALL SPEECH ALIGNMENT SCORE: {macro_score:.4f}")

    # Update leaderboard
    update_leaderboard(note_id, macro_score)

    # B. Find the Top 3 Supporting Paragraphs
    micro_res = es.search(
        index=INDEX_NAME,
        knn={
            "field": "section_vector",
            "query_vector": query_vector,
            "k": 3,
            "num_candidates": 50,
            "filter": {"term": {"type": "paragraph"}},
        },
        _source=["section_index", "section_text"],
    )

    print(">> TOP MATCHING PARAGRAPHS IN TRANSCRIPT:")
    for rank, hit in enumerate(micro_res["hits"]["hits"], start=1):
        score = hit["_score"]
        sec_num = hit["_source"].get("section_index", "?")
        snippet = hit["_source"].get("section_text", "")[:180].replace("\n", " ")
        print(f"   [{rank}] Paragraph #{sec_num} (Score: {score:.4f})")
        print(f'       "{snippet}..."')

    # Display updated leaderboard
    display_leaderboard()
# After calculating macro_score

# B. Find the Top 3 Supporting Paragraphs
micro_res = es.search(
    index=INDEX_NAME,
    knn={
        "field": "section_vector",
        "query_vector": query_vector,
        "k": 3,
        "num_candidates": 50,
        "filter": {"term": {"type": "paragraph"}},
    },
    _source=["section_index", "section_text"],
)

print(">> TOP MATCHING PARAGRAPHS IN TRANSCRIPT:")
paragraph_scores = []

for rank, hit in enumerate(micro_res["hits"]["hits"], start=1):
    score = hit["_score"]
    paragraph_scores.append(score)
    sec_num = hit["_source"].get("section_index", "?")
    snippet = hit["_source"].get("section_text", "")[:180].replace("\n", " ")
    print(f"   [{rank}] Paragraph #{sec_num} (Score: {score:.4f})")
    print(f'       "{snippet}..."')

# Compute average score for top paragraphs
if paragraph_scores:
    avg_paragraph_score = sum(paragraph_scores) / len(paragraph_scores)
    # Adjust macro score by adding a bonus based on paragraph precision
    weight = 0.2  # Weight for paragraph score influence, adjust as needed
    macro_score += avg_paragraph_score * weight

print(f"\n>> ADJUSTED OVERALL SPEECH ALIGNMENT SCORE: {macro_score:.4f}")

# Update leaderboard
update_leaderboard(note_id, macro_score)
