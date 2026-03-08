import React from 'react';
import { View, Text, Image, Pressable, StyleSheet } from 'react-native';
import { Colors, FontSize, Spacing, Radius } from '../../constants/theme';

interface Props {
  index:       number;
  front:       string;
  back?:       string;
  thumbUri?:   string | null;
  hasAudio?:   boolean;
  accentColor: string;
  // selection
  selecting:   boolean;
  selected:    boolean;
  // hide
  isHidden?:   boolean;
  // callbacks
  onPress:     () => void;
  onLongPress: () => void;
}

export const CardListItem: React.FC<Props> = ({
  index, front, back, thumbUri, hasAudio,
  accentColor, selecting, selected, isHidden,
  onPress, onLongPress,
}) => (
  <Pressable
    onPress={onPress}
    onLongPress={onLongPress}
    delayLongPress={350}
    style={({ pressed }) => [
      ci.row,
      pressed && { opacity: 0.65 },
      !selecting && isHidden && { opacity: 0.45 },
      selecting && selected && { backgroundColor: accentColor + '14' },
    ]}
  >
    {/* Number or checkbox */}
    {selecting ? (
      <View style={[ci.check, selected && { backgroundColor: accentColor, borderColor: accentColor }]}>
        {selected && <Text style={ci.checkMark}>✓</Text>}
      </View>
    ) : (
      <View style={[ci.num, { backgroundColor: accentColor + '20' }]}>
        <Text style={[ci.numText, { color: accentColor }]}>{index + 1}</Text>
      </View>
    )}

    {/* Thumbnail */}
    {thumbUri ? <Image source={{ uri: thumbUri }} style={ci.thumb} resizeMode="cover" /> : null}

    {/* Text */}
    <View style={ci.body}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
        <Text style={[ci.front, { flex: 1 }]} numberOfLines={1}>{front || '(image only)'}</Text>
        {!selecting && isHidden && <Text style={{ fontSize: 10 }}>🙈</Text>}
      </View>
      {back ? <Text style={ci.back} numberOfLines={1}>{back}</Text> : null}
    </View>

    {/* Media badges */}
    <View style={ci.badges}>
      {thumbUri  && <View style={ci.badge}><Text style={ci.badgeTxt}>🖼</Text></View>}
      {hasAudio  && <View style={ci.badge}><Text style={ci.badgeTxt}>♪</Text></View>}
    </View>

    {/* Chevron (only when not selecting) */}
    {!selecting && <Text style={ci.chevron}>›</Text>}
  </Pressable>
);

const ci = StyleSheet.create({
  row:      { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
              paddingHorizontal: Spacing.lg, paddingVertical: Spacing.sm + 3,
              borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: Colors.border,
              backgroundColor: Colors.background },
  num:      { width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  numText:  { fontSize: 10, fontWeight: '800' },
  check:    { width: 22, height: 22, borderRadius: 6, borderWidth: 2, borderColor: Colors.border,
              alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  checkMark:{ color: Colors.textPrimary, fontSize: 11, fontWeight: '800' },
  thumb:    { width: 36, height: 36, borderRadius: Radius.sm, flexShrink: 0 },
  body:     { flex: 1, gap: 2 },
  front:    { fontSize: FontSize.sm, color: Colors.textPrimary, fontWeight: '500' },
  back:     { fontSize: FontSize.xs, color: Colors.textMuted },
  badges:   { flexDirection: 'row', gap: 3 },
  badge:    { width: 20, height: 20, borderRadius: 10, backgroundColor: Colors.surfaceAlt,
              alignItems: 'center', justifyContent: 'center' },
  badgeTxt: { fontSize: 10 },
  chevron:  { color: Colors.textMuted, fontSize: 18 },
});