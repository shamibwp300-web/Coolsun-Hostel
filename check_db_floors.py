from backend.app import create_app
from backend.models import db, Floor

app = create_app()
with app.app_context():
    floors = Floor.query.all()
    for f in floors:
        print(f"ID: {f.id}, Bulk: {f.is_bulk_rented}, Tenant: {f.bulk_tenant_id}, Rent: {f.bulk_rent_amount}")
