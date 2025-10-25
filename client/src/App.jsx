import { Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import PrivateRoute from './components/PrivateRoute';
import Dashboard from './pages/Dashboard';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import TransactionsPage from './pages/TransactionsPage';
import AccountsPage from './pages/AccountsPage';
import TransfersPage from './pages/TransfersPage';
import SettingsPage from './pages/SettingsPage.jsx';
import BudgetsPage from './pages/BudgetsPage.jsx';
import DataPage from './pages/DataPage.jsx';
import RecurringPage from './pages/RecurringPage.jsx';
import ProjectionsPage from './pages/ProjectionsPage.jsx';
import ForgotPasswordOtpPage from './pages/ForgotPasswordOtpPage.jsx';
import VerifyOtpPage from './pages/VerifyOtpPage.jsx';
import ResetPasswordOtpPage from './pages/ResetPasswordOtpPage.jsx';

function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/forgotpassword" element={<ForgotPasswordOtpPage />} />
      <Route path="/verify-otp" element={<VerifyOtpPage />} />
      <Route path="/resetpassword" element={<ResetPasswordOtpPage />} />
      
      {/* Protected Routes */}
      <Route element={<PrivateRoute />}>
        <Route element={<Layout />}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/transactions" element={<TransactionsPage />} />
          <Route path="/accounts" element={<AccountsPage />} />
          <Route path="/transfers" element={<TransfersPage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="/budgets" element={<BudgetsPage />} />
          <Route path="/data" element={<DataPage />} />
          <Route path="/recurring" element={<RecurringPage />} />
          <Route path="/projections" element={<ProjectionsPage />} />
          {/* Add other protected routes here */}
        </Route>
      </Route>
    </Routes>
  );
}

export default App;