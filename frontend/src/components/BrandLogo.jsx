import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

const SIZES = {
  sm: {
    img: 'w-9 h-9',
    title: 'text-sm sm:text-base',
    shortTitle: 'text-sm font-bold',
    subtitle: 'text-[10px] sm:text-xs',
  },
  md: {
    img: 'w-10 h-10 sm:w-11 sm:h-11',
    title: 'text-base sm:text-lg md:text-xl',
    shortTitle: 'text-base font-bold',
    subtitle: 'text-[10px] sm:text-xs',
  },
  lg: {
    img: 'w-14 h-14 sm:w-16 sm:h-16 md:w-20 md:h-20',
    title: 'text-base sm:text-2xl md:text-3xl',
    shortTitle: 'text-lg sm:text-xl font-bold',
    subtitle: 'text-xs sm:text-sm',
  },
  xl: {
    img: 'w-[4.5rem] h-[4.5rem] sm:w-24 sm:h-24 md:w-28 md:h-28',
    title: 'text-[1.15rem] sm:text-3xl md:text-4xl lg:text-5xl',
    shortTitle: 'text-xl sm:text-3xl font-bold',
    subtitle: 'text-[13px] sm:text-base',
  },
};

const BrandLogo = ({
  to = '/',
  size = 'md',
  showTagline = false,
  showAppName = true,
  stacked = false,
  className = '',
  onClick,
  variant = 'light',
  forceShort = false,
}) => {
  const { t } = useTranslation();
  const s = SIZES[size] || SIZES.md;
  const titleClass = variant === 'light' ? 'gradient-text' : 'text-white';
  const subtitleClass = variant === 'light' ? 'text-slate-400' : 'text-slate-500';

  const content = (
    <span
      className={`inline-flex min-w-0 max-w-full ${
        stacked ? 'flex-col items-center text-center' : 'items-center gap-2 sm:gap-3'
      } ${className}`}
    >
      <img
        src="/logo.png"
        alt={t('appName')}
        className={`${s.img} rounded-xl object-contain bg-white/95 p-0.5 shadow-glow-sm shrink-0 ring-1 ring-violet-500/30`}
      />
      {showAppName && (
        <span className={`min-w-0 leading-tight ${stacked ? 'text-center mt-2 sm:mt-3 max-w-xs sm:max-w-md' : 'text-left flex-1'}`}>
          {/* Mobile / narrow: short name — unless stacked hero (show full name) */}
          <span
            className={`font-display tracking-tight ${s.shortTitle} ${titleClass} ${
              forceShort ? 'block' : stacked ? 'hidden' : 'block md:hidden'
            }`}
          >
            {t('appShortName')}
          </span>
          {/* Full company name */}
          {!forceShort && (
            <span
              className={`font-display font-semibold tracking-tight ${s.title} ${titleClass} ${
                stacked ? 'block text-balance' : 'hidden md:block truncate'
              }`}
            >
              {t('appName')}
            </span>
          )}
          {showTagline && (
            <span className={`block mt-1 ${s.subtitle} ${subtitleClass} ${stacked ? 'text-balance px-1' : 'truncate'}`}>
              {t('tagline')}
            </span>
          )}
        </span>
      )}
    </span>
  );

  if (to) {
    return (
      <Link to={to} onClick={onClick} className="group hover:opacity-95 transition-opacity max-w-full">
        {content}
      </Link>
    );
  }

  return content;
};

export default BrandLogo;
