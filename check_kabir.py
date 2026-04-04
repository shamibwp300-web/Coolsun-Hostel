import sqlite3
def run():
    print("Checking Root DB...")
    root_conn = sqlite3.connect('d:/Coolsun Hostel/hostel.db')
    c1 = root_conn.cursor()
    c1.execute("SELECT id, name, id_card_front_url, id_card_back_url, police_form_url, agreement_url FROM tenants WHERE name LIKE '%kabir%'")
    print(c1.fetchall())
    c1.execute("SELECT id, tenant_id, type, url FROM documents WHERE tenant_id IN (SELECT id FROM tenants WHERE name LIKE '%kabir%')")
    print("Documents:", c1.fetchall())
    root_conn.close()

    print("\nChecking Nested DB...")
    nested_conn = sqlite3.connect('d:/Coolsun Hostel/Coolsun Hostel/hostel.db')
    c2 = nested_conn.cursor()
    c2.execute("SELECT id, name, id_card_front_url, id_card_back_url, police_form_url, agreement_url FROM tenants WHERE name LIKE '%kabir%'")
    print(c2.fetchall())
    c2.execute("SELECT id, tenant_id, type, url FROM documents WHERE tenant_id IN (SELECT id FROM tenants WHERE name LIKE '%kabir%')")
    print("Documents:", c2.fetchall())
    nested_conn.close()

run()
