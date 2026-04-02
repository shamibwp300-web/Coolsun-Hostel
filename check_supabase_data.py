import os
import psycopg2
from dotenv import load_dotenv

# Load from .env (even if commented, I can try to parse it or use the string from my previous view)
db_url = "postgresql://postgres.spatbdjlozpkdkymeedm:Coolsun%4023%2A%2B@aws-0-eu-central-1.pooler.supabase.com:6543/postgres?sslmode=require"

def check_supabase():
    print(f"Connecting to Supabase...")
    try:
        conn = psycopg2.connect(db_url)
        cursor = conn.cursor()
        
        # Check Tenants
        cursor.execute("SELECT COUNT(*) FROM tenants")
        tenant_count = cursor.fetchone()[0]
        
        # Check Rooms
        cursor.execute("SELECT COUNT(*) FROM rooms")
        room_count = cursor.fetchone()[0]
        
        print("\n🌟 --- SUPABASE DATA FOUND --- 🌟")
        print(f"Total Tenants: {tenant_count}")
        print(f"Total Rooms:   {room_count}")
        print("-------------------------------\n")
        
        # Check Schema for agreement_url
        cursor.execute("SELECT column_name FROM information_schema.columns WHERE table_name = 'tenants'")
        columns = [c[0] for c in cursor.fetchall()]
        print(f"Columns in tenants: {columns}")
        
        if 'agreement_url' not in columns:
            print("❌ agreement_url is MISSING in Supabase table 'tenants'.")
        
        conn.close()
    except Exception as e:
        print(f"❌ Failed to connect to Supabase: {e}")

if __name__ == "__main__":
    check_supabase()
