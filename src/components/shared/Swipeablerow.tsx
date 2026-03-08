/**
 * SwipeableRow
 *
 * Swipe LEFT  past threshold → calls onDelete (confirm modal, row gone on confirm).
 * Swipe RIGHT past threshold → calls onHide  (toggle hide/show, snaps back).
 *
 * onHide is optional — right swipe ignored if not provided.
 *
 * The animated card wrapper has backgroundColor: '#0A0A0F' (= Colors.background)
 * so it is fully opaque and the hint behind it never bleeds through.
 */
import React, { useRef, useCallback, forwardRef, useImperativeHandle } from 'react';
import { Animated, PanResponder, View, Text, Dimensions } from 'react-native';

const SCREEN_W  = Dimensions.get('window').width;
const THRESHOLD = SCREEN_W * 0.28;

// Must equal Colors.background exactly
const CARD_BG = '#0A0A0F';

export interface SwipeableRowHandle { reset: () => void; }

interface Props {
  onDelete:       () => void;
  onHide?:        () => void;
  isHidden?:      boolean;
  children:       React.ReactNode;
  containerStyle?: any;
}

export const SwipeableRow = forwardRef<SwipeableRowHandle, Props>(
  ({ onDelete, onHide, isHidden, children, containerStyle }, ref) => {
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

    const triggerDelete = useCallback(() => {
      if (triggered.current) return;
      triggered.current = true;
      Animated.sequence([
        Animated.timing(tx, { toValue: -80, duration: 150, useNativeDriver: true }),
        Animated.spring(tx, { toValue: 0, useNativeDriver: true, tension: 200, friction: 20 }),
      ]).start(() => { triggered.current = false; });
      onDelete();
    }, [tx, onDelete]);

    const triggerHide = useCallback(() => {
      if (triggered.current || !onHide) return;
      triggered.current = true;
      Animated.sequence([
        Animated.timing(tx, { toValue: 80, duration: 150, useNativeDriver: true }),
        Animated.spring(tx, { toValue: 0, useNativeDriver: true, tension: 200, friction: 20 }),
      ]).start(() => { triggered.current = false; });
      onHide();
    }, [tx, onHide]);

    const panResponder = useRef(
      PanResponder.create({
        onMoveShouldSetPanResponder: (_, g) =>
          !triggered.current &&
          Math.abs(g.dx) > 10 &&
          Math.abs(g.dx) > Math.abs(g.dy) * 2,

        onPanResponderGrant: () => {
          tx.stopAnimation();
          tx.extractOffset();
        },

        onPanResponderMove: (_, g) => {
          if (g.dx > 0 && !onHide) return;
          tx.setValue(g.dx < 0 ? Math.min(0, g.dx) : Math.max(0, g.dx));
        },

        onPanResponderRelease: (_, g) => {
          tx.flattenOffset();
          if (g.dx < -THRESHOLD || g.vx < -0.9) {
            triggerDelete();
          } else if (onHide && (g.dx > THRESHOLD || g.vx > 0.9)) {
            triggerHide();
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
      <View style={[containerStyle, { overflow: 'hidden' }]}>
        {/* Right-swipe reveal — only rendered when onHide is provided */}
        {onHide && (
          <View style={{
            position: 'absolute', top: 0, bottom: 0, left: 0, right: 0,
            flexDirection: 'row', alignItems: 'center', paddingLeft: 20,
            backgroundColor: '#1A1A2E',
          }}>
            <Text style={{ fontSize: 18, marginRight: 6 }}>{isHidden ? '👁️' : '🙈'}</Text>
            <Text style={{ color: '#aaa', fontSize: 13, fontWeight: '600' }}>
              {isHidden ? 'Show' : 'Hide'}
            </Text>
          </View>
        )}
        {/*
          backgroundColor: CARD_BG makes this fully opaque —
          the hint above can only be seen when the card slides right,
          never through the card itself.
        */}
        <Animated.View
          style={{ transform: [{ translateX: tx }], backgroundColor: CARD_BG }}
          {...panResponder.panHandlers}
        >
          {children}
        </Animated.View>
      </View>
    );
  }
);