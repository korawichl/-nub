import React, { useState } from 'react';
import { useJobgio } from '../context/JobgioContext';
import { Application } from '../types/jobgio';
import { Modal } from '../components/common/Modal';
import { Search, ExternalLink, FileText } from 'lucide-react';

export const ApplicationsPage: React.FC = () => {
  const { applications, updateApplicationStatus } = useJobgio();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [selectedApp, setSelectedApp] = useState<Application | null>(null);

  const filteredApps = applications.filter((app) => {
    const matchesSearch =
      app.candidateName.toLowerCase().includes(search.toLowerCase()) ||
      app.candidateEmail.toLowerCase().includes(search.toLowerCase()) ||
      app.jobTitle.toLowerCase().includes(search.toLowerCase()) ||
      app.company.toLowerCase().includes(search.toLowerCase());

    const matchesStatus = statusFilter === 'All' || app.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[#171717]">Candidate Applications</h1>
          <p className="text-xs text-[#858585] mt-1">
            Review incoming candidate resumes, schedule interviews, and update application stages.
          </p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white border border-[#EEEEEE] rounded-[24px] p-4 flex flex-wrap items-center justify-between gap-3 shadow-2xs">
        <div className="relative flex-1 min-w-[240px] max-w-md">
          <Search className="w-4 h-4 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search candidate name, email, or role..."
            className="w-full pl-9 pr-3 py-2 text-xs bg-neutral-50 border border-neutral-200 rounded-full focus:outline-none focus:ring-2 focus:ring-black focus:bg-white transition-all"
          />
        </div>

        <div className="flex items-center gap-1.5 bg-neutral-100 p-1 rounded-full text-xs">
          {['All', 'Under Review', 'Interviewing', 'Accepted', 'Rejected'].map((st) => (
            <button
              key={st}
              type="button"
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1 rounded-full font-medium transition-colors ${
                statusFilter === st
                  ? 'bg-white text-black shadow-2xs font-semibold'
                  : 'text-neutral-500 hover:text-black'
              }`}
            >
              {st}
            </button>
          ))}
        </div>
      </div>

      {/* Applications List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredApps.length === 0 ? (
          <div className="col-span-full py-16 text-center text-neutral-400 bg-white border border-neutral-200 rounded-3xl">
            No applications found matching your criteria.
          </div>
        ) : (
          filteredApps.map((app) => (
            <div
              key={app.id}
              className="bg-white border border-[#EEEEEE] rounded-[24px] p-5 shadow-xs hover:border-neutral-300 transition-all flex flex-col justify-between gap-4"
            >
              <div>
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-neutral-100 flex items-center justify-center text-neutral-700 font-bold text-xs shrink-0">
                      {app.candidateName.substring(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <h3
                        onClick={() => setSelectedApp(app)}
                        className="text-sm font-bold text-[#171717] hover:underline cursor-pointer"
                      >
                        {app.candidateName}
                      </h3>
                      <p className="text-xs text-[#858585]">{app.candidateEmail}</p>
                    </div>
                  </div>

                  <span
                    className={`px-2.5 py-0.5 rounded-full text-[10px] font-semibold shrink-0 ${
                      app.status === 'Accepted'
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        : app.status === 'Interviewing'
                        ? 'bg-blue-50 text-blue-700 border border-blue-200'
                        : app.status === 'Under Review'
                        ? 'bg-amber-50 text-amber-700 border border-amber-200'
                        : 'bg-rose-50 text-rose-700 border border-rose-200'
                    }`}
                  >
                    {app.status}
                  </span>
                </div>

                <div className="mt-3.5 p-3 bg-neutral-50 rounded-2xl flex flex-col gap-1 text-xs">
                  <span className="font-semibold text-neutral-900">{app.jobTitle}</span>
                  <span className="text-neutral-500">{app.company} · Applied {app.appliedDate}</span>
                </div>

                {app.notes && (
                  <p className="text-xs text-neutral-600 mt-2.5 line-clamp-2 italic">
                    "{app.notes}"
                  </p>
                )}
              </div>

              {/* Status Update Quick Select */}
              <div className="flex items-center justify-between pt-3 border-t border-neutral-100 text-xs">
                <button
                  type="button"
                  onClick={() => setSelectedApp(app)}
                  className="text-xs font-semibold text-neutral-700 hover:text-black hover:underline"
                >
                  Review Dossier
                </button>

                <select
                  value={app.status}
                  onChange={(e) =>
                    updateApplicationStatus(app.id, e.target.value as Application['status'])
                  }
                  className="text-xs px-2.5 py-1 bg-neutral-100 border border-neutral-200 rounded-full font-medium focus:outline-none"
                >
                  <option value="Under Review">Under Review</option>
                  <option value="Interviewing">Interviewing</option>
                  <option value="Accepted">Accepted</option>
                  <option value="Rejected">Rejected</option>
                </select>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Candidate Dossier Modal */}
      {selectedApp && (
        <Modal
          isOpen={!!selectedApp}
          onClose={() => setSelectedApp(null)}
          title={`Candidate Dossier: ${selectedApp.candidateName}`}
          subtitle={`Applied for ${selectedApp.jobTitle} at ${selectedApp.company}`}
          maxWidth="md"
        >
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between pb-3 border-b border-neutral-100">
              <div>
                <h4 className="text-base font-bold text-neutral-900">{selectedApp.candidateName}</h4>
                <p className="text-xs text-neutral-500">{selectedApp.candidateEmail}</p>
              </div>
              <span className="text-xs font-medium px-3 py-1 bg-neutral-100 rounded-full">
                {selectedApp.status}
              </span>
            </div>

            <div className="flex flex-col gap-2 text-xs">
              <div className="p-3 bg-neutral-50 rounded-xl">
                <span className="font-semibold text-neutral-800">Job Position:</span>
                <p className="text-neutral-600 mt-0.5">{selectedApp.jobTitle} at {selectedApp.company}</p>
              </div>

              <div className="p-3 bg-neutral-50 rounded-xl">
                <span className="font-semibold text-neutral-800">Application Date:</span>
                <p className="text-neutral-600 mt-0.5">{selectedApp.appliedDate}</p>
              </div>

              {selectedApp.notes && (
                <div className="p-3 bg-neutral-50 rounded-xl">
                  <span className="font-semibold text-neutral-800">Review Notes:</span>
                  <p className="text-neutral-600 mt-0.5 leading-relaxed">{selectedApp.notes}</p>
                </div>
              )}
            </div>

            <div className="flex items-center gap-3 py-2 text-xs">
              {selectedApp.portfolioUrl && (
                <a
                  href={selectedApp.portfolioUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-1.5 text-neutral-700 hover:text-black font-medium"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Portfolio Site</span>
                </a>
              )}
              {selectedApp.resumeUrl && (
                <a
                  href={selectedApp.resumeUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-1.5 text-neutral-700 hover:text-black font-medium"
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>Download Resume (PDF)</span>
                </a>
              )}
            </div>

            {/* Stage Progression Buttons */}
            <div className="flex items-center justify-end gap-2 pt-4 border-t border-neutral-100">
              <button
                type="button"
                onClick={() => {
                  updateApplicationStatus(selectedApp.id, 'Interviewing');
                  setSelectedApp(null);
                }}
                className="px-3.5 py-1.5 text-xs font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-full transition-colors"
              >
                Schedule Interview
              </button>
              <button
                type="button"
                onClick={() => {
                  updateApplicationStatus(selectedApp.id, 'Accepted');
                  setSelectedApp(null);
                }}
                className="px-4 py-1.5 text-xs font-medium text-white bg-emerald-700 hover:bg-emerald-800 rounded-full transition-colors"
              >
                Accept Candidate
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
