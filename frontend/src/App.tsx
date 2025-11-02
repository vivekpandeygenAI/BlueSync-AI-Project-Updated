import React, { useState } from 'react';
import { Header } from './components/Header.tsx';
import { Sidebar } from './components/Sidebar.tsx';
import { Dashboard } from './components/Dashboard.tsx';
import { DocumentUpload } from './components/DocumentUpload.tsx';
import { RequirementsInput } from './components/RequirementsInput.tsx';
import TestCaseGeneration from './components/TestCaseGeneration';
import { ComplianceReports } from './components/ComplianceReports.tsx';
import TraceabilityMatrix from './components/TraceabilityMatrix.tsx';
import { IntegrationHub } from './components/IntegrationHub.tsx';

export type ViewType = 'dashboard' | 'upload' | 'requirements' | 'generation' | 'compliance' | 'traceability' | 'integration';

function App() {
  const [currentView, setCurrentView] = useState<ViewType>('dashboard');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const renderCurrentView = () => {
    switch (currentView) {
      case 'dashboard':
        return <Dashboard />;
      case 'upload':
        return <DocumentUpload />;
      case 'requirements':
        return <RequirementsInput />;
      case 'generation':
        return <TestCaseGeneration />;
      case 'compliance':
        return <ComplianceReports />;
      case 'traceability':
        return <TraceabilityMatrix />;
      case 'integration':
        return <IntegrationHub />;
      default:
        return <Dashboard />;
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex">
      <Sidebar 
        currentView={currentView} 
        onViewChange={setCurrentView}
        collapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
      />
      <div className={`flex-1 flex flex-col transition-all duration-300 ${sidebarCollapsed ? 'ml-16' : 'ml-64'}`}>
        <Header />
        <main className="flex-1 p-6">
          {renderCurrentView()}
        </main>
      </div>
    </div>
  );
}

export default App;