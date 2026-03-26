import sqlite3

c = sqlite3.connect("hostel.db")
print('LEDGER:', [r[1] for r in c.execute('PRAGMA table_info(ledger)')])
print('EXPENSES:', [r[1] for r in c.execute('PRAGMA table_info(expenses)')])
print('METER:', [r[1] for r in c.execute('PRAGMA table_info(meter_readings)')])
print('WATER:', [r[1] for r in c.execute('PRAGMA table_info(water_bills)')])
print('INTERNET:', [r[1] for r in c.execute('PRAGMA table_info(internet_bills)')])
