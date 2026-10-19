import React from 'react';
import { JobgioProvider, useJobgio } from './context/JobgioContext';
import { DashboardLayout } from './components/layout/DashboardLayout';
import { DashboardPage } from './pages/DashboardPage';
import { JobsPage } from './pages/JobsPage';
import { ApplicationsPage } from './pages/ApplicationsPage';
import { CompaniesPage } from './pages/CompaniesPage';
import { UsersPage } from './pages/UsersPage';
import { CategoriesPage } from './pages/CategoriesPage';
import { ReportsPage } from './pages/ReportsPage';
import { SettingsPage } from './pages/SettingsPage';

const MainContent: React.FC = () => {
  const { activeTab } = useJobgio();

  switch (activeTab) {
    case 'dashboard':
      return <DashboardPage />;
    case 'jobs':
      return <JobsPage />;
    case 'applications':
      return <ApplicationsPage />;
    case 'companies':
      return <CompaniesPage />;
    case 'users':
      return <UsersPage />;
    case 'categories':
      return <CategoriesPage />;
    case 'reports':
      return <ReportsPage />;
    case 'settings':
      return <SettingsPage />;
    default:
      return <DashboardPage />;
  }
};

export function App() {
  return (
    <JobgioProvider>
      <DashboardLayout>
        <MainContent />
      </DashboardLayout>
    </JobgioProvider>
  );
}

export default App;
