from backend.app import create_app
from backend.models import db, Room, Tenant, BillingProfile, Expense, Ledger
from backend.utils.calculator import calculate_initial_payment
from datetime import datetime, date, timedelta

app = create_app()

def seed_data():
    with app.app_context():
        # Clear existing data first (optional, but good for consistent testing)
        # db.drop_all() 
        db.create_all()
        
        # Ensure rooms exist (if not already seeded)
        if not Room.query.first():
            rooms = [
                Room(floor=1, number='101', type='Small', capacity=2),
                Room(floor=1, number='102', type='Medium', capacity=3),
                Room(floor=2, number='201', type='Large', capacity=5),
                Room(floor=2, number='202', type='Small', capacity=2),
                Room(floor=3, number='301', type='Medium', capacity=3)
            ]
            db.session.add_all(rooms)
            db.session.commit()
            print("Rooms seeded.")
        else:
            print("Rooms already exist.")

        rooms = Room.query.all()
        
        # Test 1: Financial Logic (15-Day Rule)
        print("\n--- Testing Coolsun Calculator ---")
        
        # Case A: Move-in on 5th (Before 15th) -> Pay remaining days
        fin_a = calculate_initial_payment(15000, '2026-01-05')
        print(f"Move-in Jan 5 (Rent 15k): {fin_a['description']} -> Total: {fin_a['total_initial_rent']}")
        
        # Case B: Move-in on 20th (After 15th) -> Pay remaining + Next Month
        fin_b = calculate_initial_payment(15000, '2026-01-20')
        print(f"Move-in Jan 20 (Rent 15k): {fin_b['description']} -> Total: {fin_b['total_initial_rent']}")

        # Test 2: Create Tenants with Compliance Status
        print("\n--- Testing Compliance Logic ---")
        
        # Tenant 1: Just moved in (Normal)
        t1 = Tenant(
            name='Fresh Entry', cnic='111', phone='0300', room_id=rooms[0].id,
            agreement_start_date=date.today(),
            actual_move_in_date=date.today(),
            police_status='Pending'
        )
        
        # Tenant 2: Moved in 20 days ago (Warning)
        t2 = Tenant(
            name='Warning Guy', cnic='222', phone='0301', room_id=rooms[0].id,
            agreement_start_date=date.today() - timedelta(days=20),
            actual_move_in_date=date.today() - timedelta(days=20),
            police_status='Pending'
        )
        
        # Tenant 3: Moved in 40 days ago (Critical)
        t3 = Tenant(
            name='Critical Guy', cnic='333', phone='0302', room_id=rooms[2].id,
            agreement_start_date=date.today() - timedelta(days=40),
            actual_move_in_date=date.today() - timedelta(days=40),
            police_status='Pending'
        )
        
        # Tenant 4: Verified (Verified)
        t4 = Tenant(
            name='Good Citizen', cnic='444', phone='0303', room_id=rooms[2].id,
            agreement_start_date=date.today() - timedelta(days=50),
            actual_move_in_date=date.today() - timedelta(days=50),
            police_status='Verified'
        )

        db.session.add_all([t1, t2, t3, t4])
        db.session.commit()

        # Check Compliance Status
        print(f"Tenant 1 (Today): {t1.get_compliance_status()}")
        print(f"Tenant 2 (20 days ago): {t2.get_compliance_status()}")
        print(f"Tenant 3 (40 days ago): {t3.get_compliance_status()}")
        print(f"Tenant 4 (Verified): {t4.get_compliance_status()}")
        
        # Test 3: Ledger Entries
        print("\n--- Testing Ledger ---")
        l1 = Ledger(tenant_id=t1.id, amount=5000, type='DEPOSIT', status='PAID', description='Sec Deposit')
        l2 = Ledger(tenant_id=t1.id, amount=15000, type='RENT', status='PENDING', description='Jan Rent')
        db.session.add_all([l1, l2])
        db.session.commit()
        print(f"Ledger entries created for {t1.name}")

if __name__ == '__main__':
    seed_data()
