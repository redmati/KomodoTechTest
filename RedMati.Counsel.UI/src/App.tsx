import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthGuard } from './components/guards/AuthGuard';
import { AppLayout } from './components/layout/AppLayout';
import { LoginPage } from './pages/Login/LoginPage';
import { ReferralFormPage } from './pages/ReferralForm/ReferralFormPage';
import { ReferralsPage } from './pages/Referrals/ReferralsPage';
import { ReferralDetailPage } from './pages/Referrals/ReferralDetailPage';
import { CaseProfilesPage } from './pages/CaseProfiles/CaseProfilesPage';
import { CaseProfileNewPage } from './pages/CaseProfiles/CaseProfileNewPage';
import { CaseProfileDetailPage } from './pages/CaseProfiles/CaseProfileDetailPage';
import { CalendarPage } from './pages/Calendar/CalendarPage';
import { CaseNotePage } from './pages/CaseNotes/CaseNotePage';

export function App() {
  return (
    <Routes>
      {/* Public routes */}
      <Route path="/referral/:tenantCode" element={<ReferralFormPage />} />
      <Route path="/login" element={<LoginPage />} />

      {/* Authenticated routes */}
      <Route element={<AuthGuard />}>
        <Route element={<AppLayout />}>
          <Route index element={<Navigate to="/referrals" replace />} />
          <Route path="/referrals" element={<ReferralsPage />} />
          <Route path="/referrals/:id" element={<ReferralDetailPage />} />
          <Route path="/case-profiles" element={<CaseProfilesPage />} />
          <Route path="/case-profiles/new" element={<CaseProfileNewPage />} />
          <Route path="/case-profiles/:id" element={<CaseProfileDetailPage />} />
          <Route path="/calendar" element={<CalendarPage />} />
          <Route path="/calendar/:counsellorId" element={<CalendarPage />} />
          <Route path="/case-notes/:id" element={<CaseNotePage />} />
        </Route>
      </Route>

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
