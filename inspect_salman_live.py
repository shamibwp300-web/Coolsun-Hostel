import urllib.request
import json

def fetch_json(url):
    with urllib.request.urlopen(url) as response:
        return json.loads(response.read().decode())

try:
    # 1. Get Salman's details
    tenants = fetch_json("https://hostel.coolsun.co.uk/api/tenants")
    salman = None
    for t in tenants:
        if 'Salman' in t['name']:
            salman = t
            break
            
    if not salman:
        print("Salman not found in /api/tenants")
    else:
        print("Salman details:", json.dumps(salman, indent=2))
        
    # 2. Get ledgers for Salman ID
    if salman:
        ledgers = fetch_json("https://hostel.coolsun.co.uk/api/finance/ledger")
        relevant = [l for l in ledgers if l.get('tenant_id') == salman['id']]
        print(f"Ledgers for Salman (ID {salman['id']}):", json.dumps(relevant, indent=2))

except Exception as e:
    print(f"Error: {e}")
