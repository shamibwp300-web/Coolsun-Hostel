from flask import Blueprint, jsonify
from backend.models import db, Room, Tenant, Ledger, MaintenanceRequest, MeterReading, WaterBill, InternetBill
from sqlalchemy import func
from datetime import datetime

dashboard_bp = Blueprint('dashboard', __name__)

@dashboard_bp.route('/dashboard/summary', methods=['GET'])
def get_dashboard_summary():
    today = datetime.utcnow()
    start_of_month = datetime(today.year, today.month, 1)

    # Defaults in case of failure
    total_capacity = 0
    active_tenants = 0
    occupancy_rate = 0.0
    current_collected = 0.0
    current_pending = 0.0
    legacy_arrears = 0.0
    current_expenses = 0.0
    expense_breakdown = []
    recent_expenses = []
    net_cash = 0.0
    compliance_counts = {'NORMAL': 0, 'WARNING': 0, 'CRITICAL': 0, 'VERIFIED': 0}
    open_issues = []
    issues_breakdown = {'Critical': 0, 'High': 0, 'Routine': 0}
    electricity_summary = []
    total_utilities_billed_this_month = 0.0

    # 1. Occupancy Stats
    try:
        total_capacity = db.session.query(func.sum(Room.capacity)).filter(Room.deleted_at == None).scalar() or 0
        active_tenants = Tenant.query.filter_by(deleted_at=None).count()
        occupancy_rate = round((active_tenants / total_capacity * 100), 1) if total_capacity > 0 else 0
    except Exception as e:
        print(f"Error fetching Occupancy Stats: {e}")

    # 2. Financial Stats (All-Time Liquidity/Cash Flow Reconciliation)
    try:
        # Collected (All-time)
        current_collected = db.session.query(func.sum(Ledger.amount)).filter(
            Ledger.type.in_(['RENT', 'PRIVATE_RENT', 'DEPOSIT', 'UTILITY', 'FINE', 'OPENING_BALANCE']),
            Ledger.status == 'PAID',
            Ledger.deleted_at == None
        ).scalar() or 0.0

        # Pending: All PENDING rent (Current + Arrears)
        current_pending = db.session.query(func.coalesce(func.sum(Ledger.amount), 0.0)).filter(
            Ledger.type.in_(['RENT', 'PRIVATE_RENT', 'DEPOSIT', 'UTILITY', 'FINE', 'OPENING_BALANCE']),
            Ledger.status == 'PENDING',
            Ledger.deleted_at == None
        ).scalar() or 0.0

        # Legacy Arrears: (Keeping this at 0 for now as current_pending sums all)
        legacy_arrears = 0.0

        # Expenses (All-time)
        from backend.models import Expense
        expense_data = db.session.query(
            Expense.category, 
            func.sum(Expense.amount).label('total')
        ).filter(Expense.deleted_at == None).group_by(Expense.category).all()
        
        current_expenses = sum(item.total for item in expense_data) or 0.0
        expense_breakdown = [{"name": item.category, "value": float(item.total)} for item in expense_data]
        
        # Add individual recent expenses for reporting
        recent_exps_raw = Expense.query.filter_by(deleted_at=None).order_by(Expense.date.desc(), Expense.id.desc()).limit(50).all()
        recent_expenses = [{
            "description": e.description,
            "amount": float(e.amount),
            "category": e.category,
            "type": 'Personal' if 'Personal' in (e.category or '') or 'Withdrawal' in (e.category or '') else 'Business',
            "date": e.date.strftime('%Y-%m-%d') if e.date else "N/A"
        } for e in recent_exps_raw]
        
        net_cash = float(current_collected) - float(current_expenses)
    except Exception as e:
        print(f"Error fetching Financial Stats: {e}")

    # 3. Compliance Stats
    try:
        tenants = Tenant.query.filter_by(deleted_at=None).all()
        for t in tenants:
            status = t.get_compliance_status()
            if status in compliance_counts:
                compliance_counts[status] += 1
    except Exception as e:
        print(f"Error fetching Compliance Stats: {e}")
            
    # 4. Open Issues
    try:
        open_issues = MaintenanceRequest.query.filter(
            MaintenanceRequest.status.in_(['Pending', 'Approved', 'Open', 'In Progress']),
            MaintenanceRequest.deleted_at == None
        ).all()
        
        issues_breakdown = {
            'Critical': len([i for i in open_issues if i.priority == 'Critical']),
            'High': len([i for i in open_issues if i.priority == 'High']),
            'Routine': len([i for i in open_issues if i.priority == 'Routine'])
        }
    except Exception as e:
        print(f"Error fetching Open Issues: {e}")
    
    # 5. Recent Utility Bills
    try:
        recent_readings = MeterReading.query.order_by(MeterReading.reading_date.desc()).limit(5).all()
        recent_water = WaterBill.query.order_by(WaterBill.billing_date.desc()).limit(5).all()
        recent_internet = InternetBill.query.order_by(InternetBill.billing_date.desc()).limit(5).all()
        
        for r in recent_readings:
            electricity_summary.append({
                "type": "Electricity",
                "room": r.room.number if r.room else "N/A",
                "date_obj": r.reading_date,
                "date": r.reading_date.strftime('%b %d'),
                "amount": float(r.total_bill),
                "units": f"{r.units_consumed} units"
            })
            
        for w in recent_water:
            electricity_summary.append({
                "type": "Water",
                "room": w.room.number if w.room else "N/A",
                "date_obj": w.billing_date,
                "date": w.billing_date.strftime('%b %d'),
                "amount": float(w.amount),
                "units": "Flat Fee"
            })
            
        for i in recent_internet:
            electricity_summary.append({
                "type": "Internet",
                "room": i.room.number if i.room else "N/A",
                "date_obj": i.billing_date,
                "date": i.billing_date.strftime('%b %d'),
                "amount": float(i.amount),
                "units": "Opt-ins Only"
            })
            
        electricity_summary.sort(key=lambda x: x['date_obj'], reverse=True)
        electricity_summary = electricity_summary[:5]
        
        current_elec = db.session.query(func.sum(MeterReading.total_bill)).filter(
            MeterReading.reading_date >= start_of_month
        ).scalar() or 0.0
        current_water = db.session.query(func.sum(WaterBill.amount)).filter(
            WaterBill.billing_date >= start_of_month
        ).scalar() or 0.0
        current_internet = db.session.query(func.sum(InternetBill.amount)).filter(
            InternetBill.billing_date >= start_of_month
        ).scalar() or 0.0
        
        total_utilities_billed_this_month = float(current_elec) + float(current_water) + float(current_internet)
    except Exception as e:
        print(f"Error fetching Utilities: {e}")

    return jsonify({
        "occupancy": {
            "total_capacity": total_capacity,
            "active_tenants": active_tenants,
            "rate": occupancy_rate
        },
        "financials": {
            "current_collected": float(current_collected),
            "current_pending": float(current_pending),
            "legacy_arrears": float(legacy_arrears),
            "current_expenses": float(current_expenses),
            "expense_breakdown": expense_breakdown,
            "recent_expenses": recent_expenses,
            "net_cash": float(net_cash)
        },
        "compliance": compliance_counts,
        "maintenance": {
            "total_open": len(open_issues),
            "breakdown": issues_breakdown,
            "open_issues": [{
                "id": i.id,
                "description": i.description,
                "priority": i.priority,
                "status": i.status,
                "is_approved": i.is_approved,
                "created_at": i.created_at.isoformat() if i.created_at else None
            } for i in open_issues] if type(open_issues) is list else []
        },
        "electricity": {
            "recent_bills": electricity_summary,
            "total_billed_this_month": total_utilities_billed_this_month
        }
    })
