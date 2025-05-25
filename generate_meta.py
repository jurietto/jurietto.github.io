import os
import json
from datetime import datetime

# Map: which file updates which meta file
PAGE_META_MAP = {
    "pages/home.html": "meta/home_meta.json",
    "updates/lifeupdates.html": "meta/lifeupdates_meta.json",
    "updates/sitelog.html": "meta/sitelog_meta.json",
    "updates/statuslog.html": "meta/statuslog_meta.json",
    "updates/updates.html": "meta/updates_meta.json",
}

def get_last_modified_time(filepath):
    try:
        mtime = os.path.getmtime(filepath)
        return datetime.utcfromtimestamp(mtime).isoformat() + "Z"
    except Exception as e:
        print(f"Failed to get time for {filepath}: {e}")
        return None

def write_meta(file, timestamp):
    os.makedirs(os.path.dirname(file), exist_ok=True)
    with open(file, 'w', encoding='utf-8') as f:
        json.dump({"lastUpdated": timestamp}, f, indent=2)
        print(f"✅ {file} updated")

def main():
    for html_file, meta_file in PAGE_META_MAP.items():
        ts = get_last_modified_time(html_file)
        if ts:
            write_meta(meta_file, ts)
        else:
            print(f"⚠️ Could not generate meta for {html_file}")

if __name__ == "__main__":
    main()
