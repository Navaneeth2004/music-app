import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, Pressable, ScrollView,
  TextInput, ActivityIndicator, Modal, Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import DraggableFlatList, { RenderItemParams } from 'react-native-draggable-flatlist';
import { GestureHandlerRootView, Swipeable } from 'react-native-gesture-handler';
import { Colors, FontSize, Spacing, Radius } from '../../../constants/theme';
import { Book, Chapter } from '../../../types';
import { ContentBlock, BlockType } from '../../../types/blocks';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { updateChapter } from '../../../api/content';
import { ConfirmModal } from '../../../components/shared/ConfirmModal';
import { pickAudio, PickedAudio } from '../../../utils/pickAudio';
import { ImagePickerModal } from '../../../components/shared/ImagePickerModal';
import { ImageLightbox } from '../../../components/shared/ImageLightbox';
import { AudioPlayer } from '../../../components/shared/AudioPlayer';

const uid = () => Math.random().toString(36).slice(2, 9);

interface Props { chapter: Chapter; book: Book; onBack: () => void; }

const BLOCK_META: { type: BlockType; label: string; icon: string; desc: string; color: string }[] = [
  { type: 'heading',    label: 'Heading',     icon: 'H1', desc: 'Large section title',                        color: '#7C6FF7' },
  { type: 'subheading', label: 'Subheading',  icon: 'H2', desc: 'Sub-section title',                         color: '#A89AF9' },
  { type: 'paragraph',  label: 'Paragraph',   icon: '¶',  desc: 'Body text · use <b>bold</b> <i>italic</i>', color: '#9896B0' },
  { type: 'bullets',    label: 'Bullet List', icon: '•',  desc: 'Multiple bullet points',                    color: '#4CAF88' },
  { type: 'table',      label: 'Table',       icon: '⊞',  desc: 'Comparison table (tap cells to edit)',       color: '#E05C6A' },
  { type: 'divider',    label: 'Divider',     icon: '—',  desc: 'Section separator',                         color: '#5A5870' },
  { type: 'image',      label: 'Image',       icon: '🖼',  desc: 'Upload an image',                           color: '#4A9EE0' },
  { type: 'audio',      label: 'Audio',       icon: '🎵',  desc: 'Attach an audio clip',                      color: '#E0904A' },
];
const metaFor = (t: BlockType) => BLOCK_META.find(m => m.type === t)!;

// ─── RichText ─────────────────────────────────────────────────
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

