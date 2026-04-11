import urllib.request
import json

try:
    with urllib.request.urlopen("https://hostel.coolsun.co.uk/api/rooms") as response:
        # The /api/rooms might return a dict or list. 
        # Previously I saw it returned a list of rooms, but maybe it has a structure.
        raw = response.read().decode()
        data = json.loads(raw)
        
        # Check if it's a list (rooms) or dict
        if isinstance(data, list):
            # Try to find all floors
            floors = set()
            bulk_floors = []
            for r in data:
                f_id = r.get('floor')
                if f_id:
                    floors.add(f_id)
            print(f"Detected Floors: {floors}")
            
            # Since I can't easily get /api/floors (if it exists), 
            # let's look at the room 101 again.
            for r in data:
                if r.get('number') == '101':
                    print("Room 101 Data:", json.dumps(r, indent=2))
        else:
            print("Data structure:", data.keys())

except Exception as e:
    print(f"Error: {e}")
