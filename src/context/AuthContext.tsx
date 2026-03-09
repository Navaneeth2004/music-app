/**
 * src/context/AuthContext.tsx
 * Fully local auth — no PocketBase dependency at all.
 */
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { login, register, logout, loadSession } from '../api/auth';
import { User } from '../types';

interface AuthContextType {
  user:        User | null;
  loading:     boolean;
  error:       string | null;
  isLoggedIn:  boolean;
  isAdmin:     boolean;
  login:       (username: string, password: string) => Promise<void>;
  register:    (username: string, password: string) => Promise<void>;
  logout:      () => Promise<void>;
  clearError:  () => void;
  /** Re-authenticate with own password to switch to admin mode. Returns true on success. */
  unlockAdmin: (password: string) => Promise<boolean>;
  lockAdmin:   () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

const friendlyError = (e: any): string => {
  const msg = e?.message ?? '';
  if (msg === 'WRONG_CREDENTIALS')  return 'Incorrect username or password.';
  if (msg === 'USERNAME_TAKEN')     return 'That username is already taken.';
  if (msg.includes('at least 3'))   return msg;
  if (msg.includes('at least 8'))   return msg;
  if (msg.includes('required'))     return msg;
  return 'Something went wrong. Please try again.';
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user,          setUser]          = useState<User | null>(null);
  const [loading,       setLoading]       = useState(true);
  const [error,         setError]         = useState<string | null>(null);
  const [adminUnlocked, setAdminUnlocked] = useState(false);

  // Admin mode is only active when explicitly unlocked via Settings → Switch to Admin Mode.
  const isAdmin = adminUnlocked;

  // Restore session on app start
  useEffect(() => {
    loadSession().then(u => { setUser(u); setLoading(false); });
  }, []);

  const handleLogin = useCallback(async (username: string, password: string) => {
    setError(null); setLoading(true);
    try {
      const u = await login(username, password);
      setUser(u); setAdminUnlocked(false);
    } catch (e: any) {
      setError(friendlyError(e)); throw e;
    } finally { setLoading(false); }
  }, []);

  const handleRegister = useCallback(async (username: string, password: string) => {
    setError(null); setLoading(true);
    try {
      await register(username, password);
      // Auto-login after registration
      const u = await login(username, password);
      setUser(u);
    } catch (e: any) {
      setError(friendlyError(e)); throw e;
    } finally { setLoading(false); }
  }, []);

  const handleLogout = useCallback(async () => {
    await logout(); setUser(null); setAdminUnlocked(false);
  }, []);

  const unlockAdmin = useCallback(async (password: string): Promise<boolean> => {
    if (!user) return false;
    try {
      await login(user.username, password); // re-auth to verify password
      setAdminUnlocked(true); return true;
    } catch { return false; }
  }, [user]);

  const lockAdmin = useCallback(() => setAdminUnlocked(false), []);

  return (
    <AuthContext.Provider value={{
      user, loading, error, isLoggedIn: !!user, isAdmin,
      login:      handleLogin,
      register:   handleRegister,
      logout:     handleLogout,
      clearError: () => setError(null),
      unlockAdmin,
      lockAdmin,
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};