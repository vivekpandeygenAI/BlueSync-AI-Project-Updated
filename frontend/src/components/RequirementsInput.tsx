import { apiService } from '../services/api';
import React, { useState, useEffect } from 'react';
import { Upload, FileText, Zap, CheckCircle, AlertCircle, Clock, Brain, Target, Shield } from 'lucide-react';
import { useWebSocket } from '../hooks/useWebSocket';

type UploadedFile = {
  file_id: string;
  filename: string;
  created_at: string;
};

type RequirementExtraction = {
  requirement_id: string;
  req_title_id: string;
  title: string;
  description: string;
  id?: string;
  type?: string;
  source?: string;
  category?: string;
  priority?: string;
  filename?: string;
  created_at?: string;
};

export const RequirementsInput: React.FC = () => {
  const [activeTab, setActiveTab] = useState('upload');
  const [requirements, setRequirements] = useState('');
  const [analysisStatus, setAnalysisStatus] = useState<'idle' | 'analyzing' | 'complete'>('complete');
  const [extractedRequirements, setExtractedRequirements] = useState<RequirementExtraction[]>([]);
  const [aiConfig, setAiConfig] = useState({
    confidenceThreshold: 0.8,
    extractionDepth: 'comprehensive',
    domainFocus: 'healthcare',
    regulatoryContext: ['FDA', 'IEC62304', 'ISO13485']
  });

  const { lastMessage } = useWebSocket('ws://localhost:8080/ws');

  // Fetch requirements from DB on component mount and show them directly
  useEffect(() => {
    const fetchRequirements = async () => {
      try {
        const reqs = await apiService.getRequirements();
        setExtractedRequirements(reqs || []);
        setAnalysisStatus('complete');
      } catch (error) {
        console.error('Failed to fetch requirements:', error);
        setExtractedRequirements([]);
        setAnalysisStatus('complete');
      }
    };
    fetchRequirements();
  }, []);

  // Handle real-time updates
  React.useEffect(() => {
    if (lastMessage && lastMessage.type === 'progress' && lastMessage.data.stage === 'extraction') {
      if (lastMessage.data.requirements) {
        setExtractedRequirements(lastMessage.data.requirements);
        setAnalysisStatus('complete');
      }
    }
  }, [lastMessage]);

  // Note: Extraction and file selection UI were removed. Component shows DB requirements directly.

  const tabs = [
    { id: 'upload', label: 'AI Document Analysis', icon: Brain },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold text-slate-900">Requirements Analysis</h2>
      </div>

      {/* Tab Navigation */}
      <div className="bg-white rounded-xl border border-slate-200">
        <div className="border-b border-slate-200">
          <div className="flex">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center space-x-2 px-6 py-4 border-b-2 transition-colors ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600 bg-blue-50'
                    : 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                }`}
              >
                <tab.icon className="h-4 w-4" />
                <span className="font-medium">{tab.label}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="p-6">
          {activeTab === 'upload' && (
            <div className="space-y-4">
              {/* AI Configuration Panel */}
              {/* <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
                <div className="flex items-center space-x-3 mb-4">
                  <Brain className="h-6 w-6 text-blue-600" />
                  <h4 className="text-lg font-semibold text-blue-900">AI Analysis Configuration</h4>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-blue-800 mb-2">Confidence Threshold</label>
                    <select 
                      value={aiConfig.confidenceThreshold}
                      onChange={(e) => setAiConfig(prev => ({ ...prev, confidenceThreshold: parseFloat(e.target.value) }))}
                      className="w-full px-3 py-2 border border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white"
                    >
                      <option value={0.9}>High (90%)</option>
                      <option value={0.8}>Medium (80%)</option>
                      <option value={0.7}>Low (70%)</option>
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-blue-800 mb-2">Extraction Depth</label>
                    <select 
                      value={aiConfig.extractionDepth}
                      onChange={(e) => setAiConfig(prev => ({ ...prev, extractionDepth: e.target.value }))}
                      className="w-full px-3 py-2 border border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white"
                    >
                      <option value="comprehensive">Comprehensive Analysis</option>
                      <option value="standard">Standard Extraction</option>
                      <option value="focused">Focused Requirements Only</option>
                    </select>
                  </div>
                </div>
                
                <div className="mt-4">
                  <label className="block text-sm font-medium text-blue-800 mb-2">Regulatory Context</label>
                  <div className="flex flex-wrap gap-2">
                    {['FDA 21 CFR Part 11', 'IEC 62304', 'ISO 13485', 'HIPAA', 'GDPR'].map((standard) => (
                      <button
                        key={standard}
                        onClick={() => {
                          const isSelected = aiConfig.regulatoryContext.includes(standard);
                          setAiConfig(prev => ({
                            ...prev,
                            regulatoryContext: isSelected
                              ? prev.regulatoryContext.filter(s => s !== standard)
                              : [...prev.regulatoryContext, standard]
                          }));
                        }}
                        className={`px-3 py-1 text-xs rounded-full transition-colors ${
                          aiConfig.regulatoryContext.includes(standard)
                            ? 'bg-blue-600 text-white'
                            : 'bg-white text-blue-700 border border-blue-300 hover:bg-blue-100'
                        }`}
                      >
                        {standard}
                      </button>
                    ))}
                  </div>
                </div>
              </div> */}
              
              {/* Requirements are fetched from the DB and displayed below. To add requirements, upload via Document Upload. */}
            </div>
          )}

          {activeTab === 'manual' && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Requirement Description
                </label>
                <textarea
                  value={requirements}
                  onChange={(e) => setRequirements(e.target.value)}
                  className="w-full h-40 px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Enter your requirements here..."
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Priority</label>
                  <select className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                    <option>Critical</option>
                    <option>High</option>
                    <option>Medium</option>
                    <option>Low</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Type</label>
                  <select className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                    <option>Functional</option>
                    <option>Non-functional</option>
                    <option>Security</option>
                    <option>Performance</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'api' && (
            <div className="space-y-4">
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <h4 className="font-medium text-green-900 mb-2">Enterprise ALM Integrations</h4>
                <div className="space-y-2">
                  {[
                    { name: 'Jira', status: 'connected', requirements: 245 },
                    { name: 'Azure DevOps', status: 'connected', requirements: 189 },
                    { name: 'Polarion', status: 'pending', requirements: 0 },
                    { name: 'Confluence', status: 'connected', requirements: 67 }
                  ].map((tool) => (
                    <div key={tool.name} className="flex items-center justify-between bg-white p-3 rounded">
                      <div className="flex items-center space-x-3">
                        <span className="font-medium text-slate-900">{tool.name}</span>
                        <span className={`px-2 py-1 text-xs rounded-full ${
                          tool.status === 'connected' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
                        }`}>
                          {tool.status}
                        </span>
                        {tool.requirements > 0 && (
                          <span className="text-sm text-slate-600">{tool.requirements} requirements</span>
                        )}
                      </div>
                      <button className="text-blue-600 hover:text-blue-800 text-sm">
                        {tool.status === 'connected' ? 'Sync Now' : 'Configure'}
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'validation' && (
            <div className="space-y-4">
              <div className="bg-purple-50 border border-purple-200 rounded-lg p-6">
                <div className="flex items-center space-x-3 mb-4">
                  <Shield className="h-6 w-6 text-purple-600" />
                  <h4 className="text-lg font-semibold text-purple-900">AI-Powered Validation</h4>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-white p-4 rounded-lg">
                    <Target className="h-8 w-8 text-purple-600 mb-2" />
                    <h5 className="font-medium text-slate-900 mb-1">Completeness Check</h5>
                    <p className="text-sm text-slate-600">AI validates requirement completeness and identifies gaps</p>
                  </div>
                  
                  <div className="bg-white p-4 rounded-lg">
                    <CheckCircle className="h-8 w-8 text-purple-600 mb-2" />
                    <h5 className="font-medium text-slate-900 mb-1">Compliance Validation</h5>
                    <p className="text-sm text-slate-600">Automatic validation against regulatory standards</p>
                  </div>
                  
                  <div className="bg-white p-4 rounded-lg">
                    <Brain className="h-8 w-8 text-purple-600 mb-2" />
                    <h5 className="font-medium text-slate-900 mb-1">Semantic Analysis</h5>
                    <p className="text-sm text-slate-600">Deep understanding of healthcare domain context</p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Analysis Results */}
      <div className="bg-white rounded-xl border border-slate-200 p-6">
          <div className="flex items-center space-x-3 mb-4">
            {analysisStatus === 'analyzing' ? (
              <>
                <Clock className="h-5 w-5 text-blue-600 animate-spin" />
                <h3 className="text-lg font-semibold text-slate-900">Extracting Requirements...</h3>
              </>
            ) : (
              <>
                <CheckCircle className="h-5 w-5 text-green-600" />
                <h3 className="text-lg font-semibold text-slate-900">Requirements Extracted</h3>
              </>
            )}
          </div>

          {analysisStatus === 'complete' && (
            <div className="space-y-4">
              {extractedRequirements.length > 0 ? (
                <>
                  <div className="grid grid-cols-3 gap-4 mb-6">
                    <div className="bg-green-50 p-4 rounded-lg">
                      <div className="text-2xl font-bold text-green-700">{extractedRequirements.length}</div>
                      <div className="text-sm text-green-600">Requirements Identified</div>
                    </div>
                  </div>

                  <div className="space-y-3">
                    {extractedRequirements.map((req, index) => (
                                          <div key={req.requirement_id || req.id || index} className="border border-slate-200 rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow bg-gradient-to-br from-white to-slate-50">
                                            <div className="flex items-center justify-between mb-2">
                                              <div className="flex items-center gap-4">
                                                <span className="font-semibold text-blue-700 text-base">{req.req_title_id || req.id}</span>
                                                <span className="text-xl font-semibold text-slate-900">{req.title}</span>
                                              </div>
                                              <CheckCircle className="h-5 w-5 text-green-500" />
                                            </div>
                                            <p className="text-slate-700 text-[15px] mb-2 leading-relaxed">{req.description}</p>
                                            <div className="flex flex-wrap gap-3 mt-2">
                                              {/* Type */}
                                              {req.type && (
                                                <span className="px-2 py-1 rounded text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                                                  {req.type}
                                                </span>
                                              )}
                                              {/* Source
                                              {req.source && (
                                                <span className="px-2 py-1 rounded text-xs font-medium bg-gray-50 text-gray-600 border border-gray-200">
                                                  Source: {req.source}
                                                </span>
                                              )} */}
                                              {/* Category */}
                                              {req.category && (
                                                <span className={`px-2 py-1 rounded text-xs font-semibold border ${
                                                  req.category === 'Security' ? 'bg-red-100 text-red-700 border-red-200' :
                                                  req.category === 'Compliance' ? 'bg-purple-100 text-purple-700 border-purple-200' :
                                                  req.category === 'Analytics' ? 'bg-green-100 text-green-700 border-green-200' :
                                                  req.category === 'Interoperability' ? 'bg-blue-100 text-blue-700 border-blue-200' :
                                                  req.category === 'Usability' ? 'bg-yellow-100 text-yellow-700 border-yellow-200' :
                                                  req.category === 'Data Acquisition' ? 'bg-cyan-100 text-cyan-700 border-cyan-200' :
                                                  'bg-slate-100 text-slate-700 border-slate-200'
                                                }`}>
                                                  {req.category}
                                                </span>
                                              )}
                                              {/* Priority */}
                                              {req.priority && (
                                                <span className={`px-2 py-1 rounded text-xs font-bold border ${
                                                  req.priority === 'High' ? 'bg-red-200 text-red-800 border-red-300' :
                                                  req.priority === 'Medium' ? 'bg-orange-100 text-orange-700 border-orange-200' :
                                                  req.priority === 'Low' ? 'bg-green-100 text-green-700 border-green-200' :
                                                  'bg-slate-100 text-slate-700 border-slate-200'
                                                }`}>
                                                  Priority: {req.priority}
                                                </span>
                                              )}
                                            </div>
                                          </div>
                    ))}
                  </div>
                </>
                  ) : (
                <div className="text-center py-8">
                  <AlertCircle className="h-12 w-12 text-slate-400 mx-auto mb-4" />
                  <h4 className="text-lg font-medium text-slate-900 mb-2">No Requirements Found</h4>
                  <p className="text-slate-600 mb-4">
                    No requirements were found in the database. Please upload requirement files via the Document Upload section.
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      
    </div>
  );
};