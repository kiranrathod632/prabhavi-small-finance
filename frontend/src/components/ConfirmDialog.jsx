import { HiExclamation } from 'react-icons/hi';
import Modal from './Modal';

const ConfirmDialog = ({ isOpen, onClose, onConfirm, title, message, confirmText = 'Confirm', danger = false }) => (
  <Modal isOpen={isOpen} onClose={onClose} title={title} size="sm">
    <div className="text-center">
      <div className={`mx-auto w-12 h-12 rounded-full flex items-center justify-center mb-4 ${danger ? 'bg-red-100' : 'bg-yellow-100'}`}>
        <HiExclamation className={`w-6 h-6 ${danger ? 'text-red-600' : 'text-yellow-600'}`} />
      </div>
      <p className="text-gray-600 dark:text-gray-400 mb-6">{message}</p>
      <div className="flex gap-3 justify-center">
        <button onClick={onClose} className="btn-secondary">Cancel</button>
        <button onClick={onConfirm} className={danger ? 'btn-danger' : 'btn-primary'}>
          {confirmText}
        </button>
      </div>
    </div>
  </Modal>
);

export default ConfirmDialog;
