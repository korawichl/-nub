import React, { useState } from 'react';
import { useJobgio } from '../context/JobgioContext';
import { ConfirmDialog } from '../components/common/ConfirmDialog';
import { User, RotateCcw, Save } from 'lucide-react';

export const SettingsPage: React.FC = () => {
  const { resetToDemoData, showToast } = useJobgio();

  const [name, setName] = useState('George');
  const [email, setEmail] = useState('hello.designer@gmail.com');
  const [notifyApplications, setNotifyApplications] = useState(true);
  const [notifyApprovals, setNotifyApprovals] = useState(true);
  const [notifyReports, setNotifyReports] = useState(false);
  const [isResetConfirmOpen, setIsResetConfirmOpen] = useState(false);

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    showToast('Profile & notification preferences saved!', 'success');
  };

  return (
    <div className="flex flex-col gap-6 max-w-4xl">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-[#171717]">Admin Settings</h1>
        <p className="text-xs text-[#858585] mt-1">
          Configure administrator credentials, system alerts, and demo database state.
        </p>
      </div>

      {/* Profile Section */}
      <div className="bg-white border border-[#EEEEEE] rounded-[24px] p-6 shadow-xs">
        <div className="flex items-center gap-3 pb-4 border-b border-neutral-100 mb-5">
          <div className="w-10 h-10 rounded-2xl bg-neutral-100 flex items-center justify-center text-neutral-800">
            <User className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-[#171717]">Profile Information</h2>
            <p className="text-xs text-[#858585]">Update your display name and contact email.</p>
          </div>
        </div>

        <form onSubmit={handleSaveProfile} className="flex flex-col gap-4">
          <div className="flex items-center gap-4 mb-2">
            <img
              src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80"
              alt="Avatar"
              className="w-14 h-14 rounded-full object-cover ring-2 ring-neutral-200"
            />
            <div>
              <span className="text-sm font-bold text-neutral-900 block">George (Super Administrator)</span>
              <span className="text-xs text-neutral-400">Default Jobgio admin identity</span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-neutral-700 mb-1">
                Display Name
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3.5 py-2.5 text-xs bg-neutral-50 border border-neutral-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-black focus:bg-white transition-all"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-neutral-700 mb-1">
                Email Address
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3.5 py-2.5 text-xs bg-neutral-50 border border-neutral-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-black focus:bg-white transition-all"
              />
            </div>
          </div>

          {/* Notifications Checklist */}
          <div className="pt-4 border-t border-neutral-100 mt-2">
            <h3 className="text-xs font-bold text-neutral-800 mb-3 uppercase tracking-wider">
              Email Notifications
            </h3>
            <div className="flex flex-col gap-2.5 text-xs">
              <label className="flex items-center gap-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={notifyApplications}
                  onChange={(e) => setNotifyApplications(e.target.checked)}
                  className="rounded border-neutral-300 text-black focus:ring-black"
                />
                <span className="text-neutral-700">
                  Notify me when a new candidate applies to featured jobs
                </span>
              </label>

              <label className="flex items-center gap-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={notifyApprovals}
                  onChange={(e) => setNotifyApprovals(e.target.checked)}
                  className="rounded border-neutral-300 text-black focus:ring-black"
                />
                <span className="text-neutral-700">
                  Instant alert on new company verification requests
                </span>
              </label>

              <label className="flex items-center gap-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={notifyReports}
                  onChange={(e) => setNotifyReports(e.target.checked)}
                  className="rounded border-neutral-300 text-black focus:ring-black"
                />
                <span className="text-neutral-700">
                  Receive moderation queue alerts when jobs receive reports
                </span>
              </label>
            </div>
          </div>

          <div className="flex items-center justify-end pt-3">
            <button
              type="submit"
              className="flex items-center gap-1.5 px-5 py-2 text-xs font-medium text-white bg-black hover:bg-neutral-800 rounded-full transition-colors shadow-xs"
            >
              <Save className="w-3.5 h-3.5" />
              <span>Save Preferences</span>
            </button>
          </div>
        </form>
      </div>

      {/* System & Data Management */}
      <div className="bg-white border border-[#EEEEEE] rounded-[24px] p-6 shadow-xs flex flex-col gap-4">
        <div className="flex items-center gap-3 pb-4 border-b border-neutral-100">
          <div className="w-10 h-10 rounded-2xl bg-neutral-100 flex items-center justify-center text-neutral-800">
            <RotateCcw className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-[#171717]">Database & Local Storage</h2>
            <p className="text-xs text-[#858585]">
              Reset demo jobs, approvals, and candidate applications to original seeded state.
            </p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 bg-neutral-50 rounded-2xl border border-neutral-100">
          <div>
            <span className="text-xs font-semibold text-neutral-900 block">
              Restore Sample Dataset
            </span>
            <span className="text-xs text-neutral-500">
              Useful if you have modified or deleted sample companies, jobs, or candidates.
            </span>
          </div>

          <button
            type="button"
            onClick={() => setIsResetConfirmOpen(true)}
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-medium text-rose-700 bg-white border border-rose-200 hover:bg-rose-50 rounded-full transition-colors shrink-0 shadow-2xs"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset to Demo Data</span>
          </button>
        </div>
      </div>

      {/* Reset Confirmation Dialog */}
      <ConfirmDialog
        isOpen={isResetConfirmOpen}
        onClose={() => setIsResetConfirmOpen(false)}
        onConfirm={() => {
          resetToDemoData();
          setIsResetConfirmOpen(false);
        }}
        title="Reset All Data to Factory Demo?"
        message="This will overwrite current local storage entries with the original Jobgio reference dataset (Google, Amazon, Apple, Figma, BMW, etc.)."
        confirmLabel="Reset Everything"
        isDestructive={true}
      />
    </div>
  );
};
