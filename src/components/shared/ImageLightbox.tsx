import React, { useRef } from 'react';
import { Modal, View, Pressable, StyleSheet, StatusBar, Dimensions } from 'react-native';
import { GestureHandlerRootView, PinchGestureHandler, PanGestureHandler, State } from 'react-native-gesture-handler';
import Animated, { useSharedValue, useAnimatedStyle, withSpring } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { width: SW, height: SH } = Dimensions.get('window');

interface Props { uri: string | null; onClose: () => void; }

export const ImageLightbox: React.FC<Props> = ({ uri, onClose }) => {
  const insets = useSafeAreaInsets();

  // All state in plain refs — no Animated.Value, no shared values in callbacks
  const scaleVal   = useSharedValue(1);
  const txVal      = useSharedValue(0);
  const tyVal      = useSharedValue(0);

  const savedScale = useRef(1);
  const savedTx    = useRef(0);
  const savedTy    = useRef(0);
  const gestureActive = useRef(false);

  const pinchRef = useRef<PinchGestureHandler>(null);
  const panRef   = useRef<PanGestureHandler>(null);

  const clamp = (v: number, sc: number, dim: number) => {
    const max = Math.max(0, (dim * (sc - 1)) / 2);
    return Math.min(max, Math.max(-max, v));
  };

  // ─── Pinch ────────────────────────────────────────────────────
  const onPinchEvent = ({ nativeEvent: e }: any) => {
    if (e.state !== State.ACTIVE) return;
    gestureActive.current = true;
    const next = Math.min(6, Math.max(1, savedScale.current * e.scale));
    scaleVal.value = next;
  };

  const onPinchState = ({ nativeEvent: e }: any) => {
    if (e.oldState !== State.ACTIVE) return;
    gestureActive.current = false;
    const next = Math.min(6, Math.max(1, savedScale.current * e.scale));
    savedScale.current = next;
    scaleVal.value = next;
    if (next <= 1) {
      savedTx.current = 0;
      savedTy.current = 0;
      txVal.value = withSpring(0);
      tyVal.value = withSpring(0);
    }
  };

  // ─── Pan ─────────────────────────────────────────────────────
  const onPanEvent = ({ nativeEvent: e }: any) => {
    if (e.state !== State.ACTIVE) return;
    if (savedScale.current <= 1) return;
    gestureActive.current = true;
    txVal.value = clamp(savedTx.current + e.translationX, savedScale.current, SW);
    tyVal.value = clamp(savedTy.current + e.translationY, savedScale.current, SH);
  };

  const onPanState = ({ nativeEvent: e }: any) => {
    if (e.oldState !== State.ACTIVE) return;
    gestureActive.current = false;
    if (savedScale.current <= 1) return;
    savedTx.current = clamp(savedTx.current + e.translationX, savedScale.current, SW);
    savedTy.current = clamp(savedTy.current + e.translationY, savedScale.current, SH);
    txVal.value = savedTx.current;
    tyVal.value = savedTy.current;
  };

  // ─── Close ───────────────────────────────────────────────────
  const handleClose = () => {
    savedScale.current = 1;
    savedTx.current = 0;
    savedTy.current = 0;
    scaleVal.value = 1;
    txVal.value = 0;
    tyVal.value = 0;
    onClose();
  };

  const animStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: txVal.value },
      { translateY: tyVal.value },
      { scale: scaleVal.value },
    ],
  }));

  if (!uri) return null;

  return (
    <Modal visible transparent animationType="fade" statusBarTranslucent onRequestClose={handleClose}>
      <StatusBar hidden />
      <GestureHandlerRootView style={{ flex: 1 }}>
        <View style={s.overlay}>

          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={() => { if (!gestureActive.current && savedScale.current <= 1) handleClose(); }}
          />

          <PanGestureHandler
            ref={panRef}
            onGestureEvent={onPanEvent}
            onHandlerStateChange={onPanState}
            simultaneousHandlers={pinchRef}
            avgTouches
          >
            <Animated.View style={s.imageWrap}>
              <PinchGestureHandler
                ref={pinchRef}
                onGestureEvent={onPinchEvent}
                onHandlerStateChange={onPinchState}
                simultaneousHandlers={panRef}
              >
                <Animated.Image
                  source={{ uri }}
                  style={[s.image, animStyle]}
                  resizeMode="contain"
                />
              </PinchGestureHandler>
            </Animated.View>
          </PanGestureHandler>

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
  imageWrap: { width: SW, height: SH * 0.85, justifyContent: 'center', alignItems: 'center' },
  image:     { width: SW, height: SH * 0.85 },
  closeBtn:  { position: 'absolute', right: 16, zIndex: 10 },
  closePill: { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.15)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)', alignItems: 'center', justifyContent: 'center' },
  closeX:    { position: 'absolute', width: 16, height: 2, borderRadius: 1, backgroundColor: '#fff', transform: [{ rotate: '45deg' }] },
  hintWrap:  { position: 'absolute', alignSelf: 'center', zIndex: 5 },
  hintPill:  { flexDirection: 'row', gap: 3, backgroundColor: 'rgba(255,255,255,0.12)', borderRadius: 12, paddingHorizontal: 10, paddingVertical: 5, alignItems: 'center' },
  hintDot:   { width: 5, height: 5, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.45)' },
});