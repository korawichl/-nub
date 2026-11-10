import React, { useEffect, useState } from 'react';
import { type InAppNotificationEventDetail } from '../services/notificationService';
import { Bell, Sparkles, X, ArrowRight, Utensils } from 'lucide-react';

interface InAppNotificationBannerProps {
  onOpenDiary: () => void;
}

export const InAppNotificationBanner: React.FC<InAppNotificationBannerProps> = ({
  onOpenDiary,
}) => {
  const [currentNotification, setCurrentNotification] =
    useState<InAppNotificationEventDetail | null>(null);

  useEffect(() => {
    const handleInAppNotif = (event: Event) => {
      const customEvent = event as CustomEvent<InAppNotificationEventDetail>;
      if (customEvent.detail) {
        setCurrentNotification(customEvent.detail);
      }
    };

    window.addEventListener('nub:in-app-notification', handleInAppNotif);
    return () => {
      window.removeEventListener('nub:in-app-notification', handleInAppNotif);
    };
  }, []);

  // Auto-dismiss after 10 seconds
  useEffect(() => {
    if (!currentNotification) return;
    const timer = setTimeout(() => {
      setCurrentNotification(null);
    }, 10000);
    return () => clearTimeout(timer);
  }, [currentNotification]);

  if (!currentNotification) return null;

  return (
    <div
      className="fixed top-4 left-4 right-4 z-[9999] max-w-lg mx-auto pointer-events-auto transition-all duration-300 ease-out"
      style={{
        animation: 'slideInTop 0.35s cubic-bezier(0.16, 1, 0.3, 1)',
      }}
    >
      <div className="bg-[#17213D] text-white p-4 rounded-2xl shadow-2xl border-2 border-[#6258F5] flex items-start gap-3 backdrop-blur-xl">
        <div className="w-10 h-10 rounded-xl bg-[#6258F5] flex items-center justify-center shrink-0 shadow-lg shadow-[#6258F5]/40">
          <Bell className="w-5 h-5 text-white animate-bounce" />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-bold text-[#E0DCFE] flex items-center gap-1.5">
              <Sparkles size={12} className="text-[#F59E0B]" />
              <span>{currentNotification.title}</span>
            </span>
            <button
              type="button"
              onClick={() => setCurrentNotification(null)}
              className="text-[#858BA0] hover:text-white p-1 rounded-lg transition-colors cursor-pointer"
              aria-label="Dismiss"
            >
              <X size={15} />
            </button>
          </div>

          <p className="text-xs font-semibold text-white mt-1 leading-relaxed">
            {currentNotification.body}
          </p>

          <div className="flex items-center gap-2 mt-3">
            <button
              type="button"
              onClick={() => {
                setCurrentNotification(null);
                onOpenDiary();
              }}
              className="btn btn-primary btn-sm text-xs py-1.5 px-3 flex items-center gap-1.5 shadow-md shadow-[#6258F5]/30 cursor-pointer"
            >
              <Utensils size={13} />
              <span>ไปบันทึกอาหารทันที</span>
              <ArrowRight size={13} />
            </button>
            <button
              type="button"
              onClick={() => setCurrentNotification(null)}
              className="text-xs text-[#858BA0] hover:text-white px-2 py-1 transition-colors cursor-pointer"
            >
              ไว้ทีหลัง
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
