import { HiMenu, HiMoon, HiSun, HiBell } from 'react-icons/hi';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { ROLES } from '../../utils/roles';
import LanguageSelector from '../LanguageSelector';

const getAdminBase = (role) => {
  if (role === ROLES.SUPER_ADMIN) return '/super-admin';
  return '/admin';
};

const AdminNavbar = ({ onMenuClick }) => {
  const { user, role, updateLanguage } = useAuth();
  const { darkMode, toggleDarkMode } = useTheme();
  const { t } = useTranslation();
  const base = getAdminBase(role);

  return (
    <header className="sticky top-0 z-30 border-b border-accent-400/10 bg-white/70 dark:bg-primary-950/70 backdrop-blur-xl">
      <div className="flex items-center justify-between px-3 sm:px-6 py-2 sm:py-3 gap-2 sm:gap-3">
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          <button
            type="button"
            onClick={onMenuClick}
            className="lg:hidden p-2 rounded-lg hover:bg-primary-100 dark:hover:bg-primary-800 text-primary-700 dark:text-primary-200"
            aria-label="Open menu"
          >
            <HiMenu className="w-5 h-5" />
          </button>

          <div className="hidden lg:block min-w-0">
            <p className="text-sm font-semibold text-primary-900 dark:text-white">
              {t('adminPanel')}
            </p>
            <p className="text-xs text-primary-400 truncate">{user?.name}</p>
          </div>
        </div>

        <div className="flex items-center gap-1 sm:gap-2">
          <LanguageSelector onChange={updateLanguage} />

          <button
            type="button"
            onClick={toggleDarkMode}
            className="p-2 sm:p-2.5 rounded-lg sm:rounded-xl hover:bg-primary-100 dark:hover:bg-primary-800 text-primary-600 dark:text-primary-300"
            aria-label="Toggle theme"
          >
            {darkMode ? <HiSun className="w-4 h-4 sm:w-5 sm:h-5" /> : <HiMoon className="w-4 h-4 sm:w-5 sm:h-5" />}
          </button>

          <Link
            to={`${base}/notifications`}
            className="p-2 sm:p-2.5 rounded-lg sm:rounded-xl hover:bg-primary-100 dark:hover:bg-primary-800 text-primary-600 dark:text-primary-300 relative"
            aria-label="Notifications"
          >
            <HiBell className="w-4 h-4 sm:w-5 sm:h-5" />
          </Link>

          <Link
            to={`${base}/profile`}
            className="flex items-center gap-2 pl-2 sm:pl-3 ml-0.5 border-l border-primary-200 dark:border-primary-700"
          >
            <div className="w-8 h-8 sm:w-9 sm:h-9 bg-gradient-brand rounded-full flex items-center justify-center text-white text-xs sm:text-sm font-bold shadow-glow-sm ring-2 ring-accent-400/30">
              {user?.name?.charAt(0)?.toUpperCase()}
            </div>
            <div className="hidden sm:block min-w-0">
              <p className="text-sm font-semibold text-primary-900 dark:text-white truncate max-w-[120px]">{user?.name}</p>
              <p className="text-xs text-primary-400 capitalize truncate">{role?.replace(/_/g, ' ')}</p>
            </div>
          </Link>
        </div>
      </div>
    </header>
  );
};

export default AdminNavbar;
