import React, { useState } from 'react';
import {
  View, Text, StyleSheet, Pressable, ScrollView,
  TextInput, ActivityIndicator, Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors, FontSize, Spacing, Radius } from '../../../constants/theme';
import { Book, Chapter, ChapterFlashcard as Flashcard } from '../../../types';
import { PickedImage } from '../../../utils/pickImage';
import { pickAudio, PickedAudio } from '../../../utils/pickAudio';
import { MediaChooserModal } from '../../../components/shared/MediaChooserModal';
import { ImagePickerModal } from '../../../components/shared/ImagePickerModal';
import { AudioPlayer } from '../../../components/shared/AudioPlayer';
import { createChapterFlashcard, updateChapterFlashcard } from '../../../api/content';

interface Props {
  chapter: Chapter;
  book:    Book;
  editCard: Flashcard | null;
  onSave:  () => void;
  onBack:  () => void;
}

type ModalState =
  | { type: 'none' }
  | { type: 'mediaChooser'; side: 'front' | 'back' }
  | { type: 'imagePicker';  side: 'front' | 'back' };

export const FlashcardFormScreen: React.FC<Props> = ({ chapter, book, editCard, onSave, onBack }) => {
  const [front, setFront] = useState(editCard?.front ?? '');
  const [back,  setBack]  = useState(editCard?.back  ?? '');

  // With SQLite, file fields already store full URIs — no getFileUrl() needed
  const [frontImg,   setFrontImg]   = useState<PickedImage | null>(() => {
    const f = editCard?.front_image; return f ? { uri: f } : null;
  });
  const [backImg,    setBackImg]    = useState<PickedImage | null>(() => {
    const f = editCard?.back_image;  return f ? { uri: f } : null;
  });
  const [frontImgNew,  setFrontImgNew]  = useState(false);
  const [backImgNew,   setBackImgNew]   = useState(false);

  const [frontAudio, setFrontAudio] = useState<PickedAudio | null>(() => {
    const f = editCard?.front_audio; return f ? { uri: f, fileName: 'audio', mimeType: 'audio/mpeg' } : null;
  });
  const [backAudio,  setBackAudio]  = useState<PickedAudio | null>(() => {
    const f = editCard?.back_audio;  return f ? { uri: f, fileName: 'audio', mimeType: 'audio/mpeg' } : null;
  });
  const [frontAudioNew, setFrontAudioNew] = useState(false);
  const [backAudioNew,  setBackAudioNew]  = useState(false);

  const [saving, setSaving] = useState(false);
  const [error,  setError]  = useState<string | null>(null);
  const [modal,  setModal]  = useState<ModalState>({ type: 'none' });

  const openMedia = (side: 'front' | 'back') => setModal({ type: 'mediaChooser', side });

  const handleChooseImage = () => {
    if (modal.type !== 'mediaChooser') return;
    setModal({ type: 'imagePicker', side: modal.side });
  };

  const handleChooseAudio = async () => {
    if (modal.type !== 'mediaChooser') return;
    const side = modal.side;
    setModal({ type: 'none' });
    const audio = await pickAudio();
    if (!audio) return;
    if (side === 'front') { setFrontAudio(audio); setFrontAudioNew(true); }
    else                  { setBackAudio(audio);  setBackAudioNew(true); }
  };

  const handleImagePicked = (img: PickedImage) => {
    const side = modal.type === 'imagePicker' ? modal.side : null;
    setModal({ type: 'none' });
    if (!side) return;
    if (side === 'front') { setFrontImg(img); setFrontImgNew(true); }
    else                  { setBackImg(img);  setBackImgNew(true); }
  };

  const handleSave = async () => {
    if (!front.trim()) { setError('Front text is required.'); return; }
    if (!back.trim())  { setError('Back text is required.');  return; }
    setSaving(true); setError(null);
    try {
      // Build a plain data object — URIs go directly as string fields
      const data: Partial<Flashcard> = {
        chapter: chapter.id,
        front: front.trim(),
        back:  back.trim(),
        order: editCard?.order ?? 0,
        // Only update file fields if a new file was chosen
        ...(frontImgNew   ? { front_image: frontImg?.uri  ?? undefined } : {}),
        ...(backImgNew    ? { back_image:  backImg?.uri   ?? undefined } : {}),
        ...(frontAudioNew ? { front_audio: frontAudio?.uri ?? undefined } : {}),
        ...(backAudioNew  ? { back_audio:  backAudio?.uri  ?? undefined } : {}),
      };
      if (editCard) await updateChapterFlashcard(editCard.id, data);
      else          await createChapterFlashcard(data);
      onSave();
    } catch (e) {
      console.error(e);
      setError('Failed to save. Please try again.');
    } finally { setSaving(false); }
  };

  return (
    <SafeAreaView style={s.safe}>
      <MediaChooserModal
        visible={modal.type === 'mediaChooser'}
        onChooseImage={handleChooseImage}
        onChooseAudio={handleChooseAudio}
        onCancel={() => setModal({ type: 'none' })}
      />
      <ImagePickerModal
        visible={modal.type === 'imagePicker'}
        onPicked={handleImagePicked}
        onCancel={() => setModal({ type: 'none' })}
      />

      <View style={s.header}>
        <Pressable onPress={onBack} style={s.backBtn}>
          <Text style={s.backText}>← {editCard ? 'Cancel' : 'Back'}</Text>
        </Pressable>
        <Text style={s.headerTitle}>{editCard ? 'Edit Flashcard' : 'New Flashcard'}</Text>
        <Pressable onPress={handleSave} style={[s.saveBtn, saving && { opacity: 0.6 }]} disabled={saving}>
          {saving ? <ActivityIndicator size="small" color="#fff" /> : <Text style={s.saveBtnText}>Save</Text>}
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        {error && <View style={s.err}><Text style={s.errText}>{error}</Text></View>}

        <SideCard accentColor={book.color} label="FRONT" hint="Question or term">
          <TextInput style={s.input} value={front} onChangeText={setFront} multiline
            placeholder="Enter question or term… (required)" placeholderTextColor={Colors.textMuted} />
          <SideMedia
            img={frontImg} audio={frontAudio} accentColor={book.color}
            onAddMedia={() => openMedia('front')}
            onRemoveImg={() => { setFrontImg(null); setFrontImgNew(true); }}
            onRemoveAudio={() => { setFrontAudio(null); setFrontAudioNew(true); }}
          />
        </SideCard>

        <Divider />

        <SideCard accentColor={Colors.accent} label="BACK" hint="Answer or definition">
          <TextInput style={s.input} value={back} onChangeText={setBack} multiline
            placeholder="Enter answer or definition… (required)" placeholderTextColor={Colors.textMuted} />
          <SideMedia
            img={backImg} audio={backAudio} accentColor={Colors.accent}
            onAddMedia={() => openMedia('back')}
            onRemoveImg={() => { setBackImg(null); setBackImgNew(true); }}
            onRemoveAudio={() => { setBackAudio(null); setBackAudioNew(true); }}
          />
        </SideCard>
      </ScrollView>
    </SafeAreaView>
  );
};

