import { Link, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  HiHome, HiUsers, HiCash, HiCreditCard, HiDocumentText,
  HiCurrencyRupee, HiChartBar, HiBell, HiLogout,
  HiShieldCheck, HiCog, HiX, HiShoppingCart,
} from 'react-icons/hi';
import { useAuth } from '../../context/AuthContext';
import BrandLogo from '../BrandLogo';
import { ROLES, hasPermission } from '../../utils/roles';

const getAdminBase = (role) => {
  if (role === ROLES.SUPER_ADMIN) return '/super-admin';
  return '/admin';
};

const AdminSidebar = ({ isOpen, onClose }) => {
  const { pathname } = useLocation();
  const { role, user, logout } = useAuth();
  const { t } = useTranslation();
  const base = getAdminBase(role);

  const allLinks = [
    { to: `${base}/dashboard`, label: t('dashboard'), icon: HiHome, perm: null },
    { to: `${base}/users`, label: t('users'), icon: HiUsers, perm: 'users.view' },
    { to: `${base}/loans`, label: t('loans'), icon: HiCash, perm: 'loans.view' },
    { to: `${base}/emis`, label: t('emis'), icon: HiCreditCard, perm: 'emis.view' },
    { to: `${base}/transactions`, label: t('transactions'), icon: HiDocumentText, perm: 'transactions.view' },
    { to: `${base}/funds`, label: t('funds'), icon: HiCurrencyRupee, perm: 'funds.view' },
    { to: `${base}/purchases`, label: t('adminPurchases.nav') || 'Purchases', icon: HiShoppingCart, perm: 'funds.view' },
    { to: `${base}/commissions`, label: t('commission.title') || 'Commission', icon: HiChartBar, perm: 'commission.view' },
    { to: `${base}/reports`, label: t('reports'), icon: HiChartBar, perm: 'reports.view' },
    { to: `${base}/notifications`, label: t('notifications'), icon: HiBell, perm: null },
    { to: `${base}/profile`, label: t('profile'), icon: HiCog, perm: null },
  ];

  let links = allLinks.filter(({ perm }) => !perm || role === ROLES.SUPER_ADMIN || role === ROLES.ADMIN || hasPermission(user, perm));

  if (role === ROLES.SUPER_ADMIN) {
    links.splice(1, 0, { to: `${base}/manage-admins`, label: t('manageAdmins.title'), icon: HiShieldCheck, perm: null });
  }

  const isActive = (to) => pathname === to || pathname.startsWith(`${to}/`);

  return (
    <>
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden animate-fade-in"
          onClick={onClose}
          aria-hidden="true"
        />
      )}
      <aside
        className={`sidebar-panel fixed top-0 left-0 z-50 h-full w-64 flex flex-col border-r backdrop-blur-xl transform transition-transform duration-250 ease-out lg:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="p-3 sm:p-5 border-b border-accent-400/10 flex items-start justify-between gap-2">
          <div className="min-w-0">
            <BrandLogo to={`${base}/dashboard`} size="sm" variant="light" forceShort onClick={onClose} />
          </div>
          <button
            type="button"
            onClick={onClose}
            className="lg:hidden p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-primary-800 text-slate-500 dark:text-primary-400"
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
              className={`nav-link ${
                isActive(to)
                  ? 'nav-link-active'
                  : 'nav-link-idle'
              }`}
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

export default AdminSidebar;
