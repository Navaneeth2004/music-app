import { useRouter } from 'expo-router';
import { RegisterScreen } from '@src/screens/RegisterScreen';
import { useAuth } from '@src/context/AuthContext';

export default function Register() {
  const { register, loading, error, clearError } = useAuth();
  const router = useRouter();

  const handleRegister = async (username: string, password: string) => {
    clearError();
    try { await register(username, password); } catch {}
  };

  return (
    <RegisterScreen
      onRegister={handleRegister}
      onGoToLogin={() => router.replace('/login')}
      loading={loading}
      error={error}
    />
  );
}