const SideCard: React.FC<{ accentColor: string; label: string; hint: string; children: React.ReactNode }> = ({ accentColor, label, hint, children }) => (
  <View style={[s.side, { borderColor: accentColor + '44' }]}>
    <View style={s.sideHeader}>
      <View style={[s.sidePill, { backgroundColor: accentColor + '22' }]}>
        <Text style={[s.sidePillText, { color: accentColor }]}>{label}</Text>
      </View>
      <Text style={s.sideHint}>{hint}</Text>
    </View>
    {children}
  </View>
);

const Divider = () => (
  <View style={s.separator}>
    <View style={s.sepLine} />
    <View style={s.sepCircle}><Text style={s.sepIcon}>↕</Text></View>
    <View style={s.sepLine} />
  </View>
);

const SideMedia: React.FC<{
  img: PickedImage | null; audio: PickedAudio | null; accentColor: string;
  onAddMedia: () => void; onRemoveImg: () => void; onRemoveAudio: () => void;
}> = ({ img, audio, accentColor, onAddMedia, onRemoveImg, onRemoveAudio }) => {
  const hasMedia = img || audio;
  return (
    <View style={s.mediaArea}>
      {img && (
        <View style={s.mediaItem}>
          <Image source={{ uri: img.uri }} style={s.imgPreview} resizeMode="contain" />
          <Pressable onPress={onRemoveImg} style={s.removeBtn}><Text style={s.removeBtnText}>✕ Remove image</Text></Pressable>
        </View>
      )}
      {audio && (
        <View style={s.mediaItem}>
          <AudioPlayer uri={audio.uri} accentColor={accentColor} />
          <Pressable onPress={onRemoveAudio} style={s.removeBtn}><Text style={s.removeBtnText}>✕ Remove audio</Text></Pressable>
        </View>
      )}
      {(!img || !audio) && (
        <Pressable onPress={onAddMedia} style={[s.addMediaBtn, !!hasMedia && s.addMediaBtnSmall]}>
          <Text style={s.addMediaIcon}>{hasMedia ? '＋' : '📎'}</Text>
          <Text style={s.addMediaText}>{hasMedia ? 'Add more media' : 'Add image or audio'}</Text>
          {!hasMedia && <Text style={s.addMediaHint}>optional</Text>}
        </Pressable>
      )}
    </View>
  );
};

