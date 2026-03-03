import pb, { clearAuth } from './pb';
import { User } from '../types';

export const login = async (identity: string, password: string): Promise<User> => {
  try {
    const auth = await pb.collection('users').authWithPassword(identity, password);
    return auth.record as unknown as User;
  } catch (e: any) {
    console.log('Login error full:', JSON.stringify(e?.response, null, 2));
    console.log('Login status:', e?.status);
    throw e;
  }
};

export const register = async (
  username: string,
  email: string,
  password: string
): Promise<void> => {
  try {
    await pb.collection('users').create({
      username,
      email,
      password,
      passwordConfirm: password,
      emailVisibility: true,
    });
  } catch (e: any) {
    console.log('Register error full:', JSON.stringify(e?.response, null, 2));
    throw e;
  }
};

export const requestOTP = async (email: string): Promise<string> => {
  const res = await pb.collection('users').requestOTP(email);
  return res.otpId;
};

export const verifyOTP = async (otpId: string, otp: string): Promise<User> => {
  const auth = await pb.collection('users').authWithOTP(otpId, otp);
  return auth.record as unknown as User;
};

export const logout = async (): Promise<void> => {
  await clearAuth();
};

export const getCurrentUser = (): User | null => {
  return pb.authStore.model as unknown as User | null;
};

export const isAuthenticated = (): boolean => {
  return pb.authStore.isValid;
};