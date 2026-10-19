import React, { useState, useMemo } from 'react';
import { useJobgio } from '../../context/JobgioContext';
import { Job, JobStatus } from '../../types/jobgio';
import { ConfirmDialog } from '../common/ConfirmDialog';
import { JobModal } from '../jobs/JobModal';
import { JobDetailsModal } from '../jobs/JobDetailsModal';
import {
  Search,
  ChevronDown,
  Download,
  Plus,
  MoreHorizontal,
  ChevronLeft,
  ChevronRight,
  ArrowUpDown,
  Check,
  Trash2,
  Eye,
  Edit,
} from 'lucide-react';

export const ManageJobsTable: React.FC = () => {
  const {
    jobs,
    addJob,
    updateJob,
    deleteJob,
    bulkDeleteJobs,
    bulkUpdateJobStatus,
    showToast,
  } = useJobgio();

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'All' | JobStatus>('All');
  const [statusDropdownOpen, setStatusDropdownOpen] = useState(false);

  // Sorting state
  const [sortField, setSortField] = useState<'title' | 'company' | 'postedDate'>('postedDate');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  // Selection state
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 5;

  // Modals state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingJob, setEditingJob] = useState<Job | null>(null);
  const [inspectingJob, setInspectingJob] = useState<Job | null>(null);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  const [isBulkDeleteOpen, setIsBulkDeleteOpen] = useState(false);

  // Row action menu state
  const [openActionId, setOpenActionId] = useState<string | null>(null);

  // Filtered & Sorted Jobs
  const filteredJobs = useMemo(() => {
    return jobs.filter((job) => {
      const matchesSearch =
        job.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        job.company.toLowerCase().includes(searchQuery.toLowerCase()) ||
        job.location.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesStatus = statusFilter === 'All' || job.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [jobs, searchQuery, statusFilter]);

  const sortedJobs = useMemo(() => {
    return [...filteredJobs].sort((a, b) => {
      if (sortField === 'title') {
        const res = a.title.localeCompare(b.title);
        return sortDirection === 'asc' ? res : -res;
      }
      if (sortField === 'company') {
        const res = a.company.localeCompare(b.company);
        return sortDirection === 'asc' ? res : -res;
      }
      if (sortField === 'postedDate') {
        const res = a.rawDate.localeCompare(b.rawDate);
        return sortDirection === 'asc' ? res : -res;
      }
      return 0;
    });
  }, [filteredJobs, sortField, sortDirection]);

  // Paginated records
  const totalPages = Math.max(1, Math.ceil(sortedJobs.length / pageSize));
  const paginatedJobs = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return sortedJobs.slice(start, start + pageSize);
  }, [sortedJobs, currentPage, pageSize]);

  // Selection Handlers
  const isAllVisibleSelected =
    paginatedJobs.length > 0 &&
    paginatedJobs.every((j) => selectedIds.includes(j.id));

  const handleSelectAll = () => {
    if (isAllVisibleSelected) {
      const visibleIds = paginatedJobs.map((j) => j.id);
      setSelectedIds((prev) => prev.filter((id) => !visibleIds.includes(id)));
    } else {
      const newIds = [...selectedIds];
      paginatedJobs.forEach((j) => {
        if (!newIds.includes(j.id)) newIds.push(j.id);
      });
      setSelectedIds(newIds);
    }
  };

  const handleSelectRow = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  // Sort Handler
  const handleSort = (field: 'title' | 'company' | 'postedDate') => {
    if (sortField === field) {
      setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  // Real CSV Export
  const handleExportCSV = () => {
    const exportData =
      selectedIds.length > 0
        ? jobs.filter((j) => selectedIds.includes(j.id))
        : sortedJobs;

    if (exportData.length === 0) {
      showToast('No job records to export', 'info');
      return;
    }

    const headers = [
      'Job ID',
      'Title',
      'Company',
      'Location',
      'Status',
      'Type',
      'Salary',
      'Category',
      'Posted Date',
      'Applicants Count',
    ];

    const rows = exportData.map((j) => [
      j.id,
      `"${j.title.replace(/"/g, '""')}"`,
      `"${j.company.replace(/"/g, '""')}"`,
      `"${j.location.replace(/"/g, '""')}"`,
      j.status,
      j.type,
      `"${j.salary}"`,
      j.category,
      `"${j.postedDate}"`,
      j.applicantsCount,
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute(
      'download',
      `jobgio-jobs-export-${new Date().toISOString().slice(0, 10)}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    showToast(`Exported ${exportData.length} jobs to CSV`, 'success');
  };

  // Helper for company icon badges
  const renderCompanyLogo = (company: string, logo?: string, color?: string) => {
    const initial = logo || company.charAt(0);
    const bg = color || '#171717';

    // Recognizable logos
    if (company.toLowerCase() === 'google') {
      return (
        <span className="w-6 h-6 rounded-md bg-white border border-neutral-200 flex items-center justify-center text-xs font-bold shrink-0">
          <span className="text-[#4285F4]">G</span>
        </span>
      );
    }
    if (company.toLowerCase() === 'amazon') {
      return (
        <span className="w-6 h-6 rounded-md bg-[#111111] flex items-center justify-center text-xs font-bold text-[#FF9900] shrink-0">
          a
        </span>
      );
    }
    if (company.toLowerCase() === 'paypal') {
      return (
        <span className="w-6 h-6 rounded-md bg-[#003087] flex items-center justify-center text-xs font-bold text-white shrink-0">
          P
        </span>
      );
    }
    return (
      <span
        className="w-6 h-6 rounded-md flex items-center justify-center text-xs font-bold text-white shrink-0"
        style={{ backgroundColor: bg }}
      >
        {initial}
      </span>
    );
  };

  return (
    <div className="bg-white border border-[#EEEEEE] rounded-[24px] p-6 shadow-xs flex flex-col gap-4">
      {/* Top Header Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h3 className="text-lg font-bold text-[#171717] tracking-tight">Manage jobs</h3>
          <p className="text-xs text-[#858585] mt-0.5">
            {filteredJobs.length} active listings found
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Search Input */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              placeholder="Search title, company..."
              className="pl-8 pr-3 py-1.5 text-xs bg-[#F9F9F9] border border-neutral-200 rounded-full focus:outline-none focus:ring-2 focus:ring-black focus:bg-white w-44 sm:w-48 transition-all"
            />
          </div>

          {/* Status Filter Dropdown */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setStatusDropdownOpen(!statusDropdownOpen)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-[#171717] bg-white border border-[#EEEEEE] rounded-full hover:bg-neutral-50 transition-colors shadow-2xs"
            >
              <span>{statusFilter === 'All' ? 'Status' : statusFilter}</span>
              <ChevronDown className="w-3.5 h-3.5 text-neutral-400" />
            </button>

            {statusDropdownOpen && (
              <div className="absolute right-0 mt-1 w-32 bg-white border border-neutral-200 rounded-2xl shadow-xl py-1 z-30 animate-fade-in">
                {(['All', 'Active', 'Pending', 'Expired'] as const).map((st) => (
                  <button
                    key={st}
                    type="button"
                    onClick={() => {
                      setStatusFilter(st);
                      setStatusDropdownOpen(false);
                      setCurrentPage(1);
                    }}
                    className="w-full flex items-center justify-between px-3 py-1.5 text-xs text-neutral-700 hover:bg-neutral-100 transition-colors"
                  >
                    <span>{st}</span>
                    {statusFilter === st && <Check className="w-3 h-3 text-black" />}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Export Button matching screenshot */}
          <button
            type="button"
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-medium text-white bg-[#111111] hover:bg-black rounded-full transition-colors shadow-xs"
          >
            <span>Export</span>
            <Download className="w-3.5 h-3.5" />
          </button>

          {/* Add Job Button */}
          <button
            type="button"
            onClick={() => setIsAddModalOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-medium text-[#171717] bg-[#F5F5F5] hover:bg-neutral-200 rounded-full transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Job</span>
          </button>
        </div>
      </div>

      {/* Bulk Selection Bar */}
      {selectedIds.length > 0 && (
        <div className="flex items-center justify-between px-4 py-2 bg-neutral-900 text-white rounded-2xl text-xs animate-fade-in">
          <span>{selectedIds.length} jobs selected</span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => bulkUpdateJobStatus(selectedIds, 'Active')}
              className="px-2.5 py-1 bg-neutral-800 hover:bg-neutral-700 rounded-full transition-colors"
            >
              Mark Active
            </button>
            <button
              type="button"
              onClick={() => bulkUpdateJobStatus(selectedIds, 'Expired')}
              className="px-2.5 py-1 bg-neutral-800 hover:bg-neutral-700 rounded-full transition-colors"
            >
              Mark Expired
            </button>
            <button
              type="button"
              onClick={() => setIsBulkDeleteOpen(true)}
              className="px-2.5 py-1 bg-rose-700 hover:bg-rose-600 rounded-full transition-colors flex items-center gap-1"
            >
              <Trash2 className="w-3 h-3" />
              <span>Delete</span>
            </button>
          </div>
        </div>
      )}

      {/* Table Container */}
      <div className="overflow-x-auto -mx-6 px-6">
        <table className="w-full text-left text-xs text-[#171717] border-collapse min-w-[700px]">
          {/* Table Header */}
          <thead>
            <tr className="border-b border-[#F0F0F0] text-[#858585] font-medium text-[11px]">
              <th className="py-3 px-3 w-10">
                <input
                  type="checkbox"
                  checked={isAllVisibleSelected}
                  onChange={handleSelectAll}
                  className="rounded-md border-neutral-300 text-black focus:ring-black cursor-pointer"
                />
              </th>
              <th
                className="py-3 px-3 cursor-pointer hover:text-black transition-colors"
                onClick={() => handleSort('title')}
              >
                <div className="flex items-center gap-1">
                  <span>Job Title</span>
                  <ArrowUpDown className="w-3 h-3 opacity-60" />
                </div>
              </th>
              <th
                className="py-3 px-3 cursor-pointer hover:text-black transition-colors"
                onClick={() => handleSort('company')}
              >
                <div className="flex items-center gap-1">
                  <span>Company</span>
                  <ArrowUpDown className="w-3 h-3 opacity-60" />
                </div>
              </th>
              <th className="py-3 px-3">Location</th>
              <th className="py-3 px-3">Status</th>
              <th
                className="py-3 px-3 cursor-pointer hover:text-black transition-colors"
                onClick={() => handleSort('postedDate')}
              >
                <div className="flex items-center gap-1">
                  <span>Posted Date</span>
                  <ArrowUpDown className="w-3 h-3 opacity-60" />
                </div>
              </th>
              <th className="py-3 px-3 text-right">Actions</th>
            </tr>
          </thead>

          {/* Table Body */}
          <tbody className="divide-y divide-[#F8F8F8]">
            {paginatedJobs.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-12 text-center text-neutral-400">
                  No jobs found matching your criteria.
                </td>
              </tr>
            ) : (
              paginatedJobs.map((job) => {
                const isSelected = selectedIds.includes(job.id);
                const isActionMenuOpen = openActionId === job.id;

                return (
                  <tr
                    key={job.id}
                    className={`hover:bg-[#FAFAFA] transition-colors group ${
                      isSelected ? 'bg-neutral-50/70' : ''
                    }`}
                  >
                    {/* Checkbox */}
                    <td className="py-3.5 px-3">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => handleSelectRow(job.id)}
                        className="rounded-md border-neutral-300 text-black focus:ring-black cursor-pointer"
                      />
                    </td>

                    {/* Job Title */}
                    <td className="py-3.5 px-3 font-semibold text-[#171717]">
                      <button
                        type="button"
                        onClick={() => setInspectingJob(job)}
                        className="hover:underline text-left"
                      >
                        {job.title}
                      </button>
                    </td>

                    {/* Company */}
                    <td className="py-3.5 px-3">
                      <div className="flex items-center gap-2">
                        {renderCompanyLogo(job.company, job.companyLogo, job.companyColor)}
                        <span className="font-medium text-[#171717]">{job.company}</span>
                      </div>
                    </td>

                    {/* Location */}
                    <td className="py-3.5 px-3 text-[#858585]">{job.location}</td>

                    {/* Status Badge */}
                    <td className="py-3.5 px-3">
                      <span
                        className={`inline-block px-3 py-0.5 rounded-full text-[11px] font-medium ${
                          job.status === 'Active'
                            ? 'bg-[#EBF7EE] text-[#1D7A37]'
                            : job.status === 'Pending'
                            ? 'bg-[#F4F4F5] text-[#71717A]'
                            : 'bg-[#FDF2F2] text-[#9B1C1C]'
                        }`}
                      >
                        {job.status}
                      </span>
                    </td>

                    {/* Posted Date */}
                    <td className="py-3.5 px-3 text-[#858585]">{job.postedDate}</td>

                    {/* Actions Menu */}
                    <td className="py-3.5 px-3 text-right relative">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setOpenActionId(isActionMenuOpen ? null : job.id);
                        }}
                        className="p-1 rounded-lg text-neutral-400 hover:text-black hover:bg-neutral-100 transition-colors"
                      >
                        <MoreHorizontal className="w-4 h-4" />
                      </button>

                      {isActionMenuOpen && (
                        <div
                          className="absolute right-3 top-10 w-36 bg-white border border-neutral-200 rounded-2xl shadow-xl py-1 z-30 text-left animate-fade-in"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <button
                            type="button"
                            onClick={() => {
                              setInspectingJob(job);
                              setOpenActionId(null);
                            }}
                            className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-neutral-700 hover:bg-neutral-100"
                          >
                            <Eye className="w-3.5 h-3.5 text-neutral-400" />
                            <span>View Details</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setEditingJob(job);
                              setOpenActionId(null);
                            }}
                            className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-neutral-700 hover:bg-neutral-100"
                          >
                            <Edit className="w-3.5 h-3.5 text-neutral-400" />
                            <span>Edit Listing</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              const nextStatus: JobStatus =
                                job.status === 'Active' ? 'Expired' : 'Active';
                              updateJob(job.id, { status: nextStatus });
                              setOpenActionId(null);
                            }}
                            className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-neutral-700 hover:bg-neutral-100"
                          >
                            <Check className="w-3.5 h-3.5 text-neutral-400" />
                            <span>Toggle Status</span>
                          </button>
                          <div className="border-t border-neutral-100 my-1"></div>
                          <button
                            type="button"
                            onClick={() => {
                              setDeleteTargetId(job.id);
                              setOpenActionId(null);
                            }}
                            className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-rose-600 hover:bg-rose-50"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>Delete</span>
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination & Summary */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t border-[#F5F5F5] text-xs text-[#858585]">
        <span>
          Showing {paginatedJobs.length > 0 ? (currentPage - 1) * pageSize + 1 : 0} to{' '}
          {Math.min(currentPage * pageSize, sortedJobs.length)} of {sortedJobs.length} jobs
        </span>

        <div className="flex items-center gap-2">
          <button
            type="button"
            disabled={currentPage <= 1}
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            className="p-1.5 rounded-lg border border-neutral-200 hover:bg-neutral-100 disabled:opacity-40 disabled:hover:bg-transparent transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          <span className="font-semibold text-neutral-900 px-2">
            Page {currentPage} of {totalPages}
          </span>

          <button
            type="button"
            disabled={currentPage >= totalPages}
            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
            className="p-1.5 rounded-lg border border-neutral-200 hover:bg-neutral-100 disabled:opacity-40 disabled:hover:bg-transparent transition-colors"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Add Job Modal */}
      <JobModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
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

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={!!deleteTargetId}
        onClose={() => setDeleteTargetId(null)}
        onConfirm={() => {
          if (deleteTargetId) {
            deleteJob(deleteTargetId);
            setDeleteTargetId(null);
          }
        }}
        title="Delete Job Listing?"
        message="Are you sure you want to permanently delete this job listing? This action cannot be undone."
        confirmLabel="Delete Job"
        isDestructive={true}
      />

      {/* Bulk Delete Confirmation */}
      <ConfirmDialog
        isOpen={isBulkDeleteOpen}
        onClose={() => setIsBulkDeleteOpen(false)}
        onConfirm={() => {
          bulkDeleteJobs(selectedIds);
          setSelectedIds([]);
          setIsBulkDeleteOpen(false);
        }}
        title={`Delete ${selectedIds.length} Job Listings?`}
        message={`Are you sure you want to permanently delete these ${selectedIds.length} listings?`}
        confirmLabel="Delete Selected"
        isDestructive={true}
      />
    </div>
  );
};
