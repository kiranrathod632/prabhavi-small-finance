const StatCard = ({ title, value, icon: Icon, color = 'primary', subtitle }) => {
  const colorClasses = {
    primary: 'bg-gradient-brand-soft text-violet-400 border border-violet-500/25',
    green: 'bg-teal-500/10 text-teal-400 border border-teal-400/20',
    red: 'bg-red-500/10 text-red-400 border border-red-400/20',
    yellow: 'bg-accent-400/10 text-accent-400 border border-accent-400/20',
    purple: 'bg-violet-500/10 text-violet-400 border border-violet-500/20',
    indigo: 'bg-primary-500/10 text-slate-300 border border-white/10',
  };

  return (
    <div className="card-glow group h-full hover:border-violet-500/35 transition-all duration-300">
      <div className="flex items-start justify-between gap-1.5 sm:gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-[9px] sm:text-sm font-medium text-slate-400 leading-snug break-words line-clamp-2">{title}</p>
          <p
            className="mt-0.5 sm:mt-1.5 font-bold text-white tracking-tight break-all tabular-nums leading-tight text-[13px] sm:text-xl lg:text-2xl"
            title={typeof value === 'string' || typeof value === 'number' ? String(value) : undefined}
          >
            {value}
          </p>
          {subtitle && (
            <p className="text-[9px] sm:text-xs text-slate-500 mt-0.5 sm:mt-1.5 break-words line-clamp-1">{subtitle}</p>
          )}
        </div>
        {Icon && (
          <div className={`p-1 sm:p-3 rounded-md sm:rounded-xl shrink-0 ${colorClasses[color] || colorClasses.primary} group-hover:scale-105 transition-transform`}>
            <Icon className="w-3 h-3 sm:w-6 sm:h-6" />
          </div>
        )}
      </div>
    </div>
  );
};

export default StatCard;
