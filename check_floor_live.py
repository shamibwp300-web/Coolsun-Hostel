import urllib.request
import json

def fetch_json(url):
    with urllib.request.urlopen(url) as response:
        return json.loads(response.read().decode())

try:
    # We don't have a direct /api/floors, but we can check room 101
    # Actually, I'll check /api/rooms and see if any floor info is leaked
    rooms = fetch_json("https://hostel.coolsun.co.uk/api/rooms")
    floor_id = None
    for r in rooms:
        if r['number'] == '101':
            floor_id = r['floor']
            break
            
    print(f"Room 101 Floor ID: {floor_id}")
    
    # Let's try to hit /api/onboarding/floors if it exists? 
    # Or just look at the bulk_rented flag in the room data again.
    # In my previous run: "is_bulk_rented": false was in the room JSON.
    # But that might be Room.is_bulk_rented.
    
    # Let's write a script to check Floor objects in the DB on live.
    # I'll use a temporary endpoint or just a script that I run in the backend if I could.
    # But I can only hit endpoints.

except Exception as e:
    print(f"Error: {e}")
