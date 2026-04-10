from flask import Blueprint, request, jsonify
from backend.models import db, Tenant, Ledger, Expense
from datetime import datetime, date

finance_bp = Blueprint('finance', __name__)

@finance_bp.route('/finance/ledger', methods=['GET'])
def get_ledger():
    # Get all ledger entries (recent 50)
    entries = Ledger.query.filter_by(deleted_at=None).order_by(Ledger.timestamp.desc()).limit(50).all()
    res = []
    for e in entries:
        tenant = e.tenant
        res.append({
            "id": e.id,
            "tenant_id": e.tenant_id,
            "name": tenant.name if tenant else "Unknown",
            "room": tenant.room.number if tenant and tenant.room else "N/A",
            "amount": float(e.amount),
            "type": e.type, # RENT, UTILITY, DEPOSIT, FINE
            "status": e.status, # PAID, PENDING
            "payment_method": e.payment_method or 'Cash',
            "date": e.timestamp.strftime('%b %d, %Y') if e.timestamp else "N/A",
            "description": e.description or ""
        })
    return jsonify(res), 200

@finance_bp.route('/finance/pay', methods=['POST'])
def pay_dues():
    data = request.json
    tenant_id = data.get('tenant_id')
    amount_paid = float(data.get('amount', 0))
    payment_method = data.get('payment_method', 'Cash')
    
    if not tenant_id or amount_paid <= 0:
        return jsonify({"error": "Invalid data"}), 400
        
    # Find pending ledgers for this tenant
    pending_entries = Ledger.query.filter_by(
        tenant_id=tenant_id, 
        status='PENDING', 
        deleted_at=None
    ).order_by(Ledger.timestamp.asc()).all()
    
    remaining_payment = amount_paid
    
    for entry in pending_entries:
        if remaining_payment <= 0:
            break
            
        entry_amount = float(entry.amount)
        
        if remaining_payment >= entry_amount:
            # Fully paid this entry
            entry.status = 'PAID'
            remaining_payment -= entry_amount
        else:
            # Partially paid
            # Deduct from pending and create a new PAID entry for the paid portion
            entry.amount = entry_amount - remaining_payment
            
            partial_paid_entry = Ledger(
                tenant_id=tenant_id,
                amount=remaining_payment,
                type=entry.type,
                status='PAID',
                payment_method=payment_method,
                description=f"Partial Payment ({entry.description or entry.type})"
            )
            db.session.add(partial_paid_entry)
            remaining_payment = 0
            
    # If there is remaining payment (overpaid), maybe create a credit ledger?
    if remaining_payment > 0:
        overpayment_entry = Ledger(
            tenant_id=tenant_id,
            amount=-remaining_payment,  # Negative means credit
            type='DEPOSIT',
            status='PAID',
            payment_method=payment_method,
            description="Advance / Overpayment"
        )
        db.session.add(overpayment_entry)
        
    db.session.commit()
    return jsonify({"message": "Payment logged successfully"}), 200

@finance_bp.route('/finance/expenses', methods=['GET', 'POST'])
def handle_expenses():
    if request.method == 'POST':
        data = request.json
        # Robust date parsing
        exp_date = date.today()
        if 'date' in data:
            try:
                dstr = data.get('date').split('T')[0]
                exp_date = datetime.strptime(dstr, '%Y-%m-%d').date()
            except:
                pass

        e = Expense(
            category=data.get('category', 'Operational'),
            amount=data.get('amount'),
            description=data.get('description'),
            sub_note=data.get('sub_note'),
            date=exp_date
        )
        if data.get('type') == 'Personal':
            e.category = 'Owner Personal'
        
        db.session.add(e)
        db.session.commit()
        return jsonify({"message": "Expense logged"}), 201
        
    # GET logic with filtering
    query = Expense.query.filter_by(deleted_at=None)
    
    # Filter by date range
    start_date = request.args.get('start_date')
    end_date = request.args.get('end_date')
    if start_date:
        try:
            query = query.filter(Expense.date >= datetime.strptime(start_date, '%Y-%m-%d').date())
        except: pass
    if end_date:
        try:
            query = query.filter(Expense.date <= datetime.strptime(end_date, '%Y-%m-%d').date())
        except: pass
        
    # Filter by type (Business/Personal)
    etype = request.args.get('type')
    if etype == 'Business':
        query = query.filter(Expense.category != 'Owner Personal')
    elif etype == 'Personal':
        query = query.filter(Expense.category == 'Owner Personal')
        
    # Filter by search (description)
    search = request.args.get('search')
    if search:
        query = query.filter(Expense.description.ilike(f'%{search}%'))
        
    expenses = query.order_by(Expense.date.desc(), Expense.id.desc()).all()
    
    res = []
    for exp in expenses:
        btype = "Personal" if exp.category == 'Owner Personal' else "Business"
        res.append({
            "id": exp.id,
            "category": exp.category,
            "amount": float(exp.amount),
            "description": exp.description,
            "note": exp.sub_note or "",
            "date": exp.date.strftime('%Y-%m-%d') if exp.date else "N/A", # Return ISO format for easier FE handling
            "display_date": exp.date.strftime('%b %d, %Y') if exp.date else "N/A",
            "type": btype
        })
    return jsonify(res), 200

