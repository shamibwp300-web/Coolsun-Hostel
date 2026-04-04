from datetime import datetime

def calculate_rent_breakdown(base, mode, move_in_str):
    move_in_date = datetime.strptime(move_in_str, '%Y-%m-%d').date()
    
    year = move_in_date.year
    month = move_in_date.month
    
    # Get total days in month
    if month == 12:
        next_month = datetime(year + 1, 1, 1).date()
    else:
        next_month = datetime(year, month + 1, 1).date()
    
    import calendar
    _, total_days_in_month = calendar.monthrange(year, month)
    
    # Days Remaining in the month (including the move-in day)
    # The frontend uses: totalDaysInMonth - moveInDate.getDate()
    # Wait, if I move in on the 26th of 31-day month, how many days do I owe?
    # 26, 27, 28, 29, 30, 31 = 6 days.
    # The frontend formula: 31 - 26 = 5 days.
    # This might be off by one if the move-in day itself is billed.
    
    days_remaining = max(0, total_days_in_month - move_in_date.day)
    # Actually, current frontend math (Wizard.jsx:184):
    # const daysRemaining = Math.max(0, totalDaysInMonth - moveInDate.getDate());
    
    total = base if mode == 'full' else round((base / total_days_in_month) * days_remaining)
    
    return {
        "base": base,
        "mode": mode,
        "move_in": move_in_str,
        "total_days": total_days_in_month,
        "days_charged": days_remaining,
        "total_rent": total,
        "per_day": round(base / total_days_in_month, 2)
    }

# Test Scenarios
scenarios = [
    (10000, 'pro-rata', '2026-03-26'), # 31 days month. 31 - 26 = 5 days.
    (10000, 'pro-rata', '2026-04-26'), # 30 days month. 30 - 26 = 4 days.
    (10000, 'full', '2026-03-26')
]

print(f"{'Base':<8} | {'Mode':<10} | {'Move-In':<12} | {'Days':<5} | {'Charged':<7} | {'Total':<10}")
print("-" * 65)
for s in scenarios:
    r = calculate_rent_breakdown(*s)
    print(f"{r['base']:<8} | {r['mode']:<10} | {r['move_in']:<12} | {r['total_days']:<5} | {r['days_charged']:<7} | {r['total_rent']:<10}")
