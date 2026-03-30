import urllib.request
import json
from datetime import datetime, timedelta

BASE_URL = "http://127.0.0.1:5000/api"

def post_json(url, data):
    req = urllib.request.Request(url, data=json.dumps(data).encode('utf-8'), headers={'Content-Type': 'application/json'})
    with urllib.request.urlopen(req) as response:
        return json.loads(response.read().decode())

def get_json(url):
    with urllib.request.urlopen(url) as response:
        return json.loads(response.read().decode())

def test_summary_filters():
    print("--- Creating Test Revenue Data ---")
    
    # 1. We need a tenant_id to create a ledger entry. Let's find one.
    tenants = get_json(f"{BASE_URL}/tenants")
    if not tenants:
        print("No tenants found. Skipping data creation.")
        return
    tid = tenants[0]['id']

    # 2. Create a payment for January 20th, 2026
    # Note: Our backend POST /api/finance/payments doesn't support custom dates (it uses today).
    # For testing, I'll directly add to the DB via a temporary script or just use today.
    # Actually, I'll update the backend handle_payments to support custom dates too if needed.
    
    # Wait, the user wants to filter. I should check if existing data can be used.
    # I'll just use the dashboard summary and check if any expenses I added today show up in 'Today'.
    
    today_str = datetime.utcnow().strftime('%Y-%m-%d')
    
    print("--- Testing Dashboard Summary Filters ---")
    
    # Check all-time
    all_time = get_json(f"{BASE_URL}/dashboard/summary")
    all_coll = all_time['financials']['current_collected']
    all_exp = all_time['financials']['current_expenses']
    print(f"All-time: Coll={all_coll}, Exp={all_exp}")

    # Check today
    today_summary = get_json(f"{BASE_URL}/dashboard/summary?start_date={today_str}&end_date={today_str}")
    today_coll = today_summary['financials']['current_collected']
    today_exp = today_summary['financials']['current_expenses']
    print(f"Today: Coll={today_coll}, Exp={today_exp}")

    # Check January (Should have the 2000.0 expense I added earlier)
    jan_summary = get_json(f"{BASE_URL}/dashboard/summary?start_date=2026-01-01&end_date=2026-01-31")
    jan_coll = jan_summary['financials']['current_collected']
    jan_exp = jan_summary['financials']['current_expenses']
    print(f"January: Coll={jan_coll}, Exp={jan_exp}")

if __name__ == "__main__":
    try:
        test_summary_filters()
    except Exception as e:
        print(f"Error: {e}")
