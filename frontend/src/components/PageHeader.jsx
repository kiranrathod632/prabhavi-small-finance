const PageHeader = ({ title, subtitle, actions }) => (
  <div className="page-header animate-fade-up">
    <div className="min-w-0 flex-1">
      <h1 className="page-title">{title}</h1>
      {subtitle && <p className="page-subtitle">{subtitle}</p>}
    </div>
    {actions && <div className="page-header-actions">{actions}</div>}
  </div>
);

export default PageHeader;
