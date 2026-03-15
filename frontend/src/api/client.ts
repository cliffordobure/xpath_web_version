import axios from 'axios';

const defaultApiUrl = import.meta.env.PROD
  ? 'https://xpath-web-version.onrender.com/api'
  : '/api';
const baseURL = import.meta.env.VITE_API_URL || defaultApiUrl;

export const api = axios.create({
  baseURL,
  headers: { 'Content-Type': 'application/json' },
  withCredentials: true,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('lims_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (r) => r,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('lims_token');
      window.dispatchEvent(new Event('lims_unauthorized'));
    }
    return Promise.reject(err);
  }
);

export default api;
