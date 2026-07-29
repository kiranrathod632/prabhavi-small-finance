import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { HiMenu, HiX } from 'react-icons/hi';
import BrandLogo from '../components/BrandLogo';
import LanguageSelector from '../components/LanguageSelector';

const Home = () => {
  const { t } = useTranslation();
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

  return (
    <div className="min-h-screen bg-[#05070a] text-white font-sans relative overflow-x-hidden">
      <div className="glow-orb w-96 h-96 -top-20 -right-20 bg-accent-400/20" aria-hidden="true" />
      <div className="glow-orb w-80 h-80 bottom-40 -left-20 bg-violet-500/20" aria-hidden="true" />

      {/* ── Header ── */}
      <header className="sticky top-0 z-50 px-3 sm:px-4 py-2 sm:py-4">
        <div className="max-w-6xl mx-auto glass rounded-xl sm:rounded-2xl px-3 sm:px-4 py-2.5 sm:py-3 flex items-center justify-between gap-2 sm:gap-3 shadow-soft">
          <BrandLogo size="sm" variant="light" />

          <nav className="hidden md:flex items-center gap-1 glass-nav">
            <a href="#about" className="px-3 py-1.5 rounded-full text-xs sm:text-sm text-primary-200 hover:text-white hover:bg-white/10 transition-colors">{t('home.navAbout')}</a>
            <a href="#services" className="px-3 py-1.5 rounded-full text-xs sm:text-sm text-primary-200 hover:text-white hover:bg-white/10 transition-colors">{t('home.navServices')}</a>
            <a href="#team" className="px-3 py-1.5 rounded-full text-xs sm:text-sm text-primary-200 hover:text-white hover:bg-white/10 transition-colors">{t('home.navTeam')}</a>
            <a href="#contact" className="px-3 py-1.5 rounded-full text-xs sm:text-sm text-primary-200 hover:text-white hover:bg-white/10 transition-colors">{t('home.navContact')}</a>
          </nav>

          <div className="flex items-center gap-1.5 sm:gap-3">
            <LanguageSelector className="text-xs sm:text-sm" dark />
            <Link
              to="/user/login"
              className="hidden sm:inline-flex min-h-9 px-3 sm:px-4 items-center rounded-full text-xs sm:text-sm border border-white/15 hover:bg-white/10 transition-colors"
            >
              {t('home.ctaUser')}
            </Link>
            <Link
              to="/admin/login"
              className="hidden sm:inline-flex min-h-9 px-3 sm:px-4 items-center rounded-full text-xs sm:text-sm btn-primary"
            >
              {t('home.ctaAdmin')}
            </Link>
            <button
              type="button"
              className="md:hidden p-2 rounded-xl hover:bg-white/10"
              onClick={() => setMenuOpen((v) => !v)}
              aria-label="Toggle menu"
            >
              {menuOpen ? <HiX className="w-5 h-5" /> : <HiMenu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {menuOpen && (
          <div className="md:hidden max-w-6xl mx-auto mt-2 glass rounded-xl sm:rounded-2xl animate-fade-in">
            <nav className="px-3 py-3 flex flex-col gap-1">
              <a href="#about" onClick={closeMenu} className="px-3 py-2 rounded-xl hover:bg-white/10 text-sm text-primary-200">{t('home.navAbout')}</a>
              <a href="#services" onClick={closeMenu} className="px-3 py-2 rounded-xl hover:bg-white/10 text-sm text-primary-200">{t('home.navServices')}</a>
              <a href="#team" onClick={closeMenu} className="px-3 py-2 rounded-xl hover:bg-white/10 text-sm text-primary-200">{t('home.navTeam')}</a>
              <a href="#contact" onClick={closeMenu} className="px-3 py-2 rounded-xl hover:bg-white/10 text-sm text-primary-200">{t('home.navContact')}</a>
              <div className="pt-2 mt-2 border-t border-white/10 flex flex-col gap-2">
                <Link to="/user/login" onClick={closeMenu} className="btn-secondary text-center text-sm border-white/20 bg-transparent text-white hover:bg-white/10">
                  {t('home.ctaUser')}
                </Link>
                <Link to="/admin/login" onClick={closeMenu} className="btn-primary text-center text-sm">
                  {t('home.ctaAdmin')}
                </Link>
              </div>
            </nav>
          </div>
        )}
      </header>

      {/* ── Hero ── */}
      <section className="relative overflow-hidden min-h-[60vh] sm:min-h-[75vh] flex items-center">
        <div className="absolute inset-0 bg-gradient-hero" />
        <div className="glow-orb w-48 sm:w-72 h-48 sm:h-72 right-5 sm:right-10 top-1/4 bg-accent-400/15 animate-float" aria-hidden="true" />
        <div className="relative max-w-6xl mx-auto px-4 py-10 sm:py-16 md:py-24 w-full">
          <div className="animate-fade-up">
            <span className="tag-pill mb-4 sm:mb-6 text-[10px] sm:text-xs">
              <span className="w-1 h-1 sm:w-1.5 sm:h-1.5 rounded-full bg-accent-400 shadow-glow-sm" />
              {t('tagline')}
            </span>
          </div>
          <div className="animate-fade-up" style={{ animationDelay: '0.05s' }}>
            <BrandLogo to={null} size="lg" variant="light" stacked showTagline className="mx-auto items-center mb-4 sm:mb-6" />
          </div>
          <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold max-w-3xl leading-tight animate-fade-up" style={{ animationDelay: '0.1s' }}>
            <span className="gradient-text">{t('home.heroTitle')}</span>
          </h1>
          <p className="mt-3 sm:mt-5 text-primary-300 text-sm sm:text-base md:text-lg max-w-xl leading-relaxed animate-fade-up" style={{ animationDelay: '0.18s' }}>
            {t('home.heroSubtitle')}
          </p>
          <div className="mt-5 sm:mt-8 flex flex-wrap gap-2 sm:gap-3 animate-fade-up" style={{ animationDelay: '0.26s' }}>
            <Link to="/user/login" className="btn-primary px-5 sm:px-8 text-sm sm:text-base">
              {t('home.ctaUser')}
            </Link>
            <Link
              to="/admin/login"
              className="inline-flex items-center justify-center min-h-9 sm:min-h-10 px-5 sm:px-8 rounded-full border border-accent-400/30 hover:bg-accent-400/10 font-semibold text-sm sm:text-base transition-all hover:shadow-glow-sm"
            >
              {t('home.ctaAdmin')}
            </Link>
          </div>
        </div>
      </section>

      {/* ── About ── */}
      <section id="about" className="relative border-t border-white/5">
        <div className="max-w-6xl mx-auto px-4 py-10 sm:py-16 md:py-20">
          <h2 className="font-display text-xl sm:text-2xl md:text-3xl font-semibold mb-3 sm:mb-4 gradient-text">{t('home.aboutTitle')}</h2>
          <p className="text-primary-300 max-w-3xl mb-6 sm:mb-10 text-sm sm:text-base leading-relaxed">{t('home.aboutText')}</p>
          <div className="grid grid-cols-3 gap-2 sm:gap-5">
            {[
              { label: t('home.foundedLabel'), value: t('home.foundedValue') },
              { label: t('home.customersLabel'), value: t('home.customersValue') },
              { label: t('home.branchesLabel'), value: t('home.branchesValue') },
            ].map((item) => (
              <div
                key={item.label}
                className="glass-card p-3 sm:p-5 hover:shadow-card-hover hover:border-accent-400/30 transition-all duration-300"
              >
                <p className="text-primary-400 text-[10px] sm:text-sm mb-0.5 sm:mb-1">{item.label}</p>
                <p className="text-base sm:text-2xl font-semibold gradient-text">{item.value}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Services ── */}
      <section id="services" className="relative border-t border-white/5">
        <div className="max-w-6xl mx-auto px-4 py-10 sm:py-16 md:py-20">
          <h2 className="font-display text-xl sm:text-2xl md:text-3xl font-semibold mb-5 sm:mb-8 gradient-text">{t('home.servicesTitle')}</h2>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-5">
            {services.map((s) => (
              <div
                key={s.title}
                className="glass-card p-3 sm:p-5 hover:-translate-y-1 hover:shadow-card-hover hover:border-violet-500/30 transition-all duration-300 group"
              >
                <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl bg-gradient-brand-soft border border-accent-400/20 flex items-center justify-center mb-2 sm:mb-3 group-hover:shadow-glow-sm transition-shadow">
                  <span className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-accent-400" />
                </div>
                <h3 className="text-xs sm:text-base md:text-lg font-semibold text-accent-400 mb-1 sm:mb-2 leading-snug">{s.title}</h3>
                <p className="text-primary-300 text-[10px] sm:text-sm leading-relaxed line-clamp-3">{s.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Team ── */}
      <section id="team" className="relative border-t border-white/5">
        <div className="max-w-6xl mx-auto px-4 py-10 sm:py-16 md:py-20">
          <h2 className="font-display text-xl sm:text-2xl md:text-3xl font-semibold mb-1 sm:mb-2 gradient-text">{t('home.teamTitle')}</h2>
          <p className="text-primary-400 text-xs sm:text-sm md:text-base mb-5 sm:mb-8">{t('home.teamSubtitle')}</p>
          <div className="grid grid-cols-2 gap-2.5 sm:gap-4 md:gap-5">
            {team.map((m) => (
              <div
                key={m.phone}
                className="glass-card p-3 sm:p-4 md:p-5 hover:shadow-card-hover hover:border-violet-500/30 transition-all duration-300 group"
              >
                <div className="w-9 h-9 sm:w-12 sm:h-12 md:w-14 md:h-14 rounded-full bg-gradient-brand flex items-center justify-center font-bold text-xs sm:text-sm md:text-base text-white mb-2 sm:mb-3 shadow-glow-sm ring-2 ring-accent-400/20 group-hover:ring-accent-400/40 transition-all">
                  {m.name.charAt(0)}
                </div>
                <h3 className="font-semibold text-[11px] sm:text-sm md:text-base leading-snug">{m.name}</h3>
                <p className="text-[10px] sm:text-xs md:text-sm text-violet-400 mt-0.5 sm:mt-1 font-medium">{m.role}</p>
                <a href={`tel:${m.phone}`} className="text-[10px] sm:text-xs text-slate-500 mt-1 sm:mt-1.5 flex items-center gap-1 hover:text-accent-400 transition-colors">
                  <span className="text-[9px] sm:text-[11px]">📞</span> {m.phone}
                </a>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Contact ── */}
      <section id="contact" className="relative border-t border-white/5">
        <div className="max-w-6xl mx-auto px-4 py-10 sm:py-16 md:py-20">
          <div className="grid md:grid-cols-2 gap-6 sm:gap-10 items-center">
            <div>
              <h2 className="font-display text-xl sm:text-2xl md:text-3xl font-semibold mb-3 sm:mb-4 gradient-text">{t('home.contactTitle')}</h2>
              <p className="text-primary-300 text-sm sm:text-base mb-1.5 sm:mb-2">{t('home.contactAddress')}</p>
              <p className="text-primary-300 text-sm sm:text-base mb-1.5 sm:mb-2">{t('home.contactEmail')}</p>
              <p className="text-primary-300 text-sm sm:text-base">{t('home.contactPhone')}</p>
            </div>
            <div className="glass-card p-4 sm:p-6 md:p-8 shadow-glow">
              <h3 className="font-display text-base sm:text-lg md:text-xl font-semibold text-accent-400 mb-3 sm:mb-4">{t('tagline')}</h3>
              <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
                <Link to="/user/login" className="flex-1 text-center btn-primary text-sm sm:text-base">
                  {t('userPortal')}
                </Link>
                <Link
                  to="/admin/login"
                  className="flex-1 text-center inline-flex items-center justify-center min-h-9 sm:min-h-10 px-4 rounded-full border border-accent-400/30 font-semibold text-sm sm:text-base hover:bg-accent-400/10 transition-all"
                >
                  {t('adminPortal')}
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="border-t border-white/5 py-4 sm:py-6 text-center text-xs sm:text-sm text-primary-500 px-4">
        <p>© {new Date().getFullYear()} {t('appName')} ({t('appShortName')}). {t('home.footerRights')}</p>
      </footer>
    </div>
  );
};

export default Home;
