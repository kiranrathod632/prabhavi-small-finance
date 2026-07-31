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
    <div className="min-h-[100dvh] flex flex-col lg:flex-row panel-shell relative overflow-x-hidden">
      <div className="glow-orb w-[20rem] h-[20rem] -top-20 -left-16 bg-violet-600/25 lg:w-[28rem] lg:h-[28rem]" aria-hidden="true" />
      <div className="glow-orb w-56 h-56 bottom-0 right-0 bg-accent-400/12" aria-hidden="true" />

      {/* Desktop brand panel — always dark branded */}
      <div className="relative hidden lg:flex lg:w-[42%] xl:w-[40%] text-white p-12 flex-col justify-between overflow-hidden min-h-screen bg-[#05070a]">
        <div className="absolute inset-0 bg-gradient-hero opacity-90" />
        <div className="relative z-10">
          <div className="flex flex-col items-start gap-4">
            <img src="/logo.png" alt="Prabhavi Small Finance" className="w-20 h-20 rounded-2xl object-contain bg-white p-1.5 shadow-glow-sm ring-1 ring-violet-500/30" />
            <div>
              <h2 className="font-display text-2xl font-bold gradient-text">प्रभावी स्मॉल फायनान्स</h2>
              <p className="text-sm text-slate-400 mt-1">Prabhavi Small Finance</p>
            </div>
          </div>
          <div className="mt-8 p-4 rounded-2xl border border-white/10 bg-white/5 backdrop-blur-sm">
            <p className="text-xs font-bold uppercase tracking-wider text-violet-300 mb-3">📍 महाराष्ट्र पाचोरा · स्थापना ४ जुलै २०१९</p>
            <div className="grid grid-cols-1 gap-2">
              {[
                { name: 'विठ्ठल दारासिंग राठोड', role: 'अध्यक्ष', phone: '8407912252' },
                { name: 'रमेश रामलाल राठोड', role: 'उपाध्यक्ष', phone: '8459050109' },
              ].map((m) => (
                <div key={m.phone} className="flex items-center justify-between text-sm">
                  <span className="text-slate-300">{m.name} <span className="text-violet-400 text-xs">({m.role})</span></span>
                  <span className="text-slate-500 text-xs">{m.phone}</span>
                </div>
              ))}
            </div>
          </div>
          <span className="inline-flex mt-8 tag-pill">
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
      <div className="flex-1 flex flex-col items-center justify-start lg:justify-center py-3 sm:py-8 lg:py-10 relative min-h-[100dvh] lg:min-h-0">
        <div className="auth-shell-mobile">
          <img src="/logo.png" alt="Prabhavi Small Finance" className="w-10 h-10 rounded-lg object-contain bg-white p-0.5 shadow-glow-sm ring-1 ring-violet-500/30" />
          <p className="font-display font-bold text-[12px] gradient-text">प्रभावी स्मॉल फायनान्स</p>
          <p className="text-[10px] max-w-[220px] leading-snug" style={{ color: 'var(--text-muted)' }}>{t('tagline')}</p>
        </div>

        <div className="auth-form-wrap animate-fade-up flex-1 lg:flex-none w-full flex flex-col">
          <div className="auth-card px-3 py-3.5 sm:px-8 sm:py-8 flex-1 lg:flex-none">
            <Outlet />
          </div>
          <p className="mt-2.5 sm:mt-5 text-center text-[10px] sm:text-xs lg:hidden pb-3" style={{ color: 'var(--text-muted)' }}>
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
