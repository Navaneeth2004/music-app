import { useRouter } from 'expo-router';
import { LoginScreen } from '@src/screens/LoginScreen';
import { useAuth } from '@src/context/AuthContext';

export default function Login() {
  const { login, loading, error, clearError } = useAuth();
  const router = useRouter();

  const handleLogin = async (username: string, password: string) => {
    clearError();
    try { await login(username, password); } catch {}
  };

  return (
    <LoginScreen
      onLogin={handleLogin}
      onGoToRegister={() => router.replace('/register')}
      loading={loading}
      error={error}
    />
  );
}
