/**
 * ExportNameModal
 *
 * A small modal that lets the user rename an export file before saving.
 * The .json extension is always appended automatically — the user only
 * types the base name.
 *
 * Usage:
 *   const [exportPrompt, setExportPrompt] = useState<ExportPrompt | null>(null);
 *
 *   // Trigger:
 *   setExportPrompt({ suggested: 'chapter-1-intervals', onConfirm: async (name) => {
 *     await exportJson(payload, name);
 *   }});
 *
 *   // In JSX:
 *   <ExportNameModal
 *     prompt={exportPrompt}
 *     onClose={() => setExportPrompt(null)}
 *   />
 */

import React, { useState, useEffect } from 'react';
import {
  Modal, View, Text, TextInput, Pressable, StyleSheet, KeyboardAvoidingView, Platform,
} from 'react-native';
import { Colors, FontSize, Spacing, Radius } from '../../constants/theme';

export interface ExportPrompt {
  /** Pre-filled suggestion (without .json) */
  suggested: string;
  /** Called with the final filename including .json */
  onConfirm: (filename: string) => Promise<void>;
}

interface Props {
  prompt:  ExportPrompt | null;
  onClose: () => void;
}

export const ExportNameModal: React.FC<Props> = ({ prompt, onClose }) => {
  const [name, setName]       = useState('');
  const [saving, setSaving]   = useState(false);

  useEffect(() => {
    if (prompt) setName(prompt.suggested);
  }, [prompt]);

  const handleSave = async () => {
    if (!prompt) return;
    const trimmed = name.trim().replace(/\.json$/i, '') || prompt.suggested;
    const filename = `${trimmed}.json`;
    setSaving(true);
    try {
      await prompt.onConfirm(filename);
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal visible={!!prompt} transparent animationType="fade" onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={s.overlay}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={s.box}>
          <Text style={s.title}>Name your export</Text>
          <Text style={s.sub}>Choose a filename for the .json file.</Text>

          <View style={s.inputRow}>
            <TextInput
              style={s.input}
              value={name}
              onChangeText={setName}
              autoFocus
              autoCapitalize="none"
              autoCorrect={false}
              selectTextOnFocus
              returnKeyType="done"
              onSubmitEditing={handleSave}
              placeholderTextColor={Colors.textMuted}
            />
            <Text style={s.ext}>.json</Text>
          </View>

          <View style={s.actions}>
            <Pressable onPress={onClose} style={s.cancel} disabled={saving}>
              <Text style={s.cancelText}>Cancel</Text>
            </Pressable>
            <Pressable
              onPress={handleSave}
              style={[s.save, saving && { opacity: 0.5 }]}
              disabled={saving}
            >
              <Text style={s.saveText}>{saving ? 'Exporting…' : 'Export'}</Text>
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const s = StyleSheet.create({
  overlay:   { flex: 1, backgroundColor: 'rgba(0,0,0,0.75)', justifyContent: 'center', alignItems: 'center', padding: Spacing.lg },
  box:       { backgroundColor: Colors.surface, borderRadius: Radius.xl, borderWidth: 1, borderColor: Colors.border, padding: Spacing.lg, width: '100%', maxWidth: 400, gap: Spacing.sm },
  title:     { fontSize: FontSize.lg, fontWeight: '800', color: Colors.textPrimary },
  sub:       { fontSize: FontSize.sm, color: Colors.textSecondary },
  inputRow:  { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs, marginTop: Spacing.xs },
  input:     { flex: 1, backgroundColor: Colors.surfaceAlt, borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.border, color: Colors.textPrimary, fontSize: FontSize.md, paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm },
  ext:       { fontSize: FontSize.sm, color: Colors.textMuted, fontWeight: '500' },
  actions:   { flexDirection: 'row', gap: Spacing.sm, marginTop: Spacing.xs },
  cancel:    { flex: 1, padding: Spacing.md, borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.border, alignItems: 'center' },
  cancelText:{ color: Colors.textSecondary, fontWeight: '600' },
  save:      { flex: 1, padding: Spacing.md, borderRadius: Radius.md, backgroundColor: Colors.accent, alignItems: 'center' },
  saveText:  { color: Colors.textPrimary, fontWeight: '700' },
});