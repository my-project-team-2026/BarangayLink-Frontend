import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
} from 'react-native';
import { Landmark, Mail, Lock, Eye, EyeOff, Server, ArrowRight, ShieldCheck } from 'lucide-react-native';
import { mobileApi, saveSession, getServerUrl, setServerUrl } from '../api';
import { colors, type ThemeColors } from '../theme';
import type { User } from '../types';

interface LoginScreenProps {
  theme: ThemeColors;
  isDark: boolean;
  onLoginSuccess: (user: User) => void;
  onNavigateRegister: () => void;
}

export function LoginScreen({ theme, isDark, onLoginSuccess, onNavigateRegister }: LoginScreenProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  // Server settings modal/state
  const [showServerModal, setShowServerModal] = useState(false);
  const [serverInput, setServerInput] = useState('');
  const [testingServer, setTestingServer] = useState(false);

  const openServerSettings = async () => {
    const current = await getServerUrl();
    setServerInput(current);
    setShowServerModal(true);
  };

  const saveServerSettings = async () => {
    if (!serverInput.trim()) return;
    setTestingServer(true);
    const reachable = await mobileApi.pingServer(serverInput);
    setTestingServer(false);

    if (reachable) {
      await setServerUrl(serverInput);
      Alert.alert('Connection Successful', `Server address saved:\n${serverInput}`);
      setShowServerModal(false);
    } else {
      Alert.alert(
        'Server Unreachable',
        `Could not reach ${serverInput}.\nCheck if your PC's backend is running on this IP. Save anyway?`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Save Anyway',
            onPress: async () => {
              await setServerUrl(serverInput);
              setShowServerModal(false);
            },
          },
        ]
      );
    }
  };

  const handleLogin = async () => {
    if (!email.trim() || !password) {
      Alert.alert('Error', 'Please enter both email and password.');
      return;
    }

    setLoading(true);
    try {
      const result = await mobileApi.login(email.trim(), password);
      await saveSession(result.token, result.user);
      onLoginSuccess(result.user);
    } catch (err) {
      Alert.alert('Sign In Failed', err instanceof Error ? err.message : 'Invalid credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={[styles.container, { backgroundColor: theme.background }]}
    >
      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        {/* Brand Header */}
        <View style={styles.brandContainer}>
          <View style={[styles.brandIconWrap, { backgroundColor: theme.primary }]}>
            <Landmark color="#ffffff" size={32} />
          </View>
          <Text style={[styles.brandTitle, { color: theme.textPrimary }]}>
            Barangay<Text style={{ color: theme.cyan }}>Link</Text>
          </Text>
          <Text style={[styles.brandSubtitle, { color: theme.textSecondary }]}>
            COMMUNITY PORTAL &bull; MOBILE
          </Text>
        </View>

        {/* Card Form */}
        <View
          style={[
            styles.card,
            {
              backgroundColor: theme.surface,
              borderColor: theme.border,
            },
          ]}
        >
          <Text style={[styles.welcomeTitle, { color: theme.textPrimary }]}>Sign in</Text>
          <Text style={[styles.welcomeSubtitle, { color: theme.textSecondary }]}>
            Access resident services & document requests.
          </Text>

          {/* Email Input */}
          <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>Email address</Text>
          <View style={[styles.inputBox, { borderColor: theme.border, backgroundColor: theme.surfaceSecondary }]}>
            <Mail size={18} color={theme.textMuted} style={styles.inputIcon} />
            <TextInput
              style={[styles.input, { color: theme.textPrimary }]}
              placeholder="you@example.com"
              placeholderTextColor={theme.textMuted}
              keyboardType="email-address"
              autoCapitalize="none"
              value={email}
              onChangeText={setEmail}
            />
          </View>

          {/* Password Input */}
          <Text style={[styles.inputLabel, { color: theme.textSecondary, marginTop: 14 }]}>Password</Text>
          <View style={[styles.inputBox, { borderColor: theme.border, backgroundColor: theme.surfaceSecondary }]}>
            <Lock size={18} color={theme.textMuted} style={styles.inputIcon} />
            <TextInput
              style={[styles.input, { color: theme.textPrimary }]}
              placeholder="Enter your password"
              placeholderTextColor={theme.textMuted}
              secureTextEntry={!showPassword}
              value={password}
              onChangeText={setPassword}
            />
            <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeBtn}>
              {showPassword ? <EyeOff size={18} color={theme.textMuted} /> : <Eye size={18} color={theme.textMuted} />}
            </TouchableOpacity>
          </View>

          {/* Submit Button */}
          <TouchableOpacity
            style={[styles.loginBtn, { backgroundColor: theme.primary }]}
            onPress={handleLogin}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#ffffff" />
            ) : (
              <>
                <Text style={styles.loginBtnText}>Sign In</Text>
                <ArrowRight size={18} color="#ffffff" />
              </>
            )}
          </TouchableOpacity>

          {/* Register Link */}
          <View style={styles.registerPrompt}>
            <Text style={{ color: theme.textSecondary, fontSize: 13 }}>New resident? </Text>
            <TouchableOpacity onPress={onNavigateRegister}>
              <Text style={{ color: theme.primary, fontWeight: '700', fontSize: 13 }}>Create account</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Server & Security Footers */}
        <View style={styles.footerRow}>
          <TouchableOpacity style={styles.serverButton} onPress={openServerSettings}>
            <Server size={14} color={theme.textSecondary} />
            <Text style={[styles.serverText, { color: theme.textSecondary }]}>Configure API Server</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.badgeRow}>
          <ShieldCheck size={14} color={theme.success} />
          <Text style={[styles.badgeText, { color: theme.textMuted }]}>
            100% Stored Procedures &bull; JWT Authentication
          </Text>
        </View>

        {/* Server Settings Dialog */}
        {showServerModal && (
          <View style={styles.modalBackdrop}>
            <View style={[styles.modalCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
              <Text style={[styles.modalTitle, { color: theme.textPrimary }]}>Backend Server URL</Text>
              <Text style={[styles.modalDesc, { color: theme.textSecondary }]}>
                Set the IP address of your host machine running the backend:
              </Text>
              <TextInput
                style={[styles.serverInput, { borderColor: theme.border, color: theme.textPrimary }]}
                value={serverInput}
                onChangeText={setServerInput}
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
                  onPress={saveServerSettings}
                  disabled={testingServer}
                >
                  <Text style={{ color: '#ffffff', fontWeight: '700' }}>
                    {testingServer ? 'Testing…' : 'Save & Test'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 24,
  },
  brandContainer: {
    alignItems: 'center',
    marginBottom: 28,
  },
  brandIconWrap: {
    width: 64,
    height: 64,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
  },
  brandTitle: {
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  brandSubtitle: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1.5,
    marginTop: 4,
  },
  card: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 24,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
  },
  welcomeTitle: {
    fontSize: 22,
    fontWeight: '800',
    marginBottom: 4,
  },
  welcomeSubtitle: {
    fontSize: 13,
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 6,
  },
  inputBox: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 48,
  },
  inputIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    fontSize: 14,
  },
  eyeBtn: {
    padding: 4,
  },
  loginBtn: {
    flexDirection: 'row',
    height: 50,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 22,
    gap: 8,
    elevation: 2,
  },
  loginBtnText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '700',
  },
  registerPrompt: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 20,
  },
  footerRow: {
    alignItems: 'center',
    marginTop: 24,
  },
  serverButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  serverText: {
    fontSize: 12,
    fontWeight: '600',
  },
  badgeRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
    marginTop: 12,
  },
  badgeText: {
    fontSize: 11,
  },
  modalBackdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    justifyContent: 'center',
    padding: 24,
  },
  modalCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 22,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 6,
  },
  modalDesc: {
    fontSize: 12,
    lineHeight: 18,
    marginBottom: 14,
  },
  serverInput: {
    height: 46,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    fontSize: 13,
    marginBottom: 18,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
  },
  modalBtn: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
});
