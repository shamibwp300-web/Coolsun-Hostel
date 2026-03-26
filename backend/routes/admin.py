from flask import Blueprint, jsonify, request
from backend.models import db, Tenant, Ledger, Expense, MeterReading, WaterBill, InternetBill, Floor, MoveOutRecord, Document, BillingProfile, MaintenanceRequest, AuditLog
from sqlalchemy import text

admin_bp = Blueprint('admin', __name__)

@admin_bp.route('/admin/reset', methods=['POST'])
def reset_data():
    """
    DANGER ZONE: Wipes all operational data (tenants, ledger, bills, etc.)
    Preserves: Rooms, Floors structure, User accounts, Fine types.
    Requires a confirmation token in the body.
    """
    data = request.json or {}
    if data.get('confirm') != 'RESET_ALL_DATA':
        return jsonify({"error": "Invalid confirmation token. Send { \"confirm\": \"RESET_ALL_DATA\" }"}), 400

    try:
        include_structure = data.get('includeStructure', False)

        # Order matters due to foreign key constraints.
        # Delete child tables first then parent tables.
        db.session.execute(text("DELETE FROM documents"))
        db.session.execute(text("DELETE FROM billing_profiles"))
        db.session.execute(text("DELETE FROM ledger"))
        db.session.execute(text("DELETE FROM move_out_records"))
        db.session.execute(text("DELETE FROM maintenance_requests"))
        db.session.execute(text("DELETE FROM meter_readings"))
        db.session.execute(text("DELETE FROM water_bills"))
        db.session.execute(text("DELETE FROM internet_bills"))
        db.session.execute(text("DELETE FROM expenses"))
        db.session.execute(text("DELETE FROM audit_logs"))
        db.session.execute(text("DELETE FROM tasks"))

        # Reset tenant sub-tenant links before deleting tenants
        db.session.execute(text("UPDATE tenants SET parent_tenant_id = NULL"))
        db.session.execute(text("DELETE FROM tenants"))

        if include_structure:
            db.session.execute(text("DELETE FROM rooms"))
            db.session.execute(text("DELETE FROM floors"))
            msg = "✅ ALL data (including Rooms & Floors) cleared successfully."
        else:
            # Reset bulk rental config on all floors, but keep floors/rooms
            db.session.execute(text("UPDATE floors SET is_bulk_rented=0, bulk_tenant_id=NULL, bulk_rent_amount=NULL, bulk_security_deposit=NULL"))
            db.session.execute(text("UPDATE rooms SET is_bulk_rented=0"))
            msg = "✅ Operational data cleared. Room/Floor structure preserved."

        db.session.commit()
        return jsonify({"message": msg}), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 500


@admin_bp.route('/admin/fix_room_floors', methods=['POST'])
def fix_room_floors():
    """
    Auto-correct floor assignments for all rooms based on room number prefix.
    101-199 → Floor 1,  201-299 → Floor 2,  G01 → Floor 0
    """
    from backend.models import Room
    rooms = Room.query.filter_by(deleted_at=None).all()
    fixed = []
    for room in rooms:
        num = str(room.number).strip()
        if not num:
            continue
        first = num[0].upper()
        if first == 'G':
            correct = 0
        elif first.isdigit():
            correct = int(first)
        else:
            continue
        if room.floor != correct:
            fixed.append(f"Room {room.number}: {room.floor} → {correct}")
            room.floor = correct
    db.session.commit()
    return jsonify({"fixed": fixed, "count": len(fixed)}), 200

@admin_bp.route('/migrate', methods=['GET', 'POST'])
def force_migrate_schema():
    """
    Safely apply missing schema columns without locking the entire boot sequence.
    Can be called manually after deployment to ensure Supabase is up-to-date.
    """
    from sqlalchemy import text
    queries = [
        "ALTER TABLE floors ADD COLUMN IF NOT EXISTS is_bulk_rented BOOLEAN DEFAULT FALSE",
        "ALTER TABLE floors ADD COLUMN IF NOT EXISTS bulk_tenant_id INTEGER",
        "ALTER TABLE floors ADD COLUMN IF NOT EXISTS bulk_rent_amount NUMERIC(10, 2)",
        "ALTER TABLE floors ADD COLUMN IF NOT EXISTS bulk_security_deposit NUMERIC(10, 2)",
        "ALTER TABLE floors ADD COLUMN IF NOT EXISTS max_bulk_capacity INTEGER DEFAULT 30",
        "ALTER TABLE rooms ADD COLUMN IF NOT EXISTS floor_id INTEGER",
        "ALTER TABLE rooms ADD COLUMN IF NOT EXISTS is_bulk_rented BOOLEAN DEFAULT FALSE",
        "ALTER TABLE rooms ADD COLUMN IF NOT EXISTS base_rent NUMERIC(10, 2)",
        "ALTER TABLE tenants ADD COLUMN IF NOT EXISTS parent_tenant_id INTEGER",
        "ALTER TABLE tenants ADD COLUMN IF NOT EXISTS internet_opt_in BOOLEAN DEFAULT FALSE",
        "ALTER TABLE tenants ADD COLUMN IF NOT EXISTS tenancy_type VARCHAR(50)",
        "ALTER TABLE tenants ADD COLUMN IF NOT EXISTS emergency_contact VARCHAR(50)",
        "ALTER TABLE tenants ADD COLUMN IF NOT EXISTS is_partial_payment BOOLEAN DEFAULT FALSE",
        "ALTER TABLE tenants ADD COLUMN IF NOT EXISTS compliance_alert BOOLEAN DEFAULT FALSE",
        "ALTER TABLE tenants ADD COLUMN IF NOT EXISTS bed_label VARCHAR(20)",
        "ALTER TABLE tenants ADD COLUMN IF NOT EXISTS father_name VARCHAR(100)",
        "ALTER TABLE tenants ADD COLUMN IF NOT EXISTS permanent_address VARCHAR(255)",
        "ALTER TABLE tenants ADD COLUMN IF NOT EXISTS police_station VARCHAR(100)",
        "ALTER TABLE tenants ADD COLUMN IF NOT EXISTS id_card_front_url VARCHAR(255)",
        "ALTER TABLE tenants ADD COLUMN IF NOT EXISTS id_card_back_url VARCHAR(255)",
        "ALTER TABLE tenants ADD COLUMN IF NOT EXISTS police_form_url VARCHAR(255)",
        "ALTER TABLE tenants ADD COLUMN IF NOT EXISTS police_form_submitted TIMESTAMP",
    ]
    results = []
    with db.engine.connect() as conn:
        for q in queries:
            try:
                conn.execute(text(q))
                conn.commit()
                results.append({"query": q.split('ADD COLUMN IF NOT EXISTS ')[-1], "status": "SUCCESS"})
            except Exception as e:
                try:
                    conn.rollback()
                except:
                    pass
                results.append({"query": q.split('ADD COLUMN IF NOT EXISTS ')[-1], "status": "SKIPPED/EXISTS"})
                
    return jsonify({"message": "Live Schema Sync Completed", "details": results}), 200

