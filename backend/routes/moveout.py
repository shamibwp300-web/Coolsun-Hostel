"""
backend/routes/moveout.py
Move-Out / Settlement Workflow
"""
from flask import Blueprint, request, jsonify
from backend.models import db, MoveOutRecord, Tenant, Ledger
from datetime import datetime

moveout_bp = Blueprint('moveout', __name__)


@moveout_bp.route('/moveout/finalize', methods=['POST'])
def finalize_moveout():
    """Manager finalizes move-out with automated settlement calculation."""
    data = request.json
    tenant_id = data.get('tenant_id')
    exit_date_str = data.get('exit_date')
    damage_deduction = float(data.get('damage_deduction', 0))
    fine_deduction = float(data.get('fine_deduction', 0))
    notes = data.get('notes', '')
    p_method = data.get('payment_method', 'Cash')

    if not tenant_id or not exit_date_str:
        return jsonify({"error": "tenant_id and exit_date required"}), 400

    tenant = Tenant.query.get_or_404(tenant_id)
    exit_date = datetime.strptime(exit_date_str, '%Y-%m-%d').date()

    # 1. Calculate Security Held
    deposit_ledgers = Ledger.query.filter_by(tenant_id=tenant_id, type='DEPOSIT', status='PAID', deleted_at=None).all()
    security_held = sum(float(l.amount) for l in deposit_ledgers)

    # 2. Calculate Dues (Exclude the security pending if any, we only settle Rent/Utility/Fine/Opening)
    due_ledgers = Ledger.query.filter(
        Ledger.tenant_id == tenant_id,
        Ledger.status == 'PENDING',
        Ledger.type != 'DEPOSIT',
        Ledger.deleted_at == None
    ).all()
    unpaid_dues = sum(float(l.amount) for l in due_ledgers)

    total_owed = unpaid_dues + damage_deduction + fine_deduction
    final_refund = max(0, security_held - total_owed)
    remaining_liability = max(0, total_owed - security_held)

    # 3. Process Ledger Adjustments
    # Mark existing pending dues as PAID (Settled by Security)
    # Note: In a real system you'd create offsetting entries, but for this ERP, 
    # we'll mark them as PAID with a special method.
    for l in due_ledgers:
        l.status = 'PAID'
        l.payment_method = 'Security Adjustment'
        l.description += " (Settled from Security at Move-out)"

    # Add damage/fine ledgers if provided
    if damage_deduction > 0:
        db.session.add(Ledger(
            tenant_id=tenant_id, amount=damage_deduction, type='FINE', 
            status='PAID', payment_method='Security Adjustment', 
            description=f"Damage Deduction: {notes}"
        ))
    if fine_deduction > 0:
        db.session.add(Ledger(
            tenant_id=tenant_id, amount=fine_deduction, type='FINE', 
            status='PAID', payment_method='Security Adjustment', 
            description=f"Move-out Fine Deduction: {notes}"
        ))

    # Record the Refund
    if final_refund > 0:
        db.session.add(Ledger(
            tenant_id=tenant_id, amount=final_refund, type='DEPOSIT',
            status='PAID', payment_method=p_method, 
            description="Security Deposit Refund (Move-out)"
        ))

    # Mark all DEPOSIT ledgers as "Settled" (deleted_at or a new status)
    # We soft-delete them to clear the "Held" balance from future lookups
    for l in deposit_ledgers:
        l.deleted_at = datetime.utcnow()

    # 4. Create MoveOutRecord and Archive Tenant
    record = MoveOutRecord(
        tenant_id=tenant_id,
        exit_date=exit_date,
        security_deposit_held=security_held,
        damage_deduction=damage_deduction,
        fine_deduction=fine_deduction,
        unpaid_rent=unpaid_dues,
        refund_amount=final_refund,
        notes=notes
    )
    db.session.add(record)
    
    tenant.delete() # Soft delete tenant
    
    db.session.commit()
    return jsonify({
        "message": "Checkout complete",
        "refund_amount": final_refund,
        "remaining_owed": remaining_liability
    }), 200

@moveout_bp.route('/moveout', methods=['GET'])
def get_moveout_records():
    """History of all move-outs."""
    records = MoveOutRecord.query.filter_by(deleted_at=None).order_by(MoveOutRecord.id.desc()).all()
    return jsonify([{
        "id": r.id,
        "tenant_id": r.tenant_id,
        "tenant_name": r.tenant.name if r.tenant else "Unknown",
        "exit_date": r.exit_date.isoformat(),
        "security_deposit_held": float(r.security_deposit_held),
        "damage_deduction": float(r.damage_deduction),
        "fine_deduction": float(r.fine_deduction),
        "unpaid_rent": float(r.unpaid_rent),
        "refund_amount": float(r.refund_amount),
        "notes": r.notes,
    } for r in records]), 200
