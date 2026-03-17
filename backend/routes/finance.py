import os
from flask import Blueprint, request, jsonify, current_app
from werkzeug.utils import secure_filename
from backend.models import db, Tenant, Ledger, Expense
from datetime import datetime

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
        if request.content_type and 'multipart/form-data' in request.content_type:
            data = request.form
            
            # Handle proof photo upload
            file = request.files.get('file')
            receipt_url = None
            if file and file.filename:
                upload_folder = os.path.join(current_app.instance_path, 'uploads', 'expenses')
                os.makedirs(upload_folder, exist_ok=True)
                filename = secure_filename(file.filename)
                # Ensure unique filename
                timestamp = datetime.utcnow().strftime('%Y%m%d%H%M%S')
                filename = f"{timestamp}_{filename}"
                file_path = os.path.join(upload_folder, filename)
                file.save(file_path)
                receipt_url = f'/api/uploads/expenses/{filename}'
                
            e = Expense(
                category=data.get('category', 'Operational'),
                amount=float(data.get('amount', 0)),
                description=data.get('description'),
                sub_note=data.get('sub_note'),
                maintenance_id=data.get('maintenance_id') if data.get('maintenance_id') else None,
                paid_from_cash_drawer=str(data.get('paid_from_cash_drawer', 'true')).lower() == 'true',
                receipt_url=receipt_url
            )
        else:
            data = request.json
            e = Expense(
                category=data.get('category', 'Operational'),
                amount=data.get('amount'),
                description=data.get('description'),
                sub_note=data.get('sub_note'),
                maintenance_id=data.get('maintenance_id'),
                paid_from_cash_drawer=data.get('paid_from_cash_drawer', True)
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
            "date": exp.date.strftime('%b %d, %Y'),
            "type": btype
        })
    return jsonify(res), 200

@finance_bp.route('/finance/generate-rent', methods=['POST'])
def generate_bulk_rent():
    tenants = Tenant.query.filter_by(deleted_at=None).all()
    generated = 0
    current_month_str = datetime.utcnow().strftime('%Y-%m')
    
    for t in tenants:
        # Check if rent already generated for this month
        # Use Python to check to avoid SQLite specific strftime issues
        existing = Ledger.query.filter_by(tenant_id=t.id, type='RENT', deleted_at=None).all()
        already_billed = any(e.timestamp.strftime('%Y-%m') == current_month_str for e in existing)
        
        if not already_billed:
            rent_amount = t.room.base_rent if t.room else 10000
            
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
    return jsonify({"message": f"Generated rent for {generated} tenants"}), 200
