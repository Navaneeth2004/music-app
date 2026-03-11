import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Colors, FontSize, Spacing, Radius } from '../../constants/theme';

// ─── CardListHeader ────────────────────────────────────────────
interface HeaderProps {
  accentColor: string;
  /** Left badge content, e.g. deck icon or chapter pill */
  badge:       React.ReactNode;
  /** Full title shown next to badge */
  title:       string;
  /** Back press — in select mode shows ✕ */
  onBack:      () => void;
  selecting:   boolean;
  /** Right-side action button (Review / Go) — omit to hide */
  rightAction?: React.ReactNode;
}

export const CardListHeader: React.FC<HeaderProps> = ({
  accentColor, badge, title, onBack, selecting, rightAction,
}) => (
  <View style={[lh.header, { borderBottomColor: accentColor + '33' }]}>
    <Pressable onPress={onBack} style={lh.backBtn} hitSlop={8}>
      <Text style={lh.backText}>{selecting ? '✕' : '←'}</Text>
    </Pressable>
    <View style={[lh.badge, { backgroundColor: accentColor + '18' }]}>
      {badge}
      <Text style={[lh.title, { color: accentColor }]} numberOfLines={1}>{title}</Text>
    </View>
    {rightAction ?? <View style={lh.spacer} />}
  </View>
);

// ─── SelectionBar ──────────────────────────────────────────────
interface SelectionBarProps {
  count:       number;
  total:       number;
  accentColor: string;
  onSelectAll: () => void;
  onExport:    () => void;
  allSelected: boolean;
  /** Optional hide action — renders a Hide button between Select All and Export */
  onHide?:     () => void;
}

export const SelectionBar: React.FC<SelectionBarProps> = ({
  count, total, accentColor, onSelectAll, onExport, allSelected, onHide,
}) => (
  <View style={sb.bar}>
    <Text style={sb.count}>{count} of {total} selected</Text>
    <Pressable onPress={onSelectAll} style={sb.btn}>
      <Text style={sb.btnText}>{allSelected ? 'Deselect All' : 'Select All'}</Text>
    </Pressable>
    {onHide && (
      <Pressable
        onPress={onHide}
        disabled={count === 0}
        style={[sb.btn, { opacity: count === 0 ? 0.4 : 1 }]}>
        <Text style={sb.btnText}>👁 Hide</Text>
      </Pressable>
    )}
    <Pressable
      onPress={onExport}
      disabled={count === 0}
      style={[sb.exportBtn, { backgroundColor: accentColor + '22', borderColor: accentColor + '55', opacity: count === 0 ? 0.4 : 1 }]}>
      <Text style={[sb.exportText, { color: accentColor }]}>⬆ Export ({count})</Text>
    </Pressable>
  </View>
);

// ─── Styles ────────────────────────────────────────────────────
const lh = StyleSheet.create({
  header:  { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
             paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md,
             borderBottomWidth: 1 },
  backBtn: { paddingRight: Spacing.xs },
  backText:{ color: Colors.accentLight, fontSize: FontSize.md, fontWeight: '600' },
  badge:   { flex: 1, flexDirection: 'row', alignItems: 'center', gap: Spacing.xs,
             borderRadius: Radius.full, paddingHorizontal: Spacing.sm, paddingVertical: 4 },
  title:   { fontSize: FontSize.sm, fontWeight: '700', flex: 1 },
  spacer:  { width: 48 },
});

const sb = StyleSheet.create({
  bar:       { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
               paddingHorizontal: Spacing.lg, paddingVertical: Spacing.sm,
               borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: Colors.border,
               backgroundColor: Colors.surface },
  count:     { fontSize: FontSize.xs, color: Colors.textSecondary, fontWeight: '600', flex: 1 },
  btn:       { backgroundColor: Colors.surfaceAlt, borderRadius: Radius.md,
               paddingHorizontal: Spacing.sm, paddingVertical: 4,
               borderWidth: 1, borderColor: Colors.border },
  btnText:   { color: Colors.textPrimary, fontSize: FontSize.xs, fontWeight: '600' },
  exportBtn: { borderRadius: Radius.md, paddingHorizontal: Spacing.sm,
               paddingVertical: 4, borderWidth: 1 },
  exportText:{ fontSize: FontSize.xs, fontWeight: '700' },
});