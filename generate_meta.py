import json
from datetime import datetime, timezone
import os

# Path to commits.json
COMMITS_FILE = 'commits.json'

# Output meta files
META_FILES = {
    'home_meta.json': 'home',
    'lifeupdates_meta.json': 'lifeupdates',
    'sitelog_meta.json': 'sitelog',
    'statuslog_meta.json': 'statuslog',
    'updates_meta.json': 'updates'
}

def load_commits():
    if not os.path.exists(COMMITS_FILE):
        print(f"Error: {COMMITS_FILE} not found.")
        return []
    with open(COMMITS_FILE, 'r') as f:
        return json.load(f)

def get_latest_timestamp(commits):
    latest = max(commits, key=lambda c: c.get('date', '')) if commits else None
    return latest['date'] if latest else None

def write_meta_file(path, timestamp):
    content = {
        "lastUpdated": timestamp
    }
    with open(os.path.join('meta', path), 'w') as f:
        json.dump(content, f, indent=2)
    print(f"✔ Updated {path}")

def main():
    commits = load_commits()
    timestamp = get_latest_timestamp(commits)

    if not timestamp:
        print("No valid timestamp found.")
        return

    # Ensure the meta directory exists
    os.makedirs('meta', exist_ok=True)

    for meta_file in META_FILES:
        write_meta_file(meta_file, timestamp)

if __name__ == "__main__":
    main()