@finance_bp.route('/finance/expenses/<int:expense_id>', methods=['PUT', 'DELETE'])
def manage_expense(expense_id):
    expense = Expense.query.get_or_404(expense_id)
    
    if request.method == 'DELETE':
        expense.delete() # Soft delete helper from models
        db.session.commit()
        return jsonify({"message": "Expense deleted"}), 200
        
    if request.method == 'PUT':
        data = request.json
        if 'amount' in data:
            expense.amount = data.get('amount')
        if 'description' in data:
            expense.description = data.get('description')
        if 'category' in data:
            expense.category = data.get('category')
        if 'sub_note' in data:
            expense.sub_note = data.get('sub_note')
        if 'date' in data:
            try:
                # Handle ISO date or simple YYYY-MM-DD
                dstr = data.get('date').split('T')[0]
                expense.date = datetime.strptime(dstr, '%Y-%m-%d').date()
            except:
                pass
                
        if data.get('type') == 'Personal':
            expense.category = 'Owner Personal'
        elif data.get('type') == 'Business' and expense.category == 'Owner Personal':
            expense.category = 'Operational'
            
        db.session.commit()
        return jsonify({"message": "Expense updated"}), 200

@finance_bp.route('/finance/generate-rent', methods=['POST'])
def generate_bulk_rent():
    from backend.models import Floor
    data = request.json or {}
    room_number = data.get('room_number')
    
    # Use current local time for billing period or provided month
    now = datetime.now()
    billing_month_str = data.get('billing_month')
    
    if billing_month_str:
        try:
            target_date = datetime.strptime(billing_month_str, '%Y-%m')
            current_month_str = billing_month_str
            display_month = target_date.strftime('%B %Y')
            timestamp = target_date
        except:
            current_month_str = now.strftime('%Y-%m')
            display_month = now.strftime('%B %Y')
            timestamp = now
    else:
        current_month_str = now.strftime('%Y-%m')
        display_month = now.strftime('%B %Y')
        timestamp = now
        
    generated = 0
    
    # 1. Generate Rent for Bulk Rented Floors
    # (Only if no specific room selected, or if the room belongs to a bulk-rented floor)
    # Since bulk rent is floor-based, we'll only do this if room_number is None
    if not room_number:
        bulk_floors = Floor.query.filter_by(is_bulk_rented=True, deleted_at=None).all()
        for f in bulk_floors:
            if not f.bulk_tenant_id:
                continue
                
            floor_description = f"Bulk Floor Rent ({f.name}) - {display_month}"
            
            # Check if already billed for this FLOOR specifically in this month
            existing = Ledger.query.filter(
                Ledger.tenant_id == f.bulk_tenant_id, 
                Ledger.type == 'RENT', 
                Ledger.deleted_at == None,
                Ledger.description.contains(f"({f.name})")
            ).all()
            
            already_billed = any(e.timestamp.strftime('%Y-%m') == current_month_str for e in existing)
            
            if not already_billed:
                l = Ledger(
                    tenant_id=f.bulk_tenant_id,
                    amount=f.bulk_rent_amount or 0,
                    type='RENT',
                    status='PENDING',
                    description=floor_description,
                    timestamp=timestamp
                )
                db.session.add(l)
                generated += 1

    # 2. Generate Rent for Regular Tenants
    query = Tenant.query.filter_by(deleted_at=None)
    if room_number:
        from backend.models import Room
        room_obj = Room.query.filter_by(number=room_number).first()
        if room_obj:
            query = query.filter_by(room_id=room_obj.id)
        else:
            return jsonify({"error": f"Room {room_number} not found"}), 404
            
    tenants = query.all()
    for t in tenants:
        if not t.room or (t.room.floor_ref and t.room.floor_ref.is_bulk_rented):
            continue
            
        # Check if already billed for ANY rent in this month
        existing = Ledger.query.filter(
            Ledger.tenant_id == t.id,
            Ledger.type.in_(['RENT', 'PRIVATE_RENT']),
            Ledger.deleted_at == None
        ).all()
        
        already_billed = any(e.timestamp.strftime('%Y-%m') == current_month_str for e in existing)
        
        if not already_billed:
            # Determine rent amount and type
            rent_amount = t.billing_profile.rent_amount if t.billing_profile else (t.room.base_rent or 10000)
            rent_type = 'PRIVATE_RENT' if t.tenancy_type == 'Private' else 'RENT'
            type_label = "Full Room" if rent_type == 'PRIVATE_RENT' else "Shared"
            
            l = Ledger(
                tenant_id=t.id,
                amount=rent_amount,
                type=rent_type,
                status='PENDING',
                description=f"{type_label} Rent - {display_month}",
                timestamp=timestamp
            )
            db.session.add(l)
            generated += 1
            
    db.session.commit()
    return jsonify({"message": f"Successfully generated {generated} rent invoices for {display_month}."}), 200

