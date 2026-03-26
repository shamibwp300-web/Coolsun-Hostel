import os
import sys

inner_path = os.path.abspath(r"d:\Coolsun Hostel\Coolsun Hostel")
os.chdir(inner_path)
sys.path.insert(0, inner_path)

from backend.app import create_app
from backend.models import db, Room, Floor

app = create_app()
app.config['TESTING'] = True

def run_test():
    with app.test_client() as client:
        with app.app_context():
            payload = {
                "number": "111",
                "floor": 1,
                "type": "Large",
                "capacity": 4,
                "base_rent": 10000,
                "is_bulk_rented": True
            }
            print("Sending POST /api/rooms with:", payload)
            res = client.post('/api/rooms', json=payload)
            print("Status Code:", res.status_code)
            try:
                print("Response JSON:", res.get_json())
            except Exception:
                print("Response Text:", res.data)

if __name__ == "__main__":
    run_test()
