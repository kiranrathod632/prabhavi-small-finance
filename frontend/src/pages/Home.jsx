import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { HiMenu, HiX, HiMoon, HiSun } from 'react-icons/hi';
import BrandLogo from '../components/BrandLogo';
import LanguageSelector from '../components/LanguageSelector';
import { useTheme } from '../context/ThemeContext';

const Home = () => {
  const { t } = useTranslation();
  const { darkMode, toggleDarkMode } = useTheme();
  const [menuOpen, setMenuOpen] = useState(false);

  const services = [
    { title: t('home.service1Title'), text: t('home.service1Text') },
    { title: t('home.service2Title'), text: t('home.service2Text') },
    { title: t('home.service3Title'), text: t('home.service3Text') },
    { title: t('home.service4Title'), text: t('home.service4Text') },
  ];

  const team = [
    { name: t('home.member1Name'), role: t('home.member1Role'), phone: '8407912252' },
    { name: t('home.member2Name'), role: t('home.member2Role'), phone: '8459050109' },
    { name: t('home.member3Name'), role: t('home.member3Role'), phone: '7498502572' },
    { name: t('home.member4Name'), role: t('home.member4Role'), phone: '8080178939' },
    { name: t('home.member5Name'), role: t('home.member5Role'), phone: '9322361650' },
    { name: t('home.member6Name'), role: t('home.member6Role'), phone: '9529817258' },
    { name: t('home.member7Name'), role: t('home.member7Role'), phone: '7875048923' },
    { name: t('home.member8Name'), role: t('home.member8Role'), phone: '7822026084' },
  ];

  const closeMenu = () => setMenuOpen(false);
  const navLink =
    'px-3 py-1.5 rounded-full text-xs sm:text-sm transition-colors hover:bg-black/5 dark:hover:bg-white/10';
  const navLinkColor = darkMode ? 'text-slate-300 hover:text-white' : 'text-slate-600 hover:text-slate-900';

  return (
    <div className="panel-shell overflow-x-hidden font-sans">
      <div className="glow-orb w-72 h-72 sm:w-96 sm:h-96 -top-16 -right-16 bg-accent-400/15 dark:bg-accent-400/20" aria-hidden="true" />
      <div className="glow-orb w-64 h-64 sm:w-80 sm:h-80 bottom-32 -left-16 bg-violet-500/15 dark:bg-violet-500/20" aria-hidden="true" />

      <header className="sticky top-0 z-50 px-3 sm:px-4 py-2 sm:py-3">
        <div className="max-w-6xl mx-auto glass rounded-2xl px-3 sm:px-5 py-2 sm:py-2.5 flex items-center justify-between gap-2 shadow-soft">
          <BrandLogo size="sm" variant="light" />

          <nav className="hidden md:flex items-center gap-1 glass-nav">
            <a href="#about" className={`${navLink} ${navLinkColor}`}>{t('home.navAbout')}</a>
            <a href="#services" className={`${navLink} ${navLinkColor}`}>{t('home.navServices')}</a>
            <a href="#team" className={`${navLink} ${navLinkColor}`}>{t('home.navTeam')}</a>
            <a href="#contact" className={`${navLink} ${navLinkColor}`}>{t('home.navContact')}</a>
          </nav>

          <div className="flex items-center gap-1 sm:gap-2">
            <LanguageSelector className="text-[11px] sm:text-xs" dark={darkMode} />
            <button
              type="button"
              onClick={toggleDarkMode}
              className="p-1.5 sm:p-2 rounded-lg hover:bg-black/5 dark:hover:bg-white/10"
              aria-label="Toggle theme"
            >
              {darkMode ? <HiSun className="w-4 h-4" /> : <HiMoon className="w-4 h-4" />}
            </button>
            <Link
              to="/user/login"
              className="hidden sm:inline-flex min-h-8 px-3 items-center rounded-full text-[11px] sm:text-xs border border-black/10 dark:border-white/15 hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
            >
              {t('home.ctaUser')}
            </Link>
            {/* <Link to="/admin/login" className="hidden sm:inline-flex min-h-8 px-3 items-center rounded-full text-[11px] sm:text-xs btn-primary">
              {t('home.ctaAdmin')}
            </Link> */}
            <button
              type="button"
              className="md:hidden p-1.5 rounded-xl hover:bg-black/5 dark:hover:bg-white/10"
              onClick={() => setMenuOpen((v) => !v)}
              aria-label="Toggle menu"
            >
              {menuOpen ? <HiX className="w-5 h-5" /> : <HiMenu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {menuOpen && (
          <div className="md:hidden max-w-6xl mx-auto mt-2 glass rounded-2xl animate-fade-in overflow-hidden">
            <nav className="px-3 py-2.5 flex flex-col gap-0.5">
              {[
                ['#about', t('home.navAbout')],
                ['#services', t('home.navServices')],
                ['#team', t('home.navTeam')],
                ['#contact', t('home.navContact')],
              ].map(([href, label]) => (
                <a key={href} href={href} onClick={closeMenu} className="px-3 py-2 rounded-xl hover:bg-black/5 dark:hover:bg-white/10 text-[13px] font-medium">
                  {label}
                </a>
              ))}
              <div className="pt-2 mt-1 border-t border-black/5 dark:border-white/10 flex flex-col gap-2">
                <Link to="/user/login" onClick={closeMenu} className="btn-secondary text-center text-[12px]">
                  {t('home.ctaUser')}
                </Link>
                <Link to="/admin/login" onClick={closeMenu} className="btn-primary text-center text-[12px]">
                  {t('home.ctaAdmin')}
                </Link>
              </div>
            </nav>
          </div>
        )}
      </header>

      <section className="relative overflow-hidden min-h-[52vh] sm:min-h-[68vh] flex items-center">
        <div className="absolute inset-0 bg-gradient-hero opacity-80 dark:opacity-100" />
        <div className="relative max-w-6xl mx-auto px-4 py-10 sm:py-16 md:py-20 w-full">
          <div className="animate-fade-up">
            <span className="tag-pill mb-4 sm:mb-5 !text-[10px] sm:!text-xs !px-2.5 !py-1">
              <span className="w-1.5 h-1.5 rounded-full bg-accent-400 shadow-glow-sm" />
              {t('tagline')}
            </span>
          </div>
          <div className="animate-fade-up" style={{ animationDelay: '0.05s' }}>
            {/* <BrandLogo to={null} size="xl" variant="light" stacked showTagline className="mx-auto items-center mb-4 sm:mb-6" /> */}
          </div>
          <h1 className="text-[1.4rem] sm:text-3xl md:text-4xl lg:text-5xl font-bold max-w-3xl leading-tight animate-fade-up" style={{ animationDelay: '0.1s' }}>
            <span className="gradient-text">{t('home.heroTitle')}</span>
          </h1>
          <p className="mt-3 sm:mt-4 text-[13px] sm:text-base max-w-xl leading-relaxed animate-fade-up" style={{ color: 'var(--text-muted)', animationDelay: '0.18s' }}>
            {t('home.heroSubtitle')}
          </p>
          <div className="mt-5 sm:mt-7 flex flex-col xs:flex-row flex-wrap gap-2 sm:gap-3 animate-fade-up" style={{ animationDelay: '0.26s' }}>
            <Link to="/user/login" className="btn-primary px-5 sm:px-7 text-[12px] sm:text-sm min-h-9 justify-center">
              {t('home.ctaUser')}
            </Link>
            <Link
              to="/admin/login"
              className="inline-flex items-center justify-center min-h-9 px-5 sm:px-7 rounded-full border border-accent-400/35 hover:bg-accent-400/10 font-semibold text-[12px] sm:text-sm transition-all"
            >
              {t('home.ctaAdmin')}
            </Link>
          </div>
        </div>
      </section>

      <section id="about" className="relative border-t" style={{ borderColor: 'var(--border-subtle)' }}>
        <div className="max-w-6xl mx-auto px-4 py-10 sm:py-14 md:py-16">
          <h2 className="font-display text-[1.15rem] sm:text-2xl md:text-3xl font-semibold mb-2.5 sm:mb-3 gradient-text leading-snug">
            {t('home.aboutTitle')}
          </h2>
          <p className="max-w-3xl mb-6 sm:mb-8 text-[13px] sm:text-base leading-relaxed" style={{ color: 'var(--text-muted)' }}>
            {t('home.aboutText')}
          </p>
          <div className="grid grid-cols-1 xs:grid-cols-3 gap-2.5 sm:gap-4">
            {[
              { label: t('home.foundedLabel'), value: t('home.foundedValue') },
              { label: t('home.customersLabel'), value: t('home.customersValue') },
              { label: t('home.branchesLabel'), value: t('home.branchesValue') },
            ].map((item) => (
              <div key={item.label} className="card !p-3 sm:!p-4 hover:shadow-glow-sm transition-all duration-300">
                <p className="text-[11px] sm:text-sm font-medium mb-0.5" style={{ color: 'var(--text-muted)' }}>{item.label}</p>
                <p className="text-lg sm:text-2xl font-bold gradient-text leading-tight">{item.value}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="services" className="relative border-t" style={{ borderColor: 'var(--border-subtle)' }}>
        <div className="max-w-6xl mx-auto px-4 py-10 sm:py-14 md:py-16">
          <h2 className="font-display text-[1.15rem] sm:text-2xl md:text-3xl font-semibold mb-5 sm:mb-7 gradient-text">
            {t('home.servicesTitle')}
          </h2>
          <div className="grid grid-cols-1 xs:grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4">
            {services.map((s) => (
              <div key={s.title} className="card !p-3.5 sm:!p-4 hover:-translate-y-1 transition-all duration-300 group">
                <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-lg bg-gradient-brand-soft border border-accent-400/20 flex items-center justify-center mb-2.5 group-hover:shadow-glow-sm transition-shadow">
                  <span className="w-1.5 h-1.5 rounded-full bg-accent-400" />
                </div>
                <h3 className="text-[13px] sm:text-base font-semibold text-accent-600 dark:text-accent-400 mb-1 leading-snug">{s.title}</h3>
                <p className="text-[11px] sm:text-sm leading-relaxed" style={{ color: 'var(--text-muted)' }}>{s.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="team" className="relative border-t" style={{ borderColor: 'var(--border-subtle)' }}>
        <div className="max-w-6xl mx-auto px-4 py-10 sm:py-14 md:py-16">
          <h2 className="font-display text-[1.15rem] sm:text-2xl md:text-3xl font-semibold mb-1 gradient-text">
            {t('home.teamTitle')}
          </h2>
          <p className="text-[12px] sm:text-sm mb-6 sm:mb-8" style={{ color: 'var(--text-muted)' }}>{t('home.teamSubtitle')}</p>
          <div className="team-hex-grid">
            {team.map((m, i) => (
              <div key={m.phone} className="team-hex-card" style={{ animationDelay: `${i * 0.06}s` }}>
                <div className="team-hex" aria-hidden="true">{m.name.charAt(0)}</div>
                <h3 className="team-hex-name">{m.name}</h3>
                <p className="team-hex-role">{m.role}</p>
                <a href={`tel:${m.phone}`} className="team-hex-phone">{m.phone}</a>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="contact" className="relative border-t" style={{ borderColor: 'var(--border-subtle)' }}>
        <div className="max-w-6xl mx-auto px-4 py-10 sm:py-14 md:py-16">
          <div className="grid md:grid-cols-2 gap-6 sm:gap-8 items-center">
            <div>
              <h2 className="font-display text-[1.15rem] sm:text-2xl md:text-3xl font-semibold mb-2.5 sm:mb-3 gradient-text">
                {t('home.contactTitle')}
              </h2>
              <p className="text-[13px] sm:text-base mb-1.5 leading-relaxed" style={{ color: 'var(--text-muted)' }}>{t('home.contactAddress')}</p>
              <p className="text-[13px] sm:text-base mb-1.5" style={{ color: 'var(--text-muted)' }}>{t('home.contactEmail')}</p>
              <p className="text-[13px] sm:text-base" style={{ color: 'var(--text-muted)' }}>{t('home.contactPhone')}</p>
            </div>
          </div>
        </div>
      </section>

      <footer className="border-t py-4 sm:py-5 text-center text-[11px] sm:text-sm px-4" style={{ borderColor: 'var(--border-subtle)', color: 'var(--text-faint)' }}>
        <p>© {new Date().getFullYear()} {t('appName')} ({t('appShortName')}). {t('home.footerRights')}</p>
      </footer>
    </div>
  );
};

export default Home;