// ─── Main Editor ──────────────────────────────────────────────
export const BlockEditorScreen: React.FC<Props> = ({ chapter, book, onBack }) => {
  const [blocks, setBlocks] = useState<ContentBlock[]>(() => {
    try {
      const raw = (chapter as any).content;
      if (raw) return typeof raw === 'string' ? JSON.parse(raw) : raw;
    } catch {}
    return [];
  });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [hasDraft, setHasDraft] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const [isEditMode, setIsEditMode] = useState(true);
  const [showPicker, setShowPicker] = useState(false);
  const [insertAfter, setInsertAfter] = useState<string | null>(null);
  const [modalBlock, setModalBlock] = useState<ContentBlock | null>(null);
  const [modalText, setModalText] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [dragging, setDragging] = useState<string | null>(null);
  const swipeRefs = useRef<Map<string, Swipeable | null>>(new Map());

  const DRAFT_KEY = `block_draft_${chapter.id}`;

  // Pending images: blockId -> PickedImage (local uri, not yet uploaded to PB).
  // Stored in a ref so ImageEditor reads the latest value without stale closure issues.
  // A parallel state triggers re-renders when the map changes.
  type PI = import('../../../utils/pickImage').PickedImage;
  const pendingImages = useRef<Map<string, PI>>(new Map());
  const [, setPendingVersion] = useState(0);
  const setPending = (blockId: string, img: PI | null) => {
    if (img) pendingImages.current.set(blockId, img);
    else pendingImages.current.delete(blockId);
    setPendingVersion(v => v + 1); // force re-render so ImageEditor sees new value
  };

  // Pending audios: same pattern as pendingImages
  const pendingAudios = useRef<Map<string, PickedAudio>>(new Map());
  const setPendingAudio = (blockId: string, audio: PickedAudio | null) => {
    if (audio) pendingAudios.current.set(blockId, audio);
    else pendingAudios.current.delete(blockId);
    setPendingVersion(v => v + 1);
  };

  // Load draft if one exists (content already loaded synchronously above)
  useEffect(() => {
    AsyncStorage.getItem(DRAFT_KEY).then(raw => {
      if (raw) { setBlocks(JSON.parse(raw)); setHasDraft(true); }
    }).catch(() => {});
  }, []);

  // Draft is ONLY saved when user explicitly presses "Draft" — no auto-save

  const saveDraft = async (b: ContentBlock[]) => {
    // Merge pending images/audios into the draft so they're preserved,
    // but DON'T remove them from the pending refs (they're still unsaved to disk).
    let draftBlocks = [...b];
    for (const [blockId, picked] of pendingImages.current.entries()) {
      draftBlocks = draftBlocks.map(bl =>
        bl.id === blockId ? { ...bl, imageFile: picked.uri, imageUrl: undefined } : bl
      );
    }
    for (const [blockId, picked] of pendingAudios.current.entries()) {
      draftBlocks = draftBlocks.map(bl =>
        bl.id === blockId ? { ...bl, audioFile: picked.uri } : bl
      );
    }
    await AsyncStorage.setItem(DRAFT_KEY, JSON.stringify(draftBlocks)).catch(() => {});
    setHasDraft(true);
    setIsDirty(false);
  };

  const save = async (b: ContentBlock[]) => {
    setSaving(true);
    try {
      let finalBlocks = [...b];
      for (const [blockId, picked] of pendingImages.current.entries()) {
        finalBlocks = finalBlocks.map(bl =>
          bl.id === blockId ? { ...bl, imageFile: picked.uri, imageUrl: undefined } : bl
        );
        pendingImages.current.delete(blockId);
      }
      for (const [blockId, picked] of pendingAudios.current.entries()) {
        finalBlocks = finalBlocks.map(bl =>
          bl.id === blockId ? { ...bl, audioFile: picked.uri } : bl
        );
        pendingAudios.current.delete(blockId);
      }
      setPendingVersion(v => v + 1);
      setBlocks(finalBlocks);
      await updateChapter(chapter.id, { content: JSON.stringify(finalBlocks) } as any);
      // Clear draft after successful save
      await AsyncStorage.removeItem(DRAFT_KEY).catch(() => {});
      setHasDraft(false);
      setIsDirty(false);
      setSaved(true); setTimeout(() => setSaved(false), 2000);
    } catch {}
    finally { setSaving(false); }
  };

  const addBlock = (type: BlockType) => {
    const nb: ContentBlock = {
      id: uid(), type,
      text: ['heading','subheading','paragraph'].includes(type) ? '' : undefined,
      bullets: type === 'bullets' ? [''] : undefined,
      headers: type === 'table' ? ['Column 1', 'Column 2'] : undefined,
      rows: type === 'table' ? [{ cells: ['', ''] }] : undefined,
      collapsed: false,
    };
    setBlocks(prev => {
      if (insertAfter) {
        const idx = prev.findIndex(b => b.id === insertAfter);
        const next = [...prev]; next.splice(idx + 1, 0, nb); return next;
      }
      return [...prev, nb];
    });
    setIsDirty(true);
    setShowPicker(false); setInsertAfter(null);
  };

  const upd = (id: string, u: Partial<ContentBlock>) => {
    setBlocks(prev => prev.map(b => b.id === id ? { ...b, ...u } : b));
    setIsDirty(true);
  };

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaView style={s.safe}>
        {/* Header */}
        <View style={s.header}>
        <Pressable onPress={onBack} style={s.backBtn}>
          <Text style={s.backText}>← Back</Text>
        </Pressable>
        <View style={{ flex: 1, alignItems: 'center' }}>
          <Text style={s.headerTitle} numberOfLines={1}>{chapter.title}</Text>
          {hasDraft && !isEditMode && !isDirty && (
            <View style={s.draftBadge}><Text style={s.draftBadgeText}>📝 Draft saved</Text></View>
          )}
        </View>
        {isEditMode ? (
          <View style={{ flexDirection: 'row', gap: 6 }}>
            <Pressable
              onPress={() => saveDraft(blocks)}
              disabled={!isDirty}
              style={[s.headerBtn, isDirty ? s.draftBtnActive : s.draftBtnIdle]}
            >
              <Text style={[s.draftBtnText, { color: isDirty ? Colors.warning : Colors.textMuted }]}>
                {hasDraft && !isDirty ? '✓ Drafted' : 'Draft'}
              </Text>
            </Pressable>
            <Pressable onPress={async () => { await save(blocks); onBack(); }}
              style={[s.headerBtn, s.saveBtn, !isDirty && { opacity: 0.4 }]} disabled={saving || !isDirty}>
              {saving ? <ActivityIndicator size="small" color="#fff" /> : <Text style={s.saveBtnText}>{saved ? '✓' : 'Save'}</Text>}
            </Pressable>
          </View>
        ) : (
          <Pressable onPress={() => setIsEditMode(true)} style={[s.headerBtn, s.editBtn]}>
            <Text style={s.editBtnText}>✏️ Edit</Text>
          </Pressable>
        )}
      </View>

      {/* PREVIEW mode */}
      {!isEditMode && (
        <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          {blocks.length === 0 && (
            <View style={s.empty}>
              <Text style={s.emptyIcon}>📝</Text>
              <Text style={s.emptyTitle}>No content yet</Text>
              <Text style={s.emptySub}>Press Edit to start building</Text>
            </View>
          )}
          {blocks.map(b => <PreviewBlock key={b.id} block={b} chapterRecord={chapter} />)}
        </ScrollView>
      )}

      {/* EDIT mode */}
      {isEditMode && (
        <DraggableFlatList
          data={blocks}
          keyExtractor={b => b.id}
          onDragEnd={({ data }) => { setBlocks(data); setIsDirty(true); }}
          contentContainerStyle={s.content}
          keyboardShouldPersistTaps="handled"
          renderItem={({ item: block, getIndex, drag, isActive }: RenderItemParams<ContentBlock>) => {
            const idx = getIndex() ?? 0;
            return (
              <Swipeable
                ref={r => { swipeRefs.current.set(block.id, r); }}
                renderRightActions={() => <View style={{ width: 60 }} />}
                onSwipeableWillOpen={() => setDeleteTarget(block.id)}
                overshootRight={false}
                friction={2}
                rightThreshold={60}
              >
                <EditBlock
                  key={block.id}
                  block={block}
                  isFirst={idx === 0}
                  isLast={idx === blocks.length - 1}
                  chapterId={chapter.id}
                  onUpdate={u => upd(block.id, u)}
                  onDelete={() => setDeleteTarget(block.id)}
                  onDrag={drag}
                  isActive={isActive}
                  onToggle={() => upd(block.id, { collapsed: !block.collapsed })}
                  onAddAfter={() => { setInsertAfter(block.id); setShowPicker(true); }}
                  onOpenModal={() => { setModalBlock(block); setModalText(block.text ?? ''); }}
                  chapterRecord={chapter}
                  pendingImage={pendingImages.current.get(block.id) ?? null}
                  onSetPending={(img) => setPending(block.id, img)}
                  pendingAudio={pendingAudios.current.get(block.id) ?? null}
                  onSetPendingAudio={(audio) => setPendingAudio(block.id, audio)}
                />
              </Swipeable>
            );
          }}
          ListFooterComponent={
            <View style={{ paddingBottom: Spacing.xxl }}>
              <Pressable onPress={() => { setInsertAfter(null); setShowPicker(true); }} style={s.addBlockBtn}>
                <Text style={s.addBlockText}>+ Add Block</Text>
              </Pressable>
            </View>
          }
        />
      )}

      {/* Block picker */}
      {showPicker && (
        <View style={s.overlay}>
          <Pressable style={s.backdrop} onPress={() => setShowPicker(false)} />
          <View style={s.sheet}>
            <View style={s.sheetHandle} />
            <View style={s.sheetHeader}>
              <Text style={s.sheetTitle}>Add Block</Text>
              <Pressable onPress={() => setShowPicker(false)}><Text style={s.sheetClose}>✕</Text></Pressable>
            </View>
            <ScrollView>
              {BLOCK_META.map(bm => (
                <Pressable key={bm.type} onPress={() => addBlock(bm.type)}
                  style={({ pressed }) => [s.pickerRow, pressed && s.pickerRowPressed]}>
                  <View style={[s.pickerIcon, { backgroundColor: bm.color + '22' }]}>
                    <Text style={[s.pickerIconText, { color: bm.color }]}>{bm.icon}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={s.pickerLabel}>{bm.label}</Text>
                    <Text style={s.pickerDesc}>{bm.desc}</Text>
                  </View>
                </Pressable>
              ))}
            </ScrollView>
          </View>
        </View>
      )}

      {/* Text modal */}
      <Modal visible={!!modalBlock} animationType="slide" transparent>
        <View style={s.modalOverlay}>
          <View style={s.modalBox}>
            <Text style={s.modalTitle}>{modalBlock ? metaFor(modalBlock.type).label : ''}</Text>
            {(modalBlock?.type === 'paragraph') && (
              <Text style={s.modalHint}>Use &lt;b&gt;bold&lt;/b&gt; and &lt;i&gt;italic&lt;/i&gt;</Text>
            )}
            <TextInput style={s.modalInput} value={modalText} onChangeText={setModalText}
              multiline autoFocus placeholder="Type here..." placeholderTextColor={Colors.textMuted} />
            <View style={s.modalActions}>
              <Pressable onPress={() => { setModalBlock(null); setModalText(''); }} style={s.modalCancel}>
                <Text style={s.modalCancelText}>Cancel</Text>
              </Pressable>
              <Pressable onPress={() => {
                if (modalBlock) upd(modalBlock.id, { text: modalText });
                setModalBlock(null); setModalText('');
              }} style={s.modalSave}>
                <Text style={s.modalSaveText}>Done</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* Delete confirm */}
      <ConfirmModal
        visible={!!deleteTarget}
        title="Delete Block"
        message="Remove this block? This cannot be undone."
        onConfirm={() => {
          swipeRefs.current.get(deleteTarget!)?.close();
          setBlocks(prev => prev.filter(b => b.id !== deleteTarget));
          setIsDirty(true);
          setDeleteTarget(null);
        }}
        onCancel={() => {
          swipeRefs.current.get(deleteTarget!)?.close();
          setDeleteTarget(null);
        }}
      />
      </SafeAreaView>
    </GestureHandlerRootView>
  );
};

