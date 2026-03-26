# PROJECT HANDOVER: Coolsun Hostel ERP (Finalization Phase)
This document provides all technical context needed to continue the development of the Coolsun Hostel Management System.

## 🚀 Current Technical State
- **Backend**: Flask (Python) + SQLAlchemy + SQLite (`hostel.db`).
- **Frontend**: React (Vite) + Vanilla CSS + Tailwind + Framer Motion.
- **Key Modules**:
  - **Onboarding Wizard**: Pro-rata billing, custom rent due dates, document uploads.
  - **Bulk Renting**: Whole-floor agreements and automatic sub-tenant allocations.
  - **Finance Engine**: Automated ledger, expense tracking, and bill management.
  - **Rooms Inventory**: Auto-detects floor from room number prefix (101 -> Floor 1).

## 🛠️ Recent Critical Fixes (Final Stretch)
1. **Model & Schema Sync**: Added missing columns to `Tenant`, `Task`, `Expense`, `FineType`, and `MaintenanceRequest`.
2. **Tenants UI Crash**: Fixed React crash in `Tenants.jsx` (compliance object rendering issue).
3. **Auto Floor Logic**: Typing room numbers (e.g. 101, 204) now auto-fills the Floor field in Room Inventory.
4. **Custom Rent Day**: Added `dueDay` selector in Wizard Step 3 for precise billing cycles.
5. **Enhanced Admin Reset**: 
   - Added a "Danger Zone" in Settings.
   - **Feature**: Optional "Wipe Rooms & Floors" checkbox for a 100% fresh start.
   - **Verification**: Reset API now clears Tasks and Audit logs too.
6. **Save Changes Feedback**: Added "Saving..." and "Success" states to the main Save button in Settings for better UX.
7. **Pakistani Phone & CNIC Formatting**: 
   - **Phone**: Auto-strips leading `0` and adds `+92` prefix.
   - **CNIC**: Auto-injects dashes (`xxxxx-xxxxxxx-x`).
8. **Bulk Owner Logic Fix**: Resolved a critical bug where Bulk Floor owners were not saving correctly; Finance now accurately generates one bulk rent entry and skips individual room rent for the floor.
9. **Onboarding Cycle**: Test a mid-month move-in with a custom `dueDay` to verify pro-rata calculation.