import { HiX } from 'react-icons/hi';

const Modal = ({ isOpen, onClose, title, children, size = 'md' }) => {
  if (!isOpen) return null;

  const sizes = {
    sm: 'max-w-md',
    md: 'max-w-lg',
    lg: 'max-w-2xl',
    xl: 'max-w-4xl',
  };

  const isCompact = size === 'sm';

  return (
    <div
      className={`fixed inset-0 z-50 flex justify-center ${
        isCompact ? 'items-center p-3 sm:p-4' : 'items-end sm:items-center p-0 sm:p-4'
      }`}
    >
      <div className="fixed inset-0 bg-black/50 dark:bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className={`modal-panel ${isCompact ? 'modal-panel-compact' : sizes[size]}`}>
        <div className="modal-header">
          <h3 className="text-sm sm:text-base font-semibold pr-2" style={{ color: 'var(--text-primary)' }}>{title}</h3>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg shrink-0 hover:opacity-80"
            style={{ color: 'var(--text-muted)' }}
          >
            <HiX className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>
        </div>
        <div className="p-3 sm:p-4">{children}</div>
      </div>
    </div>
  );
};

export default Modal;
