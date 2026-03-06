import React from 'react';
import { View, Text, Modal, Pressable, StyleSheet } from 'react-native';
import { Colors, FontSize, Spacing, Radius } from '../../constants/theme';

interface ConfirmModalProps {
  visible: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({
  visible, title, message, confirmLabel = 'Delete',
  cancelLabel = 'Cancel', destructive = true, onConfirm, onCancel,
}) => (
  <Modal visible={visible} transparent animationType="fade">
    <View style={s.overlay}>
      <View style={s.box}>
        <View style={[s.iconCircle, { backgroundColor: destructive ? Colors.error + '22' : Colors.accent + '22' }]}>
          <Text style={s.icon}>{destructive ? '🗑' : '⚠️'}</Text>
        </View>
        <Text style={s.title}>{title}</Text>
        <Text style={s.message}>{message}</Text>
        <View style={s.actions}>
          <Pressable onPress={onCancel} style={s.cancelBtn}>
            <Text style={s.cancelText}>{cancelLabel}</Text>
          </Pressable>
          <Pressable onPress={onConfirm} style={[s.confirmBtn, { backgroundColor: destructive ? Colors.error : Colors.accent }]}>
            <Text style={s.confirmText}>{confirmLabel}</Text>
          </Pressable>
        </View>
      </View>
    </View>
  </Modal>
);

const s = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.75)', justifyContent: 'center', alignItems: 'center', padding: Spacing.lg },
  box: { backgroundColor: Colors.surface, borderRadius: Radius.xl, borderWidth: 1, borderColor: Colors.border, padding: Spacing.xl, width: '100%', maxWidth: 360, alignItems: 'center', gap: Spacing.sm },
  iconCircle: { width: 60, height: 60, borderRadius: 30, alignItems: 'center', justifyContent: 'center', marginBottom: Spacing.xs },
  icon: { fontSize: 26 },
  title: { fontSize: FontSize.lg, fontWeight: '800', color: Colors.textPrimary, textAlign: 'center' },
  message: { fontSize: FontSize.md, color: Colors.textSecondary, textAlign: 'center', lineHeight: 22 },
  actions: { flexDirection: 'row', gap: Spacing.sm, marginTop: Spacing.sm, width: '100%' },
  cancelBtn: { flex: 1, padding: Spacing.md, borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.border, alignItems: 'center' },
  cancelText: { color: Colors.textSecondary, fontWeight: '600', fontSize: FontSize.md },
  confirmBtn: { flex: 1, padding: Spacing.md, borderRadius: Radius.md, alignItems: 'center' },
  confirmText: { color: Colors.textPrimary, fontWeight: '700', fontSize: FontSize.md },
});
