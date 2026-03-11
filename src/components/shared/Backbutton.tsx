import React, { useState } from 'react';
import { Pressable, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { Colors, FontSize, Spacing } from '../../constants/theme';

interface BackButtonProps {
  onPress:  () => void;
  label?:   string;
  color?:   string;
  /** If true, renders a ✕ Cancel style (no spinner, instant) */
  isCancel?: boolean;
}

export const BackButton: React.FC<BackButtonProps> = ({
  onPress,
  label = 'Back',
  color,
  isCancel = false,
}) => {
  const [loading, setLoading] = useState(false);
  const textColor = color ?? Colors.accentLight;

  const handlePress = async () => {
    if (loading) return;
    if (isCancel) { onPress(); return; }
    setLoading(true);
    await new Promise(r => setTimeout(r, 300));
    onPress();
    // note: component may unmount before this runs — that's fine
    setLoading(false);
  };

  return (
    <Pressable onPress={handlePress} disabled={loading} style={s.btn}>
      {loading
        ? <ActivityIndicator size="small" color={textColor} />
        : <Text style={[s.text, { color: textColor }]}>← {label}</Text>
      }
    </Pressable>
  );
};

const s = StyleSheet.create({
  btn:  { paddingVertical: Spacing.sm, minWidth: 80 },
  text: { fontSize: FontSize.md, fontWeight: '500' },
});