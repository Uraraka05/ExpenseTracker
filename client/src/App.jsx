import { Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import PrivateRoute from './components/PrivateRoute';
import Dashboard from './pages/Dashboard';
import AuthPage from './pages/AuthPage';
import ForgotPasswordOtpPage from './pages/ForgotPasswordOtpPage.jsx';
import VerifyOtpPage from './pages/VerifyOtpPage.jsx';
import ResetPasswordOtpPage from './pages/ResetPasswordOtpPage.jsx';
import AccountsPage from './pages/AccountsPage';
import TransactionsPage from './pages/TransactionsPage';
import TransfersPage from './pages/TransfersPage';
import SettingsPage from './pages/SettingsPage';
import BudgetsPage from './pages/BudgetsPage';
import DataPage from './pages/DataPage';
import RecurringPage from './pages/RecurringPage';
import ProjectionsPage from './pages/ProjectionsPage';

function App() {
  return (
    <Routes>
      <Route path="/login" element={<AuthPage />} />
      <Route path="/register" element={<AuthPage />} />
      <Route path="/forgotpassword" element={<ForgotPasswordOtpPage />} />
      <Route path="/verify-otp" element={<VerifyOtpPage />} />
      <Route path="/resetpassword" element={<ResetPasswordOtpPage />} />
      <Route element={<PrivateRoute />}>
        <Route element={<Layout />}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/accounts" element={<AccountsPage />} />
          <Route path="/transactions" element={<TransactionsPage />} />
          <Route path="/transfers" element={<TransfersPage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="/budgets" element={<BudgetsPage />} />
          <Route path="/data" element={<DataPage />} />
          <Route path="/recurring" element={<RecurringPage />} />
          <Route path="/projections" element={<ProjectionsPage />} />
        </Route>
      </Route>
    </Routes>
  );
}

export default App;