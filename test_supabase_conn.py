import os
import psycopg2

DATABASE_URL = "postgresql://postgres.spatbdjlozpkdkymeedm:Coolsun%4023%2A%2B@aws-0-eu-central-1.pooler.supabase.com:6543/postgres?sslmode=require"

try:
    conn = psycopg2.connect(DATABASE_URL)
    print("✅ Connection successful!")
    conn.close()
except Exception as e:
    print(f"❌ Connection failed: {e}")
