export type JobStatus = 'Active' | 'Pending' | 'Expired';

export interface Job {
  id: string;
  title: string;
  company: string;
  companyLogo?: string;
  companyColor?: string;
  location: string;
  status: JobStatus;
  postedDate: string; // e.g., "Jun 10, 03:20 GMT"
  rawDate: string;    // ISO string for reliable sorting
  type: 'Full-time' | 'Part-time' | 'Remote' | 'Contract';
  salary: string;
  category: string;
  applicantsCount: number;
  description: string;
}

export interface CompanyApproval {
  id: string;
  name: string;
  logo: string;
  logoType: 'apple' | 'figma' | 'bmw' | 'google' | 'amazon' | 'paypal' | 'custom';
  submittedDate: string;
  rawDate: string;
  status: 'Pending' | 'Approved' | 'Rejected';
  industry: string;
  website: string;
  contactEmail: string;
  description: string;
  employees: string;
}

export interface Application {
  id: string;
  jobId: string;
  jobTitle: string;
  company: string;
  candidateName: string;
  candidateEmail: string;
  candidateAvatar?: string;
  appliedDate: string;
  status: 'Under Review' | 'Interviewing' | 'Accepted' | 'Rejected';
  resumeUrl?: string;
  portfolioUrl?: string;
  notes?: string;
}

export interface UserAccount {
  id: string;
  name: string;
  email: string;
  role: 'Admin' | 'Employer' | 'Job Seeker';
  status: 'Active' | 'Inactive';
  avatar: string;
  joinedDate: string;
  lastLogin: string;
}

export interface JobCategory {
  id: string;
  name: string;
  slug: string;
  iconName: string;
  jobsCount: number;
  description: string;
}

export interface JobReport {
  id: string;
  jobId: string;
  jobTitle: string;
  company: string;
  reportedBy: string;
  reportedByEmail: string;
  reason: 'Spam' | 'Scam / Fraud' | 'Inappropriate' | 'Expired Listing' | 'Misleading Salary';
  details: string;
  reportedDate: string;
  status: 'Open' | 'Resolved' | 'Dismissed';
}

export interface MonthlyStat {
  month: string;
  shortMonth: string;
  jobsPosted: number;
  applications: number;
  highlighted?: boolean;
}

export interface QuickStatsData {
  totalUsers: string;
  totalCompanies: string;
  activeJobsPosted: string;
  totalApplications: string;
  pendingJobs: number;
  reportedJobs: number;
}
