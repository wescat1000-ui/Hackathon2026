import json

# Path to leaderboard data
LEADERBOARD_PATH = "leaderboard.json"

def load_leaderboard():
    try:
        with open(LEADERBOARD_PATH, "r", encoding="utf-8") as f:
            return json.load(f)
    except FileNotFoundError:
        return {}

def save_leaderboard(data):
    with open(LEADERBOARD_PATH, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=4)

def update_leaderboard(note_id, score):
    leaderboard = load_leaderboard()
    leaderboard[note_id] = score
    save_leaderboard(leaderboard)

def display_leaderboard():
    leaderboard = load_leaderboard()
    sorted_leaderboard = sorted(leaderboard.items(), key=lambda item: item[1], reverse=True)

    print("\nLeaderboard:")
    for rank, (note_id, score) in enumerate(sorted_leaderboard, start=1):
        print(f"{rank}. Note ID: {note_id}, Score: {score:.4f}")

if __name__ == "__main__":
    # Sample update and display
    update_leaderboard("note_1", 0.85)
    update_leaderboard("note_2", 0.90)
    display_leaderboard()