import { Navigate, Route, Routes } from "react-router-dom";
import { Layout } from "./components/Layout";
import { ProtectedRoute } from "./components/ProtectedRoute";

import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import ForgotPasswordPage from "./pages/ForgotPasswordPage";
import TrialExpiredPage from "./pages/TrialExpiredPage";
import DashboardPage from "./pages/DashboardPage";
import ProfilePage from "./pages/ProfilePage";
import FeePaymentsPage from "./pages/FeePaymentsPage";
import DonationsPage from "./pages/DonationsPage";
import LabourContributionsPage from "./pages/LabourContributionsPage";
import FinesPage from "./pages/FinesPage";
import AttendancePage from "./pages/AttendancePage";
import QrCodePage from "./pages/QrCodePage";
import InboxPage from "./pages/InboxPage";

import MembersPage from "./pages/executive/MembersPage";
import MemberDetailPage from "./pages/executive/MemberDetailPage";
import ScannerPage from "./pages/executive/ScannerPage";
import MeetingsPage from "./pages/executive/MeetingsPage";
import SendMessagePage from "./pages/executive/SendMessagePage";
import ReportsPage from "./pages/executive/ReportsPage";
import ExecutivesPage from "./pages/executive/ExecutivesPage";
import AccountsManagementPage from "./pages/executive/AccountsManagementPage";
import AdminDashboardPage from "./pages/admin/AdminDashboardPage";

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      <Route path="/trial-expired" element={<TrialExpiredPage />} />

      <Route element={<ProtectedRoute />}>
        <Route element={<Layout />}>
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="/fees" element={<FeePaymentsPage />} />
          <Route path="/donations" element={<DonationsPage />} />
          <Route path="/labour" element={<LabourContributionsPage />} />
          <Route path="/fines" element={<FinesPage />} />
          <Route path="/attendance" element={<AttendancePage />} />
          <Route path="/qr-code" element={<QrCodePage />} />
          <Route path="/inbox" element={<InboxPage />} />

          <Route element={<ProtectedRoute executiveOnly />}>
            <Route path="/members" element={<MembersPage />} />
            <Route path="/members/:id" element={<MemberDetailPage />} />
            <Route path="/scanner" element={<ScannerPage />} />
            <Route path="/send-message" element={<SendMessagePage />} />
            <Route path="/reports" element={<ReportsPage />} />
            <Route path="/executives" element={<ExecutivesPage />} />
          </Route>

          <Route element={<ProtectedRoute execOrAdminOnly />}>
            <Route path="/accounts/manage" element={<AccountsManagementPage />} />
            <Route path="/meetings" element={<MeetingsPage />} />
          </Route>

          <Route element={<ProtectedRoute adminOnly />}>
            <Route path="/admin" element={<AdminDashboardPage />} />
          </Route>
        </Route>
      </Route>

      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}
