import PocketBase from 'pocketbase';
import AsyncStorage from '@react-native-async-storage/async-storage';

// 👇 Replace with your local IP (run `ipconfig` on Windows)
const PB_URL = 'http://192.168.1.43:8090';

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

export default pb;
