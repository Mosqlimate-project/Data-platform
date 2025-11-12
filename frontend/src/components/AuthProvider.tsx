'use client';
import { createContext, useState, useContext, useEffect } from 'react';
import LoginModal from './LoginModal';
import RegisterModal from './RegisterModal';
import { apiFetch } from '@/lib/api';

interface User {
  id: string;
  username: string;
  email: string;
  avatar_url?: string;
}

interface AuthContextType {
  user: User | null;
  logout: () => void;
  openLogin: () => void;
  openRegister: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [showLogin, setShowLogin] = useState(false);
  const [showRegister, setShowRegister] = useState(false);

  const fetchUser = async (token: string) => {
    try {
      const data = await apiFetch('/user/me/', {
        token,
      });
      setUser(data);
      localStorage.setItem('user', JSON.stringify(data));
    } catch (err) {
      console.warn('Failed to fetch user', err);
    }
  };

  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    const accessToken = localStorage.getItem('access_token');

    if (storedUser && accessToken) {
      setUser(JSON.parse(storedUser));
    } else if (accessToken) {
      fetchUser(accessToken);
    }
  }, []);

  useEffect(() => {
    const hash = window.location.hash.substring(1);
    const params = new URLSearchParams(hash);
    const accessToken = params.get('access_token');
    const refreshToken = params.get('refresh_token');

    if (accessToken && refreshToken) {
      localStorage.setItem('access_token', accessToken);
      localStorage.setItem('refresh_token', refreshToken);
      fetchUser(accessToken);

      window.history.replaceState({}, '', window.location.pathname);
    }
  }, []);

  const logout = () => {
    setUser(null);
    localStorage.removeItem('user');
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        logout,
        openLogin: () => setShowLogin(true),
        openRegister: () => setShowRegister(true),
      }}
    >
      {children}
      <LoginModal open={showLogin} onClose={() => setShowLogin(false)} />
      <RegisterModal open={showRegister} onClose={() => setShowRegister(false)} />
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};
