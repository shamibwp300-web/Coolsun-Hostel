from flask import Blueprint, request, jsonify, current_app
from backend.models import db, Room, Tenant, BillingProfile, Document, Ledger
from werkzeug.utils import secure_filename
import os
from datetime import datetime

onboarding_bp = Blueprint('onboarding', __name__)

@onboarding_bp.route('/onboarding', methods=['POST'])
def create_tenant():
    data = request.form
    files = request.files
    
    upload_folder = 'uploads'
    if not os.path.exists(upload_folder):
        os.makedirs(upload_folder)

    saved_files = [] # Track files for rollback cleanup

    try:
        # 1. Validate Room & Capacity (Locking logic)
        room_id = data.get('room_id')
        if not room_id:
            return jsonify({"error": "Missing room_id"}), 400
            
        room = Room.query.get(room_id)
        if not room:
            return jsonify({"error": f"Room {room_id} not found"}), 404
        
        # Check active tenants (excluding soft-deleted)
        active_tenants = [t for t in room.tenants if t.deleted_at is None]
        if len(active_tenants) >= room.capacity:
            return jsonify({"error": f"Room {room.number} is already full ({len(active_tenants)}/{room.capacity})"}), 409

        # 2. Parse Dates safely
        try:
            agreement_date = datetime.strptime(data.get('agreement_start_date'), '%Y-%m-%d').date()
            move_in_date = datetime.strptime(data.get('actual_move_in_date'), '%Y-%m-%d').date()
        except (ValueError, TypeError) as e:
            return jsonify({"error": f"Invalid date format: {str(e)}"}), 400
            
        # Parse CNIC Expiry if provided
        cnic_expiry = None
        if data.get('cnic_expiry_date'):
            try:
                cnic_expiry = datetime.strptime(data.get('cnic_expiry_date'), '%Y-%m-%d').date()
            except ValueError:
                pass # Non-critical field

        # 3. Parse Booleans & IDs
        internet_opt_in = data.get('internet_opt_in', 'true').lower() == 'true'
        is_partial = data.get('is_partial_payment', 'false').lower() == 'true'
        payment_method = data.get('payment_method', 'Cash')
        tenancy_type = data.get('tenancy_type', 'Shared')
        
        parent_id_raw = data.get('parent_tenant_id')
        parent_tenant_id = None
        if parent_id_raw and parent_id_raw not in ('null', '', 'select'):
            try:
                parent_tenant_id = int(parent_id_raw)
            except ValueError:
                pass 

        # 4. Create Tenant Header
        tenant = Tenant(
            name=data.get('name'),
            cnic=data.get('cnic'),
            phone=data.get('phone'),
            room_id=room_id,
            bed_label=data.get('bed_label'),
            police_status='Pending',
            agreement_start_date=agreement_date,
            actual_move_in_date=move_in_date,
            is_partial_payment=is_partial,
            internet_opt_in=internet_opt_in,
            tenancy_type=tenancy_type,
            emergency_contact=data.get('emergency_contact'),
            parent_tenant_id=parent_tenant_id
        )
        db.session.add(tenant)
        db.session.flush() # Flush to get ID for files and billing

        # 5. Financial Logic (Billing Profile)
        try:
            raw_base_rent = data.get('base_rent') or data.get('rent_amount') or 0
            base_rent = float(raw_base_rent)
            
            raw_initial_rent = data.get('rent_amount') or 0
            initial_rent = float(raw_initial_rent)
            
            raw_security = data.get('security_deposit') or 0
            security_deposit_total = float(raw_security)
            
            due_day = int(data.get('due_day', 1))
        except ValueError as e:
            return jsonify({"error": f"Invalid numeric data: {str(e)}"}), 400

        # ----- BULK FLOOR RENTING OVERRIDE -----
        floor = room.floor_ref
        if floor and floor.is_bulk_rented:
            # Re-verify floor capacity
            floor_rooms = [r.id for r in floor.rooms if r.deleted_at is None]
            active_floor_tenants = Tenant.query.filter(Tenant.room_id.in_(floor_rooms), Tenant.deleted_at == None).count()
            if active_floor_tenants >= floor.max_bulk_capacity:
                return jsonify({"error": f"Floor capacity strictly enforced: max {floor.max_bulk_capacity} tenants reached."}), 409
            
            # Sub-tenants on bulk floors have zero system rent
            base_rent = 0.0
            initial_rent = 0.0
        # ----------------------------------------

        billing = BillingProfile(
            tenant_id=tenant.id, 
            rent_amount=base_rent, 
            security_deposit=security_deposit_total,
            pro_rata_rent=initial_rent,
            due_day=due_day
        )
        db.session.add(billing)

        # 6. Ledger Entries (Payment Allocation)
        try:
            raw_paid = data.get('amount_paid_now')
            # Fallback to sum of dues if nothing entered
            amount_paid_now = float(raw_paid) if raw_paid and raw_paid != '' else (initial_rent + security_deposit_total)
        except ValueError:
            amount_paid_now = initial_rent + security_deposit_total

        ledger_rent_type = 'PRIVATE_RENT' if tenancy_type == 'Private' else 'RENT'
        
        # Split payment: Rent first
        amount_for_rent = min(amount_paid_now, initial_rent)
        rent_pending = initial_rent - amount_for_rent
        remaining_paid = amount_paid_now - amount_for_rent

        # Then Security
        amount_for_security = min(remaining_paid, security_deposit_total)
        security_pending = security_deposit_total - amount_for_security

        if amount_for_rent > 0:
            db.session.add(Ledger(tenant_id=tenant.id, amount=amount_for_rent, type=ledger_rent_type, status='PAID', payment_method=payment_method, description=f'Initial {tenancy_type} Rent (Paid)'))
        if rent_pending > 0:
            db.session.add(Ledger(tenant_id=tenant.id, amount=rent_pending, type=ledger_rent_type, status='PENDING', description=f'Initial {tenancy_type} Rent Arrears'))

        if amount_for_security > 0:
            db.session.add(Ledger(tenant_id=tenant.id, amount=amount_for_security, type='DEPOSIT', status='PAID', payment_method=payment_method, description='Security Deposit (Paid)'))
        if security_pending > 0:
            db.session.add(Ledger(tenant_id=tenant.id, amount=security_pending, type='DEPOSIT', status='PENDING', description='Security Deposit Arrears'))

        # 7. File Attachments
        doc_dir = os.path.join(current_app.root_path, 'static', 'uploads', 'documents')
        if not os.path.exists(doc_dir):
            os.makedirs(doc_dir)

        doc_mapping = {'id_front': 'ID_Front', 'id_back': 'ID_Back', 'police_form': 'Police_Form', 'agreement': 'Agreement'}
        attr_mapping = {'id_front': 'id_card_front_url', 'id_back': 'id_card_back_url', 'police_form': 'police_form_url', 'agreement': None}

        for field, doc_type in doc_mapping.items():
            if field in files:
                file = files[field]
                if file and file.filename != '':
                    ts = int(datetime.now().timestamp())
                    ext = os.path.splitext(file.filename)[1]
                    fname = f"tenant_{tenant.id}_{field}_{ts}{ext}"
                    fpath = os.path.join(doc_dir, fname)
                    db_url = f"/static/uploads/documents/{fname}"
                    
                    file.save(fpath)
                    saved_files.append(fpath)
                    
                    # Store link in Document table
                    db.session.add(Document(tenant_id=tenant.id, type=doc_type, url=db_url))
                    
                    # Update direct attribute on Tenant model if it exists
                    attr = attr_mapping.get(field)
                    if attr:
                        setattr(tenant, attr, db_url)
                    
                    if field == 'police_form':
                        tenant.police_form_submitted = datetime.utcnow()

        if not tenant.police_form_submitted:
            tenant.compliance_alert = True

        # Final Commit
        db.session.commit()
        
        return jsonify({
            "message": "Tenant onboarded successfully", 
            "id": tenant.id, 
            "compliance": tenant.get_compliance_status()
        }), 201

    except Exception as e:
        db.session.rollback()
        # Zombie Cleanup
        for fpath in saved_files:
            if os.path.exists(fpath):
                try: os.remove(fpath)
                except: pass
        return jsonify({"error": f"Onboarding Failed: {str(e)}"}), 500

