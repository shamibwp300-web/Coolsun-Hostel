"""
backend/routes/settings.py
Fine Library CRUD + Audit Log viewer + Expense Approval pipeline
"""
from flask import Blueprint, request, jsonify, session
from backend.models import db, FineType, AuditLog, Expense, User
from datetime import datetime

settings_bp = Blueprint('settings', __name__)


def log_action(action, entity=None, entity_id=None, details=None):
    """Helper to create an immutable audit log entry."""
    try:
        log = AuditLog(
            user_id=session.get('user_id'),
            action=action,
            entity=entity,
            entity_id=entity_id,
            details=details,
            ip_address=request.remote_addr
        )
        db.session.add(log)
        # NOTE: caller must db.session.commit()
    except Exception:
        pass  # Never crash the main operation due to logging


# ─────────────────────────────────────────────
# FINE LIBRARY
# ─────────────────────────────────────────────

@settings_bp.route('/settings/fines', methods=['GET'])
def get_fines():
    fines = FineType.query.filter_by(deleted_at=None).order_by(FineType.created_at).all()
    return jsonify([{
        "id": f.id,
        "name": f.name,
        "amount": float(f.amount),
        "description": f.description,
    } for f in fines]), 200


@settings_bp.route('/settings/fines', methods=['POST'])
def create_fine():
    data = request.json
    if not data.get('name') or not data.get('amount'):
        return jsonify({"error": "Name and amount are required"}), 400
    fine = FineType(
        name=data['name'],
        amount=float(data['amount']),
        description=data.get('description', '')
    )
    db.session.add(fine)
    log_action('CREATE_FINE_TYPE', 'FineType', details=f"Created: {data['name']} = Rs.{data['amount']}")
    db.session.commit()
    return jsonify({"message": "Fine type created", "id": fine.id}), 201


@settings_bp.route('/settings/fines/<int:fine_id>', methods=['PUT'])
def update_fine(fine_id):
    fine = FineType.query.get_or_404(fine_id)
    data = request.json
    old_amount = float(fine.amount)
    fine.name = data.get('name', fine.name)
    fine.amount = float(data.get('amount', fine.amount))
    fine.description = data.get('description', fine.description)
    log_action('UPDATE_FINE_TYPE', 'FineType', entity_id=fine_id,
               details=f"Amount changed: Rs.{old_amount} → Rs.{fine.amount}")
    db.session.commit()
    return jsonify({"message": "Fine type updated"}), 200


@settings_bp.route('/settings/fines/<int:fine_id>', methods=['DELETE'])
def delete_fine(fine_id):
    fine = FineType.query.get_or_404(fine_id)
    fine.delete()
    log_action('DELETE_FINE_TYPE', 'FineType', entity_id=fine_id)
    db.session.commit()
    return jsonify({"message": "Fine type deleted"}), 200


# ─────────────────────────────────────────────
# EXPENSE APPROVAL PIPELINE
# ─────────────────────────────────────────────

@settings_bp.route('/expenses/pending', methods=['GET'])
def get_pending_expenses():
    """Manager view: all expenses pending approval."""
    expenses = Expense.query.filter_by(approval_status='Pending', deleted_at=None).all()
    return jsonify([{
        "id": e.id,
        "category": e.category,
        "amount": float(e.amount),
        "description": e.description,
        "sub_note": e.sub_note,
        "date": e.date.isoformat() if e.date else None,
        "approval_status": e.approval_status,
    } for e in expenses]), 200


@settings_bp.route('/expenses/<int:expense_id>/approve', methods=['PUT'])
def approve_expense(expense_id):
    """Manager approves an expense."""
    expense = Expense.query.get_or_404(expense_id)
    data = request.json
    action = data.get('action', 'Approved')  # 'Approved' or 'Rejected'

    if action not in ['Approved', 'Rejected']:
        return jsonify({"error": "Invalid action"}), 400

    expense.approval_status = action
    expense.approved_at = datetime.utcnow()
    log_action(f'EXPENSE_{action.upper()}', 'Expense', entity_id=expense_id,
               details=f"Rs.{expense.amount} - {expense.category}")
    db.session.commit()
    return jsonify({"message": f"Expense {action.lower()} successfully"}), 200


# ─────────────────────────────────────────────
# AUDIT LOG VIEWER (Owner Only)
# ─────────────────────────────────────────────

@settings_bp.route('/audit/logs', methods=['GET'])
def get_audit_logs():
    """Owner views full immutable audit log."""
    page = request.args.get('page', 1, type=int)
    logs = AuditLog.query.order_by(AuditLog.timestamp.desc()).paginate(
        page=page, per_page=50, error_out=False
    )
    return jsonify({
        "logs": [{
            "id": l.id,
            "action": l.action,
            "entity": l.entity,
            "entity_id": l.entity_id,
            "details": l.details,
            "ip_address": l.ip_address,
            "timestamp": l.timestamp.isoformat() if l.timestamp else None,
        } for l in logs.items],
        "total": logs.total,
        "pages": logs.pages,
        "current_page": page
    }), 200
    
@settings_bp.route('/settings/change-password', methods=['POST'])
def change_password():
    user_id = session.get('user_id')
    if not user_id:
        return jsonify({"error": "Unauthorized"}), 401
        
    data = request.json
    current_password = data.get('current_password')
    new_password = data.get('new_password')
    confirm_password = data.get('confirm_password')
    
    if not current_password or not new_password or not confirm_password:
        return jsonify({"error": "All fields are required"}), 400
        
    if new_password != confirm_password:
        return jsonify({"error": "New passwords do not match"}), 400
        
    user = User.query.get(user_id)
    if not user or not user.check_password(current_password):
        return jsonify({"error": "Incorrect current password"}), 400
        
    user.set_password(new_password)
    log_action('CHANGE_PASSWORD', 'User', entity_id=user_id, details=f"User {user.username} changed their password")
    db.session.commit()
    
    return jsonify({"message": "Password changed successfully"}), 200
