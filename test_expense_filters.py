import urllib.request
import json
from datetime import datetime, date

BASE_URL = "http://127.0.0.1:5000/api"

def post_json(url, data):
    req = urllib.request.Request(url, data=json.dumps(data).encode('utf-8'), headers={'Content-Type': 'application/json'})
    with urllib.request.urlopen(req) as response:
        return json.loads(response.read().decode())

def get_json(url):
    with urllib.request.urlopen(url) as response:
        return json.loads(response.read().decode())

def test_filters():
    print("--- Creating Test Data ---")
    
    # 1. Create a Business Expense for today
    post_json(f"{BASE_URL}/finance/expenses", {
        "amount": 500,
        "description": "Plumbing Repair",
        "category": "Repairs",
        "type": "Business"
    })
    
    # 2. Create a Personal Expense for Jan 15th
    post_json(f"{BASE_URL}/finance/expenses", {
        "amount": 2000,
        "description": "Owner Home Reno",
        "category": "Owner Personal",
        "type": "Personal",
        "date": "2026-01-15"
    })
    
    print("--- Testing Expense Filters ---")
    
    # 1. Fetch all expenses
    all_expenses = get_json(f"{BASE_URL}/finance/expenses")
    print(f"Total expenses: {len(all_expenses)}")
    
    # 2. Filter by type 'Business'
    business = get_json(f"{BASE_URL}/finance/expenses?type=Business")
    print(f"Business expenses: {len(business)}")
    
    # 3. Filter by type 'Personal'
    personal = get_json(f"{BASE_URL}/finance/expenses?type=Personal")
    print(f"Personal expenses: {len(personal)}")
    
    # 4. Filter by date range (January)
    jan_expenses = get_json(f"{BASE_URL}/finance/expenses?start_date=2026-01-01&end_date=2026-01-31")
    print(f"Expenses in January: {len(jan_expenses)}")
    if jan_expenses:
        print(f"Found: {jan_expenses[0]['description']} on {jan_expenses[0]['display_date']}")

    # 5. Filter by search
    searched = get_json(f"{BASE_URL}/finance/expenses?search=Plumbing")
    print(f"Search for 'Plumbing': {len(searched)}")

if __name__ == "__main__":
    try:
        test_filters()
    except Exception as e:
        print(f"Error: {e}")
        import traceback
        traceback.print_exc()
