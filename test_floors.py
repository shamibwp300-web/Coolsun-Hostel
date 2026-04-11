import urllib.request
import json

try:
    with urllib.request.urlopen("https://hostel.coolsun.co.uk/api/rooms") as response:
        data = json.loads(response.read().decode())
        
        # Let's see if room 101 is bulk rented
        for r in data:
            if r.get('number') == '101':
                print("Room 101:", r)
except Exception as e:
    print(f"Error: {e}")
