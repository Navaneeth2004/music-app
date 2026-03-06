import React from 'react';
import { View, Text, Modal, Pressable, StyleSheet, Platform } from 'react-native';
import { Colors, FontSize, Spacing, Radius } from '../../constants/theme';
import { PickedImage, pickImageFromWeb, pickImageNative } from '../../utils/pickImage';

interface ImagePickerModalProps {
  visible: boolean;
  onPicked: (img: PickedImage) => void;
  onCancel: () => void;
}

export const ImagePickerModal: React.FC<ImagePickerModalProps> = ({ visible, onPicked, onCancel }) => {
  const pick = async (source: 'camera' | 'library') => {
    onCancel(); // close modal first so native picker can open
    // Small delay to let modal fully close before native UI opens
    await new Promise(r => setTimeout(r, 150));
    let result: PickedImage | null = null;
    if (Platform.OS === 'web') {
      result = await pickImageFromWeb(source === 'camera');
    } else {
      result = await pickImageNative(source === 'camera');
    }
    if (result) onPicked(result);
  };

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={s.overlay}>
        <View style={s.box}>
          <View style={s.iconCircle}>
            <Text style={s.icon}>🖼</Text>
          </View>
          <Text style={s.title}>Add Image</Text>
          <Text style={s.subtitle}>Choose a source</Text>

          <Pressable onPress={() => pick('camera')} style={s.optionBtn}>
            <Text style={s.optionIcon}>📷</Text>
            <Text style={s.optionText}>Camera</Text>
          </Pressable>

          <Pressable onPress={() => pick('library')} style={s.optionBtn}>
            <Text style={s.optionIcon}>🖼</Text>
            <Text style={s.optionText}>Photo Library</Text>
          </Pressable>

          <Pressable onPress={onCancel} style={s.cancelBtn}>
            <Text style={s.cancelText}>Cancel</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
};

const s = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.lg,
  },
  box: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.xl,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.xl,
    width: '100%',
    maxWidth: 360,
    alignItems: 'center',
    gap: Spacing.sm,
  },
  iconCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: Colors.accent + '22',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.xs,
  },
  icon: { fontSize: 26 },
  title: { fontSize: FontSize.lg, fontWeight: '800', color: Colors.textPrimary },
  subtitle: { fontSize: FontSize.sm, color: Colors.textSecondary, marginBottom: Spacing.sm },
  optionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    width: '100%',
    backgroundColor: Colors.surfaceAlt,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.md,
  },
  optionIcon: { fontSize: 22 },
  optionText: { fontSize: FontSize.md, fontWeight: '600', color: Colors.textPrimary },
  cancelBtn: {
    marginTop: Spacing.xs,
    width: '100%',
    padding: Spacing.md,
    borderRadius: Radius.md,
    alignItems: 'center',
  },
  cancelText: { color: Colors.textSecondary, fontWeight: '600', fontSize: FontSize.md },
});