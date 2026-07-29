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
    { name: t('home.member1Name'), role: t('home.member1Role') },
    { name: t('home.member2Name'), role: t('home.member2Role') },
    { name: t('home.member3Name'), role: t('home.member3Role') },
    { name: t('home.member4Name'), role: t('home.member4Role') },
    { name: t('home.member5Name'), role: t('home.memberR5ole') },
    { name: t('home.member6Name'), role: t('home.member6Role') },
    { name: t('home.member7Name'), role: t('home.member7Role') },
    { name: t('home.member8Name'), role: t('home.member8Role') },
  ];

  const closeMenu = () => setMenuOpen(false);

  return (
    <div className="min-h-screen bg-[#05070a] text-white font-sans relative overflow-x-hidden">
      <div className="glow-orb w-96 h-96 -top-20 -right-20 bg-accent-400/20" aria-hidden="true" />
      <div className="glow-orb w-80 h-80 bottom-40 -left-20 bg-violet-500/20" aria-hidden="true" />

      <header className="sticky top-0 z-50 px-4 py-4">
        <div className="max-w-6xl mx-auto glass rounded-2xl px-4 py-3 flex items-center justify-between gap-3 shadow-soft">
          <BrandLogo size="md" variant="light" />

          <nav className="hidden md:flex items-center gap-1 glass-nav">
            <a href="#about" className="px-4 py-2 rounded-full text-sm text-primary-200 hover:text-white hover:bg-white/10 transition-colors">{t('home.navAbout')}</a>
            <a href="#services" className="px-4 py-2 rounded-full text-sm text-primary-200 hover:text-white hover:bg-white/10 transition-colors">{t('home.navServices')}</a>
            <a href="#team" className="px-4 py-2 rounded-full text-sm text-primary-200 hover:text-white hover:bg-white/10 transition-colors">{t('home.navTeam')}</a>
            <a href="#contact" className="px-4 py-2 rounded-full text-sm text-primary-200 hover:text-white hover:bg-white/10 transition-colors">{t('home.navContact')}</a>
          </nav>

          <div className="flex items-center gap-2 sm:gap-3">
            <LanguageSelector className="w-28 hidden sm:block" dark />
            <Link
              to="/user/login"
              className="hidden sm:inline-flex min-h-10 px-4 items-center rounded-full text-sm border border-white/15 hover:bg-white/10 transition-colors"
            >
              {t('home.ctaUser')}
            </Link>
            <Link
              to="/admin/login"
              className="hidden sm:inline-flex min-h-10 px-4 items-center rounded-full text-sm btn-primary"
            >
              {t('home.ctaAdmin')}
            </Link>
            <button
              type="button"
              className="md:hidden p-2.5 rounded-xl hover:bg-white/10"
              onClick={() => setMenuOpen((v) => !v)}
              aria-label="Toggle menu"
            >
              {menuOpen ? <HiX className="w-5 h-5" /> : <HiMenu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {menuOpen && (
          <div className="md:hidden max-w-6xl mx-auto mt-2 glass rounded-2xl animate-fade-in">
            <nav className="px-4 py-4 flex flex-col gap-1">
              <a href="#about" onClick={closeMenu} className="px-3 py-2.5 rounded-xl hover:bg-white/10 text-primary-200">{t('home.navAbout')}</a>
              <a href="#services" onClick={closeMenu} className="px-3 py-2.5 rounded-xl hover:bg-white/10 text-primary-200">{t('home.navServices')}</a>
              <a href="#team" onClick={closeMenu} className="px-3 py-2.5 rounded-xl hover:bg-white/10 text-primary-200">{t('home.navTeam')}</a>
              <a href="#contact" onClick={closeMenu} className="px-3 py-2.5 rounded-xl hover:bg-white/10 text-primary-200">{t('home.navContact')}</a>
              <div className="pt-3 mt-2 border-t border-white/10 flex flex-col gap-2">
                <LanguageSelector className="w-full" dark />
                <Link to="/user/login" onClick={closeMenu} className="btn-secondary text-center border-white/20 bg-transparent text-white hover:bg-white/10">
                  {t('home.ctaUser')}
                </Link>
                <Link to="/admin/login" onClick={closeMenu} className="btn-primary text-center">
                  {t('home.ctaAdmin')}
                </Link>
              </div>
            </nav>
          </div>
        )}
      </header>

      <section className="relative overflow-hidden min-h-[75vh] flex items-center">
        <div className="absolute inset-0 bg-gradient-hero" />
        <div className="glow-orb w-72 h-72 right-10 top-1/4 bg-accent-400/15 animate-float" aria-hidden="true" />
        <div className="relative max-w-6xl mx-auto px-4 py-16 md:py-24 w-full">
          <div className="animate-fade-up">
            <span className="tag-pill mb-6">
              <span className="w-1.5 h-1.5 rounded-full bg-accent-400 shadow-glow-sm" />
              {t('tagline')}
            </span>
          </div>
          <div className="animate-fade-up" style={{ animationDelay: '0.05s' }}>
            <BrandLogo to={null} size="xl" variant="light" stacked showTagline className="mx-auto items-center mb-6" />
          </div>
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold max-w-3xl leading-tight animate-fade-up" style={{ animationDelay: '0.1s' }}>
            <span className="gradient-text">{t('home.heroTitle')}</span>
          </h1>
          <p className="mt-5 text-primary-300 text-base sm:text-lg max-w-xl leading-relaxed animate-fade-up" style={{ animationDelay: '0.18s' }}>
            {t('home.heroSubtitle')}
          </p>
          <div className="mt-8 flex flex-wrap gap-3 animate-fade-up" style={{ animationDelay: '0.26s' }}>
            <Link to="/user/login" className="btn-primary px-8">
              {t('home.ctaUser')}
            </Link>
            <Link
              to="/admin/login"
              className="inline-flex items-center justify-center min-h-10 px-8 rounded-full border border-accent-400/30 hover:bg-accent-400/10 font-semibold transition-all hover:shadow-glow-sm"
            >
              {t('home.ctaAdmin')}
            </Link>
          </div>
        </div>
      </section>

      <section id="about" className="relative border-t border-white/5">
        <div className="max-w-6xl mx-auto px-4 py-16 md:py-20">
          <h2 className="font-display text-3xl font-semibold mb-4 gradient-text">{t('home.aboutTitle')}</h2>
          <p className="text-primary-300 max-w-3xl mb-10 leading-relaxed">{t('home.aboutText')}</p>
          <div className="grid sm:grid-cols-3 gap-5">
            {[
              { label: t('home.foundedLabel'), value: t('home.foundedValue') },
              { label: t('home.customersLabel'), value: t('home.customersValue') },
              { label: t('home.branchesLabel'), value: t('home.branchesValue') },
            ].map((item) => (
              <div
                key={item.label}
                className="glass-card p-5 hover:shadow-card-hover hover:border-accent-400/30 transition-all duration-300"
              >
                <p className="text-primary-400 text-sm mb-1">{item.label}</p>
                <p className="text-2xl font-semibold gradient-text">{item.value}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="services" className="relative border-t border-white/5">
        <div className="max-w-6xl mx-auto px-4 py-16 md:py-20">
          <h2 className="font-display text-3xl font-semibold mb-8 gradient-text">{t('home.servicesTitle')}</h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {services.map((s) => (
              <div
                key={s.title}
                className="glass-card p-5 hover:-translate-y-1 hover:shadow-card-hover hover:border-violet-500/30 transition-all duration-300 group"
              >
                <div className="w-10 h-10 rounded-xl bg-gradient-brand-soft border border-accent-400/20 flex items-center justify-center mb-3 group-hover:shadow-glow-sm transition-shadow">
                  <span className="w-2 h-2 rounded-full bg-accent-400" />
                </div>
                <h3 className="text-lg font-semibold text-accent-400 mb-2">{s.title}</h3>
                <p className="text-primary-300 text-sm leading-relaxed">{s.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="team" className="relative border-t border-white/5">
        <div className="max-w-6xl mx-auto px-4 py-16 md:py-20">
          <h2 className="font-display text-3xl font-semibold mb-2 gradient-text">{t('home.teamTitle')}</h2>
          <p className="text-primary-400 mb-8">{t('home.teamSubtitle')}</p>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {team.map((m) => (
              <div
                key={m.name}
                className="glass-card p-5 hover:shadow-card-hover transition-all duration-300"
              >
                <div className="w-12 h-12 rounded-full bg-gradient-brand flex items-center justify-center font-bold text-sm text-white mb-3 shadow-glow-sm">
                  {m.name.charAt(0)}
                </div>
                <h3 className="font-semibold">{m.name}</h3>
                <p className="text-sm text-primary-400 mt-1">{m.role}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="contact" className="relative border-t border-white/5">
        <div className="max-w-6xl mx-auto px-4 py-16 md:py-20">
          <div className="grid md:grid-cols-2 gap-10 items-center">
            <div>
              <h2 className="font-display text-3xl font-semibold mb-4 gradient-text">{t('home.contactTitle')}</h2>
              <p className="text-primary-300 mb-2">{t('home.contactAddress')}</p>
              <p className="text-primary-300 mb-2">{t('home.contactEmail')}</p>
              <p className="text-primary-300">{t('home.contactPhone')}</p>
            </div>
            <div className="glass-card p-6 md:p-8 shadow-glow">
              <h3 className="font-display text-xl font-semibold text-accent-400 mb-4">{t('tagline')}</h3>
              <div className="flex flex-col sm:flex-row gap-3">
                <Link to="/user/login" className="flex-1 text-center btn-primary">
                  {t('userPortal')}
                </Link>
                <Link
                  to="/admin/login"
                  className="flex-1 text-center inline-flex items-center justify-center min-h-10 px-4 rounded-full border border-accent-400/30 font-semibold hover:bg-accent-400/10 transition-all"
                >
                  {t('adminPortal')}
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      <footer className="border-t border-white/5 py-6 text-center text-sm text-primary-500 px-4">
        <p>© {new Date().getFullYear()} {t('appName')} ({t('appShortName')}). {t('home.footerRights')}</p>
      </footer>
    </div>
  );
};

export default Home;
