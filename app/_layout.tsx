import { useEffect } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import { AuthProvider, useAuth } from '@src/context/AuthContext';
import { NavigationProvider } from '@src/context/Navigationcontext';
import { Colors } from '@src/constants/theme';
import { View } from 'react-native';

SplashScreen.preventAutoHideAsync();

const AUTH_ROUTES  = ['login', 'register'];
const PROTECTED    = ['dashboard'];

function NavigationGuard() {
  const { isLoggedIn, loading } = useAuth();
  const router   = useRouter();
  const segments = useSegments();

  useEffect(() => {
    if (loading) return;
    const current = segments[0] as string;

    if (!current || current === '' || current === 'index') {
      router.replace(isLoggedIn ? '/dashboard' : '/login');
      return;
    }
    if (!isLoggedIn && PROTECTED.includes(current)) {
      router.replace('/login');
      return;
    }
    if (isLoggedIn && AUTH_ROUTES.includes(current)) {
      router.replace('/dashboard');
      return;
    }
  }, [isLoggedIn, loading, segments]);

  return null;
}

function RootLayoutInner() {
  const { loading } = useAuth();
  useEffect(() => { if (!loading) SplashScreen.hideAsync(); }, [loading]);

  return (
    <>
      <StatusBar style="light" backgroundColor={Colors.background} />
      <NavigationGuard />
      <View style={{ flex: 1 }}>
        <Stack screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: Colors.background },
          animation: 'fade',
          gestureEnabled: false,
        }}>
          <Stack.Screen name="index"     />
          <Stack.Screen name="login"     />
          <Stack.Screen name="register"  />
          <Stack.Screen name="dashboard" />
        </Stack>
      </View>
    </>
  );
}

export default function RootLayout() {
  return (
    <NavigationProvider>
      <AuthProvider>
        <RootLayoutInner />
      </AuthProvider>
    </NavigationProvider>
  );
}