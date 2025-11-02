

const BASE_URL = 'http://127.0.0.1:8000';


export const apiService = {
  // Upload requirement and input files
  uploadDocument: async (requirementFiles: File[], inputFiles: File[]) => {
    const formData = new FormData();
    requirementFiles.forEach((file) => formData.append('requirement_files', file));
    inputFiles.forEach((file) => formData.append('input_files', file));
    const response = await fetch(`${BASE_URL}/api/v1/files/upload`, {
      method: 'POST',
      body: formData,
    });
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ detail: response.statusText }));
      const error = new Error(`Upload failed: ${response.statusText}`);
      (error as any).response = { data: errorData };
      throw error;
    }
    return await response.json();
  },

  // Extract requirements from file
  extractRequirements: async (fileId: string) => {
    const response = await fetch(`${BASE_URL}/api/v1/requirements/${fileId}/extract`, {
      method: 'POST',
    });
    if (!response.ok) {
      throw new Error(`Requirement extraction failed: ${response.statusText}`);
    }
    return await response.json();
  },

  // Get all requirements (no file_id dependency)
  getRequirements: async () => {
    const response = await fetch(`${BASE_URL}/api/v1/requirements/`);
    if (!response.ok) {
      throw new Error(`Failed to fetch requirements: ${response.statusText}`);
    }
    return await response.json();
  },

  // Generate test cases for all requirements in a file
  generateTestCasesForFile: async (fileId: string) => {
    const response = await fetch(`${BASE_URL}/api/v1/test-cases/generate/file/${fileId}`, {
      method: 'POST',
    });
    if (!response.ok) {
      throw new Error(`Failed to generate test cases for file: ${response.statusText}`);
    }
    return await response.json();
  },

  // Generate test cases for a single requirement
  generateTestCasesForRequirement: async (requirementId: string) => {
    const response = await fetch(`${BASE_URL}/api/v1/test-cases/generate/requirement/${requirementId}`, {
      method: 'POST',
    });
    if (!response.ok) {
      throw new Error(`Failed to generate test cases: ${response.statusText}`);
    }
    return await response.json();
  },

  // Get all test cases (flat list, no file_id required)
  getTestCases: async () => {
    const response = await fetch(`${BASE_URL}/api/v1/test-cases/`);
    if (!response.ok) {
      throw new Error(`Failed to fetch test cases: ${response.statusText}`);
    }
    return await response.json();
  },

  // Improve a test case description
  improveTestCase: async (payload: { requirement_id: string; tc_id: string; user_input: string }) => {
    const response = await fetch(`${BASE_URL}/api/v1/test-cases/improve`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!response.ok) {
      throw new Error('Failed to improve test case');
    }
    return await response.json();
  },

  // Push all test cases to Jira
  pushToJira: async () => {
    const response = await fetch(`${BASE_URL}/api/v1/jira/push`, {
      method: 'POST',
    });
    if (!response.ok) {
      let errorMsg = 'Failed to push test cases to Jira.';
      try {
        const errData = await response.json();
        errorMsg = errData.detail || errorMsg;
      } catch {}
      throw new Error(errorMsg);
    }
    return await response.json();
  },

  // Fetch compliance metrics for dashboard (aggregated across all files)
  getComplianceMetrics: async () => {
    const response = await fetch(`${BASE_URL}/api/v1/jira/compliance-metrics`);
    if (!response.ok) {
      throw new Error(`Failed to fetch compliance metrics: ${response.statusText}`);
    }
    return await response.json();
  },

  // Get uploaded files
  getUploadedFiles: async () => {
    const response = await fetch(`${BASE_URL}/api/v1/files/`);
    if (!response.ok) {
      throw new Error(`Failed to fetch files: ${response.statusText}`);
    }
    return await response.json();
  },
};