// ─── Preview ──────────────────────────────────────────────────
const TappablePreviewImage: React.FC<{ uri: string }> = ({ uri }) => {
  const [open, setOpen] = React.useState(false);
  return (
    <>
      <Pressable onPress={() => setOpen(true)}>
        <Image source={{ uri }} style={pv.image} resizeMode="contain" />
      </Pressable>
      <ImageLightbox uri={open ? uri : null} onClose={() => setOpen(false)} />
    </>
  );
};

const PreviewBlock: React.FC<{ block: ContentBlock; chapterRecord: any }> = ({ block: b, chapterRecord }) => {
  if (b.type === 'divider') return <View style={pv.divider} />;
  if (b.type === 'heading') return <RichText text={b.text ?? ''} style={pv.heading} />;
  if (b.type === 'subheading') return <RichText text={b.text ?? ''} style={pv.subheading} />;
  if (b.type === 'paragraph') return <RichText text={b.text ?? ''} style={pv.paragraph} />;
  if (b.type === 'bullets') return (
    <View style={pv.bullets}>
      {(b.bullets ?? []).map((pt, i) => (
        <View key={i} style={pv.bulletRow}>
          <View style={pv.dot} />
          <RichText text={pt} style={pv.bulletText} />
        </View>
      ))}
    </View>
  );
  if (b.type === 'image') {
    // imageFile stores a full local URI with SQLite (or legacy PB filename for old data)
    const imgUri = b.imageFile ?? b.imageUrl ?? null;
    if (!imgUri) return null;
    return (
      <View>
        <TappablePreviewImage uri={imgUri} />
        {b.caption ? <Text style={pv.caption}>{b.caption}</Text> : null}
      </View>
    );
  }
  if (b.type === 'audio') {
    // audioFile stores a full local URI with SQLite
    const uri = b.audioFile ?? null;
    if (!uri) return null;
    return (
      <View style={pv.audioWrap}>
        {b.audioLabel ? <Text style={pv.blockLabel}>{b.audioLabel}</Text> : null}
        <AudioPlayer uri={uri} accentColor={Colors.accent} />
        {b.caption ? <Text style={pv.caption}>{b.caption}</Text> : null}
      </View>
    );
  }
  if (b.type === 'table') {
    const headers = b.headers ?? []; const rows = b.rows ?? [];
    return (
      <View>
        <View style={pv.table}>
          <View style={pv.tableHRow}>
            {headers.map((h, i) => (
              <View key={i} style={[pv.tableCell, i < headers.length - 1 && pv.cellBorder]}>
                <RichText text={h} style={pv.tableHText} />
              </View>
            ))}
          </View>
          {rows.map((row, ri) => (
            <View key={ri} style={[pv.tableRow, ri < rows.length - 1 && pv.rowBorder]}>
              {row.cells.map((cell, ci) => (
                <View key={ci} style={[pv.tableCell, ci < row.cells.length - 1 && pv.cellBorder]}>
                  <RichText text={cell} style={pv.tableCellText} />
                </View>
              ))}
            </View>
          ))}
        </View>
        {b.caption ? <Text style={pv.caption}>{b.caption}</Text> : null}
      </View>
    );
  }
  return null;
};

