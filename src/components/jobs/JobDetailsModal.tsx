import React from 'react';
import { Job } from '../../types/jobgio';
import { Modal } from '../common/Modal';
import { Building2, MapPin, DollarSign, Users } from 'lucide-react';

interface JobDetailsModalProps {
  job: Job | null;
  onClose: () => void;
  onEdit: (job: Job) => void;
}

export const JobDetailsModal: React.FC<JobDetailsModalProps> = ({
  job,
  onClose,
  onEdit,
}) => {
  if (!job) return null;

  return (
    <Modal
      isOpen={!!job}
      onClose={onClose}
      title={job.title}
      subtitle={`Posted by ${job.company} on ${job.postedDate}`}
      maxWidth="md"
    >
      <div className="flex flex-col gap-4">
        {/* Status Badge & Meta */}
        <div className="flex items-center justify-between pb-3 border-b border-neutral-100">
          <div className="flex items-center gap-2">
            <span
              className={`text-xs font-medium px-3 py-1 rounded-full ${
                job.status === 'Active'
                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                  : job.status === 'Pending'
                  ? 'bg-neutral-100 text-neutral-700 border border-neutral-200'
                  : 'bg-rose-50 text-rose-700 border border-rose-200'
              }`}
            >
              {job.status}
            </span>
            <span className="text-xs bg-neutral-100 text-neutral-600 px-2.5 py-1 rounded-full">
              {job.type}
            </span>
          </div>

          <span className="text-xs font-semibold text-neutral-800">
            {job.category}
          </span>
        </div>

        {/* Details Grid */}
        <div className="grid grid-cols-2 gap-3 text-xs">
          <div className="flex items-center gap-2 p-2.5 bg-neutral-50 rounded-xl text-neutral-700">
            <Building2 className="w-4 h-4 text-neutral-400" />
            <span className="font-medium">{job.company}</span>
          </div>
          <div className="flex items-center gap-2 p-2.5 bg-neutral-50 rounded-xl text-neutral-700">
            <MapPin className="w-4 h-4 text-neutral-400" />
            <span>{job.location}</span>
          </div>
          <div className="flex items-center gap-2 p-2.5 bg-neutral-50 rounded-xl text-neutral-700">
            <DollarSign className="w-4 h-4 text-neutral-400" />
            <span>{job.salary}</span>
          </div>
          <div className="flex items-center gap-2 p-2.5 bg-neutral-50 rounded-xl text-neutral-700">
            <Users className="w-4 h-4 text-neutral-400" />
            <span>{job.applicantsCount} Applicants</span>
          </div>
        </div>

        {/* Description */}
        <div>
          <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-400 mb-1.5">
            Role Overview
          </h4>
          <p className="text-xs text-neutral-600 leading-relaxed bg-neutral-50 p-3 rounded-2xl border border-neutral-100">
            {job.description}
          </p>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-neutral-100 mt-1">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium text-neutral-600 hover:bg-neutral-100 rounded-full transition-colors"
          >
            Close
          </button>
          <button
            type="button"
            onClick={() => {
              onClose();
              onEdit(job);
            }}
            className="px-5 py-2 text-xs font-medium text-white bg-[#111111] hover:bg-black rounded-full transition-colors shadow-xs"
          >
            Edit Job
          </button>
        </div>
      </div>
    </Modal>
  );
};
