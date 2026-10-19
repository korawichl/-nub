import React from 'react';
import { useJobgio } from '../../context/JobgioContext';
import {
  User,
  Building2,
  Briefcase,
  FileText,
  AlertTriangle,
  AlertCircle,
  ArrowUpRight,
} from 'lucide-react';

export const QuickStats: React.FC = () => {
  const { quickStats } = useJobgio();

  const stats = [
    {
      id: 'users',
      label: 'Total Users',
      value: quickStats.totalUsers,
      icon: User,
      isPrimary: false,
    },
    {
      id: 'companies',
      label: 'Total Companies',
      value: quickStats.totalCompanies,
      icon: Building2,
      isPrimary: false,
    },
    {
      id: 'active_jobs',
      label: 'Active Jobs Posted',
      value: quickStats.activeJobsPosted,
      icon: Briefcase,
      isPrimary: true, // Black circular icon as in screenshot
      hasArrow: true,
    },
    {
      id: 'applications',
      label: 'Total Applications',
      value: quickStats.totalApplications,
      icon: FileText,
      isPrimary: false,
    },
    {
      id: 'pending_jobs',
      label: 'Pending Jobs',
      value: quickStats.pendingJobs.toString(),
      icon: AlertTriangle,
      isPrimary: false,
    },
    {
      id: 'reported_jobs',
      label: 'Reported Jobs',
      value: quickStats.reportedJobs.toString(),
      icon: AlertCircle,
      isPrimary: false,
    },
  ];

  return (
    <div className="flex flex-col gap-3">
      {/* Quick Stats Header */}
      <div className="flex items-baseline justify-between">
        <div>
          <h2 className="text-xl font-bold text-[#171717] tracking-tight">Quick Stats</h2>
          <p className="text-xs text-[#858585] mt-0.5">Your statistics for 1 week period.</p>
        </div>
      </div>

      {/* 6 Statistic Cards Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-3.5">
        {stats.map((item) => {
          const Icon = item.icon;

          return (
            <div
              key={item.id}
              className="relative flex flex-col items-center justify-between p-4 bg-white border border-[#EEEEEE] rounded-[22px] min-h-[148px] shadow-xs hover:border-neutral-300 transition-all duration-150 text-center group"
            >
              {/* Circular Icon */}
              <div
                className={`w-11 h-11 rounded-full flex items-center justify-center transition-transform group-hover:scale-105 ${
                  item.isPrimary
                    ? 'bg-[#111111] text-white shadow-xs'
                    : 'bg-[#F5F5F5] text-[#171717]'
                }`}
              >
                <Icon className="w-5 h-5 stroke-[2]" />
              </div>

              {/* Number and Label */}
              <div className="flex flex-col items-center mt-2">
                <span className="text-xl font-bold tracking-tight text-[#171717]">
                  {item.value}
                </span>
                <span className="text-[11px] font-medium text-[#858585] mt-0.5 leading-tight">
                  {item.label}
                </span>
              </div>

              {/* Optional Arrow Indicator on highlighted Active Jobs */}
              {item.hasArrow && (
                <div className="mt-1">
                  <ArrowUpRight className="w-3.5 h-3.5 text-neutral-400 group-hover:text-neutral-900 transition-colors" />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
