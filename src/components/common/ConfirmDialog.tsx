import React from 'react';
import { Modal } from './Modal';
import { AlertCircle } from 'lucide-react';

interface ConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  isDestructive?: boolean;
}

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  isDestructive = true,
}) => {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title} maxWidth="sm">
      <div className="flex flex-col gap-4">
        <div className="flex items-start gap-3">
          <div
            className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 ${
              isDestructive ? 'bg-rose-50 text-rose-600' : 'bg-neutral-100 text-neutral-700'
            }`}
          >
            <AlertCircle className="w-5 h-5" />
          </div>
          <p className="text-sm text-neutral-600 leading-relaxed mt-1">{message}</p>
        </div>
        <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-neutral-100 mt-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-100 rounded-full transition-colors"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={() => {
              onConfirm();
              onClose();
            }}
            className={`px-4 py-2 text-sm font-medium text-white rounded-full transition-colors ${
              isDestructive
                ? 'bg-rose-600 hover:bg-rose-700'
                : 'bg-neutral-900 hover:bg-black'
            }`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </Modal>
  );
};
