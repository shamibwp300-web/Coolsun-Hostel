import urllib.request
import json

try:
    with urllib.request.urlopen("https://hostel.coolsun.co.uk/api/finance/ledger") as response:
        data = json.loads(response.read().decode())
        
        c = 0
        for l in data:
            if 'Salman' in l.get('name', ''):
                print(l)
                c += 1
        print("Total ledgers for Salman:", c)
except Exception as e:
    print(f"Error: {e}")
