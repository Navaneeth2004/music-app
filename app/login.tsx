import { useRouter } from 'expo-router';
import { LoginScreen } from '@src/screens/LoginScreen';
import { useAuth } from '@src/context/AuthContext';

export default function Login() {
  const { login, loading, error } = useAuth();
  const router = useRouter();

  const handleLogin = async (username: string, password: string) => {
    try {
      await login(username, password);
    } catch {
      // Error already set in AuthContext
    }
  };

  return (
    <LoginScreen
      onLogin={handleLogin}
      onGoToRegister={() => router.replace('/register')}
      onBack={() => router.replace('/')}
      loading={loading}
      error={error}
    />
  );
}
