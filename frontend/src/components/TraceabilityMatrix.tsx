// ...REPLACED WITH NEW IMPLEMENTATION...
import React, { useEffect, useState, useMemo } from 'react';
import { apiService } from '../services/api';

interface FileItem {
  file_id: string;
  filename: string;
}

interface Requirement {
  requirement_id: string;
  req_title_id: string;
  title: string;
  description: string;
  file_id: string;
}

interface TestCase {
  tc_id: string;
  tc_title: string;
  tc_description: string;
  expected_result: string;
  input_data: string;
  compliance_tags: string;
  status?: string;
  req_id: string;
  req_title_id: string;
  req_title: string;
  req_description: string;
}

interface MatrixRequirement {
  req_id: string;
  req_title_id: string;
  req_title: string;
  req_description: string;
}

interface MatrixTestCase {
  tc_id: string;
  tc_title: string;
  status?: string;
  details: TestCase[];
}

const statusColors: Record<string, string> = {
  'Passed': 'bg-green-500',
  'Failed': 'bg-red-500',
  'Blocked': 'bg-yellow-500',
  'Not Executed': 'bg-gray-400',
  'Not Run': 'bg-gray-400',
};

const complianceColorMap: Record<string, string> = {
  'HIPAA': 'bg-blue-200 text-blue-800',
  'GDPR': 'bg-green-200 text-green-800',
  'ISO27001': 'bg-purple-200 text-purple-800',
  'FDA': 'bg-pink-200 text-pink-800',
  'IEC 62304': 'bg-yellow-200 text-yellow-800',
  'ISO 9001': 'bg-indigo-200 text-indigo-800',
  'ISO 13485': 'bg-teal-200 text-teal-800',
};

function getComplianceBadges(tags: string) {
  return tags.split('|').filter(Boolean).map(tag => (
    <span key={tag} className={`badge px-2 py-1 rounded mr-1 text-xs font-semibold ${complianceColorMap[tag] || 'bg-gray-200 text-gray-800'}`}>{tag}</span>
  ));
}

function prettyPrintJSON(data: string) {
  try {
    return JSON.stringify(JSON.parse(data), null, 2);
  } catch {
    return data;
  }
}

