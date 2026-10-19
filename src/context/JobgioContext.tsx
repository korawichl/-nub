import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  Job,
  CompanyApproval,
  Application,
  UserAccount,
  JobCategory,
  JobReport,
  MonthlyStat,
  QuickStatsData,
  JobStatus,
} from '../types/jobgio';
import {
  INITIAL_JOBS,
  INITIAL_COMPANY_APPROVALS,
  INITIAL_APPLICATIONS,
  INITIAL_USERS,
  INITIAL_CATEGORIES,
  INITIAL_REPORTS,
  INITIAL_MONTHLY_STATS,
} from '../data/initialData';

export type NavTab =
  | 'dashboard'
  | 'jobs'
  | 'applications'
  | 'companies'
  | 'users'
  | 'categories'
  | 'reports'
  | 'settings';

export interface ToastItem {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info';
}

interface JobgioContextType {
  activeTab: NavTab;
  setActiveTab: (tab: NavTab) => void;
  jobs: Job[];
  approvals: CompanyApproval[];
  applications: Application[];
  users: UserAccount[];
  categories: JobCategory[];
  reports: JobReport[];
  monthlyStats: MonthlyStat[];
  quickStats: QuickStatsData;
  toasts: ToastItem[];
  showToast: (message: string, type?: 'success' | 'error' | 'info') => void;
  removeToast: (id: string) => void;

  // Job Actions
  addJob: (job: Omit<Job, 'id' | 'postedDate' | 'rawDate' | 'applicantsCount'>) => void;
  updateJob: (id: string, updates: Partial<Job>) => void;
  deleteJob: (id: string) => void;
  bulkDeleteJobs: (ids: string[]) => void;
  bulkUpdateJobStatus: (ids: string[], status: JobStatus) => void;

  // Company Actions
  approveCompany: (id: string) => void;
  rejectCompany: (id: string) => void;
  addCompany: (company: Omit<CompanyApproval, 'id' | 'submittedDate' | 'rawDate'>) => void;

  // Application Actions
  updateApplicationStatus: (id: string, status: Application['status']) => void;

  // User Actions
  toggleUserStatus: (id: string) => void;

  // Category Actions
  addCategory: (category: Omit<JobCategory, 'id' | 'jobsCount'>) => void;
  updateCategory: (id: string, updates: Partial<JobCategory>) => void;
  deleteCategory: (id: string) => void;

  // Report Actions
  resolveReport: (id: string, action: 'Resolved' | 'Dismissed') => void;

  // Reset
  resetToDemoData: () => void;
}

const JobgioContext = createContext<JobgioContextType | undefined>(undefined);

