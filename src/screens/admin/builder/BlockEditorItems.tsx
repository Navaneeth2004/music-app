import React, { useState } from 'react';
import {
  View, Text, StyleSheet, Pressable,
  TextInput, Modal, Image,
} from 'react-native';
import { Colors, FontSize, Spacing, Radius } from '../../../constants/theme';
import { ContentBlock, BlockType } from '../../../types/blocks';
import { PickedAudio } from '../../../utils/pickAudio';
import { pickAudio } from '../../../utils/pickAudio';
import { ImagePickerModal } from '../../../components/shared/ImagePickerModal';
import { AudioPlayer } from '../../../components/shared/AudioPlayer';
import { RichText } from '../../../components/shared/Blockpreview';
import { AITarget } from '../../AIGenerateScreen';

// ─── Block meta (shared constant) ────────────────────────────────
export const BLOCK_META: { type: BlockType; label: string; icon: string; desc: string; color: string }[] = [
  { type: 'heading',    label: 'Heading',     icon: 'H1', desc: 'Large section title',                        color: '#7C6FF7' },
  { type: 'subheading', label: 'Subheading',  icon: 'H2', desc: 'Sub-section title',                         color: '#A89AF9' },
  { type: 'paragraph',  label: 'Paragraph',   icon: '¶',  desc: 'Body text · use <b>bold</b> <i>italic</i>', color: '#9896B0' },
  { type: 'bullets',    label: 'Bullet List', icon: '•',  desc: 'Multiple bullet points',                    color: '#4CAF88' },
  { type: 'table',      label: 'Table',       icon: '⊞',  desc: 'Comparison table (tap cells to edit)',       color: '#E05C6A' },
  { type: 'divider',    label: 'Divider',     icon: '—',  desc: 'Section separator',                         color: '#5A5870' },
  { type: 'image',      label: 'Image',       icon: '🖼',  desc: 'Upload an image',                           color: '#4A9EE0' },
  { type: 'audio',      label: 'Audio',       icon: '♫',   desc: 'Attach an audio clip',                      color: '#E0904A' },
];
export const metaFor = (t: BlockType) => BLOCK_META.find(m => m.type === t)!;

// ─── Shared modal styles (referenced by sub-editors) ─────────────
export const modalStyles = StyleSheet.create({
  overlay:     { flex: 1, backgroundColor: 'rgba(0,0,0,0.75)', justifyContent: 'center', padding: Spacing.lg },
  box:         { backgroundColor: Colors.surface, borderRadius: Radius.lg, borderWidth: 1, borderColor: Colors.border, padding: Spacing.lg, gap: Spacing.md },
  title:       { color: Colors.textPrimary, fontSize: FontSize.lg, fontWeight: '700' },
  hint:        { color: Colors.textMuted, fontSize: FontSize.xs },
  input:       { backgroundColor: Colors.surfaceAlt, borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.border, color: Colors.textPrimary, fontSize: FontSize.md, padding: Spacing.md, minHeight: 160, textAlignVertical: 'top' },
  actions:     { flexDirection: 'row', gap: Spacing.sm },
  cancel:      { flex: 1, padding: Spacing.md, borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.border, alignItems: 'center' },
  cancelText:  { color: Colors.textSecondary, fontWeight: '600' },
  save:        { flex: 1, padding: Spacing.md, borderRadius: Radius.md, backgroundColor: Colors.accent, alignItems: 'center' },
  saveText:    { color: Colors.textPrimary, fontWeight: '700' },
  charCount:   { fontSize: FontSize.xs, color: Colors.textMuted, textAlign: 'right', marginTop: -4, marginBottom: Spacing.xs },
  aiBtn:       { backgroundColor: Colors.accent + '18', borderRadius: Radius.sm, borderWidth: 1, borderColor: Colors.accent + '44', paddingVertical: 8, paddingHorizontal: 12, alignItems: 'center', marginBottom: Spacing.xs },
  aiBtnText:   { color: Colors.accentLight, fontSize: FontSize.sm, fontWeight: '700' },
});

// ─── Types ───────────────────────────────────────────────────────
type PI = import('../../../utils/pickImage').PickedImage;

export interface EditBlockProps {
  block:             ContentBlock;
  isFirst:           boolean;
  isLast:            boolean;
  chapterId:         string;
  chapterRecord:     any;
  onUpdate:          (u: Partial<ContentBlock>) => void;
  onDelete:          () => void;
  onDrag:            () => void;
  isActive:          boolean;
  onToggle:          () => void;
  onAddAfter:        () => void;
  onOpenModal:       () => void;
  pendingImage:      PI | null;
  onSetPending:      (img: PI | null) => void;
  pendingAudio:      PickedAudio | null;
  onSetPendingAudio: (audio: PickedAudio | null) => void;
  setModalBlock:     (block: ContentBlock | null) => void;
  setAiTarget:       (target: AITarget | null) => void;
}

// ─── EditBlock ────────────────────────────────────────────────────
export const EditBlock: React.FC<EditBlockProps> = ({
  block, isFirst, isLast, chapterId, chapterRecord, onUpdate, onDelete,
  onDrag, isActive, onToggle, onAddAfter, onOpenModal,
  pendingImage, onSetPending, pendingAudio, onSetPendingAudio,
  setModalBlock, setAiTarget,
}) => {
  const meta = metaFor(block.type);
  const preview = block.type === 'bullets' ? (block.bullets ?? []).join(' • ').slice(0, 50)
    : block.type === 'table'   ? (block.headers ?? []).join(' | ')
    : block.type === 'image'   ? (block.imageUrl ? '🖼 Image' : '🖼 Empty')
    : block.type === 'audio'   ? (block.audioFile ? '🎵 Audio attached' : '🎵 No audio yet')
    : block.type === 'divider' ? '────'
    : (block.text ?? '').slice(0, 50);

  return (
    <View style={[eb.card, { borderLeftColor: meta.color }, isActive && { opacity: 0.85, backgroundColor: Colors.surfaceAlt }]}>
      {/* Card header */}
      <Pressable onPress={onToggle} style={eb.cardHead}>
        <View style={[eb.tag, { backgroundColor: meta.color + '22' }]}>
          <Text style={[eb.tagIcon, { color: meta.color }]}>{meta.icon}</Text>
          <Text style={[eb.tagLabel, { color: meta.color }]}>{meta.label}</Text>
        </View>
        {block.collapsed && <Text style={eb.previewText} numberOfLines={1}>{preview}</Text>}
        <View style={eb.headActions}>
          <Pressable onLongPress={onDrag} delayLongPress={150} hitSlop={8} style={eb.dragBtn}>
            <Text style={eb.dragBtnText}>☰</Text>
          </Pressable>
          <Text style={eb.arrow}>{block.collapsed ? '▼' : '▲'}</Text>
        </View>
      </Pressable>

      {/* Body */}
      {!block.collapsed && (
        <View style={eb.body}>
          {block.type === 'divider' && <View style={eb.dividerLine} />}
          {block.type === 'image' && (
            <ImageEditor
              block={block}
              chapterRecord={chapterRecord}
              pendingImage={pendingImage}
              onSetPending={onSetPending}
              onUpdate={onUpdate}
            />
          )}
          {block.type === 'audio' && (
            <AudioEditor
              block={block}
              chapterRecord={chapterRecord}
              pendingAudio={pendingAudio}
              onSetPendingAudio={onSetPendingAudio}
              onUpdate={onUpdate}
            />
          )}
          {(block.type === 'heading' || block.type === 'subheading') && (
            <Pressable onPress={onOpenModal} style={eb.tapArea}>
              <Text style={[eb.tapValue, block.type === 'heading' ? eb.h1 : eb.h2]} numberOfLines={2}>
                {block.text || `Tap to enter ${meta.label.toLowerCase()}…`}
              </Text>
              <Text style={eb.tapHint}>tap to edit</Text>
            </Pressable>
          )}
          {block.type === 'paragraph' && (
            <Pressable onPress={onOpenModal} style={eb.tapArea}>
              {block.text
                ? <RichText text={block.text} style={eb.paraText} />
                : <Text style={eb.placeholder}>Tap to edit… use &lt;b&gt;bold&lt;/b&gt; &lt;i&gt;italic&lt;/i&gt;</Text>
              }
              <Text style={eb.tapHint}>tap to edit</Text>
            </Pressable>
          )}
          {block.type === 'bullets' && (
            <BulletsEditor
              block={block}
              onUpdate={onUpdate}
              onAI={() => { setModalBlock(block); setAiTarget({ type: 'bullets' }); }}
            />
          )}
          {block.type === 'table' && (
            <TableEditor
              block={block}
              onUpdate={onUpdate}
              onAI={(ci) => { setModalBlock(block); setAiTarget({ type: 'tableCell', header: block.headers?.[ci] ?? 'Column' }); }}
            />
          )}
        </View>
      )}

      <Pressable onPress={onAddAfter} style={eb.insertBtn}>
        <Text style={eb.insertText}>＋ insert block here</Text>
      </Pressable>
    </View>
  );
};

