import React from 'react';
import { View, Text, Modal, Pressable, StyleSheet } from 'react-native';
import { Colors, FontSize, Spacing, Radius } from '../../constants/theme';

interface Props {
  visible: boolean;
  onChooseImage: () => void;
  onChooseAudio: () => void;
  onCancel: () => void;
}

export const MediaChooserModal: React.FC<Props> = ({ visible, onChooseImage, onChooseAudio, onCancel }) => (
  <Modal visible={visible} transparent animationType="none">
    <Pressable style={s.overlay} onPress={onCancel}>
      <View style={s.sheet}>
        <Text style={s.title}>Add media</Text>

        <Pressable style={s.option} onPress={onChooseImage}>
          <View style={[s.iconBox, { backgroundColor: Colors.accent + '33' }]}>
            <Text style={s.iconText}>🖼</Text>
          </View>
          <View style={s.optBody}>
            <Text style={s.optLabel}>Image</Text>
            <Text style={s.optHint}>Camera or photo library</Text>
          </View>
          <Text style={s.chevron}>›</Text>
        </Pressable>

        <Pressable style={s.option} onPress={onChooseAudio}>
          <View style={[s.iconBox, { backgroundColor: Colors.warning + '33' }]}>
            {/* Use text instead of emoji so we can control color reliably */}
            <Text style={[s.iconText, { color: Colors.warning }]}>♪</Text>
          </View>
          <View style={s.optBody}>
            <Text style={s.optLabel}>Audio</Text>
            <Text style={s.optHint}>Pick an audio file from device</Text>
          </View>
          <Text style={s.chevron}>›</Text>
        </Pressable>

        <Pressable style={s.cancelBtn} onPress={onCancel}>
          <Text style={s.cancelText}>Cancel</Text>
        </Pressable>
      </View>
    </Pressable>
  </Modal>
);

const s = StyleSheet.create({
  overlay:   { flex: 1, backgroundColor: 'rgba(0,0,0,0.65)', justifyContent: 'center', padding: Spacing.lg },
  sheet:     { backgroundColor: Colors.surface, borderRadius: Radius.xl, borderWidth: 1, borderColor: Colors.border, padding: Spacing.lg, gap: Spacing.sm },
  title:     { fontSize: FontSize.md, fontWeight: '700', color: Colors.textPrimary, textAlign: 'center', marginBottom: Spacing.xs },
  option:    { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, padding: Spacing.md, borderRadius: Radius.md, backgroundColor: Colors.surfaceAlt, borderWidth: 1, borderColor: Colors.border },
  iconBox:   { width: 42, height: 42, borderRadius: Radius.md, alignItems: 'center', justifyContent: 'center' },
  iconText:  { fontSize: 22 },
  optBody:   { flex: 1 },
  optLabel:  { fontSize: FontSize.md, fontWeight: '600', color: Colors.textPrimary },
  optHint:   { fontSize: FontSize.xs, color: Colors.textMuted, marginTop: 2 },
  chevron:   { color: Colors.textMuted, fontSize: FontSize.lg },
  cancelBtn: { marginTop: Spacing.xs, padding: Spacing.md, alignItems: 'center' },
  cancelText:{ color: Colors.textMuted, fontSize: FontSize.md },
});