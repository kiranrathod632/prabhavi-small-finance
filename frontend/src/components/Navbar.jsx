import { HiMenu, HiMoon, HiSun, HiBell } from 'react-icons/hi';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { Link } from 'react-router-dom';
import LanguageSelector from './LanguageSelector';
import { getDashboardPath, isAdminPanelRole } from '../utils/roles';

const Navbar = ({ onMenuClick }) => {
  const { user, role, updateLanguage } = useAuth();
  const { darkMode, toggleDarkMode } = useTheme();
  const { t } = useTranslation();

  const notifPath = isAdminPanelRole(role)
    ? `${getDashboardPath(role).replace('/dashboard', '')}/notifications`
    : '/notifications';

  return (
    <header className="sticky top-0 z-30 border-b border-accent-400/10 bg-white/70 dark:bg-primary-950/70 backdrop-blur-xl">
      <div className="flex items-center justify-between px-4 sm:px-6 py-3 gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <button
            type="button"
            onClick={onMenuClick}
            className="lg:hidden p-2.5 rounded-xl hover:bg-primary-100 dark:hover:bg-primary-800 text-primary-700 dark:text-primary-200"
            aria-label="Open menu"
          >
            <HiMenu className="w-5 h-5" />
          </button>

          <div className="hidden lg:block min-w-0">
            <p className="text-sm font-medium text-primary-800 dark:text-primary-100 truncate">
              {t('dash.welcome')}, {user?.name}
            </p>
            <p className="text-xs text-primary-400 capitalize">{role?.replace(/_/g, ' ')}</p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 sm:gap-2">
          <LanguageSelector className="w-24 sm:w-32 hidden xs:block sm:block" onChange={updateLanguage} />

          <button
            type="button"
            onClick={toggleDarkMode}
            className="p-2.5 rounded-xl hover:bg-primary-100 dark:hover:bg-primary-800 text-primary-600 dark:text-primary-300"
            aria-label="Toggle dark mode"
          >
            {darkMode ? <HiSun className="w-5 h-5" /> : <HiMoon className="w-5 h-5" />}
          </button>

          <Link
            to={notifPath}
            className="p-2.5 rounded-xl hover:bg-primary-100 dark:hover:bg-primary-800 text-primary-600 dark:text-primary-300 relative"
            aria-label="Notifications"
          >
            <HiBell className="w-5 h-5" />
          </Link>

          <div className="flex items-center gap-2.5 pl-2.5 sm:pl-3 ml-0.5 border-l border-primary-200 dark:border-primary-700">
            <div className="w-9 h-9 bg-gradient-brand rounded-full flex items-center justify-center text-white text-sm font-bold shadow-glow-sm ring-2 ring-accent-400/30">
              {user?.name?.charAt(0)?.toUpperCase()}
            </div>
            <div className="hidden sm:block min-w-0">
              <p className="text-sm font-semibold text-primary-900 dark:text-white truncate max-w-[120px]">{user?.name}</p>
              <p className="text-xs text-primary-400 capitalize truncate">{role?.replace(/_/g, ' ')}</p>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Navbar;
