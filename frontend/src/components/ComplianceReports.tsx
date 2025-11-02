import React, { useEffect, useState } from 'react';
import { Download, CheckCircle, AlertTriangle, XCircle, TrendingUp, FileText, Shield } from 'lucide-react';
import { apiService } from '../services/api';

type ComplianceMetrics = {
  file_id: string;
  total_test_cases: number;
  compliance_tags: string[];
  compliance_counts: Record<string, number>;
  risk_counts: Record<string, number>;
  test_cases: any[];
  last_updated: string | null;
};

const RISK_COLORS: Record<string, string> = {
  Critical: 'bg-red-500',
  High: 'bg-orange-500',
  Medium: 'bg-yellow-400',
  Low: 'bg-green-500',
};

const RISK_BG: Record<string, string> = {
  Critical: 'bg-red-100',
  High: 'bg-orange-100',
  Medium: 'bg-yellow-100',
  Low: 'bg-green-100',
};

const RISK_TEXT: Record<string, string> = {
  Critical: 'text-red-700',
  High: 'text-orange-700',
  Medium: 'text-yellow-700',
  Low: 'text-green-700',
};

export const ComplianceReports: React.FC = () => {
  const [metrics, setMetrics] = useState<ComplianceMetrics | null>(null);
  const [complianceFilter, setComplianceFilter] = useState<string[]>([]);
  const [period, setPeriod] = useState<string>('all');
  const [loading, setLoading] = useState(false);
  const [expandedRows, setExpandedRows] = useState<Record<string, boolean>>({});

  // Fetch metrics on component mount and when period changes
  useEffect(() => {
    setLoading(true);
    apiService.getComplianceMetrics()
      .then((data) => {
        setMetrics(data);
        setLoading(false);
      })
      .catch(() => {
        setMetrics({
          file_id: 'all',
          total_test_cases: 0,
          compliance_tags: [],
          compliance_counts: {},
          risk_counts: {},
          test_cases: [],
          last_updated: null,
        });
        setLoading(false);
      });
  }, [period]);

  // Filter test cases by compliance tags
  const filteredTestCases = metrics?.test_cases?.filter(tc => {
    if (complianceFilter.length === 0) return true;
    return tc.compliance_tags.some((tag: string) => complianceFilter.includes(tag));
  }) || [];

  // Filter by time period (if last_updated available)
  const timeFilteredTestCases = filteredTestCases.filter(tc => {
    if (period === 'all' || !tc.created_at) return true;
    const now = new Date();
    const created = new Date(tc.created_at);
    if (period === '7days') return (now.getTime() - created.getTime())/(1000*60*60*24) <= 7;
    if (period === '30days') return (now.getTime() - created.getTime())/(1000*60*60*24) <= 30;
    if (period === '90days') return (now.getTime() - created.getTime())/(1000*60*60*24) <= 90;
    if (period === 'year') return (now.getTime() - created.getTime())/(1000*60*60*24) <= 365;
    return true;
  });

  // Export CSV: fetch fresh metrics when exporting so we include current values and remove file_id
  const handleExportCSV = async () => {
    const buildAndDownload = (exportMetrics: any) => {
      const testCases: any[] = Array.isArray(exportMetrics.test_cases) ? exportMetrics.test_cases : [];
      const testCaseKeys = new Set<string>();
      testCases.forEach(tc => Object.keys(tc || {}).forEach(k => testCaseKeys.add(k)));

      // Meta keys to include (file_id intentionally excluded)
      const metaKeys = ['total_test_cases', 'last_updated', 'compliance_tags', 'compliance_counts', 'risk_counts'];
      const headers = metaKeys.concat(Array.from(testCaseKeys).filter(k => !metaKeys.includes(k)));

      const valueToCell = (v: any) => {
        if (v === null || v === undefined) return '';
        if (Array.isArray(v)) return v.map(x => (typeof x === 'object' ? JSON.stringify(x) : String(x))).join('; ');
        if (typeof v === 'object') return JSON.stringify(v);
        return String(v);
      };

      const rows: string[][] = testCases.length > 0
        ? testCases.map(tc => headers.map(h => metaKeys.includes(h) ? valueToCell((exportMetrics as any)[h]) : valueToCell(tc ? tc[h] : undefined)))
        : [headers.map(h => valueToCell((exportMetrics as any)[h]))];

      const escapeCell = (s: string) => `"${s.replace(/"/g, '""')}"`;
      const csvLines = [headers.map(escapeCell).join(',')].concat(rows.map(r => r.map(escapeCell).join(',')));
      const csv = csvLines.join('\n');

      const blob = new Blob([csv], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `compliance_report_all_${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    };

    try {
      const fresh = await apiService.getComplianceMetrics();
      if (fresh) {
        buildAndDownload(fresh);
        return;
      }
    } catch (e) {
      // ignore and fallback to in-memory metrics
    }

    if (metrics) buildAndDownload(metrics);
  };

  // Export PDF (simple table)
  const handleExportPDF = async () => {
    // Use browser print for now; for production use jsPDF or similar
    window.print();
  };

  // Toggle row expansion
  const toggleRow = (tc_id: string) => {
    setExpandedRows(prev => ({ ...prev, [tc_id]: !prev[tc_id] }));
  };

  // Loading state
  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-10 bg-slate-200 rounded w-1/3 mb-4" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => <div key={i} className="h-32 bg-slate-100 rounded-xl" />)}
        </div>
        <div className="h-10 bg-slate-200 rounded w-1/2 mt-8" />
        <div className="h-96 bg-slate-100 rounded-xl" />
      </div>
    );
  }

  // Empty state for no test cases
  if (!metrics || metrics.total_test_cases === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-96 text-center">
        <FileText className="h-16 w-16 text-slate-300 mb-4" />
        <h2 className="text-2xl font-bold text-slate-700 mb-2">No Test Cases Available</h2>
        <p className="text-slate-500 mb-4">No test cases have been generated yet. Please generate test cases for your requirements first.</p>
      </div>
    );
  }

  // Compliance tag options
  const complianceOptions = metrics.compliance_tags;

  // Metrics cards
  return (
    <div className="space-y-6">
      {/* Header Controls */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <h2 className="text-3xl font-bold text-slate-900">Compliance Reporting Dashboard</h2>
        <div className="flex flex-wrap gap-3 items-center">
          {/* Compliance Filter */}
          <select
            multiple
            value={complianceFilter}
            onChange={e => {
              const opts = Array.from(e.target.selectedOptions).map(o => o.value);
              setComplianceFilter(opts);
            }}
            className="px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 min-w-[180px]"
          >
            {complianceOptions.map(tag => <option key={tag} value={tag}>{tag}</option>)}
          </select>
          {/* Time Filter */}
          <select
            value={period}
            onChange={e => setPeriod(e.target.value)}
            className="px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Time</option>
            <option value="7days">Last 7 Days</option>
            <option value="30days">Last 30 Days</option>
            <option value="90days">Last 90 Days</option>
            <option value="year">Last Year</option>
          </select>
          {/* Export Buttons */}
          <button onClick={handleExportCSV} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center">
            <Download className="h-4 w-4 mr-2" /> Export CSV
          </button>
          <button onClick={handleExportPDF} className="px-4 py-2 bg-slate-600 text-white rounded-lg hover:bg-slate-700 transition-colors flex items-center">
            <Download className="h-4 w-4 mr-2" /> Export PDF
          </button>
        </div>
      </div>

      {/* Metrics Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
        {/* Total Test Cases */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 flex flex-col items-center justify-center">
          <span className="text-4xl font-bold text-blue-700">{metrics.total_test_cases}</span>
          <span className="text-slate-600 mt-2">Total Test Cases</span>
        </div>
        {/* Compliance Coverage Cards */}
        {complianceOptions.map(tag => {
          const count = metrics.compliance_counts[tag] || 0;
          const percent = metrics.total_test_cases ? Math.round((count / metrics.total_test_cases) * 100) : 0;
          return (
            <div key={tag} className="bg-white p-6 rounded-xl border border-slate-200 flex flex-col items-center">
              <div className="mb-2 flex items-center gap-2">
                {/* Replace with official logo/icon if available */}
                <ShieldIcon tag={tag} />
                <span className="font-semibold text-slate-900">{tag}</span>
              </div>
              <span className="text-2xl font-bold text-slate-700">{count}</span>
              <span className="text-xs text-slate-500 mb-2">{percent}% coverage</span>
              <div className="w-full bg-slate-200 rounded-full h-2">
                <div className="h-2 rounded-full bg-blue-500" style={{ width: `${percent}%` }}></div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Risk Assessment Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {Object.entries(metrics.risk_counts).map(([level, count]) => {
          const percent = metrics.total_test_cases ? Math.round((count / metrics.total_test_cases) * 100) : 0;
          return (
            <div key={level} className={`p-6 rounded-xl border border-slate-200 flex flex-col items-center ${RISK_BG[level]}`}> 
              <span className={`text-lg font-bold ${RISK_TEXT[level]}`}>{level}</span>
              <span className="text-2xl font-bold text-slate-900">{count}</span>
              <span className="text-xs text-slate-500 mb-2">{percent}% of cases</span>
              <div className="w-full bg-slate-200 rounded-full h-2">
                <div className={`h-2 rounded-full ${RISK_COLORS[level]}`} style={{ width: `${percent}%` }}></div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Table removed as requested */}
    </div>
  );
};

// Simple shield icon for compliance tags
function ShieldIcon({ tag }: { tag: string }) {
  // Map tag to icon/color if needed
  return <span className="inline-block mr-1"><Shield className="h-5 w-5 text-blue-500 inline" /></span>;
}