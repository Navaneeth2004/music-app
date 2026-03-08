import React, { useRef } from 'react';
import { Modal, View, Pressable, StyleSheet, StatusBar, Animated } from 'react-native';
import { GestureHandlerRootView, PinchGestureHandler, State } from 'react-native-gesture-handler';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface Props { uri: string | null; onClose: () => void; }

export const ImageLightbox: React.FC<Props> = ({ uri, onClose }) => {
  const insets     = useSafeAreaInsets();
  const scale      = useRef(new Animated.Value(1)).current;
  const committed  = useRef(1);   // scale locked in after each gesture ends
  const gestureActive = useRef(false);

  const onGestureEvent = ({ nativeEvent: e }: any) => {
    if (e.state !== State.ACTIVE) return;
    gestureActive.current = true;
    const next = Math.min(6, Math.max(0.5, committed.current * e.scale));
    scale.setValue(next);
  };

  const onHandlerStateChange = ({ nativeEvent: e }: any) => {
    if (e.oldState === State.ACTIVE) {
      // Gesture just ended — commit whatever scale we landed on
      committed.current = Math.min(6, Math.max(0.5, committed.current * e.scale));
      scale.setValue(committed.current);
      gestureActive.current = false;
    }
  };

  const handleClose = () => {
    committed.current = 1;
    scale.setValue(1);
    onClose();
  };

  if (!uri) return null;

  return (
    <Modal visible transparent animationType="fade" statusBarTranslucent onRequestClose={handleClose}>
      <StatusBar hidden />
      <GestureHandlerRootView style={{ flex: 1 }}>
        <View style={s.overlay}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => { if (!gestureActive.current) handleClose(); }} />
          <PinchGestureHandler onGestureEvent={onGestureEvent} onHandlerStateChange={onHandlerStateChange}>
            <Animated.Image
              source={{ uri }}
              style={[s.image, { transform: [{ scale }] }]}
              resizeMode="contain"
            />
          </PinchGestureHandler>
          <Pressable onPress={handleClose} style={[s.closeBtn, { top: (insets.top || 16) + 8 }]} hitSlop={16}>
            <View style={s.closePill}>
              <View style={s.closeX} />
              <View style={[s.closeX, { transform: [{ rotate: '90deg' }] }]} />
            </View>
          </Pressable>
          <View style={[s.hintWrap, { bottom: (insets.bottom || 16) + 12 }]}>
            <View style={s.hintPill}>
              <View style={s.hintDot} /><View style={s.hintDot} />
              <View style={[s.hintDot, { marginLeft: 4 }]} /><View style={s.hintDot} />
            </View>
          </View>
        </View>
      </GestureHandlerRootView>
    </Modal>
  );
};

const s = StyleSheet.create({
  overlay:   { flex: 1, backgroundColor: 'rgba(0,0,0,0.95)', justifyContent: 'center', alignItems: 'center' },
  image:     { width: '100%', height: '85%' },
  closeBtn:  { position: 'absolute', right: 16, zIndex: 10 },
  closePill: { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.15)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)', alignItems: 'center', justifyContent: 'center' },
  closeX:    { position: 'absolute', width: 16, height: 2, borderRadius: 1, backgroundColor: '#fff', transform: [{ rotate: '45deg' }] },
  hintWrap:  { position: 'absolute', alignSelf: 'center', zIndex: 5 },
  hintPill:  { flexDirection: 'row', gap: 3, backgroundColor: 'rgba(255,255,255,0.12)', borderRadius: 12, paddingHorizontal: 10, paddingVertical: 5, alignItems: 'center' },
  hintDot:   { width: 5, height: 5, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.45)' },
});