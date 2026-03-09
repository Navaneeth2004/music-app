/**
 * SwipeableRow
 *
 * Swipe LEFT  past threshold → calls onDelete (snaps back, caller handles confirm).
 * Swipe RIGHT past threshold → calls onHide OR onRightAction, depending on which is provided.
 *
 * onHide      — original hide/show toggle (right swipe), shows hide emoji hint.
 * onRightAction — generic right-swipe action with custom label/color/icon.
 *
 * Only one of onHide / onRightAction should be provided. If both given, onRightAction wins.
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
  onDelete:        () => void;
  // Original hide toggle
  onHide?:         () => void;
  isHidden?:       boolean;
  // Generic right-swipe action (overrides onHide hint UI if provided)
  onRightAction?:  () => void;
  rightLabel?:     string;   // e.g. 'Edit'
  rightIcon?:      string;   // e.g. '✏️'
  rightColor?:     string;   // e.g. '#38BFA1'
  // Whether left swipe is disabled (e.g. protected rows)
  deleteDisabled?: boolean;
  children:        React.ReactNode;
  containerStyle?: any;
}

export const SwipeableRow = forwardRef<SwipeableRowHandle, Props>(
  ({
    onDelete,
    onHide, isHidden,
    onRightAction, rightLabel = 'Edit', rightIcon = '✏️', rightColor = '#38BFA1',
    deleteDisabled = false,
    children, containerStyle,
  }, ref) => {
    const tx        = useRef(new Animated.Value(0)).current;
    const triggered = useRef(false);

    const hasRight = !!(onRightAction || onHide);

    const reset = useCallback(() => {
      triggered.current = false;
      Animated.spring(tx, { toValue: 0, useNativeDriver: true, tension: 180, friction: 20 }).start();
    }, [tx]);

    useImperativeHandle(ref, () => ({ reset }), [reset]);

    const snapBack = useCallback(() => {
      Animated.spring(tx, { toValue: 0, useNativeDriver: true, tension: 200, friction: 22 }).start();
    }, [tx]);

    const triggerDelete = useCallback(() => {
      if (triggered.current || deleteDisabled) return;
      triggered.current = true;
      Animated.sequence([
        Animated.timing(tx, { toValue: -80, duration: 150, useNativeDriver: true }),
        Animated.spring(tx, { toValue: 0, useNativeDriver: true, tension: 200, friction: 20 }),
      ]).start(() => { triggered.current = false; });
      onDelete();
    }, [tx, onDelete, deleteDisabled]);

    const triggerRight = useCallback(() => {
      if (triggered.current || !hasRight) return;
      triggered.current = true;
      Animated.sequence([
        Animated.timing(tx, { toValue: 80, duration: 150, useNativeDriver: true }),
        Animated.spring(tx, { toValue: 0, useNativeDriver: true, tension: 200, friction: 20 }),
      ]).start(() => { triggered.current = false; });
      if (onRightAction) onRightAction();
      else if (onHide) onHide();
    }, [tx, hasRight, onRightAction, onHide]);

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
          if (g.dx > 0 && !hasRight) return;
          if (g.dx < 0 && deleteDisabled) return;
          tx.setValue(g.dx < 0 ? Math.min(0, g.dx) : Math.max(0, g.dx));
        },

        onPanResponderRelease: (_, g) => {
          tx.flattenOffset();
          if (!deleteDisabled && (g.dx < -THRESHOLD || g.vx < -0.9)) {
            triggerDelete();
          } else if (hasRight && (g.dx > THRESHOLD || g.vx > 0.9)) {
            triggerRight();
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

    // Determine right-hint appearance
    const showHideHint   = !!onHide && !onRightAction;
    const showActionHint = !!onRightAction;

    return (
      <View style={[containerStyle, { overflow: 'hidden' }]}>

        {/* Right-swipe hint */}
        {showHideHint && (
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

        {showActionHint && (
          <View style={{
            position: 'absolute', top: 0, bottom: 0, left: 0, width: '50%',
            flexDirection: 'row', alignItems: 'center', paddingLeft: 20,
            backgroundColor: rightColor + '28', gap: 8,
          }}>
            <Text style={{ fontSize: 18 }}>{rightIcon}</Text>
            <Text style={{ color: rightColor, fontSize: 13, fontWeight: '700' }}>{rightLabel}</Text>
          </View>
        )}

        {/* Left-swipe hint (delete) */}
        {!deleteDisabled && (
          <View style={{
            position: 'absolute', top: 0, bottom: 0, right: 0, width: '50%',
            flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', paddingRight: 20,
            backgroundColor: '#E05C6A28', gap: 8,
          }}>
            <Text style={{ color: '#E05C6A', fontSize: 13, fontWeight: '700' }}>Delete</Text>
            <Text style={{ fontSize: 18 }}>🗑</Text>
          </View>
        )}

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