const pv = StyleSheet.create({
  heading: { fontSize: FontSize.xl, fontWeight: '800', color: Colors.textPrimary, marginTop: Spacing.lg, marginBottom: Spacing.sm },
  subheading: { fontSize: FontSize.lg, fontWeight: '700', color: Colors.textPrimary, marginTop: Spacing.md, marginBottom: Spacing.xs },
  paragraph: { fontSize: FontSize.md, color: Colors.textSecondary, lineHeight: 24, marginBottom: Spacing.md },
  bullets: { marginBottom: Spacing.md, gap: Spacing.xs },
  bulletRow: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.sm },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: Colors.accent, marginTop: 9 },
  bulletText: { flex: 1, fontSize: FontSize.md, color: Colors.textSecondary, lineHeight: 24 },
  divider: { height: 1, backgroundColor: Colors.border, marginVertical: Spacing.lg },
  image: { width: '100%', height: 200, borderRadius: Radius.md, marginBottom: Spacing.md },
  audioWrap: { marginBottom: Spacing.md },
  caption:    { fontSize: FontSize.xs, color: Colors.textMuted, fontStyle: 'italic', marginTop: 4 },
  blockLabel: { fontSize: FontSize.xs, color: Colors.textMuted, fontWeight: '600', marginBottom: 4, textTransform: 'uppercase', letterSpacing: 0.5 },
  table: { borderWidth: 1, borderColor: Colors.border, borderRadius: Radius.md, overflow: 'hidden', marginBottom: Spacing.md },
  tableHRow: { flexDirection: 'row', backgroundColor: Colors.accent + '22' },
  tableRow: { flexDirection: 'row' },
  rowBorder: { borderBottomWidth: 1, borderBottomColor: Colors.border },
  tableCell: { flex: 1, padding: Spacing.sm },
  cellBorder: { borderRightWidth: 1, borderRightColor: Colors.border },
  tableHText: { color: Colors.accentLight, fontWeight: '700', fontSize: FontSize.sm },
  tableCellText: { color: Colors.textSecondary, fontSize: FontSize.sm },
});

