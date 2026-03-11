import { Platform } from 'react-native';

export interface PickedImage {
  uri: string;
  file?: File;
  mimeType?: string;
  fileName?: string;
}

// Web: plain file input
export const pickImageFromWeb = (capture?: boolean): Promise<PickedImage | null> =>
  new Promise(resolve => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    if (capture) input.setAttribute('capture', 'environment');
    input.onchange = (e: any) => {
      const f: File = e.target.files?.[0];
      if (!f) { resolve(null); return; }
      resolve({ uri: URL.createObjectURL(f), file: f, mimeType: f.type, fileName: f.name });
    };
    input.click();
  });

// Native: launch camera or library directly (no alert needed — caller shows modal)
export const pickImageNative = async (fromCamera: boolean): Promise<PickedImage | null> => {
  try {
    const IP = await import('expo-image-picker');
    const perm = fromCamera
      ? await IP.requestCameraPermissionsAsync()
      : await IP.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) return null;
    const result = fromCamera
      ? await IP.launchCameraAsync({ allowsEditing: true, quality: 0.85 })
      : await IP.launchImageLibraryAsync({
          mediaTypes: ['images'] as any,
          allowsEditing: true,
          quality: 0.85,
        });
    if (result.canceled || !result.assets?.[0]) return null;
    const a = result.assets[0];
    // Copy to app document directory so the image persists even if deleted from gallery
    try {
      const FS = await import('expo-file-system') as any;
      const docDir = FS.documentDirectory || FS.Paths?.documentDirectory;
      const ext = (a.mimeType ?? 'image/jpeg').split('/')[1] ?? 'jpg';
      const dest = `${docDir}images/img_${Date.now()}.${ext}`;
      // ensure folder exists
      await FS.makeDirectoryAsync(`${docDir}images`, { intermediates: true }).catch(() => {});
      await FS.copyAsync({ from: a.uri, to: dest });
      return {
        uri: dest,
        mimeType: a.mimeType ?? 'image/jpeg',
        fileName: a.fileName ?? `photo_${Date.now()}.jpg`,
      };
    } catch {
      // fallback to original URI if copy fails
    }
    return {
      uri: a.uri,
      mimeType: a.mimeType ?? 'image/jpeg',
      fileName: a.fileName ?? `photo_${Date.now()}.jpg`,
    };
  } catch (e) {
    console.error('Image picker error:', e);
    return null;
  }
};

export const appendImageToFormData = (fd: FormData, field: string, img: PickedImage) => {
  if (Platform.OS === 'web' && img.file) {
    fd.append(field, img.file);
  } else {
    fd.append(field, {
      uri: img.uri,
      type: img.mimeType ?? 'image/jpeg',
      name: img.fileName ?? 'photo.jpg',
    } as any);
  }
};