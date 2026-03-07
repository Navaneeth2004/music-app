import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Crypto from 'expo-crypto';
import { dbCreateUser, dbGetUserByUsername, setCurrentUserId } from './db';
import { User } from '../types';

const SESSION_KEY = 'local_auth_user';

async function hashPassword(password: string): Promise<string> {
  return Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, password);
}

export const register = async (username: string, password: string): Promise<void> => {
  if (!username.trim())        throw new Error('Username is required.');
  if (username.trim().length < 3) throw new Error('Username must be at least 3 characters.');
  if (password.length < 8)    throw new Error('Password must be at least 8 characters.');
  const hash = await hashPassword(password);
  await dbCreateUser(username.trim(), hash);
};

export const login = async (username: string, password: string): Promise<User> => {
  const row = await dbGetUserByUsername(username.trim());
  if (!row) throw new Error('WRONG_CREDENTIALS');
  const hash = await hashPassword(password);
  if (hash !== row.password_hash) throw new Error('WRONG_CREDENTIALS');
  const user: User = { id: row.id, username: row.username, email: '', created: row.created, updated: row.created };
  await AsyncStorage.setItem(SESSION_KEY, JSON.stringify(user));
  setCurrentUserId(user.id);   // ← scope all content queries to this user
  return user;
};

export const logout = async (): Promise<void> => {
  await AsyncStorage.removeItem(SESSION_KEY);
  setCurrentUserId('');
};

export const loadSession = async (): Promise<User | null> => {
  try {
    const raw = await AsyncStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const user: User = JSON.parse(raw);
    setCurrentUserId(user.id);  // ← restore scope on app restart
    return user;
  } catch { return null; }
};