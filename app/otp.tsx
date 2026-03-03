import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { OTPScreen } from '@src/screens/OTPScreen';
import { useAuth } from '@src/context/AuthContext';
import { Colors } from '@src/constants/theme';

export default function OTP() {
  const { otpEmail, verifyOTP, requestOTP, loading, error, clearError } = useAuth();
  const router = useRouter();

  if (!otpEmail) {
    return (
      <View style={styles.loader}>
        <ActivityIndicator color={Colors.accent} />
      </View>
    );
  }

  const handleVerify = async (otp: string) => {
    try {
      await verifyOTP(otp);
    } catch {
      // Error already set in AuthContext
    }
  };

  const handleResend = async () => {
    try {
      await requestOTP(otpEmail);
    } catch {
      // Error already set in AuthContext
    }
  };

  return (
    <OTPScreen
      email={otpEmail}
      onVerify={handleVerify}
      onResend={handleResend}
      onBack={() => {
        clearError();
        router.replace('/');
      }}
      loading={loading}
      error={error}
    />
  );
}

const styles = StyleSheet.create({
  loader: {
    flex: 1,
    backgroundColor: Colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