// ─── Edit Block Card ──────────────────────────────────────────
type PI = import('../../../utils/pickImage').PickedImage;
interface EditBlockProps {
  block: ContentBlock; isFirst: boolean; isLast: boolean; chapterId: string;
  chapterRecord: any;
  onUpdate: (u: Partial<ContentBlock>) => void;
  onDelete: () => void; onDrag: () => void; isActive: boolean;
  onToggle: () => void; onAddAfter: () => void; onOpenModal: () => void;
  pendingImage: PI | null;
  onSetPending: (img: PI | null) => void;
  pendingAudio: PickedAudio | null;
  onSetPendingAudio: (audio: PickedAudio | null) => void;
}

const EditBlock: React.FC<EditBlockProps> = ({
  block, isFirst, isLast, chapterId, chapterRecord, onUpdate, onDelete,
  onDrag, isActive, onToggle, onAddAfter, onOpenModal,
  pendingImage, onSetPending, pendingAudio, onSetPendingAudio,
}) => {
  const meta = metaFor(block.type);
  const preview = block.type === 'bullets' ? (block.bullets ?? []).join(' • ').slice(0, 50)
    : block.type === 'table' ? (block.headers ?? []).join(' | ')
    : block.type === 'image' ? (block.imageUrl ? '🖼 Image' : '🖼 Empty')
    : block.type === 'audio' ? (block.audioFile ? '🎵 Audio attached' : '🎵 No audio yet')
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
          {block.type === 'image' && <ImageEditor block={block} chapterRecord={chapterRecord} pendingImage={pendingImage} onSetPending={onSetPending} onUpdate={onUpdate} />}
          {block.type === 'audio' && <AudioEditor block={block} chapterRecord={chapterRecord} pendingAudio={pendingAudio} onSetPendingAudio={onSetPendingAudio} onUpdate={onUpdate} />}
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
          {block.type === 'bullets' && <BulletsEditor block={block} onUpdate={onUpdate} />}
          {block.type === 'table' && <TableEditor block={block} onUpdate={onUpdate} />}
        </View>
      )}

      <Pressable onPress={onAddAfter} style={eb.insertBtn}>
        <Text style={eb.insertText}>＋ insert block here</Text>
      </Pressable>
    </View>
  );
};

const eb = StyleSheet.create({
  card: { backgroundColor: Colors.surface, borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.border, borderLeftWidth: 3, marginBottom: Spacing.sm },
  cardHead: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm },
  tag: { flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: 999, paddingHorizontal: Spacing.sm, paddingVertical: 3 },
  tagIcon: { fontSize: FontSize.sm, fontWeight: '800' },
  tagLabel: { fontSize: FontSize.xs, fontWeight: '700', letterSpacing: 0.5 },
  previewText: { flex: 1, color: Colors.textMuted, fontSize: FontSize.sm },
  headActions: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs, marginLeft: 'auto' },
  dragHandle: { flexDirection: 'row', gap: 2, backgroundColor: Colors.surfaceAlt, borderRadius: Radius.sm, paddingHorizontal: 4 },
  dragBtn: { padding: 4 },
  dragBtnText: { color: Colors.textSecondary, fontSize: FontSize.md, fontWeight: '700' },
  arrow: { color: Colors.textMuted, fontSize: FontSize.xs, marginLeft: 2 },
  body: { paddingHorizontal: Spacing.md, paddingBottom: Spacing.md },
  dividerLine: { height: 1, backgroundColor: Colors.border, marginVertical: Spacing.sm },
  tapArea: { backgroundColor: Colors.surfaceAlt, borderRadius: Radius.sm, borderWidth: 1, borderColor: Colors.border, padding: Spacing.md, gap: 4 },
  tapValue: { color: Colors.textPrimary, fontSize: FontSize.md },
  h1: { fontSize: FontSize.xl, fontWeight: '800' },
  h2: { fontSize: FontSize.lg, fontWeight: '700' },
  paraText: { color: Colors.textPrimary, fontSize: FontSize.md, lineHeight: 22 },
  placeholder: { color: Colors.textMuted, fontSize: FontSize.sm, fontStyle: 'italic' },
  tapHint: { color: Colors.textMuted, fontSize: FontSize.xs, textAlign: 'right' },
  insertBtn: { paddingVertical: 7, alignItems: 'center', borderTopWidth: 1, borderTopColor: Colors.border + '55' },
  insertText: { color: Colors.textMuted, fontSize: FontSize.xs },
});

