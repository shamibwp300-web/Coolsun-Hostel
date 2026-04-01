from backend.app import create_app
from backend.models import db, Room, Tenant, Ledger

app = create_app()

with app.app_context():
    room = Room.query.first()
    if not room:
        print("No room found for testing")
        exit()
    
    with app.test_client() as client:
        payload = {
            "name": "Test Onboarding Fix Salman",
            "cnic": "12345-6789012-3",
            "phone": "03001234567",
            "room_id": room.id,
            "bed_label": "Test Bed",
            "agreement_start_date": "2026-03-31",
            "actual_move_in_date": "2026-03-31",
            "tenancy_type": "Shared",
            "rent_amount": str(room.base_rent), 
            "security_deposit": "5000",
            # We pay exact rent, plus security, PLUS 5000 extra advance
            "amount_paid_now": str(room.base_rent + 5000 + 5000), 
            "payment_method": "Cash",
            "internet_opt_in": "true",
            "is_partial_payment": "false"
        }
        
        print("Sending POST /api/onboarding with extra 5000 payment over due limits")
        resp = client.post("/api/onboarding", data=payload)
        
        if resp.status_code == 201:
            data = resp.get_json()
            tenant_id = data['id']
            print("\nSuccess! Tenant Data Response:")
            print(data)
            
            print("\nVerifying Ledger Entries for Tenant ID:", tenant_id)
            tenant = Tenant.query.get(tenant_id)
            ledgers = Ledger.query.filter_by(tenant_id=tenant_id).all()
            for l in ledgers:
                print(f"  - [{l.type}] {float(l.amount)} {l.status} : {l.description}")
            
            # Clean up test user
            for l in ledgers:
                db.session.delete(l)
            db.session.delete(tenant)
            db.session.commit()
            print("Cleanup successful.")
        else:
            print("Failed Response:", resp.status_code)
            print(resp.get_data(as_text=True))
