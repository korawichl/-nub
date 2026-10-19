import React from 'react';
import { useJobgio } from '../../context/JobgioContext';
import { CheckCircle2, AlertTriangle, Info, X } from 'lucide-react';

export const ToastContainer: React.FC = () => {
  const { toasts, removeToast } = useJobgio();

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-2.5 max-w-sm w-full pointer-events-none">
      {toasts.map((toast) => {
        const isSuccess = toast.type === 'success';
        const isError = toast.type === 'error';

        return (
          <div
            key={toast.id}
            className={`pointer-events-auto flex items-center justify-between gap-3 px-4 py-3 rounded-2xl shadow-xl border transition-all duration-200 animate-slide-in ${
              isSuccess
                ? 'bg-[#111111] text-white border-neutral-800'
                : isError
                ? 'bg-rose-900 text-white border-rose-800'
                : 'bg-white text-neutral-900 border-neutral-200'
            }`}
          >
            <div className="flex items-center gap-2.5 text-sm font-medium">
              {isSuccess && <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />}
              {isError && <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />}
              {!isSuccess && !isError && <Info className="w-4 h-4 text-neutral-400 shrink-0" />}
              <span>{toast.message}</span>
            </div>
            <button
              type="button"
              onClick={() => removeToast(toast.id)}
              className="text-neutral-400 hover:text-white transition-colors p-1 rounded-lg"
              aria-label="Close notification"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        );
      })}
    </div>
  );
};
