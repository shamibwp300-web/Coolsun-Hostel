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
        e = Expense(
            category=data.get('category', 'Operational'),
            amount=data.get('amount'),
            description=data.get('description'),
            sub_note=data.get('sub_note'),
            date=date.today()
        )
        if data.get('type') == 'Personal':
            e.category = 'Owner Personal'
        
        db.session.add(e)
        db.session.commit()
        return jsonify({"message": "Expense logged"}), 201
        
    expenses = Expense.query.filter_by(deleted_at=None).order_by(Expense.date.desc()).limit(50).all()
    res = []
    for exp in expenses:
        # Front-end expects generic "Business" vs "Personal" as `type`
        btype = "Personal" if exp.category == 'Owner Personal' else "Business"
        res.append({
            "id": exp.id,
            "category": exp.category,
            "amount": float(exp.amount),
            "description": exp.description,
            "note": exp.sub_note or "",
            "date": exp.date.strftime('%b %d, %Y') if exp.date else "N/A",
            "type": btype
        })
    return jsonify(res), 200

@finance_bp.route('/finance/generate-rent', methods=['POST'])
def generate_bulk_rent():
    from backend.models import Floor
    current_month_str = datetime.utcnow().strftime('%Y-%m')
    generated = 0
    
    # 1. Generate Rent for Bulk Rented Floors (Fixed Rent for the Bulk Tenant)
    bulk_floors = Floor.query.filter_by(is_bulk_rented=True, deleted_at=None).all()
    for f in bulk_floors:
        if not f.bulk_tenant_id:
            continue
            
        # Check if already billed FOR THIS FLOOR specifically
        month_label = datetime.utcnow().strftime('%B %Y')
        floor_description = f"Floor Rent ({f.name}) for {month_label}"
        
        existing = Ledger.query.filter_by(
            tenant_id=f.bulk_tenant_id, 
            type='RENT', 
            deleted_at=None
        ).filter(Ledger.description.contains(f"Floor Rent ({f.name})")).all()
        
        already_billed = any(e.timestamp.strftime('%Y-%m') == current_month_str for e in existing)
        
        if not already_billed:
            l = Ledger(
                tenant_id=f.bulk_tenant_id,
                amount=f.bulk_rent_amount or 0,
                type='RENT',
                status='PENDING',
                description=floor_description
            )
            db.session.add(l)
            generated += 1

    # 2. Generate Rent for Regular Tenants (Skip sub-tenants on bulk-rented floors)
    tenants = Tenant.query.filter_by(deleted_at=None).all()
    for t in tenants:
        if not t.room:
            continue
            
        # Skip if the tenant's room belongs to a bulk-rented floor
        # Do not double-bill the subtenants because their rent is covered by the bulk floor owner
        if t.room.floor_ref and t.room.floor_ref.is_bulk_rented:
            continue
            
        # Check BOTH RENT and PRIVATE_RENT types
        existing = Ledger.query.filter(
            Ledger.tenant_id == t.id,
            Ledger.type.in_(['RENT', 'PRIVATE_RENT']),
            Ledger.deleted_at == None
        ).all()
        already_billed = any(e.timestamp.strftime('%Y-%m') == current_month_str for e in existing)
        
        if not already_billed:
            rent_amount = t.billing_profile.rent_amount if t.billing_profile else (t.room.base_rent or 10000)
            
            l = Ledger(
                tenant_id=t.id,
                amount=rent_amount,
                type='RENT',
                status='PENDING',
                description=f"Rent for {datetime.utcnow().strftime('%B %Y')}"
            )
            db.session.add(l)
            generated += 1
            
    db.session.commit()
    return jsonify({"message": f"Generated rent for {generated} profiles (including bulk floors)"}), 200

@finance_bp.route('/finance/opening-balance', methods=['POST'])
def add_opening_balance():
    data = request.json
    tenant_id = data.get('tenant_id')
    amount = float(data.get('amount', 0))
    # balance_type: 'DUE' (owed by tenant) or 'ADVANCE' (paid in advance)
    balance_type = data.get('balance_type', 'DUE')
    
    if not tenant_id or amount <= 0:
        return jsonify({"error": "Invalid data"}), 400
        
    if balance_type == 'DUE':
        # Create a PENDING entry (Receivable)
        entry = Ledger(
            tenant_id=tenant_id,
            amount=amount,
            type='OPENING_BALANCE',
            status='PENDING',
            description="Manual Opening Balance (Due)"
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
        
    db.session.add(entry)
    db.session.commit()
    return jsonify({"message": "Opening balance added successfully"}), 201
