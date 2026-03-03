import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { login, logout, register, requestOTP, verifyOTP, getCurrentUser, isAuthenticated } from '../api/auth';
import { loadAuth } from '../api/pb';
import { User } from '../types';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  error: string | null;
  isLoggedIn: boolean;
  otpId: string | null;
  otpEmail: string | null;
  pendingVerificationEmail: string | null;
  login: (username: string, password: string) => Promise<void>;
  register: (username: string, email: string, password: string) => Promise<void>;
  requestOTP: (email: string) => Promise<void>;
  verifyOTP: (otp: string) => Promise<void>;
  logout: () => Promise<void>;
  clearError: () => void;
  clearPendingVerification: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

// Parses PocketBase field-level errors into a human readable message
const parsePBError = (e: any): string => {
  const data = e?.response?.data;
  if (data) {
    if (data.email?.message) {
      const msg = data.email.message.toLowerCase();
      if (msg.includes('unique')) return 'This email is already registered.';
      return `Email: ${data.email.message}`;
    }
    if (data.username?.message) {
      const msg = data.username.message.toLowerCase();
      if (msg.includes('unique')) return 'This username is already taken.';
      if (msg.includes('min')) return 'Username must be at least 3 characters.';
      return `Username: ${data.username.message}`;
    }
    if (data.password?.message) {
      return `Password: ${data.password.message}`;
    }
  }
  if (e?.message === 'EMAIL_NOT_VERIFIED') return 'Please verify your email before logging in.';
  if (e?.status === 400) return 'Invalid details. Please check and try again.';
  if (e?.status === 403) return 'Action not allowed. Check PocketBase API rules.';
  if (e?.status === 404) return 'Service not found. Is PocketBase running?';
  return e?.message || 'Something went wrong. Please try again.';
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [otpId, setOtpId] = useState<string | null>(null);
  const [otpEmail, setOtpEmail] = useState<string | null>(null);
  const [pendingVerificationEmail, setPendingVerificationEmail] = useState<string | null>(null);

  useEffect(() => {
    const init = async () => {
      await loadAuth();
      if (isAuthenticated()) setUser(getCurrentUser());
      setLoading(false);
    };
    init();
  }, []);

  const handleLogin = useCallback(async (username: string, password: string) => {
    setError(null);
    setLoading(true);
    try {
      const u = await login(username, password);
      setUser(u);
    } catch (e: any) {
      setError(parsePBError(e));
      throw e;
    } finally {
      setLoading(false);
    }
  }, []);

  const handleRegister = useCallback(async (username: string, email: string, password: string) => {
    setError(null);
    setLoading(true);
    try {
      await register(username, email, password);
      const id = await requestOTP(email);
      setOtpId(id);
      setOtpEmail(email);
      setPendingVerificationEmail(email);
    } catch (e: any) {
      setError(parsePBError(e));
      throw e;
    } finally {
      setLoading(false);
    }
  }, []);

  const handleRequestOTP = useCallback(async (email: string) => {
    setError(null);
    setLoading(true);
    try {
      const id = await requestOTP(email);
      setOtpId(id);
      setOtpEmail(email);
    } catch (e: any) {
      setError('Failed to send OTP. Check the email address.');
      throw e;
    } finally {
      setLoading(false);
    }
  }, []);

  const handleVerifyOTP = useCallback(async (otp: string) => {
    if (!otpId) return;
    setError(null);
    setLoading(true);
    try {
      const u = await verifyOTP(otpId, otp);
      setUser(u);
      setOtpId(null);
      setOtpEmail(null);
      setPendingVerificationEmail(null);
    } catch (e: any) {
      setError('Invalid or expired OTP. Try again.');
      throw e;
    } finally {
      setLoading(false);
    }
  }, [otpId]);

  const handleLogout = useCallback(async () => {
    await logout();
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{
      user, loading, error, isLoggedIn: !!user,
      otpId, otpEmail, pendingVerificationEmail,
      login: handleLogin,
      register: handleRegister,
      requestOTP: handleRequestOTP,
      verifyOTP: handleVerifyOTP,
      logout: handleLogout,
      clearError: () => setError(null),
      clearPendingVerification: () => {
        setPendingVerificationEmail(null);
        setOtpId(null);
        setOtpEmail(null);
      },
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