const TraceabilityMatrix: React.FC = () => {
  // State
  const [matrixData, setMatrixData] = useState<any>(null);
  const [loadingMatrix, setLoadingMatrix] = useState(false);
  const [error, setError] = useState<string>('');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [complianceFilter, setComplianceFilter] = useState('');
  const [highlightedReqId, setHighlightedReqId] = useState<string>('');
  const [expandedTcId, setExpandedTcId] = useState<string>('');

  // Fetch matrix data
  useEffect(() => {
    setLoadingMatrix(true);
    setError('');
    apiService.getTestCases()
      .then((data: any) => {
        // Transform the flat list into a structure similar to the old format
        const requirements: Record<string, any> = {};
        data.forEach((tc: TestCase) => {
          if (!requirements[tc.req_id]) {
            requirements[tc.req_id] = {
              req_id: tc.req_id,
              req_title_id: tc.req_title_id,
              req_title: tc.req_title,
              req_description: tc.req_description,
              test_cases: []
            };
          }
          requirements[tc.req_id].test_cases.push(tc);
        });
        
        setMatrixData({ requirements: Object.values(requirements) });
        setLoadingMatrix(false);
      })
      .catch(() => {
        setError('Failed to fetch matrix data');
        setLoadingMatrix(false);
      });
  }, []);

  // Processed data for UI
  const requirements: MatrixRequirement[] = useMemo(() => {
    if (!matrixData?.requirements) return [];
    return matrixData.requirements.map((r: any) => ({
      req_id: r.req_id || r.requirement_id,
      req_title_id: r.req_title_id,
      req_title: r.req_title,
      req_description: r.req_description,
    }));
  }, [matrixData]);

  const testCases: MatrixTestCase[] = useMemo(() => {
    if (!matrixData?.requirements) return [];
    const all: TestCase[] = matrixData.requirements.flatMap((r: any) => r.test_cases.map((tc: any) => ({ ...tc, req_id: r.req_id || r.requirement_id, req_title_id: r.req_title_id, req_title: r.req_title, req_description: r.req_description })));
    // Group by tc_id
    const tcMap: Record<string, MatrixTestCase> = {};
    all.forEach(tc => {
      if (!tcMap[tc.tc_id]) {
        tcMap[tc.tc_id] = { tc_id: tc.tc_id, tc_title: tc.tc_title, status: tc.status, details: [] };
      }
      tcMap[tc.tc_id].details.push(tc);
    });
    return Object.values(tcMap);
  }, [matrixData]);

  // Matrix mapping: [tc_id]-[req_id] => true
  const matrixMap = useMemo(() => {
    const map: Record<string, boolean> = {};
    if (!matrixData?.requirements) return map;
    matrixData.requirements.forEach((r: any) => {
      r.test_cases.forEach((tc: any) => {
        map[`${tc.tc_id}-${r.req_id || r.requirement_id}`] = true;
      });
    });
    return map;
  }, [matrixData]);

  // Metrics
  const totalRequirements = requirements.length;
  const totalTestCases = testCases.length;
  const requirementsWithTC = useMemo(() => {
    if (!matrixData?.requirements) return 0;
    return matrixData.requirements.filter((r: any) => r.test_cases && r.test_cases.length > 0).length;
  }, [matrixData]);
  const coverage = totalRequirements ? Math.round((requirementsWithTC / totalRequirements) * 100) : 0;

  // Status breakdown
  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = { 'Passed': 0, 'Failed': 0, 'Blocked': 0, 'Not Executed': 0 };
    testCases.forEach(tc => {
      const status = tc.status || tc.details[0]?.status || 'Not Executed';
      if (counts[status] !== undefined) counts[status]++;
      else counts['Not Executed']++;
    });
    return counts;
  }, [testCases]);

  // Filtering
  const filteredTestCases = useMemo(() => {
    return testCases.filter(tc => {
      const matchSearch = search ? (tc.tc_id.toLowerCase().includes(search.toLowerCase()) || tc.tc_title.toLowerCase().includes(search.toLowerCase())) : true;
      const matchStatus = statusFilter ? ((tc.status || tc.details[0]?.status) === statusFilter) : true;
      // Filter: show if complianceFilter is contained in any compliance_tags (split by comma)
      const matchCompliance = complianceFilter
        ? tc.details.some(d =>
            d.compliance_tags &&
            d.compliance_tags.split(',').map(t => t.trim()).includes(complianceFilter)
          )
        : true;
      const matchHighlight = highlightedReqId ? tc.details.some(d => d.req_id === highlightedReqId) : true;
      return matchSearch && matchStatus && matchCompliance && matchHighlight;
    });
  }, [testCases, search, statusFilter, complianceFilter, highlightedReqId]);

  // Unique compliance tags for filter dropdown
  // Unique compliance tags for filter dropdown (split by comma, trim, deduplicate)
  const allComplianceTags = useMemo(() => {
    const tags = new Set<string>();
    testCases.forEach(tc =>
      tc.details.forEach(d => {
        if (d.compliance_tags) {
          d.compliance_tags.split(',').map(t => t.trim()).forEach(tag => {
            if (tag) tags.add(tag);
          });
        }
      })
    );
    return Array.from(tags).filter(Boolean);
  }, [testCases]);

  // UI
  return (
    <div className="p-4 max-w-full">
      <h2 className="text-2xl font-bold mb-4">Traceability Matrix</h2>

      {/* Header Section with Controls */}
      <div className="flex flex-col md:flex-row md:items-end gap-4 mb-6">
        {error && <span className="text-red-500 mt-2">{error}</span>}
        
        {/* Metrics Summary Card */}
        {matrixData && (
          <div className="flex flex-row gap-4 w-full md:w-2/3 justify-between items-center bg-white shadow rounded-lg p-4">
            <div className="flex flex-col items-center">
              <span className="text-lg font-semibold">Total Requirements</span>
              <span className="text-2xl font-bold">{totalRequirements}</span>
            </div>
            <div className="flex flex-col items-center">
              <span className="text-lg font-semibold">Total Test Cases</span>
              <span className="text-2xl font-bold">{totalTestCases}</span>
            </div>
            <div className="flex flex-col items-center" title="Coverage = (Requirements with at least one test case) / (Total requirements)">
              <span className="text-lg font-semibold">Coverage</span>
              <div className="relative w-20 h-10 flex items-center justify-center">
                <svg viewBox="0 0 40 20" className="w-full h-full">
                  {/* Background arc */}
                  <path d="M4 18 A16 16 0 0 1 36 18" fill="none" stroke="#e5e7eb" strokeWidth="4" />
                  {/* Foreground arc: always ends at 36 for 100% */}
                  <path d={`M4 18 A16 16 0 0 1 ${4 + 32 * Math.min(coverage, 100) / 100} 18`} fill="none" stroke="#3b82f6" strokeWidth="4" />
                </svg>
                <span className="absolute inset-0 flex items-center justify-center text-lg font-bold">{coverage}%</span>
              </div>
              <span className="text-xs text-gray-500 mt-1" title="Coverage = (Requirements with at least one test case) / (Total requirements)">Based on requirements linked to test cases</span>
            </div>
            <div className="flex flex-col items-center">
              <span className="text-lg font-semibold">Status</span>
              <div className="flex gap-2 mt-1">
                {Object.entries(statusCounts).map(([status, count]) => (
                  <span key={status} className={`px-2 py-1 rounded text-xs font-semibold ${statusColors[status] || 'bg-gray-300'}`}>{status}: {count}</span>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Toolbar & Advanced Filtering */}
      {matrixData && (
        <div className="flex flex-col md:flex-row gap-4 mb-4 items-center">
          <input
            type="text"
            placeholder="Search by Test Case ID or Title"
            className="border rounded px-3 py-2 w-full md:w-1/3"
            value={search}
            onChange={e => setSearch(e.target.value)}
            aria-label="Search Test Cases"
          />
          <select
            className="border rounded px-3 py-2 w-full md:w-1/4"
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            aria-label="Filter by Status"
          >
            <option value="">All Statuses</option>
            {Object.keys(statusColors).map(status => (
              <option key={status} value={status}>{status}</option>
            ))}
          </select>
          <select
            className="border rounded px-3 py-2 w-full md:w-1/4"
            value={complianceFilter}
            onChange={e => setComplianceFilter(e.target.value)}
            aria-label="Filter by Compliance"
          >
            <option value="">All Compliance Tags</option>
            {allComplianceTags.map(tag => (
              <option key={tag} value={tag}>{tag}</option>
            ))}
          </select>
          {highlightedReqId && (
            <button className="ml-2 px-3 py-2 rounded bg-blue-500 text-white" onClick={() => setHighlightedReqId('')}>Clear Requirement Filter</button>
          )}
        </div>
      )}

      {/* Matrix Table */}
      <div className="overflow-x-auto relative pb-4" style={{maxWidth: 'calc(100vw - 18rem)'}}>
        {loadingMatrix ? (
          <div className="animate-pulse h-32 bg-gray-100 rounded flex items-center justify-center">Loading matrix...</div>
        ) : (
          <table className="min-w-full table-fixed border-collapse text-sm">
            <colgroup>
              <col style={{ width: '140px', minWidth: '140px' }} />
              <col style={{ width: '220px', minWidth: '220px' }} />
              <col style={{ width: '120px', minWidth: '120px' }} />
              {requirements.map(() => <col style={{ minWidth: '120px' }} />)}
            </colgroup>
            <thead>
              <tr>
                <th className="sticky left-0 z-20 bg-white border-b border-r px-4 py-2 font-bold shadow" style={{minWidth: '140px', width: '140px'}}>Test Case ID</th>
                <th className="sticky left-[140px] z-20 bg-white border-b border-r px-4 py-2 font-bold shadow" style={{minWidth: '220px', width: '220px'}}>Test Case Title</th>
                <th className="sticky left-[360px] z-20 bg-white border-b border-r px-4 py-2 font-bold shadow" style={{minWidth: '120px', width: '120px'}}>Status</th>
                {requirements.map(req => (
                  <th
                    key={req.req_id}
                    className="border-b px-4 py-2 font-bold cursor-pointer bg-gray-50 hover:bg-blue-50 min-w-[120px] text-center"
                    onClick={() => setHighlightedReqId(req.req_id)}
                    tabIndex={0}
                    aria-label={`Requirement ${req.req_title_id}`}
                  >
                    <div className="flex flex-col items-center justify-center">
                      <span className="underline decoration-dotted" title={req.req_title}>{req.req_title_id}</span>
                      <div className="text-xs text-gray-500 truncate max-w-xs mt-1" title={req.req_description}>{req.req_title}</div>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredTestCases.map(tc => (
                <React.Fragment key={tc.tc_id}>
                  <tr className={expandedTcId === tc.tc_id ? 'bg-blue-50' : ''}>
                    <td className="sticky left-0 z-10 bg-white border-r px-4 py-2 font-mono cursor-pointer shadow" style={{minWidth: '140px', width: '140px'}} onClick={() => setExpandedTcId(expandedTcId === tc.tc_id ? '' : tc.tc_id)} tabIndex={0} aria-label={`Test Case ${tc.tc_id}`}>{tc.tc_id}</td>
                    <td className="sticky left-[140px] z-10 bg-white border-r px-4 py-2 cursor-pointer shadow" style={{minWidth: '220px', width: '220px'}} onClick={() => setExpandedTcId(expandedTcId === tc.tc_id ? '' : tc.tc_id)}>{tc.tc_title}</td>
                    <td className="sticky left-[360px] z-10 bg-white border-r px-4 py-2 shadow" style={{minWidth: '120px', width: '120px'}}>
                      <span className={`px-2 py-1 rounded text-xs font-semibold ${statusColors[(tc.status || tc.details[0]?.status) ?? 'Not Executed'] || 'bg-gray-300'}`}>{tc.status || tc.details[0]?.status || 'Not Executed'}</span>
                    </td>
                    {requirements.map(req => {
                      const linked = matrixMap[`${tc.tc_id}-${req.req_id}`];
                      return (
                        <td key={req.req_id} className={`text-center px-4 py-2 min-w-[120px] ${highlightedReqId === req.req_id ? 'bg-blue-100' : ''}`}> 
                          {linked ? (
                            <span
                              role="img"
                              aria-label={`Verifies ${req.req_title_id}`}
                              title={`Verifies: ${req.req_title_id} - ${req.req_title}`}
                              className="text-green-600 text-lg cursor-pointer"
                            >✅</span>
                          ) : null}
                        </td>
                      );
                    })}
                  </tr>
                  {/* Expanded row */}
                  {expandedTcId === tc.tc_id && (
                    <tr className="bg-blue-50">
                      <td colSpan={3 + requirements.length} className="p-4">
                        {tc.details.map((detail, idx) => (
                          <div key={idx} className="mb-4">
                            <div className="mb-2">
                              <span className="font-semibold">Requirement:</span> <span className="font-mono">{detail.req_title_id}</span> - <span>{detail.req_title}</span>
                            </div>
                            <div className="mb-2">
                              <span className="font-semibold">Description:</span> {detail.tc_description}
                            </div>
                            <div className="mb-2">
                              <span className="font-semibold">Expected Result:</span> {detail.expected_result}
                            </div>
                            <div className="mb-2">
                              <span className="font-semibold">Input Data:</span>
                              <pre className="bg-gray-100 rounded p-2 overflow-x-auto text-xs mt-1"><code>{prettyPrintJSON(detail.input_data)}</code></pre>
                            </div>
                            <div className="mb-2 flex flex-wrap items-center">
                              <span className="font-semibold mr-2">Compliance:</span>
                              {getComplianceBadges(detail.compliance_tags)}
                            </div>
                          </div>
                        ))}
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))}
              {filteredTestCases.length === 0 && (
                <tr><td colSpan={3 + requirements.length} className="text-center py-8 text-gray-500">No test cases found.</td></tr>
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

export default TraceabilityMatrix;