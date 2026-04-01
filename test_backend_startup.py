import sys
import os
try:
    from backend.app import create_app
    print("Backend import successful")
    app = create_app()
    print("App creation successful")
except Exception as e:
    print(f"Error during import/creation: {e}")
    import traceback
    traceback.print_exc()
