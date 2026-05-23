import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL ? import.meta.env.VITE_API_URL + '/api' : '/api',
  withCredentials: true
});

let tokenGetter = null;

export const setTokenGetter = (getter) => {
  tokenGetter = getter;
};

api.interceptors.request.use(async (config) => {
  try {
    if (tokenGetter) {
      const token = await tokenGetter();
      if (token) config.headers['Authorization'] = `Bearer ${token}`;
    }
  } catch {}
  return config;
});

export default api;