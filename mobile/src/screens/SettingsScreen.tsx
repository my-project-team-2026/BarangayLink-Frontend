import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Alert,
  TextInput,
  Modal,
  ActivityIndicator,
  Platform,
} from 'react-native';
import {
  User,
  Sun,
  Moon,
  Server,
  KeyRound,
  LogOut,
  ShieldCheck,
  MapPin,
  Phone,
  Database,
  X,
  ArrowLeft,
} from 'lucide-react-native';
import { mobileApi, clearSession, getServerUrl, setServerUrl } from '../api';
import type { ThemeColors } from '../theme';
import type { User as AuthUser, UserProfile, ThemeMode } from '../types';

interface SettingsScreenProps {
  theme: ThemeColors;
  user: AuthUser;
  isDark: boolean;
  onToggleTheme: () => void;
  onLogout: () => void;
  onNavigateBack?: () => void;
}

export function SettingsScreen({
  theme,
  user,
  isDark,
  onToggleTheme,
  onLogout,
  onNavigateBack,
}: SettingsScreenProps) {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loadingProfile, setLoadingProfile] = useState(true);

  // Server URL modal state
  const [showServerModal, setShowServerModal] = useState(false);
  const [serverUrl, setServerUrlState] = useState('');
  const [testingServer, setTestingServer] = useState(false);

  // Change password modal state
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [savingPassword, setSavingPassword] = useState(false);

  const loadProfile = async () => {
    try {
      const res = await mobileApi.profile();
      if (res && res.data) {
        setProfile(res.data);
      }
    } catch (e) {
      console.warn('Could not load profile:', e);
    } finally {
      setLoadingProfile(false);
    }
  };

  useEffect(() => {
    void loadProfile();
    void getServerUrl().then(url => setServerUrlState(url));
  }, []);

  const handleSaveServer = async () => {
    if (!serverUrl.trim()) return;
    setTestingServer(true);
    const reachable = await mobileApi.pingServer(serverUrl);
    setTestingServer(false);

    if (reachable) {
      await setServerUrl(serverUrl);
      Alert.alert('Connected', 'Server URL successfully updated and verified.');
      setShowServerModal(false);
    } else {
      Alert.alert(
        'Server Unreachable',
        `Could not reach ${serverUrl}.\nSave anyway?`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Save',
            onPress: async () => {
              await setServerUrl(serverUrl);
              setShowServerModal(false);
            },
          },
        ]
      );
    }
  };

  const handleChangePassword = async () => {
    if (!currentPassword || !newPassword || !confirmPassword) {
      Alert.alert('Required', 'Please complete all password fields.');
      return;
    }
    if (newPassword.length < 8) {
      Alert.alert('Error', 'New password must be at least 8 characters.');
      return;
    }
    if (newPassword !== confirmPassword) {
      Alert.alert('Error', 'New passwords do not match.');
      return;
    }

    setSavingPassword(true);
    try {
      const res = await mobileApi.changePassword(currentPassword, newPassword);
      Alert.alert('Success', res.message || 'Password changed successfully!');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setShowPasswordModal(false);
    } catch (err) {
      Alert.alert('Failed', err instanceof Error ? err.message : 'Could not change password.');
    } finally {
      setSavingPassword(false);
    }
  };

  const handleConfirmLogout = () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out of BarangayLink?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign Out',
        style: 'destructive',
        onPress: async () => {
          await clearSession();
          onLogout();
        },
      },
    ]);
  };

  const displayName = profile?.first_name
    ? `${profile.first_name} ${profile.last_name || ''}`.trim()
    : user.name || user.email.split('@')[0];

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      {/* Header */}
      <View style={[styles.topBar, { backgroundColor: theme.surface, borderColor: theme.border }]}>
        <View style={styles.headerLeftCol}>
          {onNavigateBack && (
            <TouchableOpacity
              style={[styles.backBtn, { backgroundColor: theme.surfaceSecondary, borderColor: theme.border }]}
              onPress={onNavigateBack}
              accessibilityLabel="Back to Home"
            >
              <ArrowLeft size={18} color={theme.textPrimary} />
            </TouchableOpacity>
          )}
          <View style={{ flex: 1 }}>
            <Text style={[styles.screenTitle, { color: theme.textPrimary }]}>Settings & Account</Text>
            <Text style={[styles.screenSubtitle, { color: theme.textSecondary }]}>
              Preferences, security, and connection
            </Text>
          </View>
        </View>
      </View>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.content}>
        {/* Profile Card */}
        <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <View style={styles.profileHeader}>
            <View style={[styles.avatarBox, { backgroundColor: theme.primaryLight }]}>
              <Text style={[styles.avatarText, { color: theme.primary }]}>
                {displayName.charAt(0).toUpperCase()}
              </Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.profileName, { color: theme.textPrimary }]}>{displayName}</Text>
              <Text style={[styles.profileEmail, { color: theme.textSecondary }]}>{user.email}</Text>
              <View style={[styles.roleBadge, { backgroundColor: theme.primaryLight }]}>
                <Text style={[styles.roleText, { color: theme.primary }]}>{user.role}</Text>
              </View>
            </View>
          </View>

          {profile?.purok_zone && (
            <View style={[styles.detailRow, { borderTopColor: theme.border }]}>
              <MapPin size={14} color={theme.textMuted} />
              <Text style={[styles.detailText, { color: theme.textSecondary }]}>
                Purok / Zone: <Text style={{ fontWeight: '700', color: theme.textPrimary }}>{profile.purok_zone}</Text>
              </Text>
            </View>
          )}

          {profile?.contact_number && (
            <View style={[styles.detailRow, { borderTopColor: theme.border }]}>
              <Phone size={14} color={theme.textMuted} />
              <Text style={[styles.detailText, { color: theme.textSecondary }]}>
                Phone: <Text style={{ fontWeight: '700', color: theme.textPrimary }}>{profile.contact_number}</Text>
              </Text>
            </View>
          )}
        </View>

        {/* Appearance Settings */}
        <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>Appearance</Text>
        <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <TouchableOpacity style={styles.settingRow} onPress={onToggleTheme}>
            <View style={styles.settingLeft}>
              <View style={[styles.iconCircle, { backgroundColor: isDark ? '#2f2514' : '#fdf5e7' }]}>
                {isDark ? <Moon size={18} color="#eebb45" /> : <Sun size={18} color="#cf8d2e" />}
              </View>
              <View>
                <Text style={[styles.settingLabel, { color: theme.textPrimary }]}>Interface Theme</Text>
                <Text style={[styles.settingSub, { color: theme.textSecondary }]}>
                  {isDark ? 'Dark Mode Active' : 'Light Mode Active'}
                </Text>
              </View>
            </View>
            <View style={[styles.themePill, { backgroundColor: theme.primaryLight }]}>
              <Text style={[styles.themePillText, { color: theme.primary }]}>
                Switch to {isDark ? 'Light' : 'Dark'}
              </Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* Security & Server */}
        <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>Security & Connection</Text>
        <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          {/* Change Password */}
          <TouchableOpacity
            style={[styles.settingRow, { borderBottomWidth: 1, borderBottomColor: theme.border }]}
            onPress={() => setShowPasswordModal(true)}
          >
            <View style={styles.settingLeft}>
              <View style={[styles.iconCircle, { backgroundColor: theme.primaryLight }]}>
                <KeyRound size={18} color={theme.primary} />
              </View>
              <View>
                <Text style={[styles.settingLabel, { color: theme.textPrimary }]}>Change Password</Text>
                <Text style={[styles.settingSub, { color: theme.textSecondary }]}>
                  Update your security credentials
                </Text>
              </View>
            </View>
          </TouchableOpacity>

          {/* Server Settings */}
          <TouchableOpacity style={styles.settingRow} onPress={() => setShowServerModal(true)}>
            <View style={styles.settingLeft}>
              <View style={[styles.iconCircle, { backgroundColor: theme.successBg }]}>
                <Server size={18} color={theme.success} />
              </View>
              <View>
                <Text style={[styles.settingLabel, { color: theme.textPrimary }]}>Backend Server URL</Text>
                <Text style={[styles.settingSub, { color: theme.textSecondary }]} numberOfLines={1}>
                  {serverUrl}
                </Text>
              </View>
            </View>
          </TouchableOpacity>
        </View>

        {/* System Info */}
        <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>System Architecture</Text>
        <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <View style={styles.systemRow}>
            <Database size={16} color={theme.success} />
            <Text style={[styles.systemText, { color: theme.textSecondary }]}>
              PostgreSQL 100% Stored Procedures & Functions
            </Text>
          </View>
          <View style={styles.systemRow}>
            <ShieldCheck size={16} color={theme.primary} />
            <Text style={[styles.systemText, { color: theme.textSecondary }]}>
              Role-Based Access Control (RBAC) &bull; JWT Secured
            </Text>
          </View>
        </View>

        {/* Sign Out Button */}
        <TouchableOpacity
          style={[styles.logoutBtn, { backgroundColor: theme.dangerBg, borderColor: theme.danger }]}
          onPress={handleConfirmLogout}
        >
          <LogOut size={18} color={theme.danger} />
          <Text style={[styles.logoutText, { color: theme.danger }]}>Sign Out of BarangayLink</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Change Password Modal */}
      <Modal visible={showPasswordModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalSheet, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <View style={styles.modalHead}>
              <Text style={[styles.modalTitle, { color: theme.textPrimary }]}>Change Password</Text>
              <TouchableOpacity onPress={() => setShowPasswordModal(false)}>
                <X size={20} color={theme.textSecondary} />
              </TouchableOpacity>
            </View>

            <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>Current Password</Text>
            <TextInput
              style={[styles.input, { borderColor: theme.border, color: theme.textPrimary, backgroundColor: theme.surfaceSecondary }]}
              secureTextEntry
              value={currentPassword}
              onChangeText={setCurrentPassword}
            />

            <Text style={[styles.inputLabel, { color: theme.textSecondary, marginTop: 12 }]}>New Password</Text>
            <TextInput
              style={[styles.input, { borderColor: theme.border, color: theme.textPrimary, backgroundColor: theme.surfaceSecondary }]}
              secureTextEntry
              placeholder="At least 8 characters"
              placeholderTextColor={theme.textMuted}
              value={newPassword}
              onChangeText={setNewPassword}
            />

            <Text style={[styles.inputLabel, { color: theme.textSecondary, marginTop: 12 }]}>Confirm New Password</Text>
            <TextInput
              style={[styles.input, { borderColor: theme.border, color: theme.textPrimary, backgroundColor: theme.surfaceSecondary }]}
              secureTextEntry
              value={confirmPassword}
              onChangeText={setConfirmPassword}
            />

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalBtn, { borderColor: theme.border, borderWidth: 1 }]}
                onPress={() => setShowPasswordModal(false)}
              >
                <Text style={{ color: theme.textSecondary, fontWeight: '600' }}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalBtn, { backgroundColor: theme.primary }]}
                onPress={handleChangePassword}
                disabled={savingPassword}
              >
                {savingPassword ? (
                  <ActivityIndicator color="#ffffff" />
                ) : (
                  <Text style={{ color: '#ffffff', fontWeight: '700' }}>Update</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Server URL Modal */}
      <Modal visible={showServerModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalSheet, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <View style={styles.modalHead}>
              <Text style={[styles.modalTitle, { color: theme.textPrimary }]}>Backend Server URL</Text>
              <TouchableOpacity onPress={() => setShowServerModal(false)}>
                <X size={20} color={theme.textSecondary} />
              </TouchableOpacity>
            </View>
            <Text style={[styles.modalDesc, { color: theme.textSecondary }]}>
              Enter your backend IP address (e.g. your PC's WiFi IP address):
            </Text>
            <TextInput
              style={[styles.input, { borderColor: theme.border, color: theme.textPrimary, backgroundColor: theme.surfaceSecondary }]}
              value={serverUrl}
              onChangeText={setServerUrlState}
              placeholder="http://192.168.1.xxx:3000/api/v1"
              placeholderTextColor={theme.textMuted}
              autoCapitalize="none"
            />
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalBtn, { borderColor: theme.border, borderWidth: 1 }]}
                onPress={() => setShowServerModal(false)}
              >
                <Text style={{ color: theme.textSecondary, fontWeight: '600' }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalBtn, { backgroundColor: theme.primary }]}
                onPress={handleSaveServer}
                disabled={testingServer}
              >
                <Text style={{ color: '#ffffff', fontWeight: '700' }}>
                  {testingServer ? 'Testing…' : 'Save & Test'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  topBar: {
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 14,
    borderBottomWidth: 1,
  },
  headerLeftCol: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  screenTitle: {
    fontSize: 20,
    fontWeight: '800',
  },
  screenSubtitle: {
    fontSize: 11,
    marginTop: 2,
  },
  content: {
    padding: 16,
    paddingBottom: 40,
  },
  card: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 18,
    marginBottom: 20,
  },
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginBottom: 10,
  },
  avatarBox: {
    width: 52,
    height: 52,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 22,
    fontWeight: '800',
  },
  profileName: {
    fontSize: 17,
    fontWeight: '800',
    marginBottom: 2,
  },
  profileEmail: {
    fontSize: 12,
    marginBottom: 6,
  },
  roleBadge: {
    alignSelf: 'flex-start',
    paddingVertical: 2,
    paddingHorizontal: 8,
    borderRadius: 10,
  },
  roleText: {
    fontSize: 10,
    fontWeight: '700',
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingTop: 10,
    marginTop: 8,
    borderTopWidth: 1,
  },
  detailText: {
    fontSize: 12,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '800',
    marginBottom: 10,
    letterSpacing: 0.5,
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  iconCircle: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  settingLabel: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 2,
  },
  settingSub: {
    fontSize: 11,
  },
  themePill: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 12,
  },
  themePillText: {
    fontSize: 11,
    fontWeight: '700',
  },
  systemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 6,
  },
  systemText: {
    fontSize: 12,
    fontWeight: '500',
    flex: 1,
  },
  logoutBtn: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderRadius: 14,
    height: 48,
    marginTop: 10,
  },
  logoutText: {
    fontSize: 14,
    fontWeight: '700',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.65)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    borderTopWidth: 1,
    padding: 22,
    paddingBottom: Platform.OS === 'ios' ? 44 : 22,
  },
  modalHead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
  },
  modalDesc: {
    fontSize: 12,
    lineHeight: 18,
    marginBottom: 14,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 6,
  },
  input: {
    height: 46,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    fontSize: 13,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
    marginTop: 20,
  },
  modalBtn: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
});