// ─── Bullets Editor ───────────────────────────────────────────
const BulletsEditor: React.FC<{ block: ContentBlock; onUpdate: (u: Partial<ContentBlock>) => void }> = ({ block, onUpdate }) => {
  const bullets = block.bullets ?? [''];
  return (
    <View style={{ gap: Spacing.xs }}>
      {bullets.map((b, i) => (
        <View key={i} style={bl.row}>
          <View style={bl.dot} />
          <TextInput style={bl.input} value={b} onChangeText={v => {
            const nb = [...bullets]; nb[i] = v; onUpdate({ bullets: nb });
          }} placeholder={`Point ${i + 1}`} placeholderTextColor={Colors.textMuted} />
          {bullets.length > 1 && (
            <Pressable onPress={() => onUpdate({ bullets: bullets.filter((_, bi) => bi !== i) })} style={bl.rm}>
              <Text style={{ color: Colors.error, fontSize: 13 }}>✕</Text>
            </Pressable>
          )}
        </View>
      ))}
      <Pressable onPress={() => onUpdate({ bullets: [...bullets, ''] })} style={bl.addBtn}>
        <Text style={bl.addText}>+ Add bullet</Text>
      </Pressable>
    </View>
  );
};
const bl = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: Colors.accent },
  input: { flex: 1, backgroundColor: Colors.surfaceAlt, borderRadius: Radius.sm, borderWidth: 1, borderColor: Colors.border, color: Colors.textPrimary, fontSize: FontSize.md, padding: Spacing.sm },
  rm: { padding: 6 },
  addBtn: { marginTop: Spacing.xs },
  addText: { color: Colors.success, fontSize: FontSize.sm, fontWeight: '600' },
});

