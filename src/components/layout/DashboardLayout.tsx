import React, { useState } from 'react';
import { Sidebar } from './Sidebar';
import { ToastContainer } from '../common/Toast';
import { Menu } from 'lucide-react';

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export const DashboardLayout: React.FC<DashboardLayoutProps> = ({ children }) => {
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen bg-[#E7E7E7] flex items-center justify-center p-2 sm:p-4 md:p-6 lg:p-8 font-sans antialiased text-[#171717]">
      {/* Background Subtle Geometry/Concentric Rings (Matching Reference Image) */}
      <div className="fixed inset-0 pointer-events-none opacity-40 overflow-hidden">
        <svg
          className="absolute -right-40 -top-40 w-[900px] h-[900px]"
          viewBox="0 0 1000 1000"
          fill="none"
        >
          <circle cx="500" cy="500" r="300" stroke="#D1D5DB" strokeWidth="1" />
          <circle cx="500" cy="500" r="450" stroke="#D1D5DB" strokeWidth="1" />
          <circle cx="500" cy="500" r="600" stroke="#D1D5DB" strokeWidth="1" />
          <circle cx="500" cy="500" r="750" stroke="#D1D5DB" strokeWidth="1" />
        </svg>
      </div>

      {/* Main Large White Rounded Container (The "Canvas") */}
      <div className="relative w-full max-w-[1440px] min-h-[920px] bg-white rounded-[28px] sm:rounded-[36px] shadow-2xl border border-[#E0E0E0] flex overflow-hidden z-10">
        {/* Left Sidebar */}
        <Sidebar
          isOpenOnMobile={isMobileSidebarOpen}
          onCloseMobile={() => setIsMobileSidebarOpen(false)}
        />

        {/* Right Content Area */}
        <div className="flex-1 flex flex-col min-w-0 bg-white">
          {/* Mobile Top Navbar (Visible only on small screens) */}
          <div className="lg:hidden flex items-center justify-between p-4 border-b border-[#EEEEEE] bg-white">
            <button
              type="button"
              onClick={() => setIsMobileSidebarOpen(true)}
              className="p-2 text-neutral-700 hover:bg-neutral-100 rounded-xl"
              aria-label="Open sidebar"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-2">
              <svg
                width="20"
                height="20"
                viewBox="0 0 28 28"
                fill="none"
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
              <span className="font-bold text-base text-[#171717]">Jobgio</span>
            </div>
            <div className="w-8"></div>
          </div>

          {/* Main Content Body */}
          <main className="flex-1 p-4 sm:p-6 lg:p-7 overflow-y-auto">
            {children}
          </main>
        </div>
      </div>

      {/* Global Toast Container */}
      <ToastContainer />
    </div>
  );
};
