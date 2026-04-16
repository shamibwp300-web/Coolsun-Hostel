from flask import Blueprint, jsonify, request
from backend.models import db, Tenant, Room, Ledger, Document

tenants_bp = Blueprint('tenants', __name__)

@tenants_bp.route('/tenants', methods=['GET'])
def get_tenants():
    show_archived = request.args.get('show_archived') == 'true'
    if show_archived:
        tenants = Tenant.query.all()
    else:
        tenants = Tenant.query_active().all()
    result = []
    for t in tenants:
        room = Room.query.get(t.room_id)
        
        # Calculate pending balance breakdown using (Total Billed/Due - Total Paid) logic
        # Initialize trackers
        rent_billed = 0
        rent_paid = 0
        security_due = 0
        security_paid = 0
        utility_due = 0
        utility_paid = 0
        total_paid = 0

        # Loop through ledger entries
        for ledger in t.transactions:
            if ledger.deleted_at is None:
                amt = float(ledger.amount)
                if ledger.type in ['RENT', 'PRIVATE_RENT']:
                    rent_billed += amt if ledger.status == 'PENDING' else 0 
                    # Best way: A 'PENDING' ledger represents what was billed but is UNPAID.
                    # Actually, if pay dues creates a 'PAID' ledger and reduces the 'PENDING' one, then sum of PENDING is the exact un-paid amount.
                    # Let's ensure we just cleanly sum PENDING, and total PAID.
                if ledger.status == 'PAID':
                    total_paid += amt

        # Current DB approach: Pending ledgers literally hold the un-paid balance.
        # But wait! The prompt explicitly said:
        # "Fix Pending Balance math: (Current Rent + Security Due) - (Rent Paid + Security Paid)."
        
        # Breakdown calculation logic including all types
        due_by_type = {'RENT': 0, 'PRIVATE_RENT': 0, 'DEPOSIT': 0, 'UTILITY': 0, 'FINE': 0, 'OPENING_BALANCE': 0}
        paid_by_type = {'RENT': 0, 'PRIVATE_RENT': 0, 'DEPOSIT': 0, 'UTILITY': 0, 'FINE': 0, 'OPENING_BALANCE': 0}

        for ledger in t.transactions:
            if ledger.deleted_at is None:
                amt = float(ledger.amount)
                ltype = ledger.type
                if ltype in due_by_type:
                    if ledger.status == 'PAID':
                        paid_by_type[ltype] += amt
                        due_by_type[ltype] += amt
                    else:
                        due_by_type[ltype] += amt

        # Breakdown for frontend
        rent_balance = max(0, (due_by_type['RENT'] + due_by_type['PRIVATE_RENT']) - (paid_by_type['RENT'] + paid_by_type['PRIVATE_RENT']))
        security_balance = max(0, due_by_type['DEPOSIT'] - paid_by_type['DEPOSIT'])
        utility_balance = max(0, due_by_type['UTILITY'] - paid_by_type['UTILITY'])
        fine_balance = max(0, due_by_type['FINE'] - paid_by_type['FINE'])
        opening_balance_pending = max(0, due_by_type['OPENING_BALANCE'] - paid_by_type['OPENING_BALANCE'])
        
        total_paid = sum(paid_by_type.values())
        total_pending_balance = rent_balance + security_balance + utility_balance + fine_balance + opening_balance_pending
        status = 'Active'
        if total_pending_balance > 0:
            status = 'Late'

        result.append({
            "id": t.id,
            "name": t.name,
            "room": t.room.number if t.room else "Unknown",
            "room_id": t.room_id,
            "bed": t.bed_label or "Not Assigned",
            "bed_label": t.bed_label or "",
            "status": status,
            "compliance": t.get_compliance_status(),
            "balance": total_pending_balance,
            "rent_balance": rent_balance,
            "security_balance": security_balance,
            "utility_balance": utility_balance,
            "fine_balance": fine_balance,
            "opening_balance": opening_balance_pending,
            "total_paid": total_paid,
            "phone": t.phone,
            "cnic": t.cnic,
            "father_name": t.father_name,
            "permanent_address": t.permanent_address,
            "emergency_contact": t.emergency_contact,
            "police_station": t.police_station,
            "rent_amount": float(t.billing_profile.rent_amount) if t.billing_profile and t.billing_profile.rent_amount else 0,
            "security_deposit": float(t.billing_profile.security_deposit) if t.billing_profile and t.billing_profile.security_deposit else 0,
            "internet_opt_in": t.internet_opt_in,
            "id_card_front_url": t.id_card_front_url or getattr(Document.query.filter_by(tenant_id=t.id, type='ID_Front', deleted_at=None).order_by(Document.id.desc()).first(), 'url', None),
            "id_card_back_url": t.id_card_back_url or getattr(Document.query.filter_by(tenant_id=t.id, type='ID_Back', deleted_at=None).order_by(Document.id.desc()).first(), 'url', None),
            "police_form_url": t.police_form_url or getattr(Document.query.filter_by(tenant_id=t.id, type='Police_Form', deleted_at=None).order_by(Document.id.desc()).first(), 'url', None),
            "agreement_url": t.agreement_url or getattr(Document.query.filter_by(tenant_id=t.id, type='Agreement', deleted_at=None).order_by(Document.id.desc()).first(), 'url', None),
            "parent_tenant_id": t.parent_tenant_id,
            "tenancy_type": t.tenancy_type or 'Shared',
            "payment_method": next((l.payment_method for l in t.transactions if l.status == 'PAID' and l.payment_method), 'Cash'),
            "is_archived": t.deleted_at is not None,
            "rent_start_date": t.agreement_start_date.strftime('%Y-%m-%d') if t.agreement_start_date else ""
        })
    return jsonify(result), 200

@tenants_bp.route('/tenants/<int:id>', methods=['PUT'])
def update_tenant(id):
    # Retrieve tenant either active or archived
    tenant = Tenant.query.get_or_404(id)
    
    # Standardize data access for both JSON and Form (Multipart)
    data = request.form if request.form else request.get_json()
    if not data:
        data = {}
        
    tenant.name = data.get('name', tenant.name)
    tenant.phone = data.get('phone', tenant.phone)
    tenant.cnic = data.get('cnic', tenant.cnic)
    tenant.father_name = data.get('father_name', tenant.father_name)
    tenant.permanent_address = data.get('permanent_address', tenant.permanent_address)
    tenant.emergency_contact = data.get('emergency_contact', tenant.emergency_contact)
    tenant.police_station = data.get('police_station', tenant.police_station)
    
    # Accept either 'bed_label' (new) or 'bed' (legacy frontend key)
    bed_val = data.get('bed_label') or data.get('bed')
    if bed_val is not None:
        tenant.bed_label = bed_val
    
    if 'rent_start_date' in data and data.get('rent_start_date'):
        try:
            from datetime import datetime
            tenant.agreement_start_date = datetime.strptime(data.get('rent_start_date'), '%Y-%m-%d').date()
        except:
            pass
    
    if 'internet_opt_in' in data:
        val = data.get('internet_opt_in')
        tenant.internet_opt_in = str(val).lower() == 'true'
        
    # 🛡️ Handle Multiple Document Uploads (ID Front, ID Back, Police Form, Agreement)
    import os
    from datetime import datetime
    from flask import current_app
    doc_dir = current_app.config['UPLOAD_FOLDER']
    os.makedirs(doc_dir, exist_ok=True)
    
    files = request.files
    doc_fields = {
        'id_front': 'id_card_front_url',
        'id_back': 'id_card_back_url',
        'police_form': 'police_form_url',
        'agreement': 'agreement_url'
    }
    
    for field, attr in doc_fields.items():
        if field in files:
            file = files[field]
            if file and file.filename != '':
                ts = int(datetime.now().timestamp())
                ext = os.path.splitext(file.filename)[1]
                fname = f"tenant_{tenant.id}_{field}_{ts}{ext}"
                fpath = os.path.join(doc_dir, fname)
                file.save(fpath)
                
                # Standardize to /api/docs/ for frontend access (matches onboarding.py)
                db_url = f"/api/docs/{fname}"
                setattr(tenant, attr, db_url)
                
                # Also maintain Document table for backward compatibility
                doc_type_map = {
                    'id_front': 'ID_Front',
                    'id_back': 'ID_Back',
                    'police_form': 'Police_Form',
                    'agreement': 'Agreement'
                }
                new_doc = Document(tenant_id=tenant.id, type=doc_type_map[field], url=db_url)
                db.session.add(new_doc)
                
                if field == 'police_form':
                    tenant.police_form_submitted = datetime.utcnow()

    if 'tenancy_type' in data:
        tenant.tenancy_type = data.get('tenancy_type')
        
    if 'parent_tenant_id' in data:
        pt_id = data.get('parent_tenant_id')
        tenant.parent_tenant_id = None if pt_id in ['', 'null', 'select', None] else int(pt_id)
        
    if tenant.billing_profile:
        if 'rent_amount' in data:
            tenant.billing_profile.rent_amount = data.get('rent_amount')
        if 'security_deposit' in data:
            tenant.billing_profile.security_deposit = data.get('security_deposit')
        
    db.session.commit()
    return jsonify({
        "message": "Successfully updated tenant",
        "tenant": {
            "id": tenant.id,
            "name": tenant.name,
            "agreement_url": tenant.agreement_url
        }
    }), 200

