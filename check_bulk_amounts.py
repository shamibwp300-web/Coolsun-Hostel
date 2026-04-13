import urllib.request
import json

def fetch_json(url):
    with urllib.request.urlopen(url) as response:
        return json.loads(response.read().decode())

try:
    # Check floors to see bulk_rent_amount
    floors = fetch_json("https://hostel.coolsun.co.uk/api/floors")
    for f in floors:
        if f['is_bulk_rented']:
            print(f"Floor {f['name']} (ID {f['id']}): Bulk Rent Amount = {f['bulk_rent_amount']}")
            
    # Check rooms to see their base_rent
    rooms = fetch_json("https://hostel.coolsun.co.uk/api/rooms")
    for r in rooms:
        if r['number'] == '102':
            print(f"Room 102: base_rent = {r['base_rent']}, is_bulk_rented = {r['is_bulk_rented']}, floor = {r['floor']}")

except Exception as e:
    print(f"Error: {e}")
