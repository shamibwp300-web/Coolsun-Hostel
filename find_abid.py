import sqlite3
dbs=[r'd:\Coolsun Hostel\hostel.db', r'd:\Coolsun Hostel\backend\instance\hostel.db', r'd:\Coolsun Hostel\Coolsun Hostel\hostel.db', r'd:\Coolsun Hostel\Coolsun Hostel\backend\instance\hostel.db']
for db in dbs:
    try:
        conn=sqlite3.connect(db)
        cursor=conn.cursor()
        cursor.execute("SELECT id, name, room_id, parent_tenant_id FROM tenants WHERE name LIKE '%Abid%'")
        print(db, cursor.fetchall())
    except Exception as e:
        print(db, e)
