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
        if include_structure:
            # Full wipe including rooms and floors (hard delete)
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

            db.session.execute(text("UPDATE tenants SET parent_tenant_id = NULL"))
            db.session.execute(text("DELETE FROM tenants"))

            db.session.execute(text("DELETE FROM rooms"))
            db.session.execute(text("DELETE FROM floors"))
            msg = "✅ ALL data (including Rooms & Floors) cleared successfully."
        else:
            # Operational wipe only (soft delete for most, hard delete for some, reset bulk status)
            # Soft delete operational data
            Tenant.query.update({Tenant.deleted_at: datetime.utcnow()})
            Ledger.query.update({Ledger.deleted_at: datetime.utcnow()})
            Expense.query.update({Expense.deleted_at: datetime.utcnow()})
            MeterReading.query.update({MeterReading.deleted_at: datetime.utcnow()})
            WaterBill.query.update({WaterBill.deleted_at: datetime.utcnow()})
            InternetBill.query.update({InternetBill.deleted_at: datetime.utcnow()})
            MoveOutRecord.query.update({MoveOutRecord.deleted_at: datetime.utcnow()})
            Document.query.update({Document.deleted_at: datetime.utcnow()})
            BillingProfile.query.update({BillingProfile.deleted_at: datetime.utcnow()})
            MaintenanceRequest.query.update({MaintenanceRequest.deleted_at: datetime.utcnow()})
            AuditLog.query.update({AuditLog.deleted_at: datetime.utcnow()})
            Task.query.update({Task.deleted_at: datetime.utcnow()})

            # 🛡️ Global Reset of Bulk Status
            Floor.query.update({
                Floor.is_bulk_rented: False,
                Floor.bulk_tenant_id: None,
                Floor.bulk_rent_amount: 0,
                Floor.bulk_security_deposit: 0
            })
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
    """Maps rooms to floors based on room number (e.g., 101 -> Floor 1) and sets floor_id."""
    from backend.models import Room, Floor
    rooms = Room.query.all()
    floors = {f.floor_number: f.id for f in Floor.query.all()}
    fixed = []
    
    for room in rooms:
        try:
            num_str = "".join(filter(str.isdigit, room.number))
            if num_str:
                correct = int(num_str[0]) if len(num_str) >= 3 else 0
                
                # Fix integer floor number
                if room.floor != correct:
                    fixed.append(f"Room {room.number}: Floor {room.floor} → {correct}")
                    room.floor = correct
                
                # Fix floor_id relationship
                correct_id = floors.get(correct)
                if correct_id and room.floor_id != correct_id:
                    room.floor_id = correct_id
                    fixed.append(f"Room {room.number}: floor_id → {correct_id}")
        except:
            continue
            
    db.session.commit()
    return jsonify({"message": "Fixed room floor mappings", "details": fixed}), 200

