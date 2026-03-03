import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { DashboardScreen } from '@src/screens/DashboardScreen';
import { useAuth } from '@src/context/AuthContext';
import { Colors } from '@src/constants/theme';

export default function Dashboard() {
  const { user, logout } = useAuth();

  if (!user) {
    return (
      <View style={styles.loader}>
        <ActivityIndicator color={Colors.accent} />
      </View>
    );
  }

  return <DashboardScreen user={user} onLogout={logout} />;
}

const styles = StyleSheet.create({
  loader: {
    flex: 1,
    backgroundColor: Colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
