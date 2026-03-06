import { useEffect } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import { AuthProvider, useAuth } from '@src/context/AuthContext';
import { Colors } from '@src/constants/theme';
import { View } from 'react-native';

SplashScreen.preventAutoHideAsync();

// Protected routes — must be logged in
const PROTECTED = ['dashboard'];
// Auth routes — must NOT be logged in
const AUTH_ROUTES = ['login', 'register', 'otp'];

function NavigationGuard() {
  const { isLoggedIn, loading, otpId } = useAuth();
  const router = useRouter();
  const segments = useSegments();

  useEffect(() => {
    if (loading) return;
    const current = segments[0] as string;

    // OTP flow
    if (otpId && current !== 'otp') { router.replace('/otp'); return; }

    // Index screen (initial load) — route based on auth state
    if (current === 'index' || current === undefined || current === '') {
      router.replace(isLoggedIn ? '/dashboard' : '/login');
      return;
    }

    // Not logged in trying to access protected route → login
    if (!isLoggedIn && !otpId && PROTECTED.includes(current)) {
      router.replace('/login');
      return;
    }

    // Logged in on auth route → dashboard
    if (isLoggedIn && AUTH_ROUTES.includes(current)) {
      router.replace('/dashboard');
      return;
    }
  }, [isLoggedIn, loading, otpId, segments]);

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
          // Disable back gesture on auth screens so logged-out users can't swipe back to dashboard
          gestureEnabled: false,
        }}>
          <Stack.Screen name="index" />
          <Stack.Screen name="login" />
          <Stack.Screen name="register" />
          <Stack.Screen name="otp" />
          <Stack.Screen name="dashboard" />
        </Stack>
      </View>
    </>
  );
}

export default function RootLayout() {
  return (
    <AuthProvider>
      <RootLayoutInner />
    </AuthProvider>
  );
}