const s = StyleSheet.create({
  safe:            { flex: 1, backgroundColor: Colors.background },
  header:          { flexDirection: 'row', alignItems: 'center', paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, borderBottomWidth: 1, borderBottomColor: Colors.border, gap: Spacing.sm },
  backBtn:         { paddingVertical: Spacing.sm },
  backText:        { color: Colors.accentLight, fontSize: FontSize.md },
  headerTitle:     { flex: 1, color: Colors.textPrimary, fontSize: FontSize.md, fontWeight: '700', textAlign: 'center' },
  saveBtn:         { backgroundColor: Colors.success, borderRadius: Radius.md, paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, minWidth: 64, alignItems: 'center' },
  saveBtnText:     { color: Colors.textPrimary, fontWeight: '700', fontSize: FontSize.sm },
  content:         { padding: Spacing.lg, paddingBottom: Spacing.xxl },
  err:             { backgroundColor: Colors.error + '22', borderRadius: Radius.md, padding: Spacing.md, marginBottom: Spacing.md, borderWidth: 1, borderColor: Colors.error },
  errText:         { color: Colors.error, fontSize: FontSize.sm },
  side:            { backgroundColor: Colors.surface, borderRadius: Radius.lg, borderWidth: 1.5, padding: Spacing.lg, gap: Spacing.md },
  sideHeader:      { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  sidePill:        { borderRadius: 999, paddingHorizontal: Spacing.md, paddingVertical: 3 },
  sidePillText:    { fontSize: FontSize.xs, fontWeight: '800', letterSpacing: 1.5 },
  sideHint:        { fontSize: FontSize.xs, color: Colors.textMuted },
  input:           { backgroundColor: Colors.surfaceAlt, borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.border, color: Colors.textPrimary, fontSize: FontSize.md, padding: Spacing.md, minHeight: 88, textAlignVertical: 'top' },
  separator:       { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, paddingVertical: Spacing.lg },
  sepLine:         { flex: 1, height: 1, backgroundColor: Colors.border },
  sepCircle:       { width: 32, height: 32, borderRadius: 16, backgroundColor: Colors.surfaceAlt, borderWidth: 1, borderColor: Colors.border, alignItems: 'center', justifyContent: 'center' },
  sepIcon:         { color: Colors.textMuted, fontSize: FontSize.md },
  mediaArea:       { gap: Spacing.sm },
  mediaItem:       { gap: Spacing.xs },
  imgPreview:      { width: '100%', height: 140, borderRadius: Radius.md },
  removeBtn:       { alignSelf: 'center', paddingVertical: Spacing.xs },
  removeBtnText:   { color: Colors.error, fontSize: FontSize.sm },
  addMediaBtn:     { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, borderWidth: 1, borderColor: Colors.border, borderStyle: 'dashed', borderRadius: Radius.md, padding: Spacing.md },
  addMediaBtnSmall:{ paddingVertical: Spacing.sm },
  addMediaIcon:    { fontSize: 16, color: Colors.textSecondary },
  addMediaText:    { flex: 1, color: Colors.textSecondary, fontSize: FontSize.sm, fontWeight: '600' },
  addMediaHint:    { color: Colors.textMuted, fontSize: FontSize.xs },
});
