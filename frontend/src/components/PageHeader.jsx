const PageHeader = ({ title, subtitle, actions }) => (
  <div className="page-header animate-fade-up">
    <div className="min-w-0">
      <h1 className="page-title">{title}</h1>
      {subtitle && <p className="page-subtitle">{subtitle}</p>}
    </div>
    {actions && <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 shrink-0">{actions}</div>}
  </div>
);

export default PageHeader;
