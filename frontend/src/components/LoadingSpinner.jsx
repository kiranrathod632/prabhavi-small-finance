const LoadingSpinner = ({ size = 'md', className = '' }) => {
  const sizes = { sm: 'w-4 h-4', md: 'w-8 h-8', lg: 'w-12 h-12' };
  return (
    <div className={`flex items-center justify-center ${className}`}>
      <div
        className={`${sizes[size]} rounded-full animate-spin border-2 border-accent-400/20 border-t-accent-400`}
        style={{ boxShadow: '0 0 12px rgba(0, 210, 255, 0.25)' }}
      />
    </div>
  );
};

export const PageLoader = () => (
  <div className="flex items-center justify-center min-h-[50vh] sm:min-h-[400px]">
    <LoadingSpinner size="lg" />
  </div>
);

export const SkeletonCard = () => (
  <div className="card animate-pulse">
    <div className="h-4 bg-accent-400/10 rounded w-1/3 mb-3" />
    <div className="h-8 bg-accent-400/10 rounded w-1/2" />
  </div>
);

export default LoadingSpinner;
