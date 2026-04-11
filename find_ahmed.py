import urllib.request
import json

def fetch_json(url):
    with urllib.request.urlopen(url) as response:
        return json.loads(response.read().decode())

try:
    tenants = fetch_json("https://hostel.coolsun.co.uk/api/tenants")
    ahmeds = [t for t in tenants if 'Ahmed' in t['name']]
    for a in ahmeds:
        print(f"Name: {a['name']}, ID: {a['id']}, Room: {a['room']}, RoomID: {a['room_id']}")

except Exception as e:
    print(f"Error: {e}")
