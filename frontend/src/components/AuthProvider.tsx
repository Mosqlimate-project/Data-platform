'use client';
import { createContext, useState, useContext } from 'react';
import LoginModal from './LoginModal';
import RegisterModal from './RegisterModal';

interface AuthContextType {
  user: any;
  login: (credentials: any) => Promise<void>;
  logout: () => void;
  openLogin: () => void;
  openRegister: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState(null);
  const [showLogin, setShowLogin] = useState(false);
  const [showRegister, setShowRegister] = useState(false);

  const login = async (credentials: any) => {
  };

  const logout = () => {
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        login,
        logout,
        openLogin: () => setShowLogin(true),
        openRegister: () => setShowRegister(true),
      }}
    >
      {children}

      {/* Always render the modals but toggle visibility using "open" */}
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
