import axios from 'axios';
import { BASE_URL } from '../Services/apis';

const api = axios.create({
  baseURL: BASE_URL,
});

 
// Attach JWT from localStorage on every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('teamflow_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle 401/403 globally
api.interceptors.response.use(
  (res) => res,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('teamflow_token');
      localStorage.removeItem('teamflow_user');
      window.location.href = '/login';
    } else if (error.response?.status === 403 && error.response?.data?.redirect) {
      // Handle planGuard redirects (e.g. to /select-plan)
      window.location.href = error.response.data.redirect;
    }
    return Promise.reject(error);
  }
);

export default api;
