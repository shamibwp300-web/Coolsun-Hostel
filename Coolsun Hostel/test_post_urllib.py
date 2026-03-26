import urllib.request
import json
import sys

url = "http://localhost:5000/api/rooms"
data = {"number":"101","floor":1,"type":"Small","capacity":2,"base_rent":10000}
json_data = json.dumps(data).encode('utf-8')

print(f"Testing POST to {url}...")
try:
    req = urllib.request.Request(url, data=json_data, headers={'Content-Type': 'application/json'}, method='POST')
    with urllib.request.urlopen(req) as f:
        print(f"Status Code: {f.getcode()}")
        print(f"Content-Type: {f.info().get_content_type()}")
        print(f"Response Body (first 500 chars):")
        print(f.read().decode('utf-8')[:500])
except urllib.error.HTTPError as e:
    print(f"HTTP ERROR {e.code}:")
    print(e.read().decode('utf-8')[:500])
except Exception as e:
    print(f"CRITICAL FAILURE: {e}")
