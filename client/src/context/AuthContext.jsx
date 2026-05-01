import { createContext, useContext, useState, useEffect } from 'react';
import api, { setAccessToken, clearTokens } from '../services/api.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // On mount: attempt to restore session from stored refresh token
  useEffect(() => {
    const storedRefreshToken = localStorage.getItem('refreshToken');
    if (storedRefreshToken) {
      api
        .post('/auth/refresh', { refreshToken: storedRefreshToken })
        .then((response) => {
          const { accessToken, refreshToken, user: userData } = response.data;
          setAccessToken(accessToken);
          if (refreshToken) {
            localStorage.setItem('refreshToken', refreshToken);
          }
          setUser(userData);
        })
        .catch(() => {
          // Refresh failed — clear stale tokens
          clearTokens();
        })
        .finally(() => {
          setLoading(false);
        });
    } else {
      setLoading(false);
    }
  }, []);

  async function login(email, password) {
    const response = await api.post('/auth/login', { email, password });
    const { accessToken, refreshToken, user: userData } = response.data;

    setAccessToken(accessToken);
    localStorage.setItem('refreshToken', refreshToken);
    setUser(userData);

    return userData;
  }

  async function register(email, displayName, password) {
    const response = await api.post('/auth/register', {
      email,
      displayName,
      password,
    });
    const { accessToken, refreshToken, user: userData } = response.data;

    setAccessToken(accessToken);
    localStorage.setItem('refreshToken', refreshToken);
    setUser(userData);

    return userData;
  }

  async function logout() {
    const storedRefreshToken = localStorage.getItem('refreshToken');
    try {
      if (storedRefreshToken) {
        // Revoke the refresh token on the server
        await api.post('/auth/logout', { refreshToken: storedRefreshToken });
      }
    } catch {
      // Ignore errors — clear tokens regardless
    } finally {
      clearTokens();
      setUser(null);
      window.location.href = '/login';
    }
  }

  const value = {
    user,
    loading,
    login,
    register,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

export default AuthContext;
