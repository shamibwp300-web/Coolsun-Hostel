import urllib.request
import json

try:
    with urllib.request.urlopen("https://hostel.coolsun.co.uk/api/finance/room-summary/101") as response:
        data = json.loads(response.read().decode())
        print("Room 101 Summary:", json.dumps(data, indent=2))
        
    with urllib.request.urlopen("https://hostel.coolsun.co.uk/api/finance/ledger") as response:
        data = json.loads(response.read().decode())
        print(f"Got {len(data)} ledgers from /finance/ledger")
        zeros = [l for l in data if l['amount'] == 0]
        print(f"Ledgers with amount 0: {len(zeros)}")
except Exception as e:
    print(f"Error: {e}")
