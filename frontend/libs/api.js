import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

const api = axios.create({
  baseURL: API_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor
api.interceptors.request.use(
  (config) => {
    // Add auth token if available
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Handle unauthorized
      if (typeof window !== 'undefined') {
        localStorage.removeItem('token');
      }
    }
    return Promise.reject(error);
  }
);

// API functions
export const videoAPI = {
  // Generate video from text
  generateVideo: async (data) => {
    const response = await api.post('/generate', data);
    return response.data;
  },

  // Get job status
  getJobStatus: async (jobId) => {
    const response = await api.get(`/job/${jobId}`);
    return response.data;
  },

  // Get video URL
  getVideoUrl: async (jobId) => {
    const response = await api.get(`/video/${jobId}`);
    return response.data;
  },

  // List all jobs
  listJobs: async (params = {}) => {
    const response = await api.get('/jobs', { params });
    return response.data;
  },

  // Delete job
  deleteJob: async (jobId) => {
    const response = await api.delete(`/job/${jobId}`);
    return response.data;
  },
};

export default api;
