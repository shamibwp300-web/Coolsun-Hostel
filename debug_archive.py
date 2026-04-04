import os
from backend.app import create_app
from backend.models import db, Tenant, Ledger

def run_debug():
    app = create_app()
    with app.app_context():
        # Find tenant Ahtasham
        tenant = Tenant.query.filter(Tenant.name.contains('Ahtasham')).first()
        if not tenant:
            print("ERROR: Tenant 'Ahtasham' not found.")
            return

        print(f"DEBUG: Found Tenant: {tenant.name} (ID: {tenant.id})")
        print(f"DEBUG: Status: {'Archived' if tenant.deleted_at else 'Active'}")
        
        # Check for related data that might cause issues
        ledgers = Ledger.query.filter_by(tenant_id=tenant.id).all()
        print(f"DEBUG: Ledger count: {len(ledgers)}")

        # Try to simulate archive
        try:
            print("DEBUG: Attempting soft-delete...")
            tenant.deleted_at = None # Ensure we can toggle it
            db.session.commit()
            
            tenant.delete() # Sets deleted_at
            db.session.commit()
            print("SUCCESS: Tenant archived successfully in simulation!")
        except Exception as e:
            import traceback
            print(f"FAILED: Simulation failed with error: {str(e)}")
            print(traceback.format_exc())
            db.session.rollback()

if __name__ == "__main__":
    run_debug()
