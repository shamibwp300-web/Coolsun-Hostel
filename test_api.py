import urllib.request
import json

try:
    url = "http://127.0.0.1:5000/api/finance/room-billing-status/102?month=2&year=2026"
    req = urllib.request.Request(url)
    with urllib.request.urlopen(req) as response:
        data = json.loads(response.read().decode())
        print("Feb 2026:", data)
except Exception as e:
    print("Feb error:", e)

try:
    url = "http://127.0.0.1:5000/api/finance/room-billing-status/102?month=4&year=2026"
    req = urllib.request.Request(url)
    with urllib.request.urlopen(req) as response:
        data = json.loads(response.read().decode())
        print("Apr 2026:", data)
except Exception as e:
    print("Apr error:", e)

try:
    url = "http://127.0.0.1:5000/api/finance/ledger"
    req = urllib.request.Request(url)
    with urllib.request.urlopen(req) as response:
        data = json.loads(response.read().decode())
        print("Ledgers:", data)
except Exception as e:
    print("Ledgers error:", e)
