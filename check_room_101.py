from backend.app import create_app
from backend.models import db, Room, Tenant, Ledger

app = create_app()

with app.app_context():
    room = Room.query.filter_by(number='101').first()
    if not room:
        print("Room not found")
        import sys
        sys.exit(0)
    
    print(f"Room: {room.number}")
    print(f"Floor has bulk_rented?: {room.floor_ref.is_bulk_rented if room.floor_ref else 'No Floor'}")
    
    tenants = Tenant.query.filter_by(room_id=room.id, deleted_at=None).all()
    print(f"Tenants in room: {len(tenants)}")
    
    for t in tenants:
        print(f"Tenant: {t.name} (id={t.id})")
        existing_rent = Ledger.query.filter(Ledger.tenant_id == t.id, Ledger.type.in_(['RENT', 'PRIVATE_RENT']), Ledger.deleted_at == None).all()
        for e in existing_rent:
            print(f"  Existing rent: {e.timestamp.strftime('%Y-%m')} amount={e.amount}")
            
        deposits = Ledger.query.filter_by(tenant_id=t.id, type='DEPOSIT', deleted_at=None).all()
        print(f"  Deposits found: {len(deposits)}")
