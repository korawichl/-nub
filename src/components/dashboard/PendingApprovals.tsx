import React, { useState } from 'react';
import { useJobgio } from '../../context/JobgioContext';
import { CompanyApproval } from '../../types/jobgio';
import { Modal } from '../common/Modal';
import { ConfirmDialog } from '../common/ConfirmDialog';
import {
  MinusCircle,
  ExternalLink,
  CheckCircle,
  XCircle,
  Building,
  Mail,
} from 'lucide-react';

export const PendingApprovals: React.FC = () => {
  const { approvals, approveCompany, rejectCompany } = useJobgio();

  const [selectedCompany, setSelectedCompany] = useState<CompanyApproval | null>(null);
  const [rejectTargetId, setRejectTargetId] = useState<string | null>(null);

  // Filter to pending approvals first, or show top requests
  const pendingList = approvals.filter((c) => c.status === 'Pending').slice(0, 3);

  // Helper to render company logo nicely
  const renderCompanyIcon = (comp: CompanyApproval) => {
    if (comp.logoType === 'apple') {
      return (
        <div className="w-9 h-9 rounded-full bg-black flex items-center justify-center text-white shrink-0">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
            <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M15.97 6.84c.62-.75 1.04-1.8 0.93-2.84-.9.04-1.99.6-2.61 1.34-.55.63-1.03 1.68-.9 2.69 1 .08 2.01-.51 2.58-1.19z" />
          </svg>
        </div>
      );
    }
    if (comp.logoType === 'figma') {
      return (
        <div className="w-9 h-9 rounded-full bg-neutral-100 flex items-center justify-center text-white shrink-0 p-1.5">
          <svg width="20" height="20" viewBox="0 0 38 57" fill="none">
            <path d="M19 28.5C19 23.2533 23.2533 19 28.5 19C33.7467 19 38 23.2533 38 28.5C38 33.7467 33.7467 38 28.5 38C23.2533 38 19 33.7467 19 28.5Z" fill="#1ABCFE"/>
            <path d="M0 47.5C0 42.2533 4.25329 38 9.5 38H19V47.5C19 52.7467 14.7467 57 9.5 57C4.25329 57 0 52.7467 0 47.5Z" fill="#0ACF83"/>
            <path d="M19 0V19H28.5C33.7467 19 38 14.7467 38 9.5C38 4.25329 33.7467 0 28.5 0H19Z" fill="#FF7262"/>
            <path d="M0 9.5C0 14.7467 4.25329 19 9.5 19H19V0H9.5C4.25329 0 0 4.25329 0 9.5Z" fill="#F24E1E"/>
            <path d="M0 28.5C0 33.7467 4.25329 38 9.5 38H19V19H9.5C4.25329 19 0 23.2533 0 28.5Z" fill="#A259FF"/>
          </svg>
        </div>
      );
    }
    if (comp.logoType === 'bmw') {
      return (
        <div className="w-9 h-9 rounded-full bg-[#0066B1] flex items-center justify-center text-white font-bold text-xs shrink-0 ring-2 ring-neutral-200">
          BMW
        </div>
      );
    }
    return (
      <div className="w-9 h-9 rounded-full bg-neutral-900 flex items-center justify-center text-white font-bold text-xs shrink-0">
        {comp.name.substring(0, 2).toUpperCase()}
      </div>
    );
  };

  return (
    <div className="bg-white border border-[#EEEEEE] rounded-[24px] p-6 shadow-xs flex flex-col justify-between h-full">
      {/* Card Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-bold text-[#171717] tracking-tight">Pending Approvals</h3>
        <button
          type="button"
          className="text-[#858585] hover:text-[#171717] transition-colors"
          title="Filter or minimize"
        >
          <MinusCircle className="w-5 h-5" />
        </button>
      </div>

      {/* Approvals List */}
      <div className="flex flex-col divide-y divide-[#F5F5F5] flex-1 justify-center">
        {pendingList.length === 0 ? (
          <div className="py-8 text-center text-xs text-[#858585]">
            No pending company approvals at this time.
          </div>
        ) : (
          pendingList.map((comp) => (
            <div
              key={comp.id}
              onClick={() => setSelectedCompany(comp)}
              className="flex items-center justify-between py-3.5 group cursor-pointer hover:bg-neutral-50/80 -mx-2 px-2 rounded-xl transition-colors"
            >
              {/* Left: Logo & Meta */}
              <div className="flex items-center gap-3">
                {renderCompanyIcon(comp)}
                <div className="flex flex-col">
                  <span className="text-sm font-semibold text-[#171717] group-hover:text-black transition-colors">
                    {comp.name}
                  </span>
                  <span className="text-[11px] text-[#858585] font-normal">
                    {comp.submittedDate}
                  </span>
                </div>
              </div>

              {/* Right: Pending Pill Badge */}
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-[#71717A] bg-[#F4F4F5] px-3 py-1 rounded-full border border-neutral-100">
                  {comp.status}
                </span>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Company Inspection Modal */}
      {selectedCompany && (
        <Modal
          isOpen={!!selectedCompany}
          onClose={() => setSelectedCompany(null)}
          title={`Company Request: ${selectedCompany.name}`}
          subtitle={`Submitted on ${selectedCompany.submittedDate}`}
          maxWidth="md"
        >
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-3.5 pb-4 border-b border-neutral-100">
              {renderCompanyIcon(selectedCompany)}
              <div>
                <h4 className="text-base font-bold text-neutral-900">{selectedCompany.name}</h4>
                <p className="text-xs text-neutral-500">{selectedCompany.industry}</p>
              </div>
            </div>

            <p className="text-xs text-neutral-600 leading-relaxed">
              {selectedCompany.description}
            </p>

            <div className="grid grid-cols-2 gap-3 py-2 text-xs">
              <div className="flex items-center gap-2 text-neutral-600 bg-neutral-50 p-2.5 rounded-xl">
                <Building className="w-4 h-4 text-neutral-400" />
                <span>{selectedCompany.employees} Employees</span>
              </div>
              <div className="flex items-center gap-2 text-neutral-600 bg-neutral-50 p-2.5 rounded-xl">
                <Mail className="w-4 h-4 text-neutral-400" />
                <span className="truncate">{selectedCompany.contactEmail}</span>
              </div>
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-neutral-100 mt-2">
              <a
                href={selectedCompany.website}
                target="_blank"
                rel="noreferrer"
                className="text-xs font-medium text-neutral-600 hover:text-black flex items-center gap-1"
              >
                <span>Visit Website</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const id = selectedCompany.id;
                    setSelectedCompany(null);
                    setRejectTargetId(id);
                  }}
                  className="px-3.5 py-1.5 text-xs font-semibold text-rose-600 hover:bg-rose-50 rounded-full border border-rose-200 transition-colors flex items-center gap-1"
                >
                  <XCircle className="w-3.5 h-3.5" />
                  <span>Reject</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    approveCompany(selectedCompany.id);
                    setSelectedCompany(null);
                  }}
                  className="px-4 py-1.5 text-xs font-semibold text-white bg-[#111111] hover:bg-black rounded-full transition-colors flex items-center gap-1 shadow-xs"
                >
                  <CheckCircle className="w-3.5 h-3.5" />
                  <span>Approve</span>
                </button>
              </div>
            </div>
          </div>
        </Modal>
      )}

      {/* Confirmation Before Rejection */}
      <ConfirmDialog
        isOpen={!!rejectTargetId}
        onClose={() => setRejectTargetId(null)}
        onConfirm={() => {
          if (rejectTargetId) {
            rejectCompany(rejectTargetId);
            setRejectTargetId(null);
          }
        }}
        title="Reject Company Application?"
        message="Are you sure you want to reject this company registration? This will notify their recruiting team."
        confirmLabel="Confirm Reject"
        isDestructive={true}
      />
    </div>
  );
};
