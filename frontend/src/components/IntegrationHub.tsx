import React, { useState, useEffect } from 'react';
import { apiService } from '../services/api';
import { CheckCircle, XCircle, Loader2, Download } from 'lucide-react';

interface TestCase {
  file_id?: string;
  req_id?: string;
  req_title_id: string;
  req_title: string;
  req_description: string;
  tc_id: string;
  tc_title: string;
  tc_description: string;
  expected_result: string;
  input_data: string;
  compliance_tags: string[];
  risk: string;
  created_at?: string;
}

interface RequirementTestCase {
  tc_id: string;
  tc_title: string;
  tc_description: string;
  expected_result: string;
  input_data: string;
  compliance_tags: string[];
  risk?: string;
}

interface Requirement {
  req_title_id: string;
  req_title: string;
  requirement_description: string;
  test_cases: RequirementTestCase[];
}

interface TestCasesResponse {
  requirements: Requirement[];
}

export const IntegrationHub: React.FC = () => {
  const [testCases, setTestCases] = useState<TestCase[]>([]);
  const [jiraStatus, setJiraStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [jiraMessage, setJiraMessage] = useState<string>('');
  const [jiraCount, setJiraCount] = useState<number | null>(null);

  useEffect(() => {
    // Fetch test cases when component mounts
    apiService.getTestCases()
      .then((data: any) => {
        // Support two response shapes:
        // 1) Nested: { requirements: [ { req_title_id, req_title, requirement_description, test_cases: [...] } ] }
        // 2) Flat array: [ { file_id, req_id, req_title_id, req_title, req_description, tc_id, ... } ]
        let flattenedTestCases: TestCase[] = [];
        if (Array.isArray(data)) {
          // Already flat list
          flattenedTestCases = data.map((tc: any) => ({
            file_id: tc.file_id,
            req_id: tc.req_id,
            req_title_id: tc.req_title_id || tc.req_title_id || '',
            req_title: tc.req_title || tc.req_title || '',
            req_description: tc.req_description || tc.requirement_description || '',
            tc_id: tc.tc_id || '',
            tc_title: tc.tc_title || '',
            tc_description: tc.tc_description || '',
            expected_result: tc.expected_result || '',
            input_data: tc.input_data || '',
            compliance_tags: Array.isArray(tc.compliance_tags) ? tc.compliance_tags : (tc.compliance_tags ? String(tc.compliance_tags).split(/[;,]\s*/).map((s: string)=>s.trim()) : []),
            risk: tc.risk || '',
            created_at: tc.created_at,
          }));
        } else if (data && data.requirements) {
          flattenedTestCases = data.requirements.flatMap((req: Requirement) => 
            req.test_cases?.map((tc: RequirementTestCase) => ({
              req_title_id: req.req_title_id,
              req_title: req.req_title,
              req_description: req.requirement_description,
              tc_id: tc.tc_id,
              tc_title: tc.tc_title,
              tc_description: tc.tc_description,
              expected_result: tc.expected_result,
              input_data: tc.input_data,
              compliance_tags: tc.compliance_tags,
              risk: tc.risk || ''
            }))
          ) || [];
        }

        setTestCases(flattenedTestCases);
      })
      .catch((error) => {
        console.error('Failed to fetch test cases:', error);
        setTestCases([]);
      });
  }, []);

  const handlePushToJira = async () => {
    setJiraStatus('loading');
    setJiraMessage('');
    setJiraCount(null);
    try {
      // Push all test cases to Jira
      const result = await apiService.pushToJira();
      setJiraStatus('success');
      setJiraCount(result.pushed_count || null);
      setJiraMessage(result.message || 'Successfully pushed test cases to Jira.');
    } catch (err: any) {
      setJiraStatus('error');
      setJiraMessage(err?.message || 'Failed to push test cases to Jira.');
    }
  };

  const handleExportCSV = () => {
    // Convert test cases to CSV format and include additional fields if present
    const headers = [
      'file_id',
      'req_id',
      'req_title_id',
      'req_title',
      'req_description',
      'tc_id',
      'tc_title',
      'tc_description',
      'expected_result',
      'input_data',
      'compliance_tags',
      'risk',
      'created_at'
    ];

    const escapeCsv = (value: any) => {
      if (value === null || value === undefined) return '';
      if (typeof value === 'object') value = JSON.stringify(value);
      const str = String(value);
      return `"${str.replace(/"/g, '""')}"`;
    };

    const csvContent = [
      headers.join(','),
      ...testCases.map(tc => [
        escapeCsv((tc as any).file_id || ''),
        escapeCsv((tc as any).req_id || ''),
        escapeCsv(tc.req_title_id || ''),
        escapeCsv(tc.req_title || ''),
        escapeCsv(tc.req_description || ''),
        escapeCsv(tc.tc_id || ''),
        escapeCsv(tc.tc_title || ''),
        escapeCsv(tc.tc_description || ''),
        escapeCsv(tc.expected_result || ''),
        escapeCsv(tc.input_data || ''),
        escapeCsv(Array.isArray(tc.compliance_tags) ? tc.compliance_tags.join(';') : tc.compliance_tags || ''),
        escapeCsv(tc.risk || ''),
        escapeCsv((tc as any).created_at || '')
      ].join(','))
    ].join('\n');

    // Create and trigger download
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'test_cases.csv';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="min-h-[300px] flex flex-col items-center justify-center bg-white rounded-xl shadow-md p-4 sm:p-8 max-w-md w-full mx-auto mt-8 sm:mt-16">
      <h2 className="text-2xl font-bold text-slate-900 mb-6 text-center">Export Test Case</h2>
      <div className="w-full flex gap-4 mb-6">
        <button
          className="flex-1 py-2 bg-blue-600 text-white rounded-lg font-semibold text-lg hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center justify-center"
          disabled={jiraStatus === 'loading'}
          onClick={handlePushToJira}
        >
          {jiraStatus === 'loading' ? <Loader2 className="animate-spin mr-2 h-5 w-5" /> : null}
          Push to Jira
        </button>
        
        <button
          className="flex-1 py-2 bg-green-600 text-white rounded-lg font-semibold text-lg hover:bg-green-700 transition-colors flex items-center justify-center"
          onClick={handleExportCSV}
        >
          <Download className="mr-2 h-5 w-5" />
          Download CSV
        </button>
      </div>

      <div className="mt-2 min-h-[32px] flex items-center justify-center w-full">
        {jiraStatus === 'idle' && testCases.length > 0 && (
          <span className="text-slate-500 text-sm text-center">{testCases.length} test cases available for export</span>
        )}
        {jiraStatus === 'success' && (
          <span className="flex items-center text-green-600 text-sm text-center">
            <CheckCircle className="mr-2 h-5 w-5" />
            Successfully pushed {jiraCount ?? ''} test cases to Jira.
          </span>
        )}
        {jiraStatus === 'error' && (
          <span className="flex items-center text-red-600 text-sm text-center">
            <XCircle className="mr-2 h-5 w-5" />
            {jiraMessage}
          </span>
        )}
      </div>
    </div>
  );
}