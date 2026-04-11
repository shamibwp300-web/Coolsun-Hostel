import urllib.request
import json

def fetch_json(url):
    with urllib.request.urlopen(url) as response:
        return json.loads(response.read().decode())

try:
    rooms = fetch_json("https://hostel.coolsun.co.uk/api/rooms")
    matches = [r for r in rooms if r['number'] == '101']
    print(f"Active rooms with number 101: {len(matches)}")
    for m in matches:
        print(f"ID: {m['id']}, Floor: {m['floor']}, Tenants: {m['occupied_beds']}")

except Exception as e:
    print(f"Error: {e}")
