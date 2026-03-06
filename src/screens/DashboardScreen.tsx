import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Colors, FontSize, Spacing } from '../constants/theme';
import { User } from '../types';
import { ADMIN_USERNAME } from '../constants/admin';
import { BookPracticeScreen } from './bookpractice/BookPracticeScreen';
import { SettingsScreen } from './SettingsScreen';
import { StudyBuilderScreen } from './admin/StudyBuilderScreen';

type Tab = 'practice' | 'builder' | 'settings';

interface DashboardScreenProps {
  user: User;
  onLogout: () => void;
}

export const DashboardScreen: React.FC<DashboardScreenProps> = ({ user, onLogout }) => {
  const isAdmin = user.username?.toLowerCase() === ADMIN_USERNAME.toLowerCase();
  const [activeTab, setActiveTab] = useState<Tab>(isAdmin ? 'builder' : 'practice');
  const [hideNav, setHideNav] = useState(false);

  // Reset to correct default tab when user changes (e.g. after refresh)
  useEffect(() => {
    setActiveTab(isAdmin ? 'builder' : 'practice');
  }, [isAdmin]);

  const tabs = isAdmin
    ? [
        { key: 'builder' as Tab, label: 'Study Builder', icon: '🛠️' },
        { key: 'settings' as Tab, label: 'Settings', icon: '⚙️' },
      ]
    : [
        { key: 'practice' as Tab, label: 'Study Practice', icon: '📖' },
        { key: 'settings' as Tab, label: 'Settings', icon: '⚙️' },
      ];

  return (
    <View style={styles.root}>
      <View style={styles.content}>
        {activeTab === 'practice' && <BookPracticeScreen onDeepNav={setHideNav} />}
        {activeTab === 'builder' && <StudyBuilderScreen onDeepNav={setHideNav} />}
        {activeTab === 'settings' && <SettingsScreen user={user} onLogout={onLogout} isAdmin={isAdmin} />}
      </View>

      {!hideNav && (
        <View style={styles.bottomNav}>
          {tabs.map(tab => {
            const active = activeTab === tab.key;
            return (
              <Pressable
                key={tab.key}
                onPress={() => { setActiveTab(tab.key); setHideNav(false); }}
                style={[styles.navPill, active && styles.navPillActive]}
                android_ripple={{ color: Colors.accent + '33', borderless: false, radius: 999 }}
              >
                <Text style={styles.navIcon}>{tab.icon}</Text>
                {active && <Text style={styles.navLabel}>{tab.label}</Text>}
              </Pressable>
            );
          })}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.background },
  content: { flex: 1 },
  bottomNav: { flexDirection: 'row', justifyContent: 'center', gap: Spacing.sm, paddingVertical: Spacing.md, paddingHorizontal: Spacing.lg, borderTopWidth: 1, borderTopColor: Colors.border, backgroundColor: Colors.surface },
  navPill: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs, paddingVertical: Spacing.sm, paddingHorizontal: Spacing.md, borderRadius: 999, overflow: 'hidden' },
  navPillActive: { backgroundColor: Colors.accent + '22' },
  navIcon: { fontSize: 20 },
  navLabel: { color: Colors.accent, fontSize: FontSize.sm, fontWeight: '600' },
});