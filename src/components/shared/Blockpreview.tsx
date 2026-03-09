import React, { useState } from 'react';
import { View, Text, Image, Pressable, StyleSheet } from 'react-native';
import { Colors, FontSize, Spacing, Radius } from '../../constants/theme';
import { ContentBlock } from '../../types/blocks';
import { ImageLightbox } from './ImageLightbox';
import { AudioPlayer } from './AudioPlayer';

// ─── RichText ────────────────────────────────────────────────
export const RichText: React.FC<{ text: string; style?: any }> = ({ text, style }) => {
  if (!text) return null;
  const parts: { t: string; b: boolean; i: boolean }[] = [];
  const re = /<b>(.*?)<\/b>|<i>(.*?)<\/i>|([^<]+)/g;
  let m;
  while ((m = re.exec(text)) !== null) {
    if (m[1] !== undefined) parts.push({ t: m[1], b: true,  i: false });
    else if (m[2] !== undefined) parts.push({ t: m[2], b: false, i: true  });
    else if (m[3] !== undefined) parts.push({ t: m[3], b: false, i: false });
  }
  return (
    <Text style={style}>
      {parts.map((p, i) => (
        <Text key={i} style={[p.b && { fontWeight: '700' as const }, p.i && { fontStyle: 'italic' as const }]}>
          {p.t}
        </Text>
      ))}
    </Text>
  );
};

// ─── Tappable image (opens lightbox) ─────────────────────────
const TappableImage: React.FC<{ uri: string }> = ({ uri }) => {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Pressable onPress={() => setOpen(true)}>
        <Image source={{ uri }} style={bp.image} resizeMode="contain" />
      </Pressable>
      <ImageLightbox uri={open ? uri : null} onClose={() => setOpen(false)} />
    </>
  );
};

// ─── BlockPreview ─────────────────────────────────────────────
export const BlockPreview: React.FC<{ block: ContentBlock }> = ({ block: b }) => {
  if (b.type === 'divider') return <View style={bp.divider} />;

  if (b.type === 'heading')    return <RichText text={b.text ?? ''} style={bp.heading} />;
  if (b.type === 'subheading') return <RichText text={b.text ?? ''} style={bp.subheading} />;
  if (b.type === 'paragraph')  return <RichText text={b.text ?? ''} style={bp.paragraph} />;

  if (b.type === 'bullets') return (
    <View style={bp.bullets}>
      {(b.bullets ?? []).map((pt, i) => (
        <View key={i} style={bp.bulletRow}>
          <View style={bp.bulletDot} />
          <RichText text={pt} style={bp.bulletText} />
        </View>
      ))}
    </View>
  );

  if (b.type === 'image') {
    const uri = b.imageFile ?? b.imageUrl ?? null;
    if (!uri) return null;
    return (
      <View style={bp.blockWrap}>
        <TappableImage uri={uri} />
        {b.caption ? <Text style={bp.imageCaption}>{b.caption}</Text> : null}
      </View>
    );
  }

  if (b.type === 'audio') {
    const uri = b.audioFile ?? null;
    if (!uri) return null;
    return (
      <View style={bp.blockWrap}>
        {b.audioLabel ? <Text style={bp.audioLabel}>{b.audioLabel}</Text> : null}
        <AudioPlayer uri={uri} accentColor={Colors.accent} />
        {b.caption ? <Text style={bp.caption}>{b.caption}</Text> : null}
      </View>
    );
  }

  if (b.type === 'table') {
    const headers = b.headers ?? [];
    const rows = b.rows ?? [];
    return (
      <View style={bp.blockWrap}>
        <View style={bp.table}>
          <View style={bp.tableHRow}>
            {headers.map((h, i) => (
              <View key={i} style={[bp.tableCell, i < headers.length - 1 && bp.cellBorder]}>
                <RichText text={h} style={bp.tableHText} />
              </View>
            ))}
          </View>
          {rows.map((row, ri) => (
            <View key={ri} style={[bp.tableRow, ri < rows.length - 1 && bp.rowBorder]}>
              {row.cells.map((cell, ci) => (
                <View key={ci} style={[bp.tableCell, ci < row.cells.length - 1 && bp.cellBorder]}>
                  <RichText text={cell} style={bp.tableCellText} />
                </View>
              ))}
            </View>
          ))}
        </View>
        {b.caption ? <Text style={bp.caption}>{b.caption}</Text> : null}
      </View>
    );
  }

  return null;
};

// ─── Shared block styles ──────────────────────────────────────
export const bp = StyleSheet.create({
  // text blocks
  heading:      { fontSize: FontSize.xl,  fontWeight: '800', color: Colors.textPrimary,   marginTop: Spacing.sm, marginBottom: Spacing.sm },
  subheading:   { fontSize: FontSize.lg,  fontWeight: '700', color: Colors.textPrimary,   marginTop: Spacing.md, marginBottom: Spacing.xs },
  paragraph:    { fontSize: FontSize.md,  color: Colors.textSecondary, lineHeight: 24,     marginBottom: Spacing.md },
  bullets:      { marginBottom: Spacing.md, gap: Spacing.xs },
  bulletRow:    { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.sm },
  bulletDot:    { width: 6, height: 6, borderRadius: 3, backgroundColor: Colors.accent, marginTop: 9 },
  bulletText:   { flex: 1, fontSize: FontSize.md, color: Colors.textSecondary, lineHeight: 24 },
  divider:      { height: 1, backgroundColor: Colors.border, marginVertical: Spacing.lg },

  // media blocks — wrapper owns all bottom spacing
  blockWrap:    { marginBottom: 20 },
  image:        { width: '100%', height: 200, borderRadius: Radius.md },

  // table
  table:        { borderWidth: 1, borderColor: Colors.border, borderRadius: Radius.md, overflow: 'hidden' },
  tableHRow:    { flexDirection: 'row', backgroundColor: Colors.accent + '22' },
  tableRow:     { flexDirection: 'row' },
  rowBorder:    { borderBottomWidth: 1, borderBottomColor: Colors.border },
  tableCell:    { flex: 1, padding: Spacing.sm },
  cellBorder:   { borderRightWidth: 1, borderRightColor: Colors.border },
  tableHText:   { color: Colors.accentLight, fontWeight: '700', fontSize: FontSize.sm },
  tableCellText:{ color: Colors.textSecondary, fontSize: FontSize.sm },

  // captions and labels
  imageCaption: { fontSize: FontSize.xs, color: Colors.textMuted, fontStyle: 'italic', marginTop: 6, textAlign: 'center' },
  caption:      { fontSize: FontSize.xs, color: Colors.textMuted, fontStyle: 'italic', marginTop: 4 },
  audioLabel:   { fontSize: FontSize.xs, color: Colors.textMuted, fontWeight: '600', marginBottom: 4 },
});