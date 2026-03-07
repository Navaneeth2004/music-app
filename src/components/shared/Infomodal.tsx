/**
 * InfoModal
 *
 * A simple one-button modal for showing errors, warnings, or info messages.
 * Use instead of Alert.alert so it matches the app's visual style.
 *
 * Usage:
 *   const [infoModal, setInfoModal] = useState<{ title: string; message: string } | null>(null);
 *
 *   setInfoModal({ title: 'Import failed', message: 'This is a chapter file, not a book.' });
 *
 *   <InfoModal info={infoModal} onClose={() => setInfoModal(null)} />
 */

import React from 'react';
import { View, Text, Modal, Pressable, StyleSheet } from 'react-native';
import { Colors, FontSize, Spacing, Radius } from '../../constants/theme';

export interface InfoModalData {
  title:   string;
  message: string;
  /** Defaults to ⚠️ for errors, or pass a custom emoji */
  icon?:   string;
}

interface Props {
  info:    InfoModalData | null;
  onClose: () => void;
  /** Label for the dismiss button. Default: 'OK' */
  okLabel?: string;
}

export const InfoModal: React.FC<Props> = ({ info, onClose, okLabel = 'OK' }) => (
  <Modal visible={!!info} transparent animationType="fade" onRequestClose={onClose}>
    <View style={s.overlay}>
      <View style={s.box}>
        <View style={s.iconCircle}>
          <Text style={s.icon}>{info?.icon ?? '⚠️'}</Text>
        </View>
        <Text style={s.title}>{info?.title}</Text>
        <Text style={s.message}>{info?.message}</Text>
        <Pressable onPress={onClose} style={s.okBtn}>
          <Text style={s.okText}>{okLabel}</Text>
        </Pressable>
      </View>
    </View>
  </Modal>
);

const s = StyleSheet.create({
  overlay:    { flex: 1, backgroundColor: 'rgba(0,0,0,0.75)', justifyContent: 'center', alignItems: 'center', padding: Spacing.lg },
  box:        { backgroundColor: Colors.surface, borderRadius: Radius.xl, borderWidth: 1, borderColor: Colors.border, padding: Spacing.xl, width: '100%', maxWidth: 360, alignItems: 'center', gap: Spacing.sm },
  iconCircle: { width: 60, height: 60, borderRadius: 30, backgroundColor: Colors.error + '22', alignItems: 'center', justifyContent: 'center', marginBottom: Spacing.xs },
  icon:       { fontSize: 26 },
  title:      { fontSize: FontSize.lg, fontWeight: '800', color: Colors.textPrimary, textAlign: 'center' },
  message:    { fontSize: FontSize.md, color: Colors.textSecondary, textAlign: 'center', lineHeight: 22 },
  okBtn:      { marginTop: Spacing.sm, width: '100%', padding: Spacing.md, borderRadius: Radius.md, backgroundColor: Colors.accent, alignItems: 'center' },
  okText:     { color: Colors.textPrimary, fontWeight: '700', fontSize: FontSize.md },
});