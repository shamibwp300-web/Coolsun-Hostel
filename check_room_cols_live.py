import urllib.request
import json

def fetch_json(url):
    with urllib.request.urlopen(url) as response:
        return json.loads(response.read().decode())

try:
    rooms = fetch_json("https://hostel.coolsun.co.uk/api/rooms")
    for r in rooms:
        if r['number'] == '101':
            # We need to know what's in the DB, but /api/rooms might not show floor_id.
            # Let's hope it shows 'floor_id' or 'floor'.
            print("Room 101:", r)

except Exception as e:
    print(f"Error: {e}")
