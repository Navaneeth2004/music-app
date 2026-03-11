import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, Pressable, ScrollView,
  TextInput, ActivityIndicator, Modal,
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
import { BackButton } from '../../../components/shared/Backbutton';
import { PickedAudio } from '../../../utils/pickAudio';
import { BlockPreview } from '../../../components/shared/Blockpreview';
import { AIGenerateScreen, AITarget } from '../../AIGenerateScreen';
import {
  EditBlock, BLOCK_META, metaFor, modalStyles,
} from './BlockEditorItems';

const uid = () => Math.random().toString(36).slice(2, 9);

interface Props { chapter: Chapter; book: Book; onBack: () => void; }

export const BlockEditorScreen: React.FC<Props> = ({ chapter, book, onBack }) => {
  const [blocks, setBlocks] = useState<ContentBlock[]>(() => {
    try {
      const raw = (chapter as any).content;
      if (raw) return typeof raw === 'string' ? JSON.parse(raw) : raw;
    } catch {}
    return [];
  });
  const [backLoading, setBackLoading] = useState(false);
  const [saving,      setSaving]      = useState(false);
  const [draftSaving, setDraftSaving] = useState(false);
  const [editLoading, setEditLoading] = useState(false);
  const [saved,       setSaved]       = useState(false);
  const [hasDraft,    setHasDraft]    = useState(false);
  const [isDirty,     setIsDirty]     = useState(false);
  const [isEditMode,  setIsEditMode]  = useState(true);
  const [showPicker,  setShowPicker]  = useState(false);
  const [insertAfter, setInsertAfter] = useState<string | null>(null);
  const [modalBlock,  setModalBlock]  = useState<ContentBlock | null>(null);
  const [modalText,   setModalText]   = useState('');
  const [aiTarget,    setAiTarget]    = useState<AITarget | null>(null);
  const [deleteTarget,setDeleteTarget]= useState<string | null>(null);
  const swipeRefs = useRef<Map<string, Swipeable | null>>(new Map());

  const DRAFT_KEY = `block_draft_${chapter.id}`;

  type PI = import('../../../utils/pickImage').PickedImage;
  const pendingImages = useRef<Map<string, PI>>(new Map());
  const [, setPendingVersion] = useState(0);
  const setPending = (blockId: string, img: PI | null) => {
    if (img) pendingImages.current.set(blockId, img);
    else pendingImages.current.delete(blockId);
    setPendingVersion(v => v + 1);
  };

  const pendingAudios = useRef<Map<string, PickedAudio>>(new Map());
  const setPendingAudio = (blockId: string, audio: PickedAudio | null) => {
    if (audio) pendingAudios.current.set(blockId, audio);
    else pendingAudios.current.delete(blockId);
    setPendingVersion(v => v + 1);
  };

  useEffect(() => {
    AsyncStorage.getItem(DRAFT_KEY).then(raw => {
      // Load draft blocks but do NOT mark dirty — draft is already saved,
      // so Draft button should show "✓ Drafted" (grayed), not active.
      if (raw) { setBlocks(JSON.parse(raw)); setHasDraft(true); setIsDirty(false); }
    }).catch(() => {});
  }, []);

  const saveDraft = async (b: ContentBlock[]) => {
    let draftBlocks = [...b];
    for (const [blockId, picked] of pendingImages.current.entries())
      draftBlocks = draftBlocks.map(bl => bl.id === blockId ? { ...bl, imageFile: picked.uri, imageUrl: undefined } : bl);
    for (const [blockId, picked] of pendingAudios.current.entries())
      draftBlocks = draftBlocks.map(bl => bl.id === blockId ? { ...bl, audioFile: picked.uri } : bl);
    // Race with a minimum delay so the spinner is always visible to the user
    await Promise.all([
      AsyncStorage.setItem(DRAFT_KEY, JSON.stringify(draftBlocks)).catch(() => {}),
      new Promise(r => setTimeout(r, 400)),
    ]);
    setHasDraft(true); setIsDirty(false);
  };

  const save = async (b: ContentBlock[]) => {
    setSaving(true);
    try {
      let finalBlocks = [...b];
      for (const [blockId, picked] of pendingImages.current.entries()) {
        finalBlocks = finalBlocks.map(bl => bl.id === blockId ? { ...bl, imageFile: picked.uri, imageUrl: undefined } : bl);
        pendingImages.current.delete(blockId);
      }
      for (const [blockId, picked] of pendingAudios.current.entries()) {
        finalBlocks = finalBlocks.map(bl => bl.id === blockId ? { ...bl, audioFile: picked.uri } : bl);
        pendingAudios.current.delete(blockId);
      }
      setPendingVersion(v => v + 1);
      setBlocks(finalBlocks);
      await updateChapter(chapter.id, { content: JSON.stringify(finalBlocks) } as any);
      await AsyncStorage.removeItem(DRAFT_KEY).catch(() => {});
      setHasDraft(false); setIsDirty(false);
      setSaved(true); setTimeout(() => setSaved(false), 2000);
    } catch {}
    finally { setSaving(false); }
  };

  const addBlock = (type: BlockType) => {
    const nb: ContentBlock = {
      id: uid(), type,
      text:    ['heading','subheading','paragraph'].includes(type) ? '' : undefined,
      bullets: type === 'bullets' ? [''] : undefined,
      headers: type === 'table'   ? ['Column 1', 'Column 2'] : undefined,
      rows:    type === 'table'   ? [{ cells: ['', ''] }]    : undefined,
      collapsed: false,
    };
    setBlocks(prev => {
      if (insertAfter) {
        const idx = prev.findIndex(b => b.id === insertAfter);
        const next = [...prev]; next.splice(idx + 1, 0, nb); return next;
      }
      return [...prev, nb];
    });
    setIsDirty(true); setShowPicker(false); setInsertAfter(null);
  };

  const upd = (id: string, u: Partial<ContentBlock>) => {
    setBlocks(prev => prev.map(b => b.id === id ? { ...b, ...u } : b));
    setIsDirty(true);
  };

  if (aiTarget) return (
    <AIGenerateScreen
      target={aiTarget}
      onBack={() => setAiTarget(null)}
      onInsert={result => {
        if (!modalBlock) return;
        if (aiTarget?.type === 'bullets') upd(modalBlock.id, { bullets: result as string[] });
        else { const text = result as string; upd(modalBlock.id, { text }); setModalText(text); }
        setAiTarget(null);
      }}
    />
  );

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaView style={s.safe}>
        {/* Header */}
        <View style={s.header}>
          <BackButton onPress={onBack} />
          <View style={{ flex: 1, alignItems: 'center' }}>
            <View style={[s.chapterPill, { backgroundColor: book.color + '22', borderColor: book.color + '55' }]}>
              <Text style={[s.chapterPillText, { color: book.color }]}>CHAPTER {chapter.number}</Text>
            </View>
            {hasDraft && !isEditMode && (
              <View style={s.draftBadge}><Text style={s.draftBadgeText}>📝 Draft saved</Text></View>
            )}
          </View>
          {isEditMode ? (
            <View style={{ flexDirection: 'row', gap: 6 }}>
              <Pressable
                onPress={async () => { setDraftSaving(true); await saveDraft(blocks); setDraftSaving(false); }}
                disabled={!isDirty || draftSaving}
                style={[s.headerBtn, isDirty ? s.draftBtnActive : s.draftBtnIdle, draftSaving && s.draftBtnLoading]}
              >
                {draftSaving
                  ? <ActivityIndicator size="large" color={Colors.warning} />
                  : <Text style={[s.draftBtnText, { color: isDirty ? Colors.warning : Colors.textMuted }]}>
                      {hasDraft && !isDirty ? '✓ Drafted' : 'Draft'}
                    </Text>
                }
              </Pressable>
              <Pressable onPress={async () => { await save(blocks); onBack(); }}
                style={[s.headerBtn, s.saveBtn, (!isDirty && !hasDraft) && { opacity: 0.4 }, saving && s.saveBtnLoading]}
                disabled={saving || (!isDirty && !hasDraft)}>
                {saving ? <ActivityIndicator size="large" color="#fff" /> : <Text style={s.saveBtnText}>{saved ? '✓' : 'Save'}</Text>}
              </Pressable>
            </View>
          ) : (
            <Pressable
              onPress={async () => {
                setEditLoading(true);
                await new Promise(r => setTimeout(r, 800));
                setIsEditMode(true); setEditLoading(false);
              }}
              disabled={editLoading}
              style={[s.headerBtn, s.editBtn, editLoading && s.editBtnLoading]}
            >
              {editLoading
                ? <ActivityIndicator size="large" color={Colors.accent} />
                : <Text style={s.editBtnText}>✏️ Edit</Text>
              }
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
            {blocks.map(b => <BlockPreview key={b.id} block={b} />)}
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
            renderItem={({ item: block, getIndex, drag, isActive }: RenderItemParams<ContentBlock>) => (
              <Swipeable
                ref={r => { swipeRefs.current.set(block.id, r); }}
                renderRightActions={() => <View style={{ width: 60 }} />}
                onSwipeableWillOpen={() => setDeleteTarget(block.id)}
                overshootRight={false} friction={2} rightThreshold={60}
              >
                <EditBlock
                  key={block.id}
                  block={block}
                  isFirst={(getIndex() ?? 0) === 0}
                  isLast={(getIndex() ?? 0) === blocks.length - 1}
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
                  setModalBlock={setModalBlock}
                  setAiTarget={setAiTarget}
                />
              </Swipeable>
            )}
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

        {/* Text edit modal */}
        <Modal visible={!!modalBlock} animationType="slide" transparent>
          <View style={modalStyles.overlay}>
            <View style={modalStyles.box}>
              <Text style={modalStyles.title}>{modalBlock ? metaFor(modalBlock.type).label : ''}</Text>
              {(modalBlock?.type === 'paragraph') && (
                <Text style={modalStyles.hint}>Use &lt;b&gt;bold&lt;/b&gt; and &lt;i&gt;italic&lt;/i&gt;</Text>
              )}
              <TextInput style={modalStyles.input} value={modalText} onChangeText={setModalText}
                multiline autoFocus placeholder="Type here..." placeholderTextColor={Colors.textMuted}
                maxLength={modalBlock?.type === 'paragraph' ? 1000 : 100} />
              <Text style={modalStyles.charCount}>{modalText.length}/{modalBlock?.type === 'paragraph' ? 1000 : 100}</Text>
              {modalBlock?.type === 'paragraph' && (
                <Pressable onPress={() => setAiTarget({ type: 'paragraph' })} style={modalStyles.aiBtn}>
                  <Text style={modalStyles.aiBtnText}>✦  Generate with AI</Text>
                </Pressable>
              )}
              <View style={modalStyles.actions}>
                <Pressable onPress={() => { setModalBlock(null); setModalText(''); }} style={modalStyles.cancel}>
                  <Text style={modalStyles.cancelText}>Cancel</Text>
                </Pressable>
                <Pressable onPress={() => {
                  if (modalBlock) upd(modalBlock.id, { text: modalText });
                  setModalBlock(null); setModalText('');
                }} style={modalStyles.save}>
                  <Text style={modalStyles.saveText}>Done</Text>
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
            setIsDirty(true); setDeleteTarget(null);
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

const s = StyleSheet.create({
  safe:            { flex: 1, backgroundColor: Colors.background },
  header:          { flexDirection: 'row', alignItems: 'center', paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, borderBottomWidth: 1, borderBottomColor: Colors.border, gap: Spacing.sm },
  backText:        { color: Colors.accentLight, fontSize: FontSize.md },
  chapterPill:     { backgroundColor: 'transparent', borderRadius: Radius.full, paddingHorizontal: 10, paddingVertical: 3, borderWidth: 1 },
  chapterPillText: { fontSize: 11, fontWeight: '800', letterSpacing: 1 },
  draftBadge:      { backgroundColor: Colors.warning + '22', borderRadius: 999, paddingHorizontal: 8, paddingVertical: 2, marginTop: 2 },
  draftBadgeText:  { color: Colors.warning, fontSize: 10, fontWeight: '600' },
  headerBtn:       { borderRadius: Radius.md, paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, width: 80, height: 38, alignItems: 'center', justifyContent: 'center' },
  backBtn:         { paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, width: 70, height: 36, justifyContent: 'center', alignItems: 'center' },
  backBtnLoading:  { backgroundColor: Colors.accentLight + '22', borderRadius: Radius.md },
  saveBtn:         { backgroundColor: Colors.accent },
  saveBtnText:     { color: Colors.textPrimary, fontWeight: '700', fontSize: FontSize.sm },
  saveBtnLoading:  { backgroundColor: Colors.accent + '88', borderWidth: 1, borderColor: Colors.accent },
  draftBtnActive:  { backgroundColor: Colors.warning + '33', borderWidth: 1, borderColor: Colors.warning + '88' },
  draftBtnIdle:    { backgroundColor: Colors.surfaceAlt, borderWidth: 1, borderColor: Colors.border },
  draftBtnText:    { fontWeight: '700', fontSize: FontSize.sm },
  draftBtnLoading: { backgroundColor: Colors.warning + '44', borderWidth: 1, borderColor: Colors.warning + 'aa' },
  editBtn:         { backgroundColor: Colors.surfaceAlt, borderWidth: 1, borderColor: Colors.border },
  editBtnText:     { color: Colors.textPrimary, fontWeight: '600', fontSize: FontSize.sm },
  editBtnLoading:  { backgroundColor: Colors.accent + '44', borderWidth: 1, borderColor: Colors.accent + 'aa' },
  content:         { padding: Spacing.md, paddingBottom: Spacing.xxl },
  empty:           { alignItems: 'center', paddingVertical: Spacing.xxl, gap: Spacing.sm },
  emptyIcon:       { fontSize: 40 },
  emptyTitle:      { fontSize: FontSize.lg, fontWeight: '700', color: Colors.textPrimary },
  emptySub:        { fontSize: FontSize.md, color: Colors.textSecondary },
  addBlockBtn:     { borderWidth: 1.5, borderColor: Colors.accent + '66', borderStyle: 'dashed', borderRadius: Radius.md, paddingVertical: Spacing.md, alignItems: 'center', marginTop: Spacing.sm },
  addBlockText:    { color: Colors.accent, fontSize: FontSize.md, fontWeight: '600' },
  overlay:         { ...StyleSheet.absoluteFillObject, justifyContent: 'flex-end', zIndex: 100 },
  backdrop:        { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.6)' },
  sheet:           { backgroundColor: Colors.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, borderWidth: 1, borderColor: Colors.border, maxHeight: '72%' },
  sheetHandle:     { width: 36, height: 4, borderRadius: 2, backgroundColor: Colors.border, alignSelf: 'center', marginTop: Spacing.sm },
  sheetHeader:     { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: Spacing.lg, borderBottomWidth: 1, borderBottomColor: Colors.border },
  sheetTitle:      { fontSize: FontSize.lg, fontWeight: '700', color: Colors.textPrimary },
  sheetClose:      { color: Colors.textMuted, fontSize: FontSize.lg },
  pickerRow:       { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, padding: Spacing.md, paddingHorizontal: Spacing.lg },
  pickerRowPressed:{ backgroundColor: Colors.surfaceAlt },
  pickerIcon:      { width: 42, height: 42, borderRadius: Radius.sm, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: Colors.border },
  pickerIconText:  { fontSize: FontSize.md, fontWeight: '800' },
  pickerLabel:     { color: Colors.textPrimary, fontSize: FontSize.md, fontWeight: '600' },
  pickerDesc:      { color: Colors.textSecondary, fontSize: FontSize.sm },
});