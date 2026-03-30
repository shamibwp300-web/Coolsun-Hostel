import urllib.request
import json

BASE_URL = "http://127.0.0.1:5000/api"

def test_summary():
    print("Testing /api/dashboard/summary...")
    try:
        url = f"{BASE_URL}/dashboard/summary"
        with urllib.request.urlopen(url) as response:
            print(f"Success (No filters): {response.status}")
    except Exception as e:
        print(f"Failed (No filters): {e}")

    try:
        url = f"{BASE_URL}/dashboard/summary?start_date=2026-03-01&end_date=2026-03-31"
        with urllib.request.urlopen(url) as response:
            print(f"Success (With filters): {response.status}")
    except Exception as e:
        print(f"Failed (With filters): {e}")

if __name__ == "__main__":
    test_summary()
