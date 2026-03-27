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

    # 🛡️ Production Guard
    is_prod = "supabase" in (db.engine.url.database or "").lower() or "supabase" in str(db.engine.url)
    if is_prod and os.getenv('ALLOW_RESET_IN_PROD') != 'TRUE':
        return jsonify({"error": "DANGER: Reset is disabled on the LIVE site for security. Enable via ALLOW_RESET_IN_PROD=TRUE if absolutely necessary."}), 403

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
            # Reset bulk rental config on all floors AND rooms using model objects for consistency
            Floor.query.update({Floor.is_bulk_rented: False, Floor.bulk_tenant_id: None, Floor.bulk_rent_amount: None, Floor.bulk_security_deposit: None})
            Room.query.update({Room.is_bulk_rented: False})
            msg = "✅ Operational data cleared. Room/Floor structure preserved."

        db.session.commit()
        return jsonify({"message": msg}), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 500
    finally:
        db.session.remove()


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
