import os
import sys
import subprocess
import shutil
from datetime import datetime

# ================= Configuration =================
SERVER_IP = "161.97.164.182"
SSH_USER = "root"  # Default VPS user. Can be changed to 'ubuntu' or 'admin' 
LOCAL_DB_PATH = os.path.join("backend", "instance", "hostel.db")
BACKUP_DIR = os.path.join("backend", "instance", "backups")
# =================================================

def run_cmd(command, shell=True):
    """Run a shell command and return its output."""
    try:
        result = subprocess.run(command, shell=shell, check=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
        return result.stdout.strip()
    except subprocess.CalledProcessError as e:
        print(f"❌ Command Failed: {command}")
        print(f"Error: {e.stderr.strip()}")
        sys.exit(1)

def get_container_name():
    """Dynamically finds the backend container name on Coolify."""
    print("🔍 Searching for backend container on the server...")
    cmd = f'ssh {SSH_USER}@{SERVER_IP} "docker ps --format \'{{{{.Names}}}}\' | grep backend"'
    try:
        container_names = run_cmd(cmd).split('\n')
        # Filter out empty strings and find the most likely backend container
        valid_containers = [name for name in container_names if name]
        if not valid_containers:
             print("❌ Could not find a running backend Docker container on the server.")
             sys.exit(1)
        
        container_name = valid_containers[0]
        print(f"✅ Found backend container: {container_name}")
        return container_name
    except Exception:
         print("❌ Failed to connect via SSH. Ensure the IP/User is correct and you have access.")
         sys.exit(1)

def backup_local_db():
    if not os.path.exists(LOCAL_DB_PATH):
        print("⚠️ No local database found to backup (this is fine if it's your first pull).")
        return

    os.makedirs(BACKUP_DIR, exist_ok=True)
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    backup_file = os.path.join(BACKUP_DIR, f"hostel_{timestamp}.db.bak")
    
    print(f"📦 Backing up local database to: {backup_file}")
    shutil.copy2(LOCAL_DB_PATH, backup_file)

def pull_database():
    print(f"=== PULLING DATA FROM LIVE SERVER ({SERVER_IP}) ===")
    container_name = get_container_name()
    backup_local_db()

    print("🚚 Copying live database out of docker container...")
    run_cmd(f'ssh {SSH_USER}@{SERVER_IP} "docker cp {container_name}:/app/backend/instance/hostel.db /tmp/hostel.db"')
    
    print("⏬ Downloading database to local PC...")
    # Make sure instance folder exists locally
    os.makedirs(os.path.dirname(LOCAL_DB_PATH), exist_ok=True)
    run_cmd(f'scp {SSH_USER}@{SERVER_IP}:/tmp/hostel.db "{LOCAL_DB_PATH}"')
    
    print("🧹 Cleaning up server temp files...")
    run_cmd(f'ssh {SSH_USER}@{SERVER_IP} "rm /tmp/hostel.db"')

    print("\n✅ SUCCESS! Live data has been pulled to your PC.")

def push_database():
    print(f"=== PUSHING LOCAL DATA TO LIVE SERVER ({SERVER_IP}) ===")
    print("⚠️ WARNING: THIS WILL OVERWRITE ALL LIVE DATA (Tenants, Rooms, Ledgers)!")
    confirm = input("Type 'CONFIRM' exactly to proceed: ")
    if confirm != "CONFIRM":
        print("❌ Aborted.")
        sys.exit(0)

    if not os.path.exists(LOCAL_DB_PATH):
        print(f"❌ Local database not found at {LOCAL_DB_PATH}.")
        sys.exit(1)

    container_name = get_container_name()

    print("⏫ Uploading local database to server...")
    run_cmd(f'scp "{LOCAL_DB_PATH}" {SSH_USER}@{SERVER_IP}:/tmp/hostel.db')
    
    print("🚚 Moving database into docker container...")
    run_cmd(f'ssh {SSH_USER}@{SERVER_IP} "docker cp /tmp/hostel.db {container_name}:/app/backend/instance/hostel.db"')
    
    print("🧹 Cleaning up server temp files...")
    run_cmd(f'ssh {SSH_USER}@{SERVER_IP} "rm /tmp/hostel.db"')
    
    print("🔄 Restarting backend container to apply changes...")
    run_cmd(f'ssh {SSH_USER}@{SERVER_IP} "docker restart {container_name}"')

    print("\n✅ SUCCESS! Local data has been pushed to the live server.")

if __name__ == "__main__":
    if len(sys.argv) < 2 or sys.argv[1] not in ['pull', 'push']:
        print("Usage: python scripts/sync_db.py [pull|push]")
        print("  pull : Downloads live database to local PC")
        print("  push : Uploads local database to live server (OVERWRITES LIVE DATA)")
        sys.exit(1)

    action = sys.argv[1]
    
    if action == 'pull':
        pull_database()
    elif action == 'push':
        push_database()
