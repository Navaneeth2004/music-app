import React from 'react';
import {
  Modal, View, Image, Pressable, StyleSheet,
  StatusBar, Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface Props {
  uri: string | null;
  onClose: () => void;
}

export const ImageLightbox: React.FC<Props> = ({ uri, onClose }) => {
  const insets = useSafeAreaInsets();
  if (!uri) return null;
  return (
    <Modal
      visible={!!uri}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <StatusBar hidden />
      <View style={s.overlay}>
        <Pressable style={s.backdrop} onPress={onClose} />
        <Image
          source={{ uri }}
          style={s.image}
          resizeMode="contain"
        />
        <Pressable
          onPress={onClose}
          style={[s.closeBtn, { top: (insets.top || 16) + 8 }]}
          hitSlop={16}
        >
          <View style={s.closePill}>
            {/* '✕' as a View+Text so it never inherits black from emoji renderer */}
            <View style={s.closeX} />
            <View style={[s.closeX, { transform: [{ rotate: '90deg' }] }]} />
          </View>
        </Pressable>
      </View>
    </Modal>
  );
};

const s = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.95)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  image: {
    width: '100%',
    height: '85%',
  },
  closeBtn: {
    position: 'absolute',
    right: 16,
    zIndex: 10,
  },
  closePill: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Two bars forming an X — no text, no emoji, always white
  closeX: {
    position: 'absolute',
    width: 16,
    height: 2,
    borderRadius: 1,
    backgroundColor: '#fff',
    transform: [{ rotate: '45deg' }],
  },
});