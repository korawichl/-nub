import React from 'react';
import { useJobgio, NavTab } from '../../context/JobgioContext';
import {
  LayoutDashboard,
  Briefcase,
  FileText,
  Building2,
  Users,
  LayoutGrid,
  AlertCircle,
  Settings,
  X,
} from 'lucide-react';

interface SidebarProps {
  isOpenOnMobile?: boolean;
  onCloseMobile?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  isOpenOnMobile = false,
  onCloseMobile,
}) => {
  const { activeTab, setActiveTab } = useJobgio();

  const navItems: { id: NavTab; label: string; icon: React.ElementType }[] = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'jobs', label: 'Jobs', icon: Briefcase },
    { id: 'applications', label: 'Applications', icon: FileText },
    { id: 'companies', label: 'Companies', icon: Building2 },
    { id: 'users', label: 'Users', icon: Users },
    { id: 'categories', label: 'Categories', icon: LayoutGrid },
    { id: 'reports', label: 'Reports', icon: AlertCircle },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  const handleNavClick = (tab: NavTab) => {
    setActiveTab(tab);
    if (onCloseMobile) onCloseMobile();
  };

  return (
    <>
      {/* Mobile overlay */}
      {isOpenOnMobile && (
        <div
          className="fixed inset-0 bg-black/40 backdrop-blur-xs z-40 lg:hidden"
          onClick={onCloseMobile}
        />
      )}

      <aside
        className={`fixed top-0 bottom-0 left-0 z-40 w-56 bg-white border-r border-[#EEEEEE] flex flex-col justify-between p-6 transition-transform duration-200 lg:static lg:translate-x-0 ${
          isOpenOnMobile ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        {/* Top: Brand Logo */}
        <div>
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-2.5">
              {/* Jobgio Geometric Icon */}
              <div className="w-8 h-8 flex items-center justify-center">
                <svg
                  width="26"
                  height="26"
                  viewBox="0 0 28 28"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    d="M14 2L2 9L14 16L26 9L14 2Z"
                    stroke="#111111"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <path
                    d="M2 14L14 21L26 14"
                    stroke="#111111"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <path
                    d="M2 19L14 26L26 19"
                    stroke="#111111"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </div>
              <span className="text-xl font-bold tracking-tight text-[#171717]">Jobgio</span>
            </div>

            {/* Mobile close button */}
            {onCloseMobile && (
              <button
                type="button"
                onClick={onCloseMobile}
                className="lg:hidden p-1 text-neutral-400 hover:text-neutral-700"
                aria-label="Close navigation"
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>

          {/* Navigation Items */}
          <nav className="flex flex-col gap-1.5" aria-label="Main Navigation">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;

              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleNavClick(item.id)}
                  className={`flex items-center gap-3.5 px-3.5 py-2.5 rounded-full text-sm font-medium transition-all duration-150 text-left w-full ${
                    isActive
                      ? 'bg-[#111111] text-white shadow-xs'
                      : 'text-[#858585] hover:text-[#171717] hover:bg-[#F5F5F5]'
                  }`}
                >
                  <Icon
                    className={`w-4 h-4 shrink-0 ${
                      isActive ? 'text-white' : 'text-[#858585]'
                    }`}
                  />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>
        </div>

        {/* Bottom: User Profile */}
        <div className="pt-6 border-t border-[#EEEEEE] flex items-center gap-3">
          <div className="relative shrink-0">
            <img
              src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80"
              alt="George"
              className="w-10 h-10 rounded-full object-cover ring-2 ring-neutral-100"
            />
            {/* Notification Badge "12" matching screenshot */}
            <span className="absolute -top-1 -right-1.5 bg-[#111111] text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full ring-2 ring-white">
              12
            </span>
          </div>
          <div className="flex flex-col min-w-0">
            <span className="text-sm font-semibold text-[#171717] truncate leading-tight">
              George
            </span>
            <span className="text-[11px] text-[#858585] truncate leading-normal">
              hello.designer@gmail.com
            </span>
          </div>
        </div>
      </aside>
    </>
  );
};
