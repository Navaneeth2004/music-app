/**
 * SwipeableRow
 * Swipe LEFT to reveal a red delete zone.
 * Tapping the red zone calls onDelete (which should show a confirm modal).
 * Uses only react-native Animated + PanResponder — no extra libraries.
 */
import React, { useRef } from 'react';
import {
  View, Text, Pressable, Animated, PanResponder,
  StyleSheet, Dimensions,
} from 'react-native';
import { Colors, Radius } from '../../constants/theme';

const SCREEN_W   = Dimensions.get('window').width;
const DELETE_W   = 72;   // width of the revealed delete zone
const THRESHOLD  = 48;   // how far to drag before it snaps open

interface Props {
  onDelete: () => void;
  children: React.ReactNode;
  /** Extra style on the outer container */
  containerStyle?: any;
}

export const SwipeableRow: React.FC<Props> = ({ onDelete, children, containerStyle }) => {
  const translateX = useRef(new Animated.Value(0)).current;
  const isOpen     = useRef(false);

  const clamp = (val: number) => Math.min(0, Math.max(-DELETE_W, val));

  const snapOpen  = () => { Animated.spring(translateX, { toValue: -DELETE_W, useNativeDriver: true, tension: 120, friction: 12 }).start(() => { isOpen.current = true; }); };
  const snapClose = () => { Animated.spring(translateX, { toValue: 0,         useNativeDriver: true, tension: 120, friction: 12 }).start(() => { isOpen.current = false; }); };

  const panResponder = useRef(PanResponder.create({
    onStartShouldSetPanResponder: () => false,
    onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dx) > 6 && Math.abs(g.dx) > Math.abs(g.dy),
    onPanResponderGrant: () => {
      // offset so we continue from current position
      translateX.stopAnimation();
      translateX.setOffset(isOpen.current ? -DELETE_W : 0);
      translateX.setValue(0);
    },
    onPanResponderMove: (_, g) => {
      const offset = isOpen.current ? -DELETE_W : 0;
      const clamped = clamp(offset + g.dx);
      translateX.setValue(clamped - offset);
    },
    onPanResponderRelease: (_, g) => {
      translateX.flattenOffset();
      const currentX = isOpen.current ? -DELETE_W + g.dx : g.dx;
      if (currentX < -THRESHOLD) { snapOpen(); }
      else { snapClose(); }
    },
    onPanResponderTerminate: () => { translateX.flattenOffset(); snapClose(); },
  })).current;

  const handleDelete = () => {
    snapClose();
    onDelete();
  };

  return (
    <View style={[sw.outer, containerStyle]}>
      {/* Delete zone (behind) */}
      <View style={sw.deleteZone}>
        <Pressable onPress={handleDelete} style={sw.deleteBtn}>
          <Text style={sw.deleteIcon}>🗑</Text>
          <Text style={sw.deleteLabel}>Delete</Text>
        </Pressable>
      </View>
      {/* Row content (on top, slides left) */}
      <Animated.View
        style={{ transform: [{ translateX }] }}
        {...panResponder.panHandlers}
      >
        {children}
      </Animated.View>
    </View>
  );
};

const sw = StyleSheet.create({
  outer:      { overflow: 'hidden' },
  deleteZone: { position: 'absolute', right: 0, top: 0, bottom: 0, width: DELETE_W,
                backgroundColor: Colors.error, alignItems: 'center', justifyContent: 'center' },
  deleteBtn:  { alignItems: 'center', justifyContent: 'center', flex: 1, width: '100%' },
  deleteIcon: { fontSize: 18 },
  deleteLabel:{ color: '#fff', fontSize: 10, fontWeight: '700', marginTop: 2 },
});