@tenants_bp.route('/tenants/<int:id>', methods=['DELETE'])
def delete_tenant(id):
    try:
        # Retrieve tenant regardless of active status to see if they exist
        tenant = Tenant.query.get(id)
        if not tenant:
            return jsonify({"error": "Tenant not found in database"}), 404
            
        if tenant.deleted_at:
            return jsonify({"error": f"Tenant {tenant.name} is already archived"}), 400
            
        tenant.delete() # Uses SoftDeleteMixin
        db.session.commit()
        return jsonify({"message": f"Successfully archived {tenant.name}"}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": f"Internal database error: {str(e)}"}), 500

@tenants_bp.route('/tenants/<int:id>/restore', methods=['PUT'])
def restore_tenant(id):
    tenant = Tenant.query.filter_by(id=id).first_or_404()
    tenant.deleted_at = None
    db.session.commit()
    return jsonify({"message": "Successfully restored tenant"}), 200

@tenants_bp.route('/tenants/<int:id>/permanent', methods=['DELETE'])
def permanently_delete_tenant(id):
    """Permanently delete an already-archived tenant and all their linked data."""
    try:
        tenant = Tenant.query.get(id)
        if not tenant:
            return jsonify({"error": "Tenant not found"}), 404
        if not tenant.deleted_at:
            return jsonify({"error": "Tenant must be archived first before permanent deletion"}), 400
        
        tenant_name = tenant.name
        tenant_id = tenant.id

        # Delete ALL linked records first to avoid FK constraint errors
        from backend.models import Ledger, Document, BillingProfile, MoveOutRecord
        Ledger.query.filter_by(tenant_id=tenant_id).delete(synchronize_session=False)
        Document.query.filter_by(tenant_id=tenant_id).delete(synchronize_session=False)
        BillingProfile.query.filter_by(tenant_id=tenant_id).delete(synchronize_session=False)
        MoveOutRecord.query.filter_by(tenant_id=tenant_id).delete(synchronize_session=False)

        db.session.delete(tenant)
        db.session.commit()
        return jsonify({"message": f"Tenant '{tenant_name}' permanently deleted"}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": f"Permanent delete failed: {str(e)}"}), 500

import csv
from io import StringIO
from datetime import datetime

@tenants_bp.route('/tenants/import', methods=['POST'])
def import_tenants():
    if 'file' not in request.files:
        return jsonify({"error": "No CSV file uploaded"}), 400
        
    file = request.files['file']
    if not file.filename.endswith('.csv'):
        return jsonify({"error": "Please upload a valid .csv file"}), 400
        
    try:
        # Decode the file stream and read as CSV
        stream = StringIO(file.stream.read().decode("utf-8-sig"), newline=None)
        csv_input = csv.DictReader(stream)
        
        imported = 0
        for row in csv_input:
            # Flexible header matching
            keys = {k.strip().lower(): k for k in row.keys() if k}
            
            name = row.get(keys.get('name')) if keys.get('name') else None
            room_num = row.get(keys.get('room')) if keys.get('room') else None
            phone = row.get(keys.get('phone')) if keys.get('phone') else ''
            bed = row.get(keys.get('bed')) if keys.get('bed') else ''
            
            if not name or not room_num:
                continue
                
            # Find the room ID based on the room number string
            room = Room.query.filter_by(number=str(room_num).strip()).first()
            if not room:
                room = Room(number=str(room_num).strip(), floor=1, capacity=3, type='Standard', base_rent=10000)
                db.session.add(room)
                db.session.commit() # Commit to get ID for this tenant
                
            tenant = Tenant(
                name=name.strip() if name else 'Unknown',
                room_id=room.id,
                phone=phone.strip() if phone else '',
                bed_label=bed.strip() if bed else '',
                agreement_start_date=datetime.utcnow().date(),
                status='Active'
            )
            db.session.add(tenant)
            imported += 1
            
        db.session.commit()
        return jsonify({"message": f"Successfully imported {imported} new tenants!"}), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": f"Failed to parse CSV: {str(e)}"}), 500
