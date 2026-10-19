import React, { useState } from 'react';
import { useJobgio } from '../context/JobgioContext';
import { CompanyApproval } from '../types/jobgio';
import { Modal } from '../components/common/Modal';
import { ConfirmDialog } from '../components/common/ConfirmDialog';
import { Search, Plus } from 'lucide-react';

export const CompaniesPage: React.FC = () => {
  const { approvals, approveCompany, rejectCompany, addCompany } = useJobgio();

  const [search, setSearch] = useState('');
  const [selectedComp, setSelectedComp] = useState<CompanyApproval | null>(null);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [rejectTargetId, setRejectTargetId] = useState<string | null>(null);

  // Add Company Form State
  const [newName, setNewName] = useState('');
  const [newIndustry, setNewIndustry] = useState('');
  const [newWebsite, setNewWebsite] = useState('https://');
  const [newEmail, setNewEmail] = useState('');
  const [newEmployees, setNewEmployees] = useState('100 - 500');
  const [newDescription, setNewDescription] = useState('');

  const filtered = approvals.filter(
    (c) =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.industry.toLowerCase().includes(search.toLowerCase())
  );

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim() || !newEmail.trim()) return;

    addCompany({
      name: newName.trim(),
      industry: newIndustry.trim() || 'Technology',
      website: newWebsite.trim(),
      contactEmail: newEmail.trim(),
      employees: newEmployees,
      description: newDescription.trim() || 'Verified employer organization.',
      status: 'Pending',
      logo: '',
      logoType: 'custom',
    });

    setNewName('');
    setNewIndustry('');
    setNewWebsite('https://');
    setNewEmail('');
    setNewDescription('');
    setIsAddOpen(false);
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[#171717]">Company Partners</h1>
          <p className="text-xs text-[#858585] mt-1">
            Directory of registered employer brands, enterprise accounts, and pending verification requests.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setIsAddOpen(true)}
          className="flex items-center gap-1.5 px-4 py-2 text-xs font-medium text-white bg-[#111111] hover:bg-black rounded-full transition-colors shadow-xs"
        >
          <Plus className="w-4 h-4" />
          <span>Register Company</span>
        </button>
      </div>

      {/* Search Bar */}
      <div className="bg-white border border-[#EEEEEE] rounded-[24px] p-4 flex items-center justify-between gap-3 shadow-2xs">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search company or industry..."
            className="w-full pl-9 pr-3 py-2 text-xs bg-neutral-50 border border-neutral-200 rounded-full focus:outline-none focus:ring-2 focus:ring-black focus:bg-white transition-all"
          />
        </div>

        <div className="text-xs text-neutral-500 font-medium">
          {filtered.length} organizations
        </div>
      </div>

      {/* Companies Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map((comp) => (
          <div
            key={comp.id}
            className="bg-white border border-[#EEEEEE] rounded-[24px] p-5 shadow-xs hover:border-neutral-300 transition-all flex flex-col justify-between gap-4"
          >
            <div>
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-neutral-900 flex items-center justify-center text-white font-bold text-xs shrink-0 shadow-2xs">
                    {comp.name.substring(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <h3
                      onClick={() => setSelectedComp(comp)}
                      className="text-sm font-bold text-[#171717] hover:underline cursor-pointer"
                    >
                      {comp.name}
                    </h3>
                    <p className="text-xs text-[#858585]">{comp.industry}</p>
                  </div>
                </div>

                <span
                  className={`px-2.5 py-0.5 rounded-full text-[10px] font-semibold shrink-0 ${
                    comp.status === 'Approved'
                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                      : comp.status === 'Pending'
                      ? 'bg-neutral-100 text-neutral-700 border border-neutral-200'
                      : 'bg-rose-50 text-rose-700 border border-rose-200'
                  }`}
                >
                  {comp.status}
                </span>
              </div>

              <p className="text-xs text-neutral-600 line-clamp-2 mt-3 leading-relaxed">
                {comp.description}
              </p>
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-neutral-100 text-xs">
              <span className="text-neutral-500">{comp.employees} staff</span>

              <div className="flex items-center gap-2">
                {comp.status === 'Pending' ? (
                  <>
                    <button
                      type="button"
                      onClick={() => setRejectTargetId(comp.id)}
                      className="px-2.5 py-1 text-xs text-rose-600 hover:bg-rose-50 rounded-full font-medium"
                    >
                      Reject
                    </button>
                    <button
                      type="button"
                      onClick={() => approveCompany(comp.id)}
                      className="px-3 py-1 text-xs text-white bg-black hover:bg-neutral-800 rounded-full font-medium shadow-2xs"
                    >
                      Approve
                    </button>
                  </>
                ) : (
                  <button
                    type="button"
                    onClick={() => setSelectedComp(comp)}
                    className="text-xs font-semibold text-neutral-700 hover:text-black"
                  >
                    View Details
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Add Company Modal */}
      <Modal
        isOpen={isAddOpen}
        onClose={() => setIsAddOpen(false)}
        title="Register New Company Partner"
        subtitle="Submit employer verification dossier"
        maxWidth="md"
      >
        <form onSubmit={handleAddSubmit} className="flex flex-col gap-3.5">
          <div>
            <label className="block text-xs font-semibold text-neutral-700 mb-1">
              Company Name *
            </label>
            <input
              type="text"
              required
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="e.g. OpenAI"
              className="w-full px-3 py-2 text-sm bg-neutral-50 border border-neutral-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-black focus:bg-white"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-neutral-700 mb-1">
                Industry
              </label>
              <input
                type="text"
                value={newIndustry}
                onChange={(e) => setNewIndustry(e.target.value)}
                placeholder="e.g. Artificial Intelligence"
                className="w-full px-3 py-2 text-sm bg-neutral-50 border border-neutral-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-black focus:bg-white"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-neutral-700 mb-1">
                Staff Size
              </label>
              <input
                type="text"
                value={newEmployees}
                onChange={(e) => setNewEmployees(e.target.value)}
                placeholder="e.g. 500+"
                className="w-full px-3 py-2 text-sm bg-neutral-50 border border-neutral-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-black focus:bg-white"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-neutral-700 mb-1">
                Website
              </label>
              <input
                type="text"
                value={newWebsite}
                onChange={(e) => setNewWebsite(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-neutral-50 border border-neutral-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-black focus:bg-white"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-neutral-700 mb-1">
                HR / Contact Email *
              </label>
              <input
                type="email"
                required
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                placeholder="careers@company.com"
                className="w-full px-3 py-2 text-sm bg-neutral-50 border border-neutral-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-black focus:bg-white"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-neutral-700 mb-1">
              Description
            </label>
            <textarea
              rows={2}
              value={newDescription}
              onChange={(e) => setNewDescription(e.target.value)}
              placeholder="Company mission and background..."
              className="w-full px-3 py-2 text-sm bg-neutral-50 border border-neutral-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-black focus:bg-white resize-none"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-neutral-100">
            <button
              type="button"
              onClick={() => setIsAddOpen(false)}
              className="px-4 py-2 text-xs font-medium text-neutral-600 hover:bg-neutral-100 rounded-full"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 text-xs font-medium text-white bg-black hover:bg-neutral-800 rounded-full"
            >
              Submit Application
            </button>
          </div>
        </form>
      </Modal>

      {/* Inspect Company Modal */}
      {selectedComp && (
        <Modal
          isOpen={!!selectedComp}
          onClose={() => setSelectedComp(null)}
          title={selectedComp.name}
          subtitle={`Status: ${selectedComp.status}`}
          maxWidth="md"
        >
          <div className="flex flex-col gap-4 text-xs">
            <div className="p-3 bg-neutral-50 rounded-xl">
              <span className="font-semibold text-neutral-800">Industry:</span>
              <p className="text-neutral-600 mt-0.5">{selectedComp.industry}</p>
            </div>
            <div className="p-3 bg-neutral-50 rounded-xl">
              <span className="font-semibold text-neutral-800">Overview:</span>
              <p className="text-neutral-600 mt-0.5 leading-relaxed">{selectedComp.description}</p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 bg-neutral-50 rounded-xl">
                <span className="font-semibold text-neutral-800">Contact:</span>
                <p className="text-neutral-600 mt-0.5">{selectedComp.contactEmail}</p>
              </div>
              <div className="p-3 bg-neutral-50 rounded-xl">
                <span className="font-semibold text-neutral-800">Employees:</span>
                <p className="text-neutral-600 mt-0.5">{selectedComp.employees}</p>
              </div>
            </div>
          </div>
        </Modal>
      )}

      {/* Rejection Confirm Dialog */}
      <ConfirmDialog
        isOpen={!!rejectTargetId}
        onClose={() => setRejectTargetId(null)}
        onConfirm={() => {
          if (rejectTargetId) {
            rejectCompany(rejectTargetId);
            setRejectTargetId(null);
          }
        }}
        title="Reject Registration?"
        message="Are you sure you want to reject this company registration?"
        confirmLabel="Reject"
        isDestructive={true}
      />
    </div>
  );
};
