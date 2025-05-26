import json
import os
from datetime import datetime

COMMITS_FILE = 'commits.json'

META_FILES = {
    'home_meta.json': 'home',
    'lifeupdates_meta.json': 'lifeupdates',
    'sitelog_meta.json': 'sitelog',
    'statuslog_meta.json': 'statuslog',
    'updates_meta.json': 'updates'
}

def load_commits():
    if not os.path.exists(COMMITS_FILE):
        print(f"❌ Error: {COMMITS_FILE} not found.")
        return []
    with open(COMMITS_FILE, 'r') as f:
        try:
            return json.load(f)
        except json.JSONDecodeError:
            print("❌ Error: commits.json is not valid JSON.")
            return []

def get_latest_timestamp(commits):
    valid_commits = [c for c in commits if 'date' in c]
    if not valid_commits:
        return None
    latest = max(valid_commits, key=lambda c: c['date'])
    try:
        dt = datetime.fromisoformat(latest['date'].replace('Z', '+00:00'))
        return dt.isoformat(timespec='seconds').replace('+00:00', 'Z')
    except Exception as e:
        print("❌ Error parsing timestamp:", e)
        return None

def write_meta_file(path, timestamp):
    content = {
        "lastUpdated": timestamp
    }
    os.makedirs('meta', exist_ok=True)
    with open(os.path.join('meta', path), 'w') as f:
        json.dump(content, f, indent=2)
    print(f"✅ {path} updated.")

def main():
    commits = load_commits()
    timestamp = get_latest_timestamp(commits)

    if not timestamp:
        print("⚠️ No valid timestamp found. Skipping update.")
        return

    for meta_file in META_FILES:
        write_meta_file(meta_file, timestamp)

if __name__ == "__main__":
    main()