const eb = StyleSheet.create({
  card:        { backgroundColor: Colors.surface, borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.border, borderLeftWidth: 3, marginBottom: Spacing.sm },
  cardHead:    { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm },
  tag:         { flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: 999, paddingHorizontal: Spacing.sm, paddingVertical: 3 },
  tagIcon:     { fontSize: FontSize.sm, fontWeight: '800' },
  tagLabel:    { fontSize: FontSize.xs, fontWeight: '700', letterSpacing: 0.5 },
  previewText: { flex: 1, color: Colors.textMuted, fontSize: FontSize.sm },
  headActions: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs, marginLeft: 'auto' },
  dragBtn:     { padding: 4 },
  dragBtnText: { color: Colors.textSecondary, fontSize: FontSize.md, fontWeight: '700' },
  arrow:       { color: Colors.textMuted, fontSize: FontSize.xs, marginLeft: 2 },
  body:        { paddingHorizontal: Spacing.md, paddingBottom: Spacing.md },
  dividerLine: { height: 1, backgroundColor: Colors.border, marginVertical: Spacing.sm },
  tapArea:     { backgroundColor: Colors.surfaceAlt, borderRadius: Radius.sm, borderWidth: 1, borderColor: Colors.border, padding: Spacing.md, gap: 4 },
  tapValue:    { color: Colors.textPrimary, fontSize: FontSize.md },
  h1:          { fontSize: FontSize.xl, fontWeight: '800' },
  h2:          { fontSize: FontSize.lg, fontWeight: '700' },
  paraText:    { color: Colors.textPrimary, fontSize: FontSize.md, lineHeight: 22 },
  placeholder: { color: Colors.textMuted, fontSize: FontSize.sm, fontStyle: 'italic' },
  tapHint:     { color: Colors.textMuted, fontSize: FontSize.xs, textAlign: 'right' },
  insertBtn:   { paddingVertical: 7, alignItems: 'center', borderTopWidth: 1, borderTopColor: Colors.border + '55' },
  insertText:  { color: Colors.textMuted, fontSize: FontSize.xs },
});

