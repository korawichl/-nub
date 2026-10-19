import React, { useState } from 'react';
import { useJobgio } from '../context/JobgioContext';
import { Search, Shield, User, Briefcase } from 'lucide-react';

export const UsersPage: React.FC = () => {
  const { users, toggleUserStatus } = useJobgio();
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('All');

  const filtered = users.filter((u) => {
    const matchSearch =
      u.name.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase());
    const matchRole = roleFilter === 'All' || u.role === roleFilter;
    return matchSearch && matchRole;
  });

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-[#171717]">User Accounts</h1>
        <p className="text-xs text-[#858585] mt-1">
          Manage system administrators, hiring employers, and active job seekers.
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
            placeholder="Search by name or email..."
            className="w-full pl-9 pr-3 py-2 text-xs bg-neutral-50 border border-neutral-200 rounded-full focus:outline-none focus:ring-2 focus:ring-black focus:bg-white transition-all"
          />
        </div>

        <div className="flex items-center gap-1.5 bg-neutral-100 p-1 rounded-full text-xs">
          {['All', 'Admin', 'Employer', 'Job Seeker'].map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => setRoleFilter(r)}
              className={`px-3 py-1 rounded-full font-medium transition-colors ${
                roleFilter === r
                  ? 'bg-white text-black shadow-2xs font-semibold'
                  : 'text-neutral-500 hover:text-black'
              }`}
            >
              {r}
            </button>
          ))}
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-white border border-[#EEEEEE] rounded-[24px] p-6 shadow-xs overflow-x-auto">
        <table className="w-full text-left text-xs text-[#171717] border-collapse min-w-[650px]">
          <thead>
            <tr className="border-b border-[#F0F0F0] text-[#858585] font-medium text-[11px]">
              <th className="py-3 px-3">User</th>
              <th className="py-3 px-3">Role</th>
              <th className="py-3 px-3">Status</th>
              <th className="py-3 px-3">Joined Date</th>
              <th className="py-3 px-3">Last Active</th>
              <th className="py-3 px-3 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#F8F8F8]">
            {filtered.map((user) => (
              <tr key={user.id} className="hover:bg-neutral-50/70 transition-colors">
                <td className="py-3.5 px-3">
                  <div className="flex items-center gap-3">
                    <img
                      src={user.avatar}
                      alt={user.name}
                      className="w-9 h-9 rounded-full object-cover ring-1 ring-neutral-200"
                    />
                    <div>
                      <span className="font-semibold text-neutral-900 block">{user.name}</span>
                      <span className="text-[11px] text-neutral-500">{user.email}</span>
                    </div>
                  </div>
                </td>

                <td className="py-3.5 px-3">
                  <div className="flex items-center gap-1.5 font-medium">
                    {user.role === 'Admin' && <Shield className="w-3.5 h-3.5 text-neutral-900" />}
                    {user.role === 'Employer' && <Briefcase className="w-3.5 h-3.5 text-blue-600" />}
                    {user.role === 'Job Seeker' && <User className="w-3.5 h-3.5 text-emerald-600" />}
                    <span>{user.role}</span>
                  </div>
                </td>

                <td className="py-3.5 px-3">
                  <span
                    className={`inline-block px-2.5 py-0.5 rounded-full text-[11px] font-medium ${
                      user.status === 'Active'
                        ? 'bg-emerald-50 text-emerald-700'
                        : 'bg-neutral-100 text-neutral-600'
                    }`}
                  >
                    {user.status}
                  </span>
                </td>

                <td className="py-3.5 px-3 text-neutral-500">{user.joinedDate}</td>
                <td className="py-3.5 px-3 text-neutral-500">{user.lastLogin}</td>

                <td className="py-3.5 px-3 text-right">
                  <button
                    type="button"
                    onClick={() => toggleUserStatus(user.id)}
                    className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                      user.status === 'Active'
                        ? 'text-rose-600 hover:bg-rose-50'
                        : 'text-emerald-700 hover:bg-emerald-50'
                    }`}
                  >
                    {user.status === 'Active' ? 'Deactivate' : 'Activate'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