// ─── Table Editor ─────────────────────────────────────────────
const TableEditor: React.FC<{ block: ContentBlock; onUpdate: (u: Partial<ContentBlock>) => void }> = ({ block, onUpdate }) => {
  const headers = block.headers ?? [];
  const rows = block.rows ?? [];
  const cols = headers.length;
  const [cell, setCell] = useState<{ r: number; c: number; header: boolean; val: string } | null>(null);

  const setHeader = (i: number, v: string) => { const h = [...headers]; h[i] = v; onUpdate({ headers: h }); };
  const setCell_ = (ri: number, ci: number, v: string) => onUpdate({ rows: rows.map((row, r) => r !== ri ? row : { cells: row.cells.map((c, ci2) => ci2 !== ci ? c : v) }) });
  const addRow = () => onUpdate({ rows: [...rows, { cells: Array(cols).fill('') }] });
  const rmRow = (i: number) => onUpdate({ rows: rows.filter((_, ri) => ri !== i) });
  const addCol = () => onUpdate({ headers: [...headers, `Col ${cols + 1}`], rows: rows.map(r => ({ cells: [...r.cells, ''] })) });
  const rmCol = () => cols > 1 && onUpdate({ headers: headers.slice(0, -1), rows: rows.map(r => ({ cells: r.cells.slice(0, -1) })) });

  return (
    <View style={tbl.wrap}>
      <View style={tbl.table}>
        <View style={tbl.row}>
          {headers.map((h, i) => (
            <Pressable key={i} onPress={() => setCell({ r: -1, c: i, header: true, val: h })}
              style={[tbl.cell, tbl.hCell, i < cols - 1 && tbl.rBorder]}>
              <Text style={tbl.hText} numberOfLines={1}>{h || 'Header'}</Text>
            </Pressable>
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
        {cols > 1 && <Pressable onPress={rmCol} style={[tbl.btn, { borderColor: Colors.error + '44' }]}><Text style={[tbl.btnText, { color: Colors.error }]}>− Col</Text></Pressable>}
      </View>

      <Modal visible={!!cell} animationType="fade" transparent>
        <View style={s.modalOverlay}>
          <View style={s.modalBox}>
            <Text style={s.modalTitle}>{cell?.header ? 'Edit Header' : 'Edit Cell'}</Text>
            <Text style={s.modalHint}>Use &lt;b&gt;bold&lt;/b&gt; and &lt;i&gt;italic&lt;/i&gt;</Text>
            <TextInput style={s.modalInput} value={cell?.val ?? ''} onChangeText={v => setCell(c => c ? { ...c, val: v } : null)}
              multiline autoFocus placeholder="Enter text…" placeholderTextColor={Colors.textMuted} />
            <View style={s.modalActions}>
              <Pressable onPress={() => setCell(null)} style={s.modalCancel}><Text style={s.modalCancelText}>Cancel</Text></Pressable>
              <Pressable onPress={() => {
                if (cell) { cell.header ? setHeader(cell.c, cell.val) : setCell_(cell.r, cell.c, cell.val); }
                setCell(null);
              }} style={s.modalSave}><Text style={s.modalSaveText}>Done</Text></Pressable>
            </View>
          </View>
        </View>
      </Modal>
      <TextInput
        style={tbl.captionInput}
        value={block.caption ?? ''}
        onChangeText={v => onUpdate({ caption: v })}
        placeholder="Caption / hint (optional)"
        placeholderTextColor={Colors.textMuted}
      />
    </View>
  );
};

const tbl = StyleSheet.create({
  wrap: { gap: Spacing.xs },
  table: { borderWidth: 1, borderColor: Colors.border, borderRadius: Radius.md, overflow: 'hidden' },
  row: { flexDirection: 'row' },
  bBorder: { borderBottomWidth: 1, borderBottomColor: Colors.border },
  cell: { flex: 1, padding: Spacing.sm, minHeight: 40, justifyContent: 'center' },
  hCell: { backgroundColor: Colors.accent + '22' },
  rBorder: { borderRightWidth: 1, borderRightColor: Colors.border },
  hText: { color: Colors.accentLight, fontWeight: '700', fontSize: FontSize.sm },
  cellText: { color: Colors.textPrimary, fontSize: FontSize.sm },
  rmBtn: { paddingHorizontal: Spacing.sm, justifyContent: 'center' },
  rmPlaceholder: { width: 28 },
  actions: { flexDirection: 'row', gap: Spacing.sm, paddingTop: Spacing.xs },
  btn: { paddingHorizontal: Spacing.md, paddingVertical: Spacing.xs, borderRadius: Radius.sm, borderWidth: 1, borderColor: Colors.border, backgroundColor: Colors.surfaceAlt },
  btnText:      { color: Colors.textSecondary, fontSize: FontSize.sm, fontWeight: '600' },
  captionInput: { backgroundColor: Colors.surfaceAlt, borderRadius: Radius.sm, borderWidth: 1, borderColor: Colors.border, color: Colors.textPrimary, fontSize: FontSize.sm, padding: Spacing.sm, marginTop: Spacing.xs },
});

// ─── Image Editor ─────────────────────────────────────────────
// No upload happens here. Image is stored locally (pendingImage) until Save is pressed.
// On Save, the parent uploads all pending images and writes their PB urls into the blocks.
// This is exactly how FlashcardFormScreen works — no race conditions, no flicker.
const ImageEditor: React.FC<{
  block: ContentBlock;
  chapterRecord: any;
  pendingImage: import('../../../utils/pickImage').PickedImage | null;
  onSetPending: (img: import('../../../utils/pickImage').PickedImage | null) => void;
  onUpdate: (u: Partial<ContentBlock>) => void;
}> = ({ block, chapterRecord, pendingImage, onSetPending, onUpdate }) => {
  const [showPicker, setShowPicker] = useState(false);

  // imageFile is a full local URI with SQLite; fall back to legacy imageUrl
  const savedUri = block.imageFile ?? block.imageUrl ?? null;
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
      <TextInput
        style={img.captionInput}
        value={block.caption ?? ''}
        onChangeText={v => onUpdate({ caption: v })}
        placeholder="Caption / hint (optional)"
        placeholderTextColor={Colors.textMuted}
      />
    </View>
  );
};

const img = StyleSheet.create({
  wrap: { gap: Spacing.sm },
  preview: { width: '100%', height: 180, borderRadius: Radius.md, backgroundColor: Colors.surfaceAlt },
  rmBtn: { alignSelf: 'center' },
  rmText: { color: Colors.error, fontSize: FontSize.sm },
  uploadBtn: { borderWidth: 1.5, borderColor: Colors.border, borderStyle: 'dashed', borderRadius: Radius.md, padding: Spacing.xl, alignItems: 'center', gap: Spacing.xs },
  uploadIcon: { fontSize: 32 },
  uploadText: { color: Colors.textSecondary, fontSize: FontSize.md, fontWeight: '600' },
  uploadHint: { color: Colors.textMuted, fontSize: FontSize.xs },
  captionInput: { backgroundColor: Colors.surfaceAlt, borderRadius: Radius.sm, borderWidth: 1, borderColor: Colors.border, color: Colors.textPrimary, fontSize: FontSize.sm, padding: Spacing.sm },
  unsavedBadge: { backgroundColor: Colors.warning + '22', borderRadius: Radius.sm, padding: Spacing.xs, alignItems: 'center' },
  unsavedText: { color: Colors.warning, fontSize: FontSize.xs, fontWeight: '600' },
});

// ─── Audio Editor ─────────────────────────────────────────────
// Same deferred-upload pattern as ImageEditor: audio is picked locally,
// stored in pendingAudios ref, and uploaded on Save.
const AudioEditor: React.FC<{
  block: ContentBlock;
  chapterRecord: any;
  pendingAudio: PickedAudio | null;
  onSetPendingAudio: (audio: PickedAudio | null) => void;
  onUpdate: (u: Partial<ContentBlock>) => void;
}> = ({ block, chapterRecord, pendingAudio, onSetPendingAudio, onUpdate }) => {
  const [labelText, setLabelText] = useState(block.audioLabel ?? '');

  // audioFile is a full local URI with SQLite
  const savedUri = block.audioFile ?? null;
  const displayUri = pendingAudio?.uri ?? savedUri;

  const handlePick = async () => {
    const audio = await pickAudio();
    if (!audio) return;
    onSetPendingAudio(audio);
  };

  return (
    <View style={au.wrap}>
      {/* Optional label */}
      <TextInput
        style={au.labelInput}
        value={labelText}
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
      <TextInput
        style={au.captionInput}
        value={block.caption ?? ''}
        onChangeText={v => onUpdate({ caption: v })}
        placeholder="Caption / hint (optional)"
        placeholderTextColor={Colors.textMuted}
      />
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
  unsavedBadge:  { backgroundColor: Colors.warning + '22', borderRadius: Radius.sm, padding: Spacing.xs, alignItems: 'center' },
  unsavedText:   { color: Colors.warning, fontSize: FontSize.xs, fontWeight: '600' },
});

// ─── Main styles ──────────────────────────────────────────────
const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, borderBottomWidth: 1, borderBottomColor: Colors.border, gap: Spacing.sm },
  backBtn: { paddingVertical: Spacing.sm },
  backText: { color: Colors.accentLight, fontSize: FontSize.md },
  headerTitle: { color: Colors.textPrimary, fontSize: FontSize.md, fontWeight: '700', textAlign: 'center' },
  draftBadge: { backgroundColor: Colors.warning + '22', borderRadius: 999, paddingHorizontal: 8, paddingVertical: 2, marginTop: 2 },
  draftBadgeText: { color: Colors.warning, fontSize: 10, fontWeight: '600' },
  headerBtn: { borderRadius: Radius.md, paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, minWidth: 56, alignItems: 'center' },
  saveBtn: { backgroundColor: Colors.accent },
  saveBtnText: { color: Colors.textPrimary, fontWeight: '700', fontSize: FontSize.sm },
  draftBtnActive: { backgroundColor: Colors.warning + '33', borderWidth: 1, borderColor: Colors.warning + '88' },
  draftBtnIdle:   { backgroundColor: Colors.surfaceAlt, borderWidth: 1, borderColor: Colors.border },
  draftBtnText:   { fontWeight: '700', fontSize: FontSize.sm },
  editBtn: { backgroundColor: Colors.surfaceAlt, borderWidth: 1, borderColor: Colors.border },
  editBtnText: { color: Colors.textPrimary, fontWeight: '600', fontSize: FontSize.sm },
  content: { padding: Spacing.md, paddingBottom: Spacing.xxl },
  empty: { alignItems: 'center', paddingVertical: Spacing.xxl, gap: Spacing.sm },
  emptyIcon: { fontSize: 40 },
  emptyTitle: { fontSize: FontSize.lg, fontWeight: '700', color: Colors.textPrimary },
  emptySub: { fontSize: FontSize.md, color: Colors.textSecondary },
  addBlockBtn: { borderWidth: 1.5, borderColor: Colors.accent + '66', borderStyle: 'dashed', borderRadius: Radius.md, paddingVertical: Spacing.md, alignItems: 'center', marginTop: Spacing.sm },
  addBlockText: { color: Colors.accent, fontSize: FontSize.md, fontWeight: '600' },
  overlay: { ...StyleSheet.absoluteFillObject, justifyContent: 'flex-end', zIndex: 100 },
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.6)' },
  sheet: { backgroundColor: Colors.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, borderWidth: 1, borderColor: Colors.border, maxHeight: '72%' },
  sheetHandle: { width: 36, height: 4, borderRadius: 2, backgroundColor: Colors.border, alignSelf: 'center', marginTop: Spacing.sm },
  sheetHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: Spacing.lg, borderBottomWidth: 1, borderBottomColor: Colors.border },
  sheetTitle: { fontSize: FontSize.lg, fontWeight: '700', color: Colors.textPrimary },
  sheetClose: { color: Colors.textMuted, fontSize: FontSize.lg },
  pickerRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, padding: Spacing.md, paddingHorizontal: Spacing.lg },
  pickerRowPressed: { backgroundColor: Colors.surfaceAlt },
  pickerIcon: { width: 42, height: 42, borderRadius: Radius.sm, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: Colors.border },
  pickerIconText: { fontSize: FontSize.md, fontWeight: '800' },
  pickerLabel: { color: Colors.textPrimary, fontSize: FontSize.md, fontWeight: '600' },
  pickerDesc: { color: Colors.textSecondary, fontSize: FontSize.sm },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.75)', justifyContent: 'center', padding: Spacing.lg },
  modalBox: { backgroundColor: Colors.surface, borderRadius: Radius.lg, borderWidth: 1, borderColor: Colors.border, padding: Spacing.lg, gap: Spacing.md },
  modalTitle: { color: Colors.textPrimary, fontSize: FontSize.lg, fontWeight: '700' },
  modalHint: { color: Colors.textMuted, fontSize: FontSize.xs },
  modalInput: { backgroundColor: Colors.surfaceAlt, borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.border, color: Colors.textPrimary, fontSize: FontSize.md, padding: Spacing.md, minHeight: 160, textAlignVertical: 'top' },
  modalActions: { flexDirection: 'row', gap: Spacing.sm },
  modalCancel: { flex: 1, padding: Spacing.md, borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.border, alignItems: 'center' },
  modalCancelText: { color: Colors.textSecondary, fontWeight: '600' },
  modalSave: { flex: 1, padding: Spacing.md, borderRadius: Radius.md, backgroundColor: Colors.accent, alignItems: 'center' },
  modalSaveText: { color: Colors.textPrimary, fontWeight: '700' },
});