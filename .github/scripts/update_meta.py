import os
import json
from datetime import datetime

targets = {
    "pages/home.html": "meta/home_meta.json",
    "updates/lifeupdates.html": "meta/lifeupdates_meta.json",
    "updates/sitelog.html": "meta/sitelog_meta.json",
    "updates/statuslog.html": "meta/statuslog_meta.json",
    "updates/updates.html": "meta/updates_meta.json"
}

changed_files = os.popen('git diff --name-only HEAD^ HEAD').read().splitlines()
now_iso = datetime.utcnow().isoformat() + 'Z'

for html_file, meta_file in targets.items():
    if html_file in changed_files:
        os.makedirs(os.path.dirname(meta_file), exist_ok=True)
        data = { "lastUpdated": now_iso }
        with open(meta_file, 'w', encoding='utf-8') as f:
            json.dump(data, f, indent=2)
        print(f"Updated: {meta_file}")
