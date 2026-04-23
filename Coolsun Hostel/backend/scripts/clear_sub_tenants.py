import os
import sys

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..')))

from backend.app import _DB_PATH, create_app
from backend.models import db, Tenant, Ledger
from datetime import datetime

def clear_sub_tenant_ledgers():
    print(f"Using DB: {_DB_PATH}")
    app = create_app()
    with app.app_context():
        sub_tenants = Tenant.query.filter(Tenant.parent_tenant_id.isnot(None), Tenant.deleted_at.is_(None)).all()
        print(f"Found {len(sub_tenants)} sub-tenants.")
        
        entries_voided = 0
        for st in sub_tenants:
            ledgers = Ledger.query.filter_by(tenant_id=st.id, deleted_at=None).all()
            for l in ledgers:
                # We can either delete them or set to 0. 
                # Let's delete them.
                l.deleted_at = datetime.utcnow()
                entries_voided += 1
                
        db.session.commit()
        print(f"Successfully voided {entries_voided} ledger entries for sub-tenants.")

if __name__ == '__main__':
    clear_sub_tenant_ledgers()
