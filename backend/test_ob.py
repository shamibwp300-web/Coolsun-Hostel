import requests
import json

payload = {
    "balance_type": "OWNER_FUND",
    "amount": 748588,
    "tenant_id": ""
}

try:
    res = requests.post("http://127.0.0.1:5000/api/finance/opening-balance", json=payload)
    print("Status:", res.status_code)
    print("Response:", res.text)
except Exception as e:
    print("Error:", e)
