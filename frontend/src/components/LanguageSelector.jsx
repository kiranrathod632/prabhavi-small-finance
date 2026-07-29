import { useTranslation } from 'react-i18next';
import { changeLanguage } from '../i18n';
import { LANGUAGES } from '../utils/roles';

/**
 * Language switcher — compact dropdown visible on all devices.
 * Placed beside the dark mode toggle / hamburger menu.
 */
const LanguageSelector = ({ className = '', onChange, dark = false }) => {
  const { i18n } = useTranslation();

  const currentLang = i18n.language?.startsWith('hi') ? 'hi' : i18n.language?.startsWith('mr') ? 'mr' : 'en';

  const handleChange = async (e) => {
    const lang = e.target.value;
    await changeLanguage(lang);
    onChange?.(lang);
  };

  return (
    <select
      value={currentLang}
      onChange={handleChange}
      className={`py-1 sm:py-1.5 px-1.5 sm:px-2 rounded-lg border font-semibold cursor-pointer focus:outline-none focus:ring-2 focus:ring-violet-500/40 transition-all ${
        dark
          ? 'bg-white/10 border-white/15 text-white hover:bg-white/15'
          : 'bg-white dark:bg-primary-900 border-primary-200 dark:border-primary-700 text-primary-700 dark:text-primary-200 hover:border-violet-400'
      } ${className}`}
    >
      {LANGUAGES.map(({ code, label }) => (
        <option key={code} value={code} className="bg-[#111318] text-white">
          {label}
        </option>
      ))}
    </select>
  );
};

export default LanguageSelector;
