import { Link, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  HiHome, HiUsers, HiCash, HiCreditCard, HiDocumentText,
  HiCurrencyRupee, HiChartBar, HiBell, HiUser, HiLogout,
  HiCalculator, HiCog, HiShieldCheck, HiX,
} from 'react-icons/hi';
import { useAuth } from '../context/AuthContext';
import BrandLogo from './BrandLogo';
import { ROLES, hasPermission } from '../utils/roles';

const ADMIN_LINKS = [
  { to: '/admin/dashboard', labelKey: 'dashboard', icon: HiHome, perm: null },
  { to: '/admin/users', labelKey: 'users', icon: HiUsers, perm: 'users.view' },
  { to: '/admin/loans', labelKey: 'loans', icon: HiCash, perm: 'loans.view' },
  { to: '/admin/emis', labelKey: 'emis', icon: HiCreditCard, perm: 'emis.view' },
  { to: '/admin/transactions', labelKey: 'transactions', icon: HiDocumentText, perm: 'transactions.view' },
  { to: '/admin/funds', labelKey: 'funds', icon: HiCurrencyRupee, perm: 'funds.view' },
  { to: '/admin/reports', labelKey: 'reports', icon: HiChartBar, perm: 'reports.view' },
  { to: '/admin/settings', labelKey: 'settings', icon: HiCog, perm: 'settings.manage' },
  { to: '/notifications', labelKey: 'notifications', icon: HiBell, perm: null },
];

const getNavLinks = (role, user, t) => {
  if (role === ROLES.USER) {
    return [
      { to: '/dashboard', label: t('dashboard'), icon: HiHome },
      { to: '/loans', label: t('myLoans'), icon: HiCash },
      { to: '/emi-calculator', label: t('emiCalculator'), icon: HiCalculator },
      { to: '/emis', label: t('emis'), icon: HiCreditCard },
      { to: '/transactions', label: t('transactions'), icon: HiDocumentText },
      { to: '/notifications', label: t('notifications'), icon: HiBell },
      { to: '/profile', label: t('profile'), icon: HiUser },
    ];
  }

  const prefix = role === ROLES.SUPER_ADMIN ? '/super-admin' : '/admin';

  const links = ADMIN_LINKS
    .filter(({ perm }) => !perm || role === ROLES.SUPER_ADMIN || role === ROLES.ADMIN || hasPermission(user, perm))
    .map(({ to, labelKey, icon }) => ({
      to: to.replace('/admin', prefix),
      label: t(labelKey),
      icon,
    }));

  if (role === ROLES.SUPER_ADMIN) {
    links.splice(1, 0, { to: '/super-admin/admins', label: t('manageAdmins'), icon: HiShieldCheck });
  }

  return links;
};

const Sidebar = ({ isOpen, onClose }) => {
  const { pathname } = useLocation();
  const { role, user, logout } = useAuth();
  const { t } = useTranslation();
  const links = getNavLinks(role, user, t);

  const isActive = (to) => pathname === to || pathname.startsWith(`${to}/`);

  return (
    <>
      {isOpen && (
        <div
          className="fixed inset-0 bg-primary-950/60 backdrop-blur-sm z-40 lg:hidden animate-fade-in"
          onClick={onClose}
          aria-hidden="true"
        />
      )}
      <aside
        className={`sidebar-panel fixed top-0 left-0 z-50 h-full w-64 flex flex-col shadow-soft transform transition-transform duration-250 ease-out lg:translate-x-0 border-r backdrop-blur-xl ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="p-3 sm:p-5 border-b border-accent-400/10 flex items-start justify-between gap-2">
          <BrandLogo size="sm" variant="light" forceShort onClick={onClose} />
          <button
            type="button"
            onClick={onClose}
            className="lg:hidden p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-white/10 text-slate-500 dark:text-primary-300"
            aria-label="Close menu"
          >
            <HiX className="w-4 h-4" />
          </button>
        </div>

        <nav className="p-2 sm:p-3 space-y-0.5 sm:space-y-1 flex-1 overflow-y-auto">
          {links.map(({ to, label, icon: Icon }) => (
            <Link
              key={to}
              to={to}
              onClick={onClose}
              className={`nav-link ${isActive(to) ? 'nav-link-active' : 'nav-link-idle'}`}
            >
              <Icon className="w-4 h-4 sm:w-5 sm:h-5 shrink-0" />
              <span className="truncate">{label}</span>
            </Link>
          ))}
        </nav>

        <div className="p-2 sm:p-3 border-t" style={{ borderColor: 'var(--border-subtle)' }}>
          <button
            type="button"
            onClick={logout}
            className="nav-link w-full text-red-600 dark:text-red-400 hover:bg-red-500/10 hover:text-red-500"
          >
            <HiLogout className="w-4 h-4 sm:w-5 sm:h-5" />
            {t('logout')}
          </button>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
