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

@admin_bp.route('/admin/reset-ledger', methods=['POST'])
def reset_ledger_only():
    """
    TARGETED RESET: Wipes out ONLY the financial Ledger tracking.
    This effectively zeroes out "Total Collected", "Pending Current", and "Arrears",
    but it PRESERVES all Tenants, Rooms, and Expenses safely.
    """
    data = request.json or {}
    if data.get('confirm') != 'RESET_LEDGER_ONLY':
        return jsonify({"error": "Invalid confirmation token. Send { \"confirm\": \"RESET_LEDGER_ONLY\" }"}), 400

    try:
        # Delete only from ledger table.
        db.session.execute(text("DELETE FROM ledger"))
        db.session.commit()
        return jsonify({"message": "✅ Financial Ledger effectively cleared successfully. Total Collected & Pending are now 0. Expenses & Tenants are preserved."}), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 500

@admin_bp.route('/admin/easy-zero-ledger', methods=['GET'])
def easy_reset_ledger():
    """
    Temporary accessible link for the admin to zero out the ledger
    by just typing the URL in the browser.
    """
    try:
        db.session.execute(text("DELETE FROM ledger"))
        db.session.commit()
        return "<h1>✅ SUCCESS: FINANCIAL LEDGER ZEROD OUT.</h1><p>Total Collected and Pending have been cleared. All your expenses, rooms, and tenants are perfectly safe.</p><a href='/'>Go Back to Dashboard</a>", 200
    except Exception as e:
        db.session.rollback()
        return f"ERROR: {str(e)}", 500


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

@admin_bp.route('/migrate-db-force', methods=['GET', 'POST'])
def force_migrate_db():
    from sqlalchemy import text
    import traceback
    
    # Do not use IF NOT EXISTS since older SQLite doesn't support it
    queries = [
        "ALTER TABLE floors ADD COLUMN is_bulk_rented BOOLEAN DEFAULT FALSE",
        "ALTER TABLE floors ADD COLUMN bulk_tenant_id INTEGER",
        "ALTER TABLE floors ADD COLUMN bulk_rent_amount NUMERIC(10, 2)",
        "ALTER TABLE floors ADD COLUMN bulk_security_deposit NUMERIC(10, 2)",
        "ALTER TABLE floors ADD COLUMN max_bulk_capacity INTEGER DEFAULT 30",
        "ALTER TABLE rooms ADD COLUMN floor_id INTEGER",
        "ALTER TABLE rooms ADD COLUMN is_bulk_rented BOOLEAN DEFAULT FALSE",
        "ALTER TABLE rooms ADD COLUMN base_rent NUMERIC(10, 2)",
        "ALTER TABLE tenants ADD COLUMN parent_tenant_id INTEGER",
        "ALTER TABLE tenants ADD COLUMN internet_opt_in BOOLEAN DEFAULT FALSE",
        "ALTER TABLE tenants ADD COLUMN tenancy_type VARCHAR(50)",
        "ALTER TABLE tenants ADD COLUMN emergency_contact VARCHAR(50)",
        "ALTER TABLE tenants ADD COLUMN is_partial_payment BOOLEAN DEFAULT FALSE",
        "ALTER TABLE tenants ADD COLUMN compliance_alert BOOLEAN DEFAULT FALSE",
        "ALTER TABLE tenants ADD COLUMN bed_label VARCHAR(20)",
        "ALTER TABLE tenants ADD COLUMN father_name VARCHAR(100)",
        "ALTER TABLE tenants ADD COLUMN permanent_address VARCHAR(255)",
        "ALTER TABLE tenants ADD COLUMN police_station VARCHAR(100)",
        "ALTER TABLE tenants ADD COLUMN id_card_front_url VARCHAR(255)",
        "ALTER TABLE tenants ADD COLUMN id_card_back_url VARCHAR(255)",
        "ALTER TABLE tenants ADD COLUMN police_form_url VARCHAR(255)",
        "ALTER TABLE tenants ADD COLUMN police_form_submitted TIMESTAMP",
    ]
    results = []
    with db.engine.connect() as conn:
        for q in queries:
            try:
                conn.execute(text(q))
                conn.commit()
                results.append({"query": q.split('ADD COLUMN ')[-1], "status": "SUCCESS"})
            except Exception as e:
                err_msg = str(e)
                try: conn.rollback()
                except: pass
                
                # If it's just duplicate column, it's fine!
                if "duplicate column name" in err_msg.lower():
                    results.append({"query": q.split('ADD COLUMN ')[-1], "status": "ALREADY_EXISTS"})
                else:
                    results.append({"query": q.split('ADD COLUMN ')[-1], "status": "ERROR", "error": err_msg})
                
    return jsonify({"message": "Live Schema Sync Finished", "details": results}), 200

@admin_bp.route('/admin/fix-ledger-schema', methods=['GET', 'POST'])
def fix_ledger_schema():
    """
    Safely drops the NOT NULL constraint on ledger.tenant_id by rebuilding the table.
    """
    from sqlalchemy import text
    try:
        with db.engine.connect() as conn:
            # Check if using SQLite
            if 'sqlite' in str(db.engine.url):
                conn.execute(text("PRAGMA foreign_keys=off;"))
                
                new_table_sql = """
                CREATE TABLE IF NOT EXISTS ledger_new (
                    id INTEGER PRIMARY KEY,
                    tenant_id INTEGER REFERENCES tenants(id),
                    amount NUMERIC(10, 2),
                    type VARCHAR(20),
                    status VARCHAR(20),
                    payment_method VARCHAR(50),
                    description VARCHAR(255),
                    timestamp DATETIME,
                    deleted_at DATETIME
                );
                """
                conn.execute(text(new_table_sql))
                conn.execute(text("INSERT INTO ledger_new SELECT id, tenant_id, amount, type, status, payment_method, description, timestamp, deleted_at FROM ledger;"))
                conn.execute(text("DROP TABLE ledger;"))
                conn.execute(text("ALTER TABLE ledger_new RENAME TO ledger;"))
                conn.execute(text("PRAGMA foreign_keys=on;"))
                conn.commit()
                return jsonify({"message": "✅ Success! Ledger table rebuilt. NOT NULL constraint removed."}), 200
            else:
                # PostgreSQL path
                conn.execute(text("ALTER TABLE ledger ALTER COLUMN tenant_id DROP NOT NULL;"))
                conn.commit()
                return jsonify({"message": "✅ Success! PostgreSQL ledger constraint updated."}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

