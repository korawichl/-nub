import React, { useState, useMemo } from 'react';
import { useJobgio } from '../context/JobgioContext';
import { Job } from '../types/jobgio';
import { JobModal } from '../components/jobs/JobModal';
import { JobDetailsModal } from '../components/jobs/JobDetailsModal';
import { ConfirmDialog } from '../components/common/ConfirmDialog';
import {
  Search,
  Plus,
  Briefcase,
  CheckCircle,
  Clock,
  AlertTriangle,
  Download,
  Filter,
  Eye,
  Edit,
  Trash2,
} from 'lucide-react';

export const JobsPage: React.FC = () => {
  const { jobs, addJob, updateJob, deleteJob, showToast } = useJobgio();

  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedStatus, setSelectedStatus] = useState<string>('All');
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editingJob, setEditingJob] = useState<Job | null>(null);
  const [inspectingJob, setInspectingJob] = useState<Job | null>(null);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);

  // Statistics
  const activeCount = jobs.filter((j) => j.status === 'Active').length;
  const pendingCount = jobs.filter((j) => j.status === 'Pending').length;
  const expiredCount = jobs.filter((j) => j.status === 'Expired').length;

  // Filtering
  const filteredJobs = useMemo(() => {
    return jobs.filter((j) => {
      const matchSearch =
        j.title.toLowerCase().includes(search.toLowerCase()) ||
        j.company.toLowerCase().includes(search.toLowerCase()) ||
        j.location.toLowerCase().includes(search.toLowerCase());
      const matchCat =
        selectedCategory === 'All' || j.category === selectedCategory;
      const matchStatus =
        selectedStatus === 'All' || j.status === selectedStatus;
      return matchSearch && matchCat && matchStatus;
    });
  }, [jobs, search, selectedCategory, selectedStatus]);

  const handleExport = () => {
    const headers = ['Title', 'Company', 'Category', 'Location', 'Type', 'Salary', 'Status', 'Applicants'];
    const rows = filteredJobs.map((j) => [
      `"${j.title}"`,
      `"${j.company}"`,
      j.category,
      `"${j.location}"`,
      j.type,
      `"${j.salary}"`,
      j.status,
      j.applicantsCount,
    ]);
    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const link = document.createElement('a');
    link.href = encodeURI(csvContent);
    link.download = `jobgio-jobs-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    showToast(`Exported ${filteredJobs.length} jobs to CSV`, 'success');
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[#171717]">Job Management</h1>
          <p className="text-xs text-[#858585] mt-1">
            Oversee active postings, review pending applications, and manage hiring pipelines.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={handleExport}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-neutral-700 bg-white border border-neutral-200 rounded-full hover:bg-neutral-50 transition-colors shadow-2xs"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export CSV</span>
          </button>
          <button
            type="button"
            onClick={() => setIsAddOpen(true)}
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-medium text-white bg-[#111111] hover:bg-black rounded-full transition-colors shadow-xs"
          >
            <Plus className="w-4 h-4" />
            <span>Post New Job</span>
          </button>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        <div className="p-4 bg-white border border-[#EEEEEE] rounded-[22px] flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-neutral-100 flex items-center justify-center text-neutral-800">
            <Briefcase className="w-5 h-5" />
          </div>
          <div>
            <span className="text-lg font-bold text-[#171717]">{jobs.length}</span>
            <p className="text-[11px] text-[#858585]">Total Jobs</p>
          </div>
        </div>

        <div className="p-4 bg-white border border-[#EEEEEE] rounded-[22px] flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-600">
            <CheckCircle className="w-5 h-5" />
          </div>
          <div>
            <span className="text-lg font-bold text-emerald-600">{activeCount}</span>
            <p className="text-[11px] text-[#858585]">Active Postings</p>
          </div>
        </div>

        <div className="p-4 bg-white border border-[#EEEEEE] rounded-[22px] flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-amber-50 flex items-center justify-center text-amber-600">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <span className="text-lg font-bold text-amber-600">{pendingCount}</span>
            <p className="text-[11px] text-[#858585]">Pending Review</p>
          </div>
        </div>

        <div className="p-4 bg-white border border-[#EEEEEE] rounded-[22px] flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-neutral-100 flex items-center justify-center text-neutral-600">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div>
            <span className="text-lg font-bold text-[#171717]">{expiredCount}</span>
            <p className="text-[11px] text-[#858585]">Expired Listings</p>
          </div>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white border border-[#EEEEEE] rounded-[24px] p-4 flex flex-wrap items-center justify-between gap-3 shadow-2xs">
        <div className="flex items-center gap-3 flex-1 min-w-[240px]">
          <div className="relative flex-1 max-w-sm">
            <Search className="w-4 h-4 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search title, company, or location..."
              className="w-full pl-9 pr-3 py-2 text-xs bg-neutral-50 border border-neutral-200 rounded-full focus:outline-none focus:ring-2 focus:ring-black focus:bg-white transition-all"
            />
          </div>

          <div className="flex items-center gap-1.5 text-xs text-neutral-500">
            <Filter className="w-3.5 h-3.5" />
            <span>Category:</span>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="px-2 py-1 bg-neutral-50 border border-neutral-200 rounded-lg text-xs focus:outline-none"
            >
              <option value="All">All Categories</option>
              <option value="Engineering">Engineering</option>
              <option value="Design">Design</option>
              <option value="Product">Product</option>
              <option value="Marketing">Marketing</option>
              <option value="Data">Data & AI</option>
            </select>
          </div>
        </div>

        {/* Status Pills */}
        <div className="flex items-center gap-1.5 bg-neutral-100 p-1 rounded-full text-xs">
          {['All', 'Active', 'Pending', 'Expired'].map((st) => (
            <button
              key={st}
              type="button"
              onClick={() => setSelectedStatus(st)}
              className={`px-3 py-1 rounded-full font-medium transition-colors ${
                selectedStatus === st
                  ? 'bg-white text-black shadow-2xs font-semibold'
                  : 'text-neutral-500 hover:text-black'
              }`}
            >
              {st}
            </button>
          ))}
        </div>
      </div>

      {/* Jobs Grid / Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredJobs.length === 0 ? (
          <div className="col-span-full py-16 text-center text-neutral-400 bg-white border border-neutral-200 rounded-3xl">
            No job listings found matching filters.
          </div>
        ) : (
          filteredJobs.map((job) => (
            <div
              key={job.id}
              className="bg-white border border-[#EEEEEE] rounded-[24px] p-5 shadow-xs hover:border-neutral-300 transition-all flex flex-col justify-between gap-4"
            >
              <div>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <span
                      className="w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold text-white shrink-0 shadow-2xs"
                      style={{ backgroundColor: job.companyColor || '#171717' }}
                    >
                      {job.companyLogo || job.company.charAt(0)}
                    </span>
                    <div>
                      <h3
                        onClick={() => setInspectingJob(job)}
                        className="text-sm font-bold text-[#171717] hover:underline cursor-pointer"
                      >
                        {job.title}
                      </h3>
                      <p className="text-xs text-[#858585]">{job.company} · {job.location}</p>
                    </div>
                  </div>

                  <span
                    className={`px-3 py-0.5 rounded-full text-[11px] font-medium ${
                      job.status === 'Active'
                        ? 'bg-[#EBF7EE] text-[#1D7A37]'
                        : job.status === 'Pending'
                        ? 'bg-[#F4F4F5] text-[#71717A]'
                        : 'bg-[#FDF2F2] text-[#9B1C1C]'
                    }`}
                  >
                    {job.status}
                  </span>
                </div>

                <p className="text-xs text-neutral-600 line-clamp-2 mt-3 leading-relaxed">
                  {job.description}
                </p>
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-[#F5F5F5] text-xs">
                <div className="flex items-center gap-3 text-neutral-500 font-medium">
                  <span className="text-[#171717] font-semibold">{job.salary}</span>
                  <span>•</span>
                  <span>{job.applicantsCount} Applicants</span>
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setInspectingJob(job)}
                    className="p-1.5 text-neutral-400 hover:text-black rounded-lg hover:bg-neutral-100 transition-colors"
                    title="View details"
                  >
                    <Eye className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditingJob(job)}
                    className="p-1.5 text-neutral-400 hover:text-black rounded-lg hover:bg-neutral-100 transition-colors"
                    title="Edit job"
                  >
                    <Edit className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setDeleteTargetId(job.id)}
                    className="p-1.5 text-rose-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition-colors"
                    title="Delete job"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Add Job Modal */}
      <JobModal
        isOpen={isAddOpen}
        onClose={() => setIsAddOpen(false)}
        onSubmit={(data) => addJob(data)}
      />

      {/* Edit Job Modal */}
      <JobModal
        isOpen={!!editingJob}
        onClose={() => setEditingJob(null)}
        initialJob={editingJob}
        onSubmit={(data) => {
          if (editingJob) {
            updateJob(editingJob.id, data);
            setEditingJob(null);
          }
        }}
      />

      {/* Inspect Job Modal */}
      <JobDetailsModal
        job={inspectingJob}
        onClose={() => setInspectingJob(null)}
        onEdit={(job) => {
          setInspectingJob(null);
          setEditingJob(job);
        }}
      />

      {/* Confirm Deletion */}
      <ConfirmDialog
        isOpen={!!deleteTargetId}
        onClose={() => setDeleteTargetId(null)}
        onConfirm={() => {
          if (deleteTargetId) {
            deleteJob(deleteTargetId);
            setDeleteTargetId(null);
          }
        }}
        title="Delete Job?"
        message="Are you sure you want to delete this job listing? It will be removed permanently."
        confirmLabel="Delete"
        isDestructive={true}
      />
    </div>
  );
};
