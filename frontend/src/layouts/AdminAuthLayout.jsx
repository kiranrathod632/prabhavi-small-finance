import { Link, Navigate, Outlet, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import BrandLogo from '../components/BrandLogo';
import { useAuth } from '../context/AuthContext';
import { PageLoader } from '../components/LoadingSpinner';
import { isAdminPanelRole, getDashboardPath } from '../utils/roles';

const AdminAuthLayout = () => {
  const { user, loading } = useAuth();
  const { t } = useTranslation();
  const { pathname } = useLocation();
  const isRegisterPage = pathname === '/admin/register';

  if (loading) return <PageLoader />;
  if (user) {
    if (isAdminPanelRole(user.role)) {
      return <Navigate to={getDashboardPath(user.role)} replace />;
    }
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <div className="min-h-screen bg-[#05070a] flex items-center justify-center p-4 sm:p-6 relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-hero" />
      <div className="glow-orb w-96 h-96 -top-20 -right-20 bg-violet-600/20" aria-hidden="true" />
      <div className="glow-orb w-72 h-72 bottom-10 -left-16 bg-accent-400/12" aria-hidden="true" />

      <div className="relative w-full max-w-md animate-fade-up">
        <div className="text-center mb-6 sm:mb-8">
          <BrandLogo to={null} size="lg" variant="light" stacked className="mx-auto" />
          <span className="inline-flex mt-4 tag-pill">
            <span className="w-1.5 h-1.5 rounded-full bg-accent-400" />
            {isRegisterPage ? t('adminRegister') : t('adminPortal')}
          </span>
        </div>

        <div className="auth-card p-6 sm:p-8 pt-7 sm:pt-8">
          <Outlet />
        </div>

        <p className="text-center text-slate-500 text-sm mt-5">
          <Link to="/" className="link-accent">{t('backToHome')}</Link>
        </p>
      </div>
    </div>
  );
};

export default AdminAuthLayout;
