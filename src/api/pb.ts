import PocketBase from 'pocketbase';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const PB_URL = process.env.EXPO_PUBLIC_PB_URL!;

const pb = new PocketBase(PB_URL);

// Persist auth across app restarts
pb.authStore.onChange(async () => {
  try {
    await AsyncStorage.setItem(
      'pb_auth',
      JSON.stringify({
        token: pb.authStore.token,
        model: pb.authStore.model,
      })
    );
  } catch (e) {
    console.error('Failed to save auth:', e);
  }
});

// Load saved auth on startup
export const loadAuth = async () => {
  try {
    const data = await AsyncStorage.getItem('pb_auth');
    if (data) {
      const { token, model } = JSON.parse(data);
      pb.authStore.save(token, model);
    }
  } catch (e) {
    console.error('Failed to load auth:', e);
  }
};

export const clearAuth = async () => {
  pb.authStore.clear();
  await AsyncStorage.removeItem('pb_auth');
};

// Reliable file URL builder - doesn't depend on record object having collectionId/collectionName.
// Use this instead of pb.files.getURL() when passing typed model objects (which may lack those fields).
export const getFileUrl = (collectionName: string, recordId: string, filename: string): string =>
  `${PB_URL}/api/files/${collectionName}/${recordId}/${filename}`;

export default pb;
