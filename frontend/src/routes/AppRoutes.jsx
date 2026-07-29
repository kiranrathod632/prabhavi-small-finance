import { Routes, Route, Navigate } from 'react-router-dom';
import AuthLayout from '../layouts/AuthLayout';
import AdminAuthLayout from '../layouts/AdminAuthLayout';
import DashboardLayout from '../layouts/DashboardLayout';
import AdminPanelLayout from '../layouts/AdminPanelLayout';

import Home from '../pages/Home';
import Login from '../pages/auth/Login';
import Register from '../pages/auth/Register';
import ForgotPassword from '../pages/auth/ForgotPassword';
import ResetPassword from '../pages/auth/ResetPassword';
import AdminLogin from '../pages/auth/AdminLogin';
import AdminRegister from '../pages/auth/AdminRegister';
import CompleteProfile from '../pages/auth/CompleteProfile';

import UserDashboard from '../pages/user/UserDashboard';
import Loans from '../pages/user/Loans';
import LoanDetails from '../pages/user/LoanDetails';
import EMIs from '../pages/user/EMIs';
import EMICalculator from '../pages/user/EMICalculator';
import Transactions from '../pages/user/Transactions';
import Profile from '../pages/user/Profile';
import Notifications from '../pages/user/Notifications';

import AdminDashboard from '../pages/admin/AdminDashboard';
import AdminUsers from '../pages/admin/AdminUsers';
import AdminLoans from '../pages/admin/AdminLoans';
import AdminEMIs from '../pages/admin/AdminEMIs';
import AdminTransactions from '../pages/admin/AdminTransactions';
import AdminFunds from '../pages/admin/AdminFunds';
import AdminReports from '../pages/admin/AdminReports';
import AdminCommissions from '../pages/admin/AdminCommissions';
import ManageAdmins from '../pages/super-admin/ManageAdmins';
import UserDetail from '../pages/admin/UserDetail';

const adminPanelPages = [
  { path: 'dashboard', element: <AdminDashboard /> },
  { path: 'users', element: <AdminUsers /> },
  { path: 'loans', element: <AdminLoans /> },
  { path: 'emis', element: <AdminEMIs /> },
  { path: 'transactions', element: <AdminTransactions /> },
  { path: 'funds', element: <AdminFunds /> },
  { path: 'commissions', element: <AdminCommissions /> },
  { path: 'reports', element: <AdminReports /> },
  { path: 'notifications', element: <Notifications /> },
  { path: 'profile', element: <Profile /> },
];

const AppRoutes = () => (
  <Routes>
    {/* Public home */}
    <Route path="/" element={<Home />} />

    {/* User portal auth */}
    <Route element={<AuthLayout />}>
      <Route path="/user/login" element={<Login />} />
      <Route path="/user/register" element={<Register />} />
      <Route path="/user/forgot-password" element={<ForgotPassword />} />
      {/* Backward compatible redirects */}
      <Route path="/login" element={<Navigate to="/user/login" replace />} />
      <Route path="/register" element={<Navigate to="/user/register" replace />} />
      <Route path="/forgot-password" element={<Navigate to="/user/forgot-password" replace />} />
    </Route>
    <Route path="/reset-password/:token" element={<ResetPassword />} />
    <Route path="/complete-profile" element={<CompleteProfile />} />

    {/* Admin portal auth */}
    <Route element={<AdminAuthLayout />}>
      <Route path="/admin/login" element={<AdminLogin />} />
      <Route path="/admin/register" element={<AdminRegister />} />
      <Route path="/super-admin/login" element={<Navigate to="/admin/login" replace />} />
    </Route>

    {/* User panel */}
    <Route element={<DashboardLayout allowedRoles={['user']} />}>
      <Route path="/dashboard" element={<UserDashboard />} />
      <Route path="/loans" element={<Loans />} />
      <Route path="/loans/:id" element={<LoanDetails />} />
      <Route path="/emi-calculator" element={<EMICalculator />} />
      <Route path="/emis" element={<EMIs />} />
      <Route path="/transactions" element={<Transactions />} />
      <Route path="/profile" element={<Profile />} />
      <Route path="/notifications" element={<Notifications />} />
    </Route>

    {/* Admin panel */}
    <Route element={<AdminPanelLayout allowedRoles={['admin']} />}>
      {adminPanelPages.map(({ path, element }) => (
        <Route key={`admin-${path}`} path={`/admin/${path}`} element={element} />
      ))}
      <Route path="/admin/users/:id" element={<UserDetail />} />
    </Route>

    {/* Super Admin panel */}
    <Route element={<AdminPanelLayout allowedRoles={['super_admin']} />}>
      {adminPanelPages.map(({ path, element }) => (
        <Route key={`sa-${path}`} path={`/super-admin/${path}`} element={element} />
      ))}
      <Route path="/super-admin/manage-admins" element={<ManageAdmins />} />
      <Route path="/super-admin/users/:id" element={<UserDetail />} />
    </Route>

    <Route path="*" element={<Navigate to="/" replace />} />
  </Routes>
);

export default AppRoutes;
