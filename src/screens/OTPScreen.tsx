import React, { useState, useRef } from 'react';
import { View, Text, StyleSheet, TextInput, Pressable } from 'react-native';
import { Screen } from '../components/layout/Screen';
import { Button, Card, Heading, BodyText, Caption } from '../components/ui';
import { Colors, FontSize, Spacing, Radius } from '../constants/theme';

interface OTPScreenProps {
  email: string;
  onVerify: (otp: string) => Promise<void>;
  onResend: () => Promise<void>;
  onBack: () => void;
  loading: boolean;
  error: string | null;
}

export const OTPScreen: React.FC<OTPScreenProps> = ({
  email,
  onVerify,
  onResend,
  onBack,
  loading,
  error,
}) => {
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [resent, setResent] = useState(false);
  const inputs = useRef<(TextInput | null)[]>([]);

  const handleChange = (val: string, idx: number) => {
    if (!/^\d*$/.test(val)) return;
    const newOtp = [...otp];
    newOtp[idx] = val.slice(-1);
    setOtp(newOtp);
    if (val && idx < 5) inputs.current[idx + 1]?.focus();
  };

  const handleKeyPress = (e: any, idx: number) => {
    if (e.nativeEvent.key === 'Backspace' && !otp[idx] && idx > 0) {
      inputs.current[idx - 1]?.focus();
    }
  };

  const handleResend = async () => {
    await onResend();
    setResent(true);
    setOtp(['', '', '', '', '', '']);
    inputs.current[0]?.focus();
    setTimeout(() => setResent(false), 5000);
  };

  const otpValue = otp.join('');
  const isComplete = otpValue.length === 6;

  return (
    <Screen scrollable>
      <Pressable onPress={onBack} style={styles.backBtn}>
        <Text style={styles.backText}>← Back</Text>
      </Pressable>

      <View style={styles.container}>
        <View style={styles.header}>
          <View style={styles.iconWrapper}>
            <Text style={styles.icon}>🔐</Text>
          </View>
          <Heading style={styles.title}>Enter OTP</Heading>
          <BodyText style={styles.subtitle}>We sent a 6-digit code to</BodyText>
          <Text style={styles.email}>{email}</Text>
        </View>

        <Card>
          {error && (
            <View style={styles.errorBanner}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          {/* OTP boxes */}
          <View style={styles.otpRow}>
            {otp.map((digit, idx) => (
              <TextInput
                key={idx}
                ref={r => { inputs.current[idx] = r; }}
                value={digit}
                onChangeText={val => handleChange(val, idx)}
                onKeyPress={e => handleKeyPress(e, idx)}
                keyboardType="number-pad"
                maxLength={1}
                selectTextOnFocus
                style={[
                  styles.otpBox,
                  digit ? styles.otpBoxFilled : null,
                ]}
              />
            ))}
          </View>

          <View style={styles.gap} />

          <Button
            label="Verify"
            onPress={() => onVerify(otpValue)}
            loading={loading}
            disabled={!isComplete}
          />

          <View style={styles.gap} />

          <Button
            label={resent ? '✓ Code resent!' : 'Resend code'}
            onPress={handleResend}
            variant="secondary"
            disabled={resent || loading}
          />
        </Card>

        <Caption style={styles.hint}>
          Check your spam folder if you don't see it.
        </Caption>
      </View>
    </Screen>
  );
};

const styles = StyleSheet.create({
  backBtn: {
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.md,
    paddingHorizontal: Spacing.xs,
  },
  backText: {
    color: Colors.accentLight,
    fontSize: FontSize.md,
  },
  container: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.xl,
    gap: Spacing.lg,
  },
  header: {
    alignItems: 'center',
  },
  iconWrapper: {
    width: 88,
    height: 88,
    borderRadius: 28,
    backgroundColor: Colors.surfaceAlt,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.lg,
  },
  icon: {
    fontSize: 40,
  },
  title: {
    marginBottom: Spacing.sm,
  },
  subtitle: {
    textAlign: 'center',
  },
  email: {
    color: Colors.accentLight,
    fontSize: FontSize.md,
    fontWeight: '600',
    marginTop: Spacing.xs,
  },
  otpRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: Spacing.xs,
    marginVertical: Spacing.md,
    paddingHorizontal: Spacing.xs,
  },
  otpBox: {
    width: 40,
    height: 50,
    borderRadius: Radius.md,
    borderWidth: 1.5,
    borderColor: Colors.border,
    backgroundColor: Colors.surfaceAlt,
    color: Colors.textPrimary,
    fontSize: FontSize.xl,
    fontWeight: '700',
    textAlign: 'center',
  },
  otpBoxFilled: {
    borderColor: Colors.accent,
  },
  errorBanner: {
    backgroundColor: `${Colors.error}22`,
    borderRadius: 8,
    padding: Spacing.md,
    marginBottom: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.error,
  },
  errorText: {
    color: Colors.error,
    fontSize: FontSize.sm,
  },
  gap: {
    height: Spacing.sm,
  },
  hint: {
    textAlign: 'center',
  },
});
