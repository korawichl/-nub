import { describe, it, expect } from 'vitest';
import {
  INITIAL_JOBS,
  INITIAL_COMPANY_APPROVALS,
  INITIAL_MONTHLY_STATS,
} from '../data/initialData';

describe('Jobgio Dashboard Data & Logic', () => {
  it('contains valid initial jobs with required fields', () => {
    expect(INITIAL_JOBS.length).toBeGreaterThanOrEqual(10);
    const googleJob = INITIAL_JOBS.find((j) => j.company === 'Google');
    expect(googleJob).toBeDefined();
    expect(googleJob?.title).toBe('Product Designer');
    expect(googleJob?.status).toBe('Pending');
    expect(googleJob?.location).toBe('San Francisco');
  });

  it('contains initial pending company approvals matching screenshot', () => {
    const apple = INITIAL_COMPANY_APPROVALS.find((c) => c.name === 'Apple');
    const figma = INITIAL_COMPANY_APPROVALS.find((c) => c.name === 'Figma');
    const bmw = INITIAL_COMPANY_APPROVALS.find((c) => c.name === 'BMW');

    expect(apple).toBeDefined();
    expect(apple?.status).toBe('Pending');
    expect(figma).toBeDefined();
    expect(figma?.status).toBe('Pending');
    expect(bmw).toBeDefined();
    expect(bmw?.status).toBe('Pending');
  });

  it('contains August highlighted 6.4K statistic', () => {
    const august = INITIAL_MONTHLY_STATS.find((m) => m.shortMonth === 'Aug');
    expect(august).toBeDefined();
    expect(august?.jobsPosted).toBe(6400);
    expect(august?.highlighted).toBe(true);
  });

  it('filters jobs accurately by status and search terms', () => {
    const activeJobs = INITIAL_JOBS.filter((j) => j.status === 'Active');
    expect(activeJobs.length).toBeGreaterThan(0);

    const amazonJob = INITIAL_JOBS.filter((j) =>
      j.company.toLowerCase().includes('amazon')
    );
    expect(amazonJob.length).toBe(1);
    expect(amazonJob[0].title).toBe('Digital Marketer');
  });
});