@finance_bp.route('/finance/manual-charge', methods=['POST'])
def add_manual_charge():
    """Allows admin to manually inject a PENDING charge/bill into a tenant's ledger (with backdating support)"""
    data = request.json
    tenant_id = data.get('tenant_id')
    amount = float(data.get('amount', 0))
    charge_type = data.get('type', 'RENT') # 'RENT', 'DEPOSIT', 'UTILITY', 'FINE'
    description = data.get('description', '')
    
    if not tenant_id or amount <= 0:
        return jsonify({"error": "Invalid data. Amount must be greater than 0."}), 400
        
    tenant = Tenant.query.get(tenant_id)
    if not tenant:
        return jsonify({"error": "Tenant not found."}), 404
        
    # Date parsing for backdating
    charge_date = datetime.utcnow()
    if 'date' in data and data['date']:
        try:
            dstr = data.get('date').split('T')[0]
            # Convert YYYY-MM-DD to a datetime strictly for the Ledger timestamp
            parsed_date = datetime.strptime(dstr, '%Y-%m-%d')
            # Retain current time hours/mins to avoid tz shift issues if needed, or just set to midnight
            charge_date = parsed_date
        except ValueError:
            pass

    # For Private Rent mode
    if charge_type == 'RENT' and tenant.tenancy_type == 'Private':
        charge_type = 'PRIVATE_RENT'

    # Create the Ledger entry as PENDING (meaning the tenant now owes this money)
    entry = Ledger(
        tenant_id=tenant_id,
        amount=amount,
        type=charge_type,
        status='PENDING',
        description=description or f"Manual Charge: {charge_type}",
        timestamp=charge_date
    )
    
    db.session.add(entry)
    db.session.commit()
    
    return jsonify({
        "message": f"Successfully charged Rs. {amount} to {tenant.name} for {charge_type}.",
        "id": entry.id
    }), 201

@finance_bp.route('/finance/opening-balance', methods=['POST'])
def add_opening_balance():
    data = request.json
    tenant_id = data.get('tenant_id')
    amount = float(data.get('amount', 0))
    # balance_type: 'DUE' (owed by tenant), 'ADVANCE' (paid in advance), or 'OWNER_FUND' (capital injection)
    balance_type = data.get('balance_type', 'DUE')
    
    if amount <= 0:
        return jsonify({"error": "Invalid amount"}), 400
        
    if balance_type != 'OWNER_FUND' and not tenant_id:
        return jsonify({"error": "Tenant is required"}), 400
        
    if balance_type == 'DUE':
        # Create a PENDING entry (Receivable)
        entry = Ledger(
            tenant_id=tenant_id,
            amount=amount,
            type='OPENING_BALANCE',
            status='PENDING',
            description="Manual Opening Balance (Due)"
        )
    elif balance_type == 'OWNER_FUND':
        # Create a PAID entry (Capital Injection)
        # We use System ID 0 to represent Owner Equity professionally
        # This completely resolves the database NOT NULL constraint securely
        entry = Ledger(
            tenant_id=0,
            amount=amount,
            type='OWNER_FUND',
            status='PAID',
            payment_method='Manual Entry',
            description="Owner Capital / Funds Added"
        )
    else:
        # Create a PAID entry (Advance/Credit)
        entry = Ledger(
            tenant_id=tenant_id,
            amount=amount,
            type='OPENING_BALANCE',
            status='PAID',
            payment_method='Manual Entry',
            description="Manual Opening Balance (Advance/Credit)"
        )
        
    try:
        db.session.add(entry)
        db.session.commit()
        return jsonify({"message": "Opening balance added successfully"}), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": f"Database error details: {str(e)}"}), 500

@finance_bp.route('/finance/room-summary/<room_number>', methods=['GET'])
def get_room_summary(room_number):
    from backend.models import Room
    room_obj = Room.query.filter_by(number=room_number, deleted_at=None).first()
    if not room_obj:
        return jsonify({"error": f"Room {room_number} not found"}), 404
        
    tenants = room_obj.get_active_tenants()
    
    primary_tenants = [t for t in tenants if t.parent_tenant_id is None]
    sub_tenants = [t for t in tenants if t.parent_tenant_id is not None]
    
    def get_tenant_summary(t):
        # Calculate balance from billing_profile or ledger
        # Assuming we have a helper or can calculate here
        pending_ledgers = Ledger.query.filter_by(tenant_id=t.id, status='PENDING', deleted_at=None).all()
        balance = sum(float(l.amount) for l in pending_ledgers)
        
        return {
            "id": t.id,
            "name": t.name,
            "phone": t.phone,
            "balance": balance,
            "rent_amount": float(t.billing_profile.rent_amount if t.billing_profile else 0),
            "is_primary": t.parent_tenant_id is None,
            "bed": t.bed_label or "N/A"
        }

    res_primary = [get_tenant_summary(t) for t in primary_tenants]
    res_sub = [get_tenant_summary(t) for t in sub_tenants]
    
    total_room_pending = sum(p['balance'] for p in res_primary) + sum(s['balance'] for s in res_sub)
    
    return jsonify({
        "room_number": room_number,
        "primary": res_primary,
        "sub_tenants": res_sub,
        "total_pending": total_room_pending
    }), 200
