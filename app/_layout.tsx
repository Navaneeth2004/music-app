import { useEffect } from 'react';
import { View } from 'react-native';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import { AuthProvider, useAuth } from '@src/context/AuthContext';
import { Colors } from '@src/constants/theme';

SplashScreen.preventAutoHideAsync();

function NavigationGuard() {
  const { isLoggedIn, loading, otpId } = useAuth();
  const router = useRouter();
  const segments = useSegments();

  useEffect(() => {
    if (loading) return;
    const current = segments[0] as string;

    if (otpId && current !== 'otp') {
      router.replace('/otp');
      return;
    }
    if (isLoggedIn && ['login', 'register', 'otp', 'index', undefined].includes(current)) {
      router.replace('/dashboard');
      return;
    }
    if (!isLoggedIn && !otpId && current === 'dashboard') {
      router.replace('/');
    }
  }, [isLoggedIn, loading, otpId, segments]);

  return null;
}

function RootLayoutInner() {
  const { loading } = useAuth();

  useEffect(() => {
    if (!loading) SplashScreen.hideAsync();
  }, [loading]);

  return (
    <>
      <StatusBar style="light" backgroundColor={Colors.background} />
      <NavigationGuard />
      <View style={{ flex: 1 }}>
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: Colors.background },
            animation: 'fade',
          }}
        >
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
