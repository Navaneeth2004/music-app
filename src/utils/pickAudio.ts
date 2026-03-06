import { Platform } from 'react-native';

export interface PickedAudio {
  uri: string;
  fileName: string;
  mimeType: string;
  file?: File; // web only
}

const AUDIO_MIME_TYPES = [
  'audio/mpeg',       // .mp3
  'audio/mp4',        // .m4a / .aac
  'audio/wav',        // .wav
  'audio/x-wav',
  'audio/ogg',        // .ogg
  'audio/flac',       // .flac
  'audio/aac',        // .aac
  'audio/*',
];

// ─── Web ──────────────────────────────────────────────────────
const pickAudioFromWeb = (): Promise<PickedAudio | null> =>
  new Promise(resolve => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'audio/*';
    input.onchange = (e: any) => {
      const f: File = e.target.files?.[0];
      if (!f) { resolve(null); return; }
      resolve({
        uri: URL.createObjectURL(f),
        file: f,
        mimeType: f.type || 'audio/mpeg',
        fileName: f.name,
      });
    };
    input.click();
  });

// ─── Native ───────────────────────────────────────────────────
const pickAudioNative = async (): Promise<PickedAudio | null> => {
  try {
    const DP = await import('expo-document-picker');
    const result = await DP.getDocumentAsync({
      type: AUDIO_MIME_TYPES,
      copyToCacheDirectory: true,
    });
    if (result.canceled || !result.assets?.[0]) return null;
    const asset = result.assets[0];
    return {
      uri: asset.uri,
      fileName: asset.name,
      mimeType: asset.mimeType || 'audio/mpeg',
    };
  } catch (e) {
    console.error('Audio picker error:', e);
    return null;
  }
};

// ─── Public API ───────────────────────────────────────────────
export const pickAudio = (): Promise<PickedAudio | null> =>
  Platform.OS === 'web' ? pickAudioFromWeb() : pickAudioNative();

export const appendAudioToFormData = (fd: FormData, field: string, audio: PickedAudio) => {
  if (Platform.OS === 'web' && audio.file) {
    fd.append(field, audio.file);
  } else {
    fd.append(field, {
      uri: audio.uri,
      type: audio.mimeType,
      name: audio.fileName,
    } as any);
  }
};