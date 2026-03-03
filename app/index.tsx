import { useRouter } from 'expo-router';
import { HomeScreen } from '@src/screens/HomeScreen';
import { useAuth } from '@src/context/AuthContext';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { Colors } from '@src/constants/theme';

export default function Index() {
  const { loading } = useAuth();
  const router = useRouter();

  if (loading) {
    return (
      <View style={styles.loader}>
        <ActivityIndicator size="large" color={Colors.accent} />
      </View>
    );
  }

  return (
    <HomeScreen
      onLogin={() => router.push('/login')}
      onRegister={() => router.push('/register')}
    />
  );
}

const styles = StyleSheet.create({
  loader: {
    flex: 1,
    backgroundColor: Colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
