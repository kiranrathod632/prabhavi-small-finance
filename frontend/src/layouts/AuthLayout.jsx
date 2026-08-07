import { Link, Navigate, Outlet } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { HiMoon, HiSun } from 'react-icons/hi';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { PageLoader } from '../components/LoadingSpinner';
import BrandLogo from '../components/BrandLogo';
import { getDashboardPath, isAdminPanelRole } from '../utils/roles';

// const BOARD_HIGHLIGHTS = [
//   { name: 'विठ्ठल दारासिंग राठोड', role: 'अध्यक्ष', phone: '8407912252' },
//   { name: 'रमेश रामलाल राठोड', role: 'उपाध्यक्ष', phone: '8459050109' },
// ];

const AuthLayout = () => {
  const { user, loading } = useAuth();
  const { darkMode, toggleDarkMode } = useTheme();
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
      <div className="glow-orb w-[20rem] h-[20rem] -top-20 -left-16 bg-violet-600/20 dark:bg-violet-600/25 lg:w-[28rem] lg:h-[28rem]" aria-hidden="true" />
      <div className="glow-orb w-56 h-56 bottom-0 right-0 bg-accent-400/10 dark:bg-accent-400/12" aria-hidden="true" />

      {/* Desktop brand panel — follows active theme (no dark+light mix) */}
      <aside
        className={`auth-brand-panel ${
          darkMode
            ? 'bg-[#05070a] text-white'
            : 'bg-[#f4f7fb] text-slate-900 border-r border-slate-200/80'
        }`}
      >
        <div
          className={`absolute inset-0 bg-gradient-hero ${darkMode ? 'opacity-90' : 'opacity-40'}`}
          aria-hidden="true"
        />
        <div
          className={`absolute inset-0 ${
            darkMode
              ? 'bg-[radial-gradient(ellipse_at_top_left,rgba(124,58,237,0.22),transparent_55%)]'
              : 'bg-[radial-gradient(ellipse_at_top_left,rgba(99,102,241,0.12),transparent_55%)]'
          }`}
          aria-hidden="true"
        />
        <div className="auth-brand-inner">
          <div>
            <div className="flex flex-col items-start gap-3">
              <BrandLogo to="/" size="lg" variant="light" showAppName={false} />
              <div>
                <h2 className="font-display text-2xl font-bold gradient-text leading-snug">
                  प्रभावी स्मॉल फायनान्स
                </h2>
                <p className={`text-sm mt-1 ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                  Prabhavi Small Finance
                </p>
              </div>
            </div>

            <div
              className={`auth-brand-board ${
                darkMode
                  ? 'border-white/10 bg-white/[0.04]'
                  : 'border-slate-200/90 bg-white/80 shadow-sm'
              }`}
            >
              <p className={`text-[11px] font-bold tracking-wide mb-3 ${darkMode ? 'text-violet-300' : 'text-violet-700'}`}>
                📍 महाराष्ट्र पाचोरा · स्थापना ४ जुलै २०१९
              </p>
              <div className="space-y-2.5">
                {/* {BOARD_HIGHLIGHTS.map((m) => (
                  <div key={m.phone} className="flex items-start justify-between gap-3 text-sm">
                    <span className={`leading-snug ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                      {m.name}{' '}
                      <span className={`text-xs whitespace-nowrap ${darkMode ? 'text-violet-400' : 'text-violet-600'}`}>
                        ({m.role})
                      </span>
                    </span>
                    <a
                      href={`tel:${m.phone}`}
                      className={`text-xs tabular-nums shrink-0 transition-colors ${
                        darkMode ? 'text-slate-400 hover:text-cyan-300' : 'text-slate-500 hover:text-teal-700'
                      }`}
                    >
                      {m.phone}
                    </a>
                  </div>
                ))} */}
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <span
              className={`inline-flex tag-pill ${
                darkMode
                  ? '!bg-violet-500/15 !border-violet-400/30 !text-violet-200'
                  : '!bg-violet-100/80 !border-violet-200 !text-violet-700'
              }`}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-accent-400 shadow-glow-sm" />
              {t('tagline')}
            </span>
            <h1 className="font-display text-3xl xl:text-[2.35rem] font-semibold leading-tight">
              <span className={`block ${darkMode ? 'text-white' : 'text-slate-900'}`}>{t('userPortal')}</span>
              <span className="block mt-2 gradient-text text-[1.35rem] xl:text-2xl font-medium">
                {t('tagline')}
              </span>
            </h1>
            <p
              className={`max-w-md leading-relaxed text-sm xl:text-[15px] line-clamp-3 ${
                darkMode ? 'text-slate-400' : 'text-slate-600'
              }`}
            >
              {t('home.heroSubtitle')}
            </p>
            <p className={`text-sm pt-2 ${darkMode ? 'text-slate-500' : 'text-slate-500'}`}>
              <Link to="/" className="link-accent">{t('backToHome')}</Link>
              {' · '}
              <Link to="/admin/login" className="link-accent">{t('adminPortal')}</Link>
            </p>
          </div>
        </div>
      </aside>

      {/* Form panel */}
      <div className="flex-1 flex flex-col items-center justify-center relative min-h-[100dvh] py-6 sm:py-10 px-0 overflow-y-auto">
        <button
          type="button"
          onClick={toggleDarkMode}
          className="absolute top-4 right-4 z-20 p-2.5 rounded-xl border transition-colors"
          style={{
            background: 'var(--bg-card)',
            borderColor: 'var(--border-card)',
            color: 'var(--text-muted)',
          }}
          aria-label="Toggle theme"
        >
          {darkMode ? <HiSun className="w-4 h-4" /> : <HiMoon className="w-4 h-4" />}
        </button>

        <div className="auth-shell-mobile">
          <BrandLogo to="/" size="md" variant="light" showAppName={false} />
          <p className="font-display font-bold text-[13px] gradient-text">प्रभावी स्मॉल फायनान्स</p>
          <p className="text-[11px] max-w-[240px] leading-snug" style={{ color: 'var(--text-muted)' }}>
            {t('tagline')}
          </p>
        </div>

        <div className="auth-form-wrap w-full animate-fade-up">
          <div className="auth-card px-4 py-5 sm:px-8 sm:py-8">
            <Outlet />
          </div>
          <p className="mt-4 text-center text-[11px] sm:text-xs lg:hidden" style={{ color: 'var(--text-muted)' }}>
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
