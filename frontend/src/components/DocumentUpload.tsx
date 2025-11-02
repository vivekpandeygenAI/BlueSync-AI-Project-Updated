import React, { useState, useCallback } from 'react';
import { 
  Upload, 
  FileText, 
  AlertCircle, 
  CheckCircle, 
  Clock,
  X,
  Eye,
  Download
} from 'lucide-react';
import { apiService } from '../services/api';

export const DocumentUpload: React.FC = () => {
  // State for requirement files
  const [requirementFiles, setRequirementFiles] = useState<File[]>([]);
  // State for input files
  const [inputFiles, setInputFiles] = useState<File[]>([]);
  // Upload feedback
  const [uploadStatus, setUploadStatus] = useState<string>('');
  const [uploading, setUploading] = useState(false);

  // File selection handlers
  const handleRequirementFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setRequirementFiles(Array.from(e.target.files));
    }
  };
  const handleInputFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setInputFiles(Array.from(e.target.files));
    }
  };

  // Remove file from list
  const removeRequirementFile = (idx: number) => {
    setRequirementFiles(files => files.filter((_, i) => i !== idx));
  };
  const removeInputFile = (idx: number) => {
    setInputFiles(files => files.filter((_, i) => i !== idx));
  };

  // Single upload handler for both file types
  const handleUploadBoth = async () => {
    setUploading(true);
    setUploadStatus('');
    try {
      const res = await apiService.uploadDocument(requirementFiles, inputFiles);
      setUploadStatus(res.message || 'Files uploaded.');
      setRequirementFiles([]);
      setInputFiles([]);
    } catch (err: any) {
      setUploadStatus(err.response?.data?.detail || 'Upload failed.');
    }
    setUploading(false);
  };

  // File validation (reuse logic)
  const isValidFile = (file: File): boolean => {
    const validTypes = [
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/msword',
      'text/plain',
      'application/xml',
      'text/xml'
    ];
    const maxSize = 50 * 1024 * 1024; // 50MB
    if (!validTypes.includes(file.type)) {
      return false;
    }
    if (file.size > maxSize) {
      return false;
    }
    return true;
  };

  // Format file size
  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // Pipeline steps array outside JSX
  const pipelineSteps = [
    { stage: 'Upload', icon: Upload },
    { stage: 'Parse', icon: FileText },
    { stage: 'Requirement Generation', icon: Eye },
    { stage: 'Testcase Generation', icon: CheckCircle },
    { stage: 'Traceability Matrix', icon: Clock },
    { stage: 'Compliance Report', icon: AlertCircle },
    { stage: 'Integration to Jira', icon: Download }
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold text-slate-900">Document Upload & Processing</h2>
        <div className="text-sm text-slate-600">
          Supported: PDF, Word, XML, Markup
        </div>
      </div>

      {/* Dual Upload Sections */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Requirement Documents Section */}
        <div className="bg-white p-6 rounded-xl border-2 border-blue-400">
          <h3 className="text-lg font-semibold text-blue-700 mb-4 flex items-center"><FileText className="mr-2" /> Software Requirement Documents</h3>
          <input
            type="file"
            multiple
            accept=".pdf,.doc,.docx,.txt,.xml"
            onChange={handleRequirementFileChange}
            className="hidden"
            id="requirement-upload"
          />
          <label
            htmlFor="requirement-upload"
            className="inline-flex items-center px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors cursor-pointer mb-4"
          >
            <Upload className="h-4 w-4 mr-2" />
            Choose Requirement Files
          </label>
          {/* File List */}
          {requirementFiles.length > 0 && (
            <div className="mb-4">
              <div className="font-medium text-slate-700 mb-2">Selected Files:</div>
              <ul className="space-y-1">
                {requirementFiles.map((file, idx) => (
                  <li key={idx} className="flex items-center justify-between text-sm bg-slate-100 rounded px-2 py-1">
                    <span>{file.name} <span className="text-xs text-slate-500">({formatFileSize(file.size)})</span></span>
                    <button onClick={() => removeRequirementFile(idx)} className="ml-2 text-red-500 hover:text-red-700"><X className="h-4 w-4" /></button>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {/* No individual upload button here */}
        </div>

        {/* Input Files Section */}
        <div className="bg-white p-6 rounded-xl border-2 border-green-400">
          <h3 className="text-lg font-semibold text-green-700 mb-4 flex items-center"><FileText className="mr-2" /> Input Files</h3>
          <input
            type="file"
            multiple
            accept=".pdf,.doc,.docx,.txt,.xml"
            onChange={handleInputFileChange}
            className="hidden"
            id="input-upload"
          />
          <label
            htmlFor="input-upload"
            className="inline-flex items-center px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors cursor-pointer mb-4"
          >
            <Upload className="h-4 w-4 mr-2" />
            Choose Input Files
          </label>
          {/* File List */}
          {inputFiles.length > 0 && (
            <div className="mb-4">
              <div className="font-medium text-slate-700 mb-2">Selected Files:</div>
              <ul className="space-y-1">
                {inputFiles.map((file, idx) => (
                  <li key={idx} className="flex items-center justify-between text-sm bg-slate-100 rounded px-2 py-1">
                    <span>{file.name} <span className="text-xs text-slate-500">({formatFileSize(file.size)})</span></span>
                    <button onClick={() => removeInputFile(idx)} className="ml-2 text-red-500 hover:text-red-700"><X className="h-4 w-4" /></button>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {/* No individual upload button here */}
        </div>
      </div>


      {/* Combined Upload Button */}
      <div className="flex justify-center mt-4">
        <button
          onClick={handleUploadBoth}
          disabled={(requirementFiles.length === 0 && inputFiles.length === 0) || uploading}
          className="px-8 py-4 bg-indigo-700 text-white rounded-lg hover:bg-indigo-800 transition-colors disabled:opacity-50 text-lg font-semibold"
        >
          Upload All Selected Files
        </button>
      </div>
      {/* Upload Status */}
      {uploadStatus && (
        <div
          className={`p-4 rounded mt-4 border text-base font-semibold ${
            uploadStatus.toLowerCase().includes('success')
              ? 'bg-green-100 border-green-400 text-green-800'
              : uploadStatus.toLowerCase().includes('fail') || uploadStatus.toLowerCase().includes('error')
              ? 'bg-red-100 border-red-400 text-red-800'
              : 'bg-yellow-100 border-yellow-400 text-yellow-800'
          }`}
        >
          {uploadStatus}
        </div>
      )}

      {/* AI Processing Pipeline - Updated Steps */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 mt-8">
        <h3 className="text-lg font-semibold text-slate-900 mb-4">AI Processing Pipeline</h3>
        <div className="grid grid-cols-1 md:grid-cols-7 gap-4">
          {pipelineSteps.map((step, index) => (
            <div key={index} className="text-center">
              <div className="w-12 h-12 rounded-full mx-auto mb-2 flex items-center justify-center bg-slate-100">
                <step.icon className="h-6 w-6 text-blue-600" />
              </div>
              <span className="text-sm font-medium text-slate-700">{step.stage}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};