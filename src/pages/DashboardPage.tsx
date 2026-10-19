import React from 'react';
import { QuickStats } from '../components/dashboard/QuickStats';
import { StatisticsChart } from '../components/dashboard/StatisticsChart';
import { PendingApprovals } from '../components/dashboard/PendingApprovals';
import { ManageJobsTable } from '../components/dashboard/ManageJobsTable';

export const DashboardPage: React.FC = () => {
  return (
    <div className="flex flex-col gap-6">
      {/* 1. Top Section: Quick Stats (6 rounded pill cards) */}
      <QuickStats />

      {/* 2. Middle Section: Statistics Chart (Left) + Pending Approvals (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2">
          <StatisticsChart />
        </div>
        <div className="lg:col-span-1">
          <PendingApprovals />
        </div>
      </div>

      {/* 3. Bottom Section: Manage Jobs Table */}
      <ManageJobsTable />
    </div>
  );
};
