import requests

url = "https://hostel.coolsun.co.uk/api/finance/generate-rent"
payload = {
    "room_number": "101",
    "billing_month": "2026-04"
}

try:
    response = requests.post(url, json=payload)
    print(f"Status Code: {response.status_code}")
    print(f"Response: {response.text}")
except Exception as e:
    print(f"Error: {e}")
