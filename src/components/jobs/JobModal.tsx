import React, { useState, useEffect } from 'react';
import { Job, JobStatus } from '../../types/jobgio';
import { Modal } from '../common/Modal';

interface JobModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (jobData: any) => void;
  initialJob?: Job | null;
}

export const JobModal: React.FC<JobModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  initialJob,
}) => {
  const [title, setTitle] = useState('');
  const [company, setCompany] = useState('');
  const [location, setLocation] = useState('');
  const [status, setStatus] = useState<JobStatus>('Active');
  const [type, setType] = useState<Job['type']>('Full-time');
  const [salary, setSalary] = useState('');
  const [category, setCategory] = useState('Engineering');
  const [description, setDescription] = useState('');
  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  useEffect(() => {
    if (initialJob) {
      setTitle(initialJob.title);
      setCompany(initialJob.company);
      setLocation(initialJob.location);
      setStatus(initialJob.status);
      setType(initialJob.type);
      setSalary(initialJob.salary);
      setCategory(initialJob.category);
      setDescription(initialJob.description);
    } else {
      setTitle('');
      setCompany('');
      setLocation('San Francisco, CA');
      setStatus('Active');
      setType('Full-time');
      setSalary('$120K - $160K');
      setCategory('Engineering');
      setDescription('');
    }
    setErrors({});
  }, [initialJob, isOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: { [key: string]: string } = {};

    if (!title.trim()) newErrors.title = 'Job title is required';
    if (!company.trim()) newErrors.company = 'Company name is required';
    if (!location.trim()) newErrors.location = 'Location is required';

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    onSubmit({
      title: title.trim(),
      company: company.trim(),
      location: location.trim(),
      status,
      type,
      salary: salary.trim() || 'Competitive',
      category,
      description: description.trim() || 'No description provided.',
    });

    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={initialJob ? 'Edit Job Posting' : 'Post New Job'}
      subtitle={initialJob ? `Editing ${initialJob.title}` : 'Create an active or pending listing'}
      maxWidth="md"
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        {/* Job Title */}
        <div>
          <label className="block text-xs font-semibold text-neutral-700 mb-1">
            Job Title *
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Senior Frontend Engineer"
            className="w-full px-3.5 py-2.5 text-sm bg-neutral-50 border border-neutral-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-black focus:bg-white transition-all"
          />
          {errors.title && <p className="text-[11px] text-rose-500 mt-1">{errors.title}</p>}
        </div>

        {/* Company & Category */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-neutral-700 mb-1">
              Company *
            </label>
            <input
              type="text"
              value={company}
              onChange={(e) => setCompany(e.target.value)}
              placeholder="e.g. Stripe"
              className="w-full px-3.5 py-2.5 text-sm bg-neutral-50 border border-neutral-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-black focus:bg-white transition-all"
            />
            {errors.company && <p className="text-[11px] text-rose-500 mt-1">{errors.company}</p>}
          </div>

          <div>
            <label className="block text-xs font-semibold text-neutral-700 mb-1">
              Category
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full px-3 py-2.5 text-sm bg-neutral-50 border border-neutral-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-black focus:bg-white transition-all"
            >
              <option value="Engineering">Engineering</option>
              <option value="Design">Design</option>
              <option value="Product">Product</option>
              <option value="Marketing">Marketing</option>
              <option value="Data">Data & AI</option>
              <option value="Sales">Sales & CS</option>
            </select>
          </div>
        </div>

        {/* Location & Status */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-neutral-700 mb-1">
              Location *
            </label>
            <input
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="e.g. San Francisco or Remote"
              className="w-full px-3.5 py-2.5 text-sm bg-neutral-50 border border-neutral-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-black focus:bg-white transition-all"
            />
            {errors.location && <p className="text-[11px] text-rose-500 mt-1">{errors.location}</p>}
          </div>

          <div>
            <label className="block text-xs font-semibold text-neutral-700 mb-1">
              Status
            </label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as JobStatus)}
              className="w-full px-3 py-2.5 text-sm bg-neutral-50 border border-neutral-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-black focus:bg-white transition-all"
            >
              <option value="Active">Active</option>
              <option value="Pending">Pending</option>
              <option value="Expired">Expired</option>
            </select>
          </div>
        </div>

        {/* Type & Salary */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-neutral-700 mb-1">
              Job Type
            </label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value as Job['type'])}
              className="w-full px-3 py-2.5 text-sm bg-neutral-50 border border-neutral-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-black focus:bg-white transition-all"
            >
              <option value="Full-time">Full-time</option>
              <option value="Part-time">Part-time</option>
              <option value="Remote">Remote</option>
              <option value="Contract">Contract</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-neutral-700 mb-1">
              Salary Range
            </label>
            <input
              type="text"
              value={salary}
              onChange={(e) => setSalary(e.target.value)}
              placeholder="e.g. $130K - $170K"
              className="w-full px-3.5 py-2.5 text-sm bg-neutral-50 border border-neutral-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-black focus:bg-white transition-all"
            />
          </div>
        </div>

        {/* Description */}
        <div>
          <label className="block text-xs font-semibold text-neutral-700 mb-1">
            Description
          </label>
          <textarea
            rows={3}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Key responsibilities and qualifications..."
            className="w-full px-3.5 py-2 text-sm bg-neutral-50 border border-neutral-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-black focus:bg-white transition-all resize-none"
          />
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-neutral-100 mt-1">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium text-neutral-600 hover:bg-neutral-100 rounded-full transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="px-5 py-2 text-xs font-medium text-white bg-[#111111] hover:bg-black rounded-full transition-colors shadow-xs"
          >
            {initialJob ? 'Save Changes' : 'Post Job'}
          </button>
        </div>
      </form>
    </Modal>
  );
};
