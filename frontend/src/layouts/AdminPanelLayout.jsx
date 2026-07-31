import { useState } from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import AdminSidebar from '../components/admin/AdminSidebar';
import AdminNavbar from '../components/admin/AdminNavbar';
import { useAuth } from '../context/AuthContext';
import { PageLoader } from '../components/LoadingSpinner';
import { ADMIN_PANEL_ROLES, getDashboardPath } from '../utils/roles';

const AdminPanelLayout = ({ allowedRoles = ADMIN_PANEL_ROLES }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { user, loading, role, dashboardPath } = useAuth();

  if (loading) return <PageLoader />;
  if (!user) return <Navigate to="/admin/login" replace />;

  const homePath = dashboardPath || getDashboardPath(role);

  if (allowedRoles.length > 0 && !allowedRoles.includes(role)) {
    return <Navigate to={homePath} replace />;
  }

  if (!ADMIN_PANEL_ROLES.includes(role)) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <div className="panel-shell">
      <AdminSidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="lg:ml-64 min-h-screen flex flex-col transition-[margin] duration-200">
        <AdminNavbar onMenuClick={() => setSidebarOpen(true)} />
        <main className="flex-1 p-3 sm:p-5 md:p-6 lg:p-8 max-w-[1600px] w-full mx-auto overflow-x-hidden">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default AdminPanelLayout;
