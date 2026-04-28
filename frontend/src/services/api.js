import axios from 'axios';

const API_BASE_URL = 'http://localhost:8001';

// Add interceptor to include token in requests
axios.interceptors.request.use(config => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const fetchConfig = async () => {
  const response = await axios.get(`${API_BASE_URL}/config`);
  return response.data;
};

export const fetchSystems = async (industry) => {
  const response = await axios.get(`${API_BASE_URL}/systems`, {
    params: { industry }
  });
  return response.data;
};

export const fetchGraph = async (asset, type = "Both") => {
  const response = await axios.get(`${API_BASE_URL}/graph`, {
    params: { asset, type }
  });
  return response.data;
};

export const runImpactAnalysis = async (nodeName, nodeType) => {
  const response = await axios.post(`${API_BASE_URL}/impact-analysis`, {
    component_name: nodeName,
    node_type: nodeType
  });
  return response.data;
};

export const ingestCadData = async (file) => {
  const formData = new FormData();
  formData.append('file', file);
  
  const response = await axios.post(`${API_BASE_URL}/cad-ingest`, formData, {
    headers: {
      'Content-Type': 'multipart/form-data'
    }
  });
  return response.data;
};

export const login = async (email, password) => {
  const response = await axios.post(`${API_BASE_URL}/auth/login`, { email, password });
  return response.data;
};

export const signup = async (email, password) => {
  const response = await axios.post(`${API_BASE_URL}/auth/signup`, { email, password });
  return response.data;
};

export const fetchDashboardStats = async () => {
  const response = await axios.get(`${API_BASE_URL}/dashboard-stats`);
  return response.data;
};

export const fetchAssets = async () => {
  const response = await axios.get(`${API_BASE_URL}/assets`);
  return response.data;
};

export const fetchChangeRequests = async () => {
  const response = await axios.get(`${API_BASE_URL}/change-requests`);
  return response.data;
};

export const createChangeRequest = async (nodeName, nodeType) => {
  const response = await axios.post(`${API_BASE_URL}/change-requests`, {
    component_name: nodeName,
    node_type: nodeType
  });
  return response.data;
};
