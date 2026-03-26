import requests
import json
import sys

url = "http://localhost:5000/api/rooms"
data = {"number":"101","floor":1,"type":"Small","capacity":2,"base_rent":10000}

print(f"Testing POST to {url}...")
try:
    response = requests.post(url, json=data)
    print(f"Status Code: {response.status_code}")
    print(f"Content-Type: {response.headers.get('Content-Type')}")
    print(f"Response Body (first 500 chars):")
    print(response.text[:500])
except Exception as e:
    print(f"CRITICAL FAILURE: {e}")
