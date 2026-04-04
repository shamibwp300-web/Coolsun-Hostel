import sqlite3

# Try parsing all tenants
conn = sqlite3.connect('d:/Coolsun Hostel/hostel.db')
c = conn.cursor()
c.execute("SELECT id, name, id_card_front_url, id_card_back_url, police_form_url, agreement_url FROM tenants")
tenants = c.fetchall()

print(f"Total tenants in root DB: {len(tenants)}")

found = False
for t in tenants:
    t_id, name, idf, idb, pf, af = t
    if 'kabir' in (name or '').lower() or 'abdul' in (name or '').lower():
        print("====== FOUND IN ROOT ======")
        print(f"Name: {name}")
        print(f"ID Front: {idf}")
        print(f"ID Back: {idb}")
        print(f"Police Form: {pf}")
        print(f"Agreement Form: {af}")
        found = True
        
        # Checking Documents table for this ID
        c.execute("SELECT type, url FROM documents WHERE tenant_id = ?", (t_id,))
        docs = c.fetchall()
        print(f"Documents Table for {name}: {docs}")
        
if not found:
    print("Could not find kabir or abdul in either.")

conn.close()

conn2 = sqlite3.connect('d:/Coolsun Hostel/Coolsun Hostel/hostel.db')
c2 = conn2.cursor()
c2.execute("SELECT id, name, id_card_front_url, id_card_back_url, police_form_url, agreement_url FROM tenants")
tenants2 = c2.fetchall()

print(f"\nTotal tenants in nested DB: {len(tenants2)}")
found2 = False
for t in tenants2:
    t_id, name, idf, idb, pf, af = t
    if 'kabir' in (name or '').lower() or 'abdul' in (name or '').lower():
        print("====== FOUND IN NESTED ======")
        print(f"Name: {name}")
        print(f"ID Front: {idf}")
        print(f"ID Back: {idb}")
        print(f"Police Form: {pf}")
        print(f"Agreement Form: {af}")
        found2 = True
        
        # Checking Documents table for this ID
        c2.execute("SELECT type, url FROM documents WHERE tenant_id = ?", (t_id,))
        docs2 = c2.fetchall()
        print(f"Documents Table for {name}: {docs2}")

conn2.close()

