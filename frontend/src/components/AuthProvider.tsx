'use client';
import { createContext, useState, useContext, useEffect } from 'react';
import Cookies from 'js-cookie';
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

  const fetchUser = async () => {
    try {
      const data = await apiFetch('/user/me/');
      setUser(data);
    } catch (err) {
      console.warn('Failed to fetch user', err);
    }
  };

  useEffect(() => {
    const accessToken = Cookies.get('access_token');
    if (accessToken) fetchUser();
  }, []);

  useEffect(() => {
    // OAuth redirect case: tokens come in URL hash
    const hash = window.location.hash.substring(1);
    const params = new URLSearchParams(hash);
    const accessToken = params.get('access_token');
    const refreshToken = params.get('refresh_token');

    if (accessToken && refreshToken) {
      const secure = window.location.protocol === 'https:';
      const commonOptions = { path: '/', sameSite: 'lax' as const, secure };

      Cookies.set('access_token', accessToken, { ...commonOptions });
      Cookies.set('refresh_token', refreshToken, { ...commonOptions });
      fetchUser();

      window.history.replaceState({}, '', window.location.pathname);
    }
  }, []);

  const logout = () => {
    setUser(null);
    Cookies.remove('access_token');
    Cookies.remove('refresh_token');
    Cookies.remove('csrftoken');
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
