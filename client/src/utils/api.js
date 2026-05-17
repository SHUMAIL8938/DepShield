import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL ? import.meta.env.VITE_API_URL + '/api' : '/api',
  withCredentials: true
});

export const setTokenGetter = (getter) => {
  api.interceptors.request.use(async (config) => {
    try {
      const token = await getter();
      if (token) config.headers['Authorization'] = `Bearer ${token}`;
    } catch {
    }
    return config;
  });
};

export default api;
