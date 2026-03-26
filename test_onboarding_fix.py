import os
from backend.app import create_app
from backend.models import db, Room

app = create_app()
app.config['TESTING'] = True

def run_test():
    with app.test_client() as client:
        with app.app_context():
            room = Room.query.first()
            if not room:
                print("No room available for testing.")
                return

            data = {
                'room_id': room.id,
                'name': 'Test Subtenant',
                'cnic': '12345-6789012-3',
                'phone': '+923000000000',
                'bed_label': 'Bed X',
                'base_rent': 10000,
                'rent_amount': 10000,
                'agreement_start_date': '2026-03-26',
                'actual_move_in_date': '2026-03-26',
                'tenancy_type': 'Shared',
                'parent_tenant_id': 'select',
                'due_day': 5
            }
            res = client.post('/api/onboarding', data=data)
            print("Status Code:", res.status_code)
            try:
                print("Response JSON:", res.get_json())
            except Exception:
                print("Response Text:", res.data)

if __name__ == "__main__":
    run_test()
