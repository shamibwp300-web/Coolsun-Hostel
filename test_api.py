import urllib.request
import json

try:
    req = urllib.request.Request("http://127.0.0.1:5000/api/tenants")
    with urllib.request.urlopen(req) as response:
        data = json.loads(response.read().decode())
        for t in data:
            if 'kabir' in t['name'].lower():
                print("Found Tenant:", t['name'])
                print("ID Front:", t.get('id_card_front_url'))
                print("ID Back:", t.get('id_card_back_url'))
                print("Police form:", t.get('police_form_url'))
                print("Agreement form:", t.get('agreement_url'))
except Exception as e:
    print("Error:", e)
