import requests

BASE_URL = "http://localhost:5000/api"

# Get tenants
print("Fetching tenants...")
r = requests.get(f"{BASE_URL}/tenants")
if r.status_code != 200:
    print("Failed to fetch tenants:", r.text)
    exit()

tenants = r.json()
if not tenants:
    print("No tenants found.")
    exit()

# Print balances
print("\nBefore Payment:")
for t in tenants:
    print(f"[{t['id']}] {t['name']} - Pending: {t['balance']}, Total Paid: {t['total_paid']}")

# Pick the first tenant with a balance
tenant_with_balance = next((t for t in tenants if t['balance'] > 0), None)
if not tenant_with_balance:
    print("No tenants with pending balance found.")
    print("Let's add a test tenant...")
    exit()

tid = tenant_with_balance['id']
pay_amount = 1

print(f"\nPaying Rs. {pay_amount} for {tenant_with_balance['name']} (ID {tid})...")
pay_data = {
    "tenant_id": tid,
    "amount": pay_amount,
    "payment_method": "Cash"
}

r_pay = requests.post(f"{BASE_URL}/finance/pay", json=pay_data)
print("Payment Response:", r_pay.status_code, r_pay.json() if r_pay.status_code == 200 else r_pay.text)

# Check balances again
print("\nAfter Payment:")
r2 = requests.get(f"{BASE_URL}/tenants")
tenants2 = r2.json()
for t in tenants2:
    if t['id'] == tid:
        print(f"[{t['id']}] {t['name']} - Pending: {t['balance']}, Total Paid: {t['total_paid']}")

