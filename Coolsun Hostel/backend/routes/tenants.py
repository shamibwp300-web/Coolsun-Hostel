from flask import Blueprint, jsonify, request
from backend.models import db, Tenant, Room, Ledger

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
        
        # Initial trackers for all types
        due_by_type = {'RENT': 0, 'PRIVATE_RENT': 0, 'DEPOSIT': 0, 'UTILITY': 0, 'FINE': 0, 'OPENING_BALANCE': 0}
        paid_by_type = {'RENT': 0, 'PRIVATE_RENT': 0, 'DEPOSIT': 0, 'UTILITY': 0, 'FINE': 0, 'OPENING_BALANCE': 0}

        for ledger in t.transactions:
            if ledger.deleted_at is None:
                amt = float(ledger.amount)
                ltype = ledger.type
                print(f"DEBUG: Tenant {t.name}, Ledger Type: {ltype}, Amount: {amt}, Status: {ledger.status}")
                if ltype not in due_by_type:
                    continue
                    
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
            "id_card_front_url": t.id_card_front_url,
            "id_card_back_url": t.id_card_back_url,
            "police_form_url": t.police_form_url,
            "agreement_url": getattr(t, 'agreement_url', None),
            "parent_tenant_id": t.parent_tenant_id,
            "payment_method": next((l.payment_method for l in t.transactions if l.status == 'PAID' and l.payment_method), 'Cash'),
            "is_archived": t.deleted_at is not None
        })
    return jsonify(result), 200

@tenants_bp.route('/tenants/<int:id>', methods=['PUT'])
def update_tenant(id):
    tenant = Tenant.query_active().filter_by(id=id).first_or_404()
    data = request.json
    
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
    
    if 'internet_opt_in' in data:
        tenant.internet_opt_in = bool(data.get('internet_opt_in'))
        
    if 'parent_tenant_id' in data:
        pt_id = data.get('parent_tenant_id')
        tenant.parent_tenant_id = None if pt_id == '' or pt_id is None else int(pt_id)
        
    if tenant.billing_profile:
        if 'rent_amount' in data:
            tenant.billing_profile.rent_amount = data.get('rent_amount')
        if 'security_deposit' in data:
            tenant.billing_profile.security_deposit = data.get('security_deposit')
        
    db.session.commit()
    return jsonify({"message": "Successfully updated tenant"}), 200

@tenants_bp.route('/tenants/<int:id>', methods=['DELETE'])
def delete_tenant(id):
    tenant = Tenant.query_active().filter_by(id=id).first_or_404()
    tenant.delete() # Uses SoftDeleteMixin
    db.session.commit()
    return jsonify({"message": "Successfully archived tenant"}), 200

@tenants_bp.route('/tenants/<int:id>/restore', methods=['PUT'])
def restore_tenant(id):
    tenant = Tenant.query.filter_by(id=id).first_or_404()
    tenant.deleted_at = None
    db.session.commit()
    return jsonify({"message": "Successfully restored tenant"}), 200

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
