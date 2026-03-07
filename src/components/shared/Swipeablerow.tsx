/**
 * SwipeableRow — swipe left to trigger delete
 *
 * Swipe LEFT past threshold → briefly animates left → calls onDelete immediately.
 * The parent shows a ConfirmModal. On confirm: delete + reload (row gone).
 * On cancel: reload (row snaps back because list remounts).
 *
 * Right swipe, tap, and long-press are completely ignored.
 */
import React, { useRef, useCallback, forwardRef, useImperativeHandle } from 'react';
import { Animated, PanResponder, View, Dimensions } from 'react-native';

const SCREEN_W  = Dimensions.get('window').width;
const THRESHOLD = SCREEN_W * 0.30;

export interface SwipeableRowHandle { reset: () => void; }

interface Props {
  onDelete:       () => void;
  children:       React.ReactNode;
  containerStyle?: any;
}

export const SwipeableRow = forwardRef<SwipeableRowHandle, Props>(
  ({ onDelete, children, containerStyle }, ref) => {
    const tx        = useRef(new Animated.Value(0)).current;
    const triggered = useRef(false);

    const reset = useCallback(() => {
      triggered.current = false;
      Animated.spring(tx, { toValue: 0, useNativeDriver: true, tension: 180, friction: 20 }).start();
    }, [tx]);

    useImperativeHandle(ref, () => ({ reset }), [reset]);

    const snapBack = useCallback(() => {
      Animated.spring(tx, { toValue: 0, useNativeDriver: true, tension: 200, friction: 22 }).start();
    }, [tx]);

    const trigger = useCallback(() => {
      if (triggered.current) return;
      triggered.current = true;
      // Small leftward nudge to give visual feedback, then snap back
      // The row will disappear only when parent calls load() after confirm
      Animated.sequence([
        Animated.timing(tx, { toValue: -80, duration: 150, useNativeDriver: true }),
        Animated.spring(tx, { toValue: 0, useNativeDriver: true, tension: 200, friction: 20 }),
      ]).start(() => { triggered.current = false; });
      onDelete(); // fire immediately so modal appears right away
    }, [tx, onDelete]);

    const panResponder = useRef(
      PanResponder.create({
        onMoveShouldSetPanResponder: (_, g) =>
          !triggered.current &&
          g.dx < -10 &&
          Math.abs(g.dx) > Math.abs(g.dy) * 2,

        onPanResponderGrant: () => {
          tx.stopAnimation();
          tx.extractOffset();
        },

        onPanResponderMove: (_, g) => {
          tx.setValue(Math.min(0, g.dx));
        },

        onPanResponderRelease: (_, g) => {
          tx.flattenOffset();
          if (g.dx < -THRESHOLD || g.vx < -0.9) {
            trigger();
          } else {
            snapBack();
          }
        },

        onPanResponderTerminate: () => {
          tx.flattenOffset();
          snapBack();
        },
      })
    ).current;

    return (
      <View style={containerStyle}>
        <Animated.View style={{ transform: [{ translateX: tx }] }} {...panResponder.panHandlers}>
          {children}
        </Animated.View>
      </View>
    );
  }
);