import { useTranslation } from 'react-i18next';
import { changeLanguage } from '../i18n';
import { LANGUAGES } from '../utils/roles';

/**
 * Language switcher — updates i18n + localStorage immediately.
 * Pass onChange to also persist preferredLanguage to the API after login.
 */
const LanguageSelector = ({ className = '', onChange, dark = false }) => {
  const { i18n, t } = useTranslation();

  const handleChange = async (e) => {
    const lang = e.target.value;
    await changeLanguage(lang);
    onChange?.(lang);
  };

  return (
    <div className={className}>
      <label className={`text-xs block mb-1 ${dark ? 'text-slate-400' : 'text-gray-500'}`}>
        {t('language')}
      </label>
      <select
        value={i18n.language?.startsWith('hi') ? 'hi' : i18n.language?.startsWith('mr') ? 'mr' : 'en'}
        onChange={handleChange}
        className={`w-full text-sm py-1.5 px-2 rounded-lg border ${
          dark
            ? 'bg-slate-800 border-slate-600 text-white'
            : 'bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600'
        }`}
      >
        {LANGUAGES.map(({ code, label }) => (
          <option key={code} value={code}>{label}</option>
        ))}
      </select>
    </div>
  );
};

export default LanguageSelector;
