'use client';

import { createContext, useState, useContext, useEffect, useRef } from 'react';
import LoginModal from './LoginModal';
import RegisterModal from './RegisterModal';
import { NEXT_PUBLIC_API_URL } from '@/lib/env';

interface User {
  id: string;
  username: string;
  email: string;
  avatar_url?: string;
  first_name?: string;
  last_name?: string;
}

interface AuthContextType {
  user: User | null;
  loadingUser: boolean;
  logout: () => Promise<void>;
  openLogin: () => void;
  openRegister: () => void;
  fetchUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loadingUser, setLoadingUser] = useState(true);
  const [showLogin, setShowLogin] = useState(false);
  const [showRegister, setShowRegister] = useState(false);

  const hasFetchedUser = useRef(false);

  const fetchUser = async () => {
    try {
      const res = await fetch(`${NEXT_PUBLIC_API_URL}/me/`);

      if (res.ok) {
        const data = await res.json();
        setUser(data);
      } else {
        setUser(null);
      }
    } catch (err) {
      console.warn('Failed to fetch user session:', err);
      setUser(null);
    } finally {
      setLoadingUser(false);
    }
  };

  useEffect(() => {
    if (hasFetchedUser.current) return;
    hasFetchedUser.current = true;
    fetchUser();
  }, []);

  const logout = async () => {
    try {
      await fetch(`${NEXT_PUBLIC_API_URL}/auth/logout`, { method: "POST" });
      setUser(null);
      window.location.href = "/";
    } catch (error) {
      console.error("Logout failed", error);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loadingUser,
        logout,
        openLogin: () => setShowLogin(true),
        openRegister: () => setShowRegister(true),
        fetchUser,
      }}
    >
      {children}

      <LoginModal
        open={showLogin}
        onClose={() => setShowLogin(false)}
        onCancel={() => {
          window.dispatchEvent(new Event("login-cancelled"));
        }}
      />

      <RegisterModal
        open={showRegister}
        onClose={() => setShowRegister(false)}
      />
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};
