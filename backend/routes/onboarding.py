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
        # ATOMIC TRANSACTION BLOCK
        with db.session.begin_nested():
            # 1. Check Ghost Slots (Optimistic Locking)
            room_id = data.get('room_id')
            room = Room.query.get(room_id)
            if not room:
                return jsonify({"error": "Room not found"}), 404
            
            active_tenants = len([t for t in room.tenants if getattr(t, 'deleted_at', None) is None])
            if (room.capacity - active_tenants) <= 0:
                return jsonify({"error": "No vacancies in this room"}), 409 # Conflict

            # 2. Parse Dates
            agreement_date = datetime.strptime(data.get('agreement_start_date'), '%Y-%m-%d').date()
            move_in_date = datetime.strptime(data.get('actual_move_in_date'), '%Y-%m-%d').date()
            
            # Form data parsing for booleans (FormData sends strings)
            payment_method = data.get('payment_method', 'Cash')
            internet_opt_in_str = data.get('internet_opt_in', 'true').lower()
            internet_opt_in = internet_opt_in_str == 'true'
            
            parent_tenant_id = data.get('parent_tenant_id')
            if parent_tenant_id in ['null', '', 'select', None]:
                parent_tenant_id = None
            else:
                try:
                    parent_tenant_id = int(parent_tenant_id)
                except ValueError:
                    parent_tenant_id = None

            # 3. Create Tenant
            tenancy_type = data.get('tenancy_type', 'Shared')
            tenant = Tenant(
                name=data.get('name'),
                cnic=data.get('cnic'),
                phone=data.get('phone'),
                room_id=room_id,
                bed_label=data.get('bed_label'),
                police_status='Pending',
                agreement_start_date=agreement_date,
                actual_move_in_date=move_in_date,
                is_partial_payment=data.get('is_partial_payment') == 'true',
                internet_opt_in=internet_opt_in,
                tenancy_type=tenancy_type,
                emergency_contact=data.get('emergency_contact'),
                parent_tenant_id=parent_tenant_id
            )
            db.session.add(tenant)
            db.session.flush() # Get Tenant ID

            # 4. Create Billing Profile
            base_rent = float(data.get('base_rent') or data.get('rent_amount') or 0)
            initial_rent = float(data.get('rent_amount', 0))
            security_deposit_total = float(data.get('security_deposit') or 0)
            due_day = int(data.get('due_day', 1))

            # ----- BULK FLOOR RENTING LOGIC -----
            floor = room.floor_ref
            if floor and floor.is_bulk_rented:
                floor_rooms = [r.id for r in floor.rooms if r.deleted_at is None]
                if floor_rooms:
                    active_floor_tenants = Tenant.query.filter(Tenant.room_id.in_(floor_rooms), Tenant.deleted_at == None).count()
                    if active_floor_tenants >= floor.max_bulk_capacity:
                        return jsonify({"error": f"Floor capacity strictly enforced: max {floor.max_bulk_capacity} tenants allowed."}), 409
                
                # The sub-tenant on a bulk rented floor doesn't pay system rent
                base_rent = 0.0
                initial_rent = 0.0
            # ------------------------------------
            
            
            billing = BillingProfile(
                tenant_id=tenant.id, 
                rent_amount=base_rent, 
                security_deposit=security_deposit_total,
                pro_rata_rent=initial_rent,
                due_day=due_day
            )
            db.session.add(billing)

            # 5. Financial Logic (Unified Billing & Security)
            amount_paid_now_raw = data.get('amount_paid_now')
            if amount_paid_now_raw is not None and str(amount_paid_now_raw).strip() != '':
                amount_paid_now = float(amount_paid_now_raw)
            else:
                amount_paid_now = initial_rent + security_deposit_total
            
            ledger_rent_type = 'PRIVATE_RENT' if tenancy_type == 'Private' else 'RENT'

            # Allocate payments: Rent first, then Security
            amount_for_rent = min(amount_paid_now, initial_rent)
            rent_pending = initial_rent - amount_for_rent
            remaining_paid = amount_paid_now - amount_for_rent

            amount_for_security = min(remaining_paid, security_deposit_total)
            security_pending = security_deposit_total - amount_for_security
            remaining_paid -= amount_for_security

            # Rent Ledger Entries
            if amount_for_rent > 0:
                db.session.add(Ledger(tenant_id=tenant.id, amount=amount_for_rent, type=ledger_rent_type, status='PAID', payment_method=payment_method, description=f'Initial {tenancy_type} Rent (Paid)'))
            if rent_pending > 0:
                db.session.add(Ledger(tenant_id=tenant.id, amount=rent_pending, type=ledger_rent_type, status='PENDING', description=f'Initial {tenancy_type} Rent Arrears'))

            # Security Ledger Entries
            if amount_for_security > 0:
                db.session.add(Ledger(tenant_id=tenant.id, amount=amount_for_security, type='DEPOSIT', status='PAID', payment_method=payment_method, description='Security Deposit (Paid)'))
            if security_pending > 0:
                db.session.add(Ledger(tenant_id=tenant.id, amount=security_pending, type='DEPOSIT', status='PENDING', description='Security Deposit Arrears'))
            
            # Record any overpayment / pure advance (e.g., bulk tenant or manual extra payment)
            if remaining_paid > 0:
                db.session.add(Ledger(tenant_id=tenant.id, amount=remaining_paid, type='DEPOSIT', status='PAID', payment_method=payment_method, description='Initial Advance / Overpayment'))

            financials = {
                "rent": initial_rent,
                "security": security_deposit_total,
                "received": amount_paid_now,
                "arrears": rent_pending + security_pending,
                "advance": remaining_paid
            }

            # 6. Handle Files (Naming Convention: tenantID_docType_timestamp)
            # Dedicated fields mapping
            doc_mapping = {
                'id_front': 'ID_Front',
                'id_back': 'ID_Back',
                'police_form': 'Police_Form',
                'agreement': 'Agreement'
            }
            
            # Attribute mapping on Tenant model
            attr_mapping = {
                'id_front': 'id_card_front_url',
                'id_back': 'id_card_back_url',
                'police_form': 'police_form_url',
                'agreement': 'agreement_url'
            }
            
            # Save file to the persistent upload directory
            static_doc_dir = current_app.config['UPLOAD_FOLDER']
            os.makedirs(static_doc_dir, exist_ok=True)

            if 'police_form' not in files:
                tenant.compliance_alert = True
                tenant.police_form_submitted = None
            else:
                tenant.police_form_submitted = datetime.utcnow()

            for doc_field, enum_type in doc_mapping.items():
                target_attr = attr_mapping[doc_field]
                if doc_field in files:
                    file = files[doc_field]
                    if file.filename == '':
                        continue
                    
                    timestamp = int(datetime.now().timestamp())
                    filename = f"tenant_{tenant.id}_{doc_field}_{timestamp}{os.path.splitext(file.filename)[1]}"
                    file_path = os.path.join(static_doc_dir, filename)
                    
                    # URL for frontend access
                    db_url = f"/api/docs/{filename}"
                    
                    # Save File
                    file.save(file_path)
                    saved_files.append(file_path)
                    
                    # 1. Update direct field on Tenant
                    setattr(tenant, target_attr, db_url)
                    
                    # 2. Maintain Document table record (using capitalized Enum)
                    doc = Document(tenant_id=tenant.id, type=enum_type, url=db_url)
                    db.session.add(doc)
            
            # Also handle the 'agreement' which isn't one of the 3 dedicated but still in files
            if 'agreement' in files:
                file = files['agreement']
                if file.filename != '':
                    timestamp = int(datetime.now().timestamp())
                    filename = f"tenant_{tenant.id}_agreement_{timestamp}{os.path.splitext(file.filename)[1]}"
                    file_path = os.path.join(static_doc_dir, filename)
                    
                    # URL for frontend access
                    db_url = f"/api/docs/{filename}"
                    
                    # Save File
                    file.save(file_path)
                    saved_files.append(file_path)
                    
                    # 1. Update direct field on Tenant
                    tenant.agreement_url = db_url
                    
                    # 2. Maintain Document table record
                    doc = Document(tenant_id=tenant.id, type='Agreement', url=db_url)
                    db.session.add(doc)

        # Commit only if everything succeeded
        db.session.commit()
        return jsonify({
            "message": "Tenant onboarded successfully", 
            "id": tenant.id, 
            "financials": financials,
            "compliance": tenant.get_compliance_status()
        }), 201

    except Exception as e:
        db.session.rollback()
        # Clean up files (Zombie Prevention)
        for fpath in saved_files:
            if os.path.exists(fpath):
                try:
                    os.remove(fpath)
                except OSError:
                    pass # Log error in production
        return jsonify({"error": str(e)}), 500
