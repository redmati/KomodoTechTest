import express from 'express';
import cors from 'cors';

// Initialise DB first (creates tables + seeds data)
import './db';

import authRoutes from './routes/authRoutes';
import publicRoutes from './routes/publicRoutes';
import referralRoutes from './routes/referralRoutes';
import caseProfileRoutes from './routes/caseProfileRoutes';
import appointmentRoutes from './routes/appointmentRoutes';
import caseNoteRoutes from './routes/caseNoteRoutes';
import userRoutes from './routes/userRoutes';

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());

app.use('/api/v1/auth',          authRoutes);
app.use('/api/v1/public',        publicRoutes);
app.use('/api/v1/referrals',     referralRoutes);
app.use('/api/v1/case-profiles', caseProfileRoutes);
app.use('/api/v1/appointments',  appointmentRoutes);
app.use('/api/v1/case-notes',    caseNoteRoutes);
app.use('/api/v1/users',         userRoutes);

app.get('/health', (_req, res) => res.json({ status: 'ok' }));

app.listen(PORT, () => {
  console.log(`\n🚀  RedMati Counsel API  →  http://localhost:${PORT}`);
  console.log(`\n📋  Test credentials:`);
  console.log(`     Email:    counsellor@komodo.test`);
  console.log(`     Password: Password1!`);
  console.log(`     Tenant:   komodo-saint-peter  (public referral form URL: /referral/komodo-saint-peter)\n`);
});