export const JobgioProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [activeTab, setActiveTab] = useState<NavTab>('dashboard');

  const [jobs, setJobs] = useState<Job[]>(() => {
    const saved = localStorage.getItem('jobgio_jobs');
    return saved ? JSON.parse(saved) : INITIAL_JOBS;
  });

  const [approvals, setApprovals] = useState<CompanyApproval[]>(() => {
    const saved = localStorage.getItem('jobgio_approvals');
    return saved ? JSON.parse(saved) : INITIAL_COMPANY_APPROVALS;
  });

  const [applications, setApplications] = useState<Application[]>(() => {
    const saved = localStorage.getItem('jobgio_applications');
    return saved ? JSON.parse(saved) : INITIAL_APPLICATIONS;
  });

  const [users, setUsers] = useState<UserAccount[]>(() => {
    const saved = localStorage.getItem('jobgio_users');
    return saved ? JSON.parse(saved) : INITIAL_USERS;
  });

  const [categories, setCategories] = useState<JobCategory[]>(() => {
    const saved = localStorage.getItem('jobgio_categories');
    return saved ? JSON.parse(saved) : INITIAL_CATEGORIES;
  });

  const [reports, setReports] = useState<JobReport[]>(() => {
    const saved = localStorage.getItem('jobgio_reports');
    return saved ? JSON.parse(saved) : INITIAL_REPORTS;
  });

  const [monthlyStats] = useState<MonthlyStat[]>(INITIAL_MONTHLY_STATS);
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  // Local storage synchronization
  useEffect(() => {
    localStorage.setItem('jobgio_jobs', JSON.stringify(jobs));
  }, [jobs]);

  useEffect(() => {
    localStorage.setItem('jobgio_approvals', JSON.stringify(approvals));
  }, [approvals]);

  useEffect(() => {
    localStorage.setItem('jobgio_applications', JSON.stringify(applications));
  }, [applications]);

  useEffect(() => {
    localStorage.setItem('jobgio_users', JSON.stringify(users));
  }, [users]);

  useEffect(() => {
    localStorage.setItem('jobgio_categories', JSON.stringify(categories));
  }, [categories]);

  useEffect(() => {
    localStorage.setItem('jobgio_reports', JSON.stringify(reports));
  }, [reports]);

  // Toast Helper
  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    const id = Date.now().toString() + Math.random().toString(36).substring(2, 5);
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      removeToast(id);
    }, 3500);
  };

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  // Derive Quick Stats
  const activeJobsCount = jobs.filter((j) => j.status === 'Active').length;
  const pendingJobsCount = jobs.filter((j) => j.status === 'Pending').length;
  const openReportsCount = reports.filter((r) => r.status === 'Open').length;

  const quickStats: QuickStatsData = {
    totalUsers: '500K',
    totalCompanies: `${(1.2 + (approvals.length - INITIAL_COMPANY_APPROVALS.length) * 0.1).toFixed(1)}K`,
    activeJobsPosted: `${(3.5 + (activeJobsCount - 5) * 0.1).toFixed(1)}K`,
    totalApplications: `${28 + (applications.length - INITIAL_APPLICATIONS.length)}K`,
    pendingJobs: pendingJobsCount + 78, // matching screenshot base of 80 with live delta
    reportedJobs: openReportsCount + 18, // matching screenshot base of 20 with live delta
  };

  // Job Operations
  const addJob = (jobData: Omit<Job, 'id' | 'postedDate' | 'rawDate' | 'applicantsCount'>) => {
    const now = new Date();
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const monthStr = months[now.getMonth()];
    const day = String(now.getDate()).padStart(2, '0');
    const hours = String(now.getUTCHours()).padStart(2, '0');
    const mins = String(now.getUTCMinutes()).padStart(2, '0');
    const postedDate = `${monthStr} ${day} ${hours}:${mins} GMT`;

    const newJob: Job = {
      ...jobData,
      id: `job-${Date.now()}`,
      postedDate,
      rawDate: now.toISOString(),
      applicantsCount: 0,
      companyLogo: jobData.companyLogo || jobData.company.charAt(0).toUpperCase(),
      companyColor: jobData.companyColor || '#171717',
    };

    setJobs((prev) => [newJob, ...prev]);
    showToast(`Job "${newJob.title}" posted successfully!`, 'success');
  };

  const updateJob = (id: string, updates: Partial<Job>) => {
    setJobs((prev) =>
      prev.map((j) => (j.id === id ? { ...j, ...updates } : j))
    );
    showToast('Job details updated', 'info');
  };

  const deleteJob = (id: string) => {
    const job = jobs.find((j) => j.id === id);
    setJobs((prev) => prev.filter((j) => j.id !== id));
    showToast(`Deleted "${job?.title || 'Job'}"`, 'info');
  };

  const bulkDeleteJobs = (ids: string[]) => {
    setJobs((prev) => prev.filter((j) => !ids.includes(j.id)));
    showToast(`Deleted ${ids.length} jobs`, 'info');
  };

  const bulkUpdateJobStatus = (ids: string[], status: JobStatus) => {
    setJobs((prev) =>
      prev.map((j) => (ids.includes(j.id) ? { ...j, status } : j))
    );
    showToast(`Updated ${ids.length} jobs to ${status}`, 'success');
  };

  // Company Approvals
  const approveCompany = (id: string) => {
    const comp = approvals.find((c) => c.id === id);
    setApprovals((prev) =>
      prev.map((c) => (c.id === id ? { ...c, status: 'Approved' } : c))
    );
    showToast(`Company "${comp?.name || 'Company'}" has been approved!`, 'success');
  };

  const rejectCompany = (id: string) => {
    const comp = approvals.find((c) => c.id === id);
    setApprovals((prev) =>
      prev.map((c) => (c.id === id ? { ...c, status: 'Rejected' } : c))
    );
    showToast(`Company "${comp?.name || 'Company'}" request was rejected`, 'info');
  };

  const addCompany = (compData: Omit<CompanyApproval, 'id' | 'submittedDate' | 'rawDate'>) => {
    const now = new Date();
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const monthStr = months[now.getMonth()];
    const day = String(now.getDate()).padStart(2, '0');
    const hours = String(now.getUTCHours()).padStart(2, '0');
    const mins = String(now.getUTCMinutes()).padStart(2, '0');
    const submittedDate = `${monthStr} ${day} ${hours}:${mins} GMT`;

    const newComp: CompanyApproval = {
      ...compData,
      id: `comp-${Date.now()}`,
      submittedDate,
      rawDate: now.toISOString(),
    };

    setApprovals((prev) => [newComp, ...prev]);
    showToast(`Company "${newComp.name}" registered!`, 'success');
  };

  // Application Updates
  const updateApplicationStatus = (id: string, status: Application['status']) => {
    setApplications((prev) =>
      prev.map((a) => (a.id === id ? { ...a, status } : a))
    );
    showToast(`Application status changed to "${status}"`, 'success');
  };

  // User Actions
  const toggleUserStatus = (id: string) => {
    setUsers((prev) =>
      prev.map((u) => {
        if (u.id === id) {
          const next = u.status === 'Active' ? 'Inactive' : 'Active';
          showToast(`User ${u.name} is now ${next}`, 'info');
          return { ...u, status: next };
        }
        return u;
      })
    );
  };

  // Category Actions
  const addCategory = (catData: Omit<JobCategory, 'id' | 'jobsCount'>) => {
    const newCat: JobCategory = {
      ...catData,
      id: `cat-${Date.now()}`,
      jobsCount: 0,
    };
    setCategories((prev) => [...prev, newCat]);
    showToast(`Category "${newCat.name}" added`, 'success');
  };

  const updateCategory = (id: string, updates: Partial<JobCategory>) => {
    setCategories((prev) =>
      prev.map((c) => (c.id === id ? { ...c, ...updates } : c))
    );
    showToast('Category updated', 'info');
  };

  const deleteCategory = (id: string) => {
    setCategories((prev) => prev.filter((c) => c.id !== id));
    showToast('Category deleted', 'info');
  };

  // Report Actions
  const resolveReport = (id: string, action: 'Resolved' | 'Dismissed') => {
    setReports((prev) =>
      prev.map((r) => (r.id === id ? { ...r, status: action } : r))
    );
    showToast(`Report marked as ${action}`, 'info');
  };

  // Reset to Demo Data
  const resetToDemoData = () => {
    localStorage.removeItem('jobgio_jobs');
    localStorage.removeItem('jobgio_approvals');
    localStorage.removeItem('jobgio_applications');
    localStorage.removeItem('jobgio_users');
    localStorage.removeItem('jobgio_categories');
    localStorage.removeItem('jobgio_reports');

    setJobs(INITIAL_JOBS);
    setApprovals(INITIAL_COMPANY_APPROVALS);
    setApplications(INITIAL_APPLICATIONS);
    setUsers(INITIAL_USERS);
    setCategories(INITIAL_CATEGORIES);
    setReports(INITIAL_REPORTS);

    showToast('All data reset to initial demo values', 'success');
  };

  return (
    <JobgioContext.Provider
      value={{
        activeTab,
        setActiveTab,
        jobs,
        approvals,
        applications,
        users,
        categories,
        reports,
        monthlyStats,
        quickStats,
        toasts,
        showToast,
        removeToast,
        addJob,
        updateJob,
        deleteJob,
        bulkDeleteJobs,
        bulkUpdateJobStatus,
        approveCompany,
        rejectCompany,
        addCompany,
        updateApplicationStatus,
        toggleUserStatus,
        addCategory,
        updateCategory,
        deleteCategory,
        resolveReport,
        resetToDemoData,
      }}
    >
      {children}
    </JobgioContext.Provider>
  );
};

export const useJobgio = () => {
  const context = useContext(JobgioContext);
  if (!context) {
    throw new Error('useJobgio must be used within a JobgioProvider');
  }
  return context;
};
