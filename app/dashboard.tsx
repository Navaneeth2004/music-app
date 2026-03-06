import { useEffect } from 'react';
import { useRouter } from 'expo-router';
import { DashboardScreen } from '@src/screens/DashboardScreen';
import { useAuth } from '@src/context/AuthContext';

export default function Dashboard() {
  const { user, logout, isLoggedIn } = useAuth();
  const router = useRouter();

  const handleLogout = async () => {
    await logout();
    // Replace entire history so back button can't return to dashboard
    router.replace('/login');
  };

  if (!isLoggedIn || !user) return null;

  return <DashboardScreen user={user} onLogout={handleLogout} />;
}