// ─── BulletsEditor ────────────────────────────────────────────────
export const BulletsEditor: React.FC<{
  block:    ContentBlock;
  onUpdate: (u: Partial<ContentBlock>) => void;
  onAI:     () => void;
}> = ({ block, onUpdate, onAI }) => {
  const bullets = block.bullets ?? [''];
  const [editing, setEditing] = useState<{ index: number; val: string } | null>(null);

  return (
    <View style={{ gap: Spacing.xs }}>
      {bullets.map((b, i) => (
        <Pressable key={i} onPress={() => setEditing({ index: i, val: b })} style={bl.row}>
          <View style={bl.dot} />
          <Text style={[bl.bulletText, !b && bl.bulletPlaceholder]} numberOfLines={2}>
            {b || `Point ${i + 1}`}
          </Text>
          {bullets.length > 1 && (
            <Pressable
              onPress={() => onUpdate({ bullets: bullets.filter((_, bi) => bi !== i) })}
              style={bl.rm}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Text style={{ color: Colors.error, fontSize: 13 }}>✕</Text>
            </Pressable>
          )}
        </Pressable>
      ))}
      <Pressable onPress={() => {
        const newIdx = bullets.length;
        onUpdate({ bullets: [...bullets, ''] });
        setTimeout(() => setEditing({ index: newIdx, val: '' }), 50);
      }} style={bl.addBtn}>
        <Text style={bl.addText}>+ Add bullet</Text>
      </Pressable>

      {/* Per-bullet edit modal */}
      <Modal visible={!!editing} animationType="fade" transparent>
        <View style={modalStyles.overlay}>
          <View style={modalStyles.box}>
            <Text style={modalStyles.title}>Bullet Point {editing ? editing.index + 1 : ''}</Text>
            <Text style={modalStyles.hint}>Use &lt;b&gt;bold&lt;/b&gt; and &lt;i&gt;italic&lt;/i&gt;</Text>
            <TextInput
              style={modalStyles.input}
              value={editing?.val ?? ''}
              onChangeText={v => setEditing(e => e ? { ...e, val: v } : null)}
              multiline autoFocus
              placeholder="Enter bullet text…"
              placeholderTextColor={Colors.textMuted}
              maxLength={200}
            />
            <Text style={modalStyles.charCount}>{(editing?.val ?? '').length}/200</Text>
            <Pressable onPress={() => { onAI(); setEditing(null); }} style={modalStyles.aiBtn}>
              <Text style={modalStyles.aiBtnText}>✦  Generate with AI</Text>
            </Pressable>
            <View style={modalStyles.actions}>
              <Pressable onPress={() => setEditing(null)} style={modalStyles.cancel}>
                <Text style={modalStyles.cancelText}>Cancel</Text>
              </Pressable>
              <Pressable onPress={() => {
                if (editing) {
                  const nb = [...bullets]; nb[editing.index] = editing.val;
                  onUpdate({ bullets: nb });
                }
                setEditing(null);
              }} style={modalStyles.save}>
                <Text style={modalStyles.saveText}>Done</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const bl = StyleSheet.create({
  row:               { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, backgroundColor: Colors.surfaceAlt, borderRadius: Radius.sm, borderWidth: 1, borderColor: Colors.border, padding: Spacing.sm },
  dot:               { width: 6, height: 6, borderRadius: 3, backgroundColor: Colors.accent, flexShrink: 0 },
  bulletText:        { flex: 1, color: Colors.textPrimary, fontSize: FontSize.md },
  bulletPlaceholder: { color: Colors.textMuted },
  rm:                { padding: 4 },
  addBtn:            { marginTop: Spacing.xs },
  addText:           { color: Colors.success, fontSize: FontSize.sm, fontWeight: '600' },
});

// ─── TableEditor ─────────────────────────────────────────────────
export const TableEditor: React.FC<{
  block:    ContentBlock;
  onUpdate: (u: Partial<ContentBlock>) => void;
  onAI:     (colIndex: number) => void;
}> = ({ block, onUpdate, onAI }) => {
  const headers = block.headers ?? [];
  const rows    = block.rows    ?? [];
  const cols    = headers.length;
  const [cell, setCell] = useState<{ r: number; c: number; header: boolean; val: string } | null>(null);

  const setHeader  = (i: number, v: string) => { const h = [...headers]; h[i] = v; onUpdate({ headers: h }); };
  const setCell_   = (ri: number, ci: number, v: string) =>
    onUpdate({ rows: rows.map((row, r) => r !== ri ? row : { cells: row.cells.map((c, ci2) => ci2 !== ci ? c : v) }) });
  const addRow     = () => onUpdate({ rows: [...rows, { cells: Array(cols).fill('') }] });
  const rmRow      = (i: number) => onUpdate({ rows: rows.filter((_, ri) => ri !== i) });
  const addCol     = () => onUpdate({ headers: [...headers, `Col ${cols + 1}`], rows: rows.map(r => ({ cells: [...r.cells, ''] })) });
  const rmCol      = () => cols > 1 && onUpdate({ headers: headers.slice(0, -1), rows: rows.map(r => ({ cells: r.cells.slice(0, -1) })) });

  return (
    <View style={tbl.wrap}>
      <View style={tbl.table}>
        <View style={tbl.row}>
          {headers.map((h, i) => (
            <View key={i} style={[tbl.cell, tbl.hCell, i < cols - 1 && tbl.rBorder]}>
              <TextInput style={tbl.hInput} value={h} onChangeText={v => setHeader(i, v)}
                placeholder={`Col ${i + 1}`} placeholderTextColor={Colors.accentLight + '66'} maxLength={60} />
            </View>
          ))}
          <View style={tbl.rmPlaceholder} />
        </View>
        {rows.map((row, ri) => (
          <View key={ri} style={[tbl.row, ri < rows.length - 1 && tbl.bBorder]}>
            {row.cells.map((c, ci) => (
              <Pressable key={ci} onPress={() => setCell({ r: ri, c: ci, header: false, val: c })}
                style={[tbl.cell, ci < cols - 1 && tbl.rBorder]}>
                <Text style={tbl.cellText} numberOfLines={2}>{c || <Text style={{ color: Colors.textMuted }}>tap</Text>}</Text>
              </Pressable>
            ))}
            <Pressable onPress={() => rmRow(ri)} style={tbl.rmBtn}>
              <Text style={{ color: Colors.error, fontSize: 11 }}>✕</Text>
            </Pressable>
          </View>
        ))}
      </View>

      <View style={tbl.actions}>
        <Pressable onPress={addRow} style={tbl.btn}><Text style={tbl.btnText}>+ Row</Text></Pressable>
        <Pressable onPress={addCol} style={tbl.btn}><Text style={tbl.btnText}>+ Col</Text></Pressable>
        {cols > 1 && (
          <Pressable onPress={rmCol} style={[tbl.btn, { borderColor: Colors.error + '44' }]}>
            <Text style={[tbl.btnText, { color: Colors.error }]}>− Col</Text>
          </Pressable>
        )}
      </View>

      <Modal visible={!!cell} animationType="fade" transparent>
        <View style={modalStyles.overlay}>
          <View style={modalStyles.box}>
            <Text style={modalStyles.title}>Edit Cell</Text>
            <Text style={modalStyles.hint}>Use &lt;b&gt;bold&lt;/b&gt; and &lt;i&gt;italic&lt;/i&gt;</Text>
            <TextInput style={modalStyles.input} value={cell?.val ?? ''}
              onChangeText={v => setCell(c => c ? { ...c, val: v } : null)}
              multiline autoFocus placeholder="Enter text…" placeholderTextColor={Colors.textMuted} maxLength={500} />
            <Pressable onPress={() => onAI(cell?.c ?? 0)} style={modalStyles.aiBtn}>
              <Text style={modalStyles.aiBtnText}>✦  Generate with AI</Text>
            </Pressable>
            <View style={modalStyles.actions}>
              <Pressable onPress={() => setCell(null)} style={modalStyles.cancel}>
                <Text style={modalStyles.cancelText}>Cancel</Text>
              </Pressable>
              <Pressable onPress={() => {
                if (cell) setCell_(cell.r, cell.c, cell.val);
                setCell(null);
              }} style={modalStyles.save}>
                <Text style={modalStyles.saveText}>Done</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      <TextInput style={tbl.captionInput} value={block.caption ?? ''} onChangeText={v => onUpdate({ caption: v })}
        placeholder="Hint / caption (optional)" placeholderTextColor={Colors.textMuted} maxLength={150} />
    </View>
  );
};

const tbl = StyleSheet.create({
  wrap:         { gap: Spacing.xs },
  table:        { borderWidth: 1, borderColor: Colors.border, borderRadius: Radius.md, overflow: 'hidden' },
  row:          { flexDirection: 'row' },
  bBorder:      { borderBottomWidth: 1, borderBottomColor: Colors.border },
  cell:         { flex: 1, padding: Spacing.sm, minHeight: 40, justifyContent: 'center' },
  hCell:        { backgroundColor: Colors.accent + '22' },
  rBorder:      { borderRightWidth: 1, borderRightColor: Colors.border },
  hInput:       { color: Colors.accentLight, fontWeight: '700', fontSize: FontSize.sm, padding: 0, flex: 1 },
  cellText:     { color: Colors.textPrimary, fontSize: FontSize.sm },
  rmBtn:        { paddingHorizontal: Spacing.sm, justifyContent: 'center' },
  rmPlaceholder:{ width: 28 },
  actions:      { flexDirection: 'row', gap: Spacing.sm, paddingTop: Spacing.xs },
  btn:          { paddingHorizontal: Spacing.md, paddingVertical: Spacing.xs, borderRadius: Radius.sm, borderWidth: 1, borderColor: Colors.border, backgroundColor: Colors.surfaceAlt },
  btnText:      { color: Colors.textSecondary, fontSize: FontSize.sm, fontWeight: '600' },
  captionInput: { backgroundColor: Colors.surfaceAlt, borderRadius: Radius.sm, borderWidth: 1, borderColor: Colors.border, color: Colors.textPrimary, fontSize: FontSize.sm, padding: Spacing.sm, marginTop: Spacing.xs },
});

// ─── ImageEditor ─────────────────────────────────────────────────
export const ImageEditor: React.FC<{
  block:         ContentBlock;
  chapterRecord: any;
  pendingImage:  import('../../../utils/pickImage').PickedImage | null;
  onSetPending:  (img: import('../../../utils/pickImage').PickedImage | null) => void;
  onUpdate:      (u: Partial<ContentBlock>) => void;
}> = ({ block, chapterRecord, pendingImage, onSetPending, onUpdate }) => {
  const [showPicker, setShowPicker] = useState(false);
  const savedUri   = block.imageFile ?? block.imageUrl ?? null;
  const displayUri = pendingImage?.uri ?? savedUri;

  return (
    <View style={img.wrap}>
      <ImagePickerModal
        visible={showPicker}
        onPicked={(picked) => { onSetPending(picked); setShowPicker(false); }}
        onCancel={() => setShowPicker(false)}
      />
      {displayUri ? (
        <>
          <Image source={{ uri: displayUri }} style={img.preview} resizeMode="contain" />
          <Pressable onPress={() => { onSetPending(null); onUpdate({ imageUrl: undefined, imageFile: undefined }); }} style={img.rmBtn}>
            <Text style={img.rmText}>Remove image</Text>
          </Pressable>
        </>
      ) : (
        <Pressable onPress={() => setShowPicker(true)} style={img.uploadBtn}>
          <Text style={img.uploadIcon}>🖼</Text>
          <Text style={img.uploadText}>Tap to add image</Text>
          <Text style={img.uploadHint}>Camera or Photo Library</Text>
        </Pressable>
      )}
      <TextInput style={img.captionInput} value={block.caption ?? ''} onChangeText={v => onUpdate({ caption: v })}
        placeholder="Hint / caption (optional)" placeholderTextColor={Colors.textMuted} maxLength={150} />
    </View>
  );
};

const img = StyleSheet.create({
  wrap:         { gap: Spacing.sm },
  preview:      { width: '100%', height: 180, borderRadius: Radius.md, backgroundColor: Colors.surfaceAlt },
  rmBtn:        { alignSelf: 'center' },
  rmText:       { color: Colors.error, fontSize: FontSize.sm },
  uploadBtn:    { borderWidth: 1.5, borderColor: Colors.border, borderStyle: 'dashed', borderRadius: Radius.md, padding: Spacing.xl, alignItems: 'center', gap: Spacing.xs },
  uploadIcon:   { fontSize: 32 },
  uploadText:   { color: Colors.textSecondary, fontSize: FontSize.md, fontWeight: '600' },
  uploadHint:   { color: Colors.textMuted, fontSize: FontSize.xs },
  captionInput: { backgroundColor: Colors.surfaceAlt, borderRadius: Radius.sm, borderWidth: 1, borderColor: Colors.border, color: Colors.textPrimary, fontSize: FontSize.sm, padding: Spacing.sm },
});

// ─── AudioEditor ─────────────────────────────────────────────────
export const AudioEditor: React.FC<{
  block:             ContentBlock;
  chapterRecord:     any;
  pendingAudio:      PickedAudio | null;
  onSetPendingAudio: (audio: PickedAudio | null) => void;
  onUpdate:          (u: Partial<ContentBlock>) => void;
}> = ({ block, chapterRecord, pendingAudio, onSetPendingAudio, onUpdate }) => {
  const [labelText, setLabelText] = useState(block.audioLabel ?? '');
  const savedUri   = block.audioFile ?? null;
  const displayUri = pendingAudio?.uri ?? savedUri;

  const handlePick = async () => {
    const audio = await pickAudio();
    if (!audio) return;
    onSetPendingAudio(audio);
  };

  return (
    <View style={au.wrap}>
      <TextInput style={au.labelInput} value={labelText}
        onChangeText={v => { setLabelText(v); onUpdate({ audioLabel: v }); }}
        placeholder="Label (optional, e.g. 'Example pronunciation')"
        placeholderTextColor={Colors.textMuted}
      />
      {displayUri ? (
        <>
          <AudioPlayer uri={displayUri} accentColor={Colors.accent} />
          <Pressable onPress={() => { onSetPendingAudio(null); onUpdate({ audioFile: undefined }); }} style={au.rmBtn}>
            <Text style={au.rmText}>Remove audio</Text>
          </Pressable>
        </>
      ) : (
        <Pressable onPress={handlePick} style={au.uploadBtn}>
          <View style={[au.uploadIconBox, { backgroundColor: Colors.accent + '33' }]}>
            <Text style={[au.uploadIconText, { color: Colors.accent }]}>♪</Text>
          </View>
          <Text style={au.uploadText}>Tap to add audio</Text>
          <Text style={au.uploadHint}>Pick an audio file from device</Text>
        </Pressable>
      )}
      <TextInput style={au.captionInput} value={block.caption ?? ''} onChangeText={v => onUpdate({ caption: v })}
        placeholder="Hint / caption (optional)" placeholderTextColor={Colors.textMuted} maxLength={150} />
    </View>
  );
};

const au = StyleSheet.create({
  wrap:          { gap: Spacing.sm },
  labelInput:    { backgroundColor: Colors.surfaceAlt, borderRadius: Radius.sm, borderWidth: 1, borderColor: Colors.border, color: Colors.textPrimary, fontSize: FontSize.sm, padding: Spacing.sm },
  rmBtn:         { alignSelf: 'center' },
  rmText:        { color: Colors.error, fontSize: FontSize.sm },
  uploadBtn:     { borderWidth: 1.5, borderColor: Colors.border, borderStyle: 'dashed', borderRadius: Radius.md, padding: Spacing.lg, alignItems: 'center', gap: Spacing.xs },
  uploadIconBox: { width: 44, height: 44, borderRadius: Radius.md, alignItems: 'center', justifyContent: 'center', marginBottom: Spacing.xs },
  uploadIconText:{ fontSize: 24, fontWeight: '700' },
  uploadText:    { color: Colors.textSecondary, fontSize: FontSize.md, fontWeight: '600' },
  uploadHint:    { color: Colors.textMuted, fontSize: FontSize.xs },
  captionInput:  { backgroundColor: Colors.surfaceAlt, borderRadius: Radius.sm, borderWidth: 1, borderColor: Colors.border, color: Colors.textPrimary, fontSize: FontSize.sm, padding: Spacing.sm },
});