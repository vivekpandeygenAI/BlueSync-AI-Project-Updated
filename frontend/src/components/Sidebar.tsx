import React from 'react';
import { 
  LayoutDashboard, 
  FileText, 
  Upload,
  Zap, 
  Shield, 
  Network, 
  Settings, 
  ChevronLeft,
  Activity
} from 'lucide-react';
import { ViewType } from '../App';

interface SidebarProps {
  currentView: ViewType;
  onViewChange: (view: ViewType) => void;
  collapsed: boolean;
  onToggleCollapse: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ 
  currentView, 
  onViewChange, 
  collapsed, 
  onToggleCollapse 
}) => {
  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'upload', label: 'Document Upload', icon: Upload },
    { id: 'requirements', label: 'Requirement Analysis', icon: FileText },
    { id: 'generation', label: 'Test Generation', icon: Zap },
    { id: 'traceability', label: 'Traceability Matrix', icon: Network },
    { id: 'compliance', label: 'Compliance Reports', icon: Shield },
    { id: 'integration', label: 'Integration Hub', icon: Settings },
  ];

  return (
    <div className={`fixed left-0 top-0 h-full bg-white border-r border-slate-200 transition-all duration-300 z-10 ${collapsed ? 'w-14' : 'w-64'} sm:w-64`}>
      <div className="flex items-center justify-between p-2 sm:p-4 border-b border-slate-200">
        {!collapsed && (
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
              <Activity className="h-5 w-5 text-white" />
            </div>
            <span className="font-bold text-slate-900">TestGenAI</span>
          </div>
        )}
        <button
          onClick={onToggleCollapse}
          className="p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
        >
          <ChevronLeft className={`h-4 w-4 text-slate-500 transition-transform ${collapsed ? 'rotate-180' : ''}`} />
        </button>
      </div>

      <nav className="p-2 sm:p-4">
        <ul className="space-y-2">
          {navItems.map((item) => (
            <li key={item.id}>
              <button
                onClick={() => onViewChange(item.id as ViewType)}
                className={`w-full flex items-center space-x-3 px-2 sm:px-3 py-2 rounded-lg transition-colors ${
                  currentView === item.id
                    ? 'bg-blue-50 text-blue-700 border border-blue-200'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                }`}
                title={collapsed ? item.label : undefined}
              >
                <item.icon className="h-5 w-5 flex-shrink-0" />
                {!collapsed && <span className="font-medium">{item.label}</span>}
              </button>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  );
};