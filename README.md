Basic full stack App for the Tech exercise of Red Mati:

Terminal 1 — API:
cd RedMati.Counsel.API
npm run dev


Terminal 2 — UI:
cd RedMati.Counsel.UI
npm run dev

Then open http://localhost:5173 and log in with:

Email:	counsellor@komodo.test
Password:	Password1!

Initial data seeded:

Tenant komodo-saint-peter — public referral form at /referral/komodo-saint-peter
• 3 referrals (PENDING, ASSIGNED, CLOSED)
• 1 case profile with 1 appointment and 1 case note

• Second counsellor jane@komodo.test / Password1! (Jane Smith) — use this to test access-sharing
• Note: Data is in-memory only — resets every time you restart the API.

