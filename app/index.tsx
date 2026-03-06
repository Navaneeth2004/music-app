import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { Colors } from '@src/constants/theme';

export default function Index() {
  return (
    <View style={s.root}>
      <ActivityIndicator size="large" color={Colors.accent} />
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.background, alignItems: 'center', justifyContent: 'center' },
});
