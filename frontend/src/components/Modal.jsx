import { HiX } from 'react-icons/hi';

const Modal = ({ isOpen, onClose, title, children, size = 'md' }) => {
  if (!isOpen) return null;

  const sizes = {
    sm: 'max-w-md',
    md: 'max-w-lg',
    lg: 'max-w-2xl',
    xl: 'max-w-4xl',
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className={`relative bg-[#111318] border border-white/10 rounded-t-2xl sm:rounded-xl shadow-xl w-full ${sizes[size]} max-h-[88vh] sm:max-h-[90vh] overflow-y-auto`}>
        <div className="flex items-center justify-between p-3 sm:p-4 border-b border-white/10 sticky top-0 bg-[#111318] z-10">
          <h3 className="text-sm sm:text-lg font-semibold text-white pr-2">{title}</h3>
          <button type="button" onClick={onClose} className="p-1.5 hover:bg-white/10 rounded-lg text-slate-300 shrink-0">
            <HiX className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>
        </div>
        <div className="p-3 sm:p-4">{children}</div>
      </div>
    </div>
  );
};

export default Modal;
