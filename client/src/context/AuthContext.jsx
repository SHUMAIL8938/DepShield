import { createContext, useContext, useState, useEffect } from 'react';
import api from '../utils/api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('accessToken'));
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (token) {
      api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      api.get('/auth/me')
        .then(r => setUser(r.data))
        .catch(() => { setToken(null); localStorage.removeItem('accessToken'); })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, [token]);

  const login = async (email, password) => {
    const r = await api.post('/auth/login', { email, password });
    const { accessToken, user } = r.data;
    localStorage.setItem('accessToken', accessToken);
    api.defaults.headers.common['Authorization'] = `Bearer ${accessToken}`;
    setToken(accessToken);
    setUser(user);
    return user;
  };

  const register = async (email, password, username) => {
    const r = await api.post('/auth/register', { email, password, username });
    const { accessToken, user } = r.data;
    localStorage.setItem('accessToken', accessToken);
    api.defaults.headers.common['Authorization'] = `Bearer ${accessToken}`;
    setToken(accessToken);
    setUser(user);
    return user;
  };

  const logout = async () => {
    await api.post('/auth/logout').catch(() => {});
    localStorage.removeItem('accessToken');
    delete api.defaults.headers.common['Authorization'];
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
