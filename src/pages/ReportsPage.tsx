import React, { useState } from 'react';
import { useJobgio } from '../context/JobgioContext';
import { JobReport } from '../types/jobgio';
import { Modal } from '../components/common/Modal';
import { ShieldAlert, Search } from 'lucide-react';

export const ReportsPage: React.FC = () => {
  const { reports, resolveReport } = useJobgio();

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [selectedReport, setSelectedReport] = useState<JobReport | null>(null);

  const filtered = reports.filter((r) => {
    const matchSearch =
      r.jobTitle.toLowerCase().includes(search.toLowerCase()) ||
      r.company.toLowerCase().includes(search.toLowerCase()) ||
      r.reportedBy.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === 'All' || r.status === statusFilter;
    return matchSearch && matchStatus;
  });

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-[#171717]">Reported Listings & Moderation</h1>
        <p className="text-xs text-[#858585] mt-1">
          Review community reports regarding expired, fraudulent, or non-compliant job postings.
        </p>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white border border-[#EEEEEE] rounded-[24px] p-4 flex flex-wrap items-center justify-between gap-3 shadow-2xs">
        <div className="relative flex-1 min-w-[240px] max-w-md">
          <Search className="w-4 h-4 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search report details, job, or reporter..."
            className="w-full pl-9 pr-3 py-2 text-xs bg-neutral-50 border border-neutral-200 rounded-full focus:outline-none focus:ring-2 focus:ring-black focus:bg-white transition-all"
          />
        </div>

        <div className="flex items-center gap-1.5 bg-neutral-100 p-1 rounded-full text-xs">
          {['All', 'Open', 'Resolved', 'Dismissed'].map((st) => (
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

      {/* Reports Table */}
      <div className="bg-white border border-[#EEEEEE] rounded-[24px] p-6 shadow-xs overflow-x-auto">
        <table className="w-full text-left text-xs text-[#171717] border-collapse min-w-[650px]">
          <thead>
            <tr className="border-b border-[#F0F0F0] text-[#858585] font-medium text-[11px]">
              <th className="py-3 px-3">Job Listing</th>
              <th className="py-3 px-3">Reason</th>
              <th className="py-3 px-3">Reported By</th>
              <th className="py-3 px-3">Date</th>
              <th className="py-3 px-3">Status</th>
              <th className="py-3 px-3 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#F8F8F8]">
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-12 text-center text-neutral-400">
                  No moderation reports matching criteria.
                </td>
              </tr>
            ) : (
              filtered.map((r) => (
                <tr key={r.id} className="hover:bg-neutral-50/70 transition-colors">
                  <td className="py-3.5 px-3">
                    <span className="font-semibold text-neutral-900 block">{r.jobTitle}</span>
                    <span className="text-[11px] text-neutral-500">{r.company}</span>
                  </td>

                  <td className="py-3.5 px-3">
                    <span className="inline-flex items-center gap-1 text-rose-700 bg-rose-50 px-2.5 py-0.5 rounded-full text-[11px] font-medium">
                      <ShieldAlert className="w-3 h-3" />
                      <span>{r.reason}</span>
                    </span>
                  </td>

                  <td className="py-3.5 px-3">
                    <span className="text-neutral-800 block">{r.reportedBy}</span>
                    <span className="text-[11px] text-neutral-400">{r.reportedByEmail}</span>
                  </td>

                  <td className="py-3.5 px-3 text-neutral-500">{r.reportedDate}</td>

                  <td className="py-3.5 px-3">
                    <span
                      className={`inline-block px-2.5 py-0.5 rounded-full text-[11px] font-medium ${
                        r.status === 'Open'
                          ? 'bg-amber-50 text-amber-700 border border-amber-200'
                          : r.status === 'Resolved'
                          ? 'bg-emerald-50 text-emerald-700'
                          : 'bg-neutral-100 text-neutral-600'
                      }`}
                    >
                      {r.status}
                    </span>
                  </td>

                  <td className="py-3.5 px-3 text-right">
                    <button
                      type="button"
                      onClick={() => setSelectedReport(r)}
                      className="px-3 py-1 rounded-full text-xs font-semibold text-neutral-700 hover:text-black hover:bg-neutral-100 transition-colors"
                    >
                      Investigate
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Investigation Modal */}
      {selectedReport && (
        <Modal
          isOpen={!!selectedReport}
          onClose={() => setSelectedReport(null)}
          title={`Moderation Report: ${selectedReport.jobTitle}`}
          subtitle={`Reason: ${selectedReport.reason}`}
          maxWidth="md"
        >
          <div className="flex flex-col gap-4 text-xs">
            <div className="p-3 bg-neutral-50 rounded-xl">
              <span className="font-semibold text-neutral-800">Flagged Listing:</span>
              <p className="text-neutral-600 mt-0.5">{selectedReport.jobTitle} at {selectedReport.company}</p>
            </div>

            <div className="p-3 bg-neutral-50 rounded-xl">
              <span className="font-semibold text-neutral-800">Reporter Comments:</span>
              <p className="text-neutral-600 mt-0.5 leading-relaxed italic">
                "{selectedReport.details}"
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 bg-neutral-50 rounded-xl">
                <span className="font-semibold text-neutral-800">Reported By:</span>
                <p className="text-neutral-600 mt-0.5">{selectedReport.reportedBy} ({selectedReport.reportedByEmail})</p>
              </div>
              <div className="p-3 bg-neutral-50 rounded-xl">
                <span className="font-semibold text-neutral-800">Date Logged:</span>
                <p className="text-neutral-600 mt-0.5">{selectedReport.reportedDate}</p>
              </div>
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-neutral-100 mt-1">
              <span className="text-neutral-500">Current status: {selectedReport.status}</span>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    resolveReport(selectedReport.id, 'Dismissed');
                    setSelectedReport(null);
                  }}
                  className="px-3 py-1.5 text-xs text-neutral-700 hover:bg-neutral-100 rounded-full font-medium"
                >
                  Dismiss Flag
                </button>
                <button
                  type="button"
                  onClick={() => {
                    resolveReport(selectedReport.id, 'Resolved');
                    setSelectedReport(null);
                  }}
                  className="px-4 py-1.5 text-xs text-white bg-black hover:bg-neutral-800 rounded-full font-medium shadow-xs"
                >
                  Mark Resolved
                </button>
              </div>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
