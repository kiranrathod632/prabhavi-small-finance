import { Link, Navigate, Outlet, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
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
    <div className="min-h-screen panel-shell flex items-center justify-center p-3 sm:p-6 relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-hero opacity-60 dark:opacity-100" />
      <div className="glow-orb w-96 h-96 -top-20 -right-20 bg-violet-600/15 dark:bg-violet-600/20" aria-hidden="true" />
      <div className="glow-orb w-72 h-72 bottom-10 -left-16 bg-accent-400/10 dark:bg-accent-400/12" aria-hidden="true" />

      <div className="relative w-full max-w-[320px] sm:max-w-md animate-fade-up">
        <div className="text-center mb-2.5 sm:mb-6">
          <img
            src="/logo.png"
            alt="Prabhavi Small Finance"
            className="w-11 h-11 sm:w-20 sm:h-20 mx-auto rounded-lg sm:rounded-2xl object-contain bg-white p-1 sm:p-2 shadow-glow-sm ring-1 ring-violet-500/30"
          />
          <h2 className="mt-2 sm:mt-3 font-display text-[12px] sm:text-xl font-bold gradient-text">प्रभावी स्मॉल फायनान्स</h2>
          <p className="text-[10px] sm:text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>Prabhavi Small Finance</p>
          <span className="inline-flex mt-2 sm:mt-3 tag-pill !text-[9px] sm:!text-xs !px-2 !py-1">
            <span className="w-1 h-1 sm:w-1.5 sm:h-1.5 rounded-full bg-accent-400" />
            {isRegisterPage ? t('adminRegister') : t('adminPortal')}
          </span>
        </div>

        <div className="auth-card p-3.5 sm:p-8 pt-4 sm:pt-8">
          <Outlet />
        </div>

        <p className="text-center text-[10px] sm:text-xs mt-2.5 sm:mt-4" style={{ color: 'var(--text-muted)' }}>
          <Link to="/" className="link-accent">{t('backToHome')}</Link>
          {' · '}
          <Link to="/user/login" className="link-accent">{t('userPortal')}</Link>
        </p>
      </div>
    </div>
  );
};

export default AdminAuthLayout;
