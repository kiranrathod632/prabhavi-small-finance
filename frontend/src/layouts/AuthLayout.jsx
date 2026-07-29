import { Link, Navigate, Outlet } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import BrandLogo from '../components/BrandLogo';
import { useAuth } from '../context/AuthContext';
import { PageLoader } from '../components/LoadingSpinner';
import { getDashboardPath, isAdminPanelRole } from '../utils/roles';

const AuthLayout = () => {
  const { user, loading } = useAuth();
  const { t } = useTranslation();

  if (loading) return <PageLoader />;
  if (user) {
    if (user.role === 'user' && user.profileSetupComplete !== true) {
      return <Navigate to="/complete-profile" replace />;
    }
    if (isAdminPanelRole(user.role)) {
      return <Navigate to={getDashboardPath(user.role)} replace />;
    }
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <div className="min-h-[100dvh] flex flex-col lg:flex-row bg-[#05070a] relative overflow-x-hidden">
      <div className="glow-orb w-[20rem] h-[20rem] -top-20 -left-16 bg-violet-600/35 lg:w-[28rem] lg:h-[28rem]" aria-hidden="true" />
      <div className="glow-orb w-56 h-56 bottom-0 right-0 bg-accent-400/18" aria-hidden="true" />

      {/* Desktop brand panel */}
      <div className="relative hidden lg:flex lg:w-[42%] xl:w-[40%] text-white p-12 flex-col justify-between overflow-hidden min-h-screen">
        <div className="absolute inset-0 bg-gradient-hero opacity-90" />
        <div className="relative z-10">
          <BrandLogo size="md" variant="light" />
          <span className="inline-flex mt-10 tag-pill">
            <span className="w-1.5 h-1.5 rounded-full bg-accent-400 shadow-glow-sm" />
            {t('tagline')}
          </span>
          <h1 className="mt-5 font-display text-3xl xl:text-4xl font-semibold leading-tight">
            <span className="text-white">{t('userPortal')}</span>
            <span className="block mt-2 gradient-text">{t('tagline')}</span>
          </h1>
          <p className="mt-4 text-slate-400 max-w-md leading-relaxed text-base">
            {t('home.heroSubtitle')}
          </p>
          <ul className="mt-8 space-y-3">
            {[t('home.service1Title'), t('home.service2Title'), t('home.service3Title')].filter(Boolean).map((item) => (
              <li key={item} className="flex items-center gap-2.5 text-sm text-slate-400">
                <span className="w-1.5 h-1.5 rounded-full bg-gradient-brand shrink-0" />
                {item}
              </li>
            ))}
          </ul>
        </div>
        <p className="relative z-10 text-sm text-slate-500">
          <Link to="/" className="link-accent">{t('backToHome')}</Link>
          {' · '}
          <Link to="/admin/login" className="link-accent">{t('adminPortal')}</Link>
        </p>
      </div>

      {/* Form panel — full width on mobile */}
      <div className="flex-1 flex flex-col items-center justify-start lg:justify-center py-5 sm:py-8 lg:py-10 relative min-h-[100dvh] lg:min-h-0">
        <div className="auth-shell-mobile">
          <BrandLogo size="sm" variant="light" />
          <p className="text-[13px] text-slate-500 max-w-[280px] leading-snug">{t('tagline')}</p>
        </div>

        <div className="auth-form-wrap animate-fade-up flex-1 lg:flex-none w-full flex flex-col">
          <div className="auth-card px-6 py-8 xs:px-7 xs:py-9 sm:px-9 sm:py-10 flex-1 lg:flex-none">
            <Outlet />
          </div>
          <p className="mt-6 text-center text-[14px] text-slate-500 lg:hidden pb-4">
            <Link to="/" className="link-accent">{t('backToHome')}</Link>
            {' · '}
            <Link to="/admin/login" className="link-accent">{t('adminPortal')}</Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default AuthLayout;
