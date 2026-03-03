import { useRouter } from 'expo-router';
import { RegisterScreen } from '@src/screens/RegisterScreen';
import { useAuth } from '@src/context/AuthContext';

export default function Register() {
  const { register, loading, error } = useAuth();
  const router = useRouter();

  const handleRegister = async (username: string, email: string, password: string) => {
    try {
      await register(username, email, password);
    } catch {
      // Error is already set in AuthContext, just prevent uncaught promise
    }
  };

  return (
    <RegisterScreen
      onRegister={handleRegister}
      onGoToLogin={() => router.replace('/login')}
      onBack={() => router.replace('/')}
      loading={loading}
      error={error}
    />
  );
}
