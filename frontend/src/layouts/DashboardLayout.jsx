import { useState } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import Navbar from '../components/Navbar';
import { useAuth } from '../context/AuthContext';
import { PageLoader } from '../components/LoadingSpinner';
import { getDashboardPath } from '../utils/roles';

const DashboardLayout = ({ allowedRoles = [] }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { user, loading, role, dashboardPath } = useAuth();
  const location = useLocation();

  if (loading) return <PageLoader />;
  if (!user) return <Navigate to="/user/login" replace />;

  const homePath = dashboardPath || getDashboardPath(role);

  if (allowedRoles.length > 0 && !allowedRoles.includes(role)) {
    return <Navigate to={homePath} replace />;
  }

  if (
    role === 'user' &&
    user.profileSetupComplete !== true &&
    location.pathname !== '/complete-profile'
  ) {
    return <Navigate to="/complete-profile" replace />;
  }

  return (
    <div className="panel-shell">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="lg:ml-64 min-h-screen flex flex-col transition-[margin] duration-200">
        <Navbar onMenuClick={() => setSidebarOpen(true)} />
        <main className="flex-1 p-3 sm:p-5 md:p-6 lg:p-8 max-w-[1600px] w-full mx-auto overflow-x-hidden">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default DashboardLayout;
