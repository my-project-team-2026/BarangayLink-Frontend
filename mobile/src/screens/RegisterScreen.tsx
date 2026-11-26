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
import { ArrowLeft, CheckCircle2 } from 'lucide-react-native';
import { mobileApi } from '../api';
import type { ThemeColors } from '../theme';

function localToday() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

interface RegisterScreenProps {
  theme: ThemeColors;
  onNavigateLogin: () => void;
}

export function RegisterScreen({ theme, onNavigateLogin }: RegisterScreenProps) {
  const [form, setForm] = useState({
    email: '',
    password: '',
    first_name: '',
    middle_name: '',
    last_name: '',
    birthdate: '',
    gender: '',
    purok_zone: '',
    address_line: '',
    contact_number: '',
  });
  const [loading, setLoading] = useState(false);

  const titleCase = (v:string) => v.trim().toLowerCase().replace(/\b([\p{L}])/gu,m=>m.toUpperCase()).replace(/\s+/g,' ');
  const normalizePurok = (v:string) => { const m=v.trim().match(/^(purok|zone)\s*(\d+)$/i); return m ? `${m[1][0].toUpperCase()}${m[1].slice(1).toLowerCase()} ${m[2]}` : v.trim().replace(/\s+/g,' '); };
  const update = (key: keyof typeof form, val: string) =>
    setForm(prev => ({ ...prev, [key]: key==='purok_zone' ? normalizePurok(val) : val }));

  const handleRegister = async () => {
    if (
      !form.email.trim() ||
      !form.password ||
      !form.first_name.trim() ||
      !form.last_name.trim() ||
      !form.birthdate.trim() ||
      !form.purok_zone.trim() ||
      !form.address_line.trim()
    ) {
      Alert.alert('Required Fields', 'Please fill in all required resident information.');
      return;
    }

    const dateParts = form.birthdate.split('-').map(Number);
    const [year, month, day] = dateParts;
    const parsedDate = new Date(Date.UTC(year, month - 1, day));
    const validBirthdate = dateParts.length === 3 && year > 0 && month >= 1 && month <= 12 && day >= 1 && day <= 31 && parsedDate.getUTCFullYear() === year && parsedDate.getUTCMonth() === month - 1 && parsedDate.getUTCDate() === day && form.birthdate <= localToday();
    if (!validBirthdate) {
      Alert.alert('Invalid Birthdate', 'Enter a valid birthdate in YYYY-MM-DD format that is not in the future.');
      return;
    }

    if (form.password.length < 8) {
      Alert.alert('Password too short', 'Password must be at least 8 characters long.');
      return;
    }

    setLoading(true);
    try {
      const res = await mobileApi.register({
        ...form, first_name:titleCase(form.first_name), middle_name:form.middle_name.trim() ? titleCase(form.middle_name) : undefined, last_name:titleCase(form.last_name), purok_zone:normalizePurok(form.purok_zone), address_line:titleCase(form.address_line),
        gender: form.gender ? form.gender : undefined,
        contact_number: form.contact_number ? form.contact_number.trim() : undefined,
      });

      Alert.alert('Success', res.message || 'Account created! You can now sign in.', [
        { text: 'Go to Sign In', onPress: onNavigateLogin },
      ]);
    } catch (err) {
      Alert.alert('Registration Failed', err instanceof Error ? err.message : 'Could not register.');
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
        {/* Back Button */}
        <TouchableOpacity style={styles.backButton} onPress={onNavigateLogin}>
          <ArrowLeft size={20} color={theme.textPrimary} />
          <Text style={[styles.backText, { color: theme.textPrimary }]}>Back to Sign In</Text>
        </TouchableOpacity>

        <View style={styles.header}>
          <Text style={[styles.eyebrow, { color: theme.cyan }]}>RESIDENT REGISTRATION</Text>
          <Text style={[styles.title, { color: theme.textPrimary }]}>Create an Account</Text>
          <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
            Register your profile to submit and track document requests on your phone.
          </Text>
        </View>

        <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <Text style={[styles.sectionTitle, { color: theme.primary }]}>Account Information</Text>

          <Text style={[styles.label, { color: theme.textSecondary }]}>Email address *</Text>
          <TextInput
            style={[styles.input, { borderColor: theme.border, color: theme.textPrimary, backgroundColor: theme.surfaceSecondary }]}
            placeholder="you@example.com"
            placeholderTextColor={theme.textMuted}
            keyboardType="email-address"
            autoCapitalize="none"
            value={form.email}
            onChangeText={v => update('email', v)}
          />

          <Text style={[styles.label, { color: theme.textSecondary, marginTop: 12 }]}>Password *</Text>
          <TextInput
            style={[styles.input, { borderColor: theme.border, color: theme.textPrimary, backgroundColor: theme.surfaceSecondary }]}
            placeholder="At least 8 characters"
            placeholderTextColor={theme.textMuted}
            secureTextEntry
            value={form.password}
            onChangeText={v => update('password', v)}
          />

          <Text style={[styles.sectionTitle, { color: theme.primary, marginTop: 22 }]}>Personal Information</Text>

          <Text style={[styles.label, { color: theme.textSecondary }]}>First name *</Text>
          <TextInput
            style={[styles.input, { borderColor: theme.border, color: theme.textPrimary, backgroundColor: theme.surfaceSecondary }]}
            value={form.first_name}
            onChangeText={v => update('first_name', v)}
          />

          <Text style={[styles.label, { color: theme.textSecondary, marginTop: 12 }]}>Middle name (optional)</Text>
          <TextInput
            style={[styles.input, { borderColor: theme.border, color: theme.textPrimary, backgroundColor: theme.surfaceSecondary }]}
            value={form.middle_name}
            onChangeText={v => update('middle_name', v)}
          />

          <Text style={[styles.label, { color: theme.textSecondary, marginTop: 12 }]}>Last name *</Text>
          <TextInput
            style={[styles.input, { borderColor: theme.border, color: theme.textPrimary, backgroundColor: theme.surfaceSecondary }]}
            value={form.last_name}
            onChangeText={v => update('last_name', v)}
          />

          <Text style={[styles.label, { color: theme.textSecondary, marginTop: 12 }]}>Birthdate (YYYY-MM-DD) *</Text>
          <TextInput
            style={[styles.input, { borderColor: theme.border, color: theme.textPrimary, backgroundColor: theme.surfaceSecondary }]}
            placeholder="e.g. 2000-05-15"
            placeholderTextColor={theme.textMuted}
            value={form.birthdate}
            onChangeText={v => update('birthdate', v)}
          />

          <Text style={[styles.label, { color: theme.textSecondary, marginTop: 12 }]}>Gender (Male/Female/Other)</Text>
          <TextInput
            style={[styles.input, { borderColor: theme.border, color: theme.textPrimary, backgroundColor: theme.surfaceSecondary }]}
            placeholder="e.g. Male"
            placeholderTextColor={theme.textMuted}
            value={form.gender}
            onChangeText={v => update('gender', v)}
          />

          <Text style={[styles.label, { color: theme.textSecondary, marginTop: 12 }]}>Purok / Zone *</Text>
          <TextInput
            style={[styles.input, { borderColor: theme.border, color: theme.textPrimary, backgroundColor: theme.surfaceSecondary }]}
            placeholder="e.g. Purok 1"
            placeholderTextColor={theme.textMuted}
            value={form.purok_zone}
            onChangeText={v => update('purok_zone', v)}
          />

          <Text style={[styles.label, { color: theme.textSecondary, marginTop: 12 }]}>Complete Address *</Text>
          <TextInput
            style={[styles.input, { borderColor: theme.border, color: theme.textPrimary, backgroundColor: theme.surfaceSecondary }]}
            placeholder="House #, Street name"
            placeholderTextColor={theme.textMuted}
            value={form.address_line}
            onChangeText={v => update('address_line', v)}
          />

          <Text style={[styles.label, { color: theme.textSecondary, marginTop: 12 }]}>Contact Number (optional)</Text>
          <TextInput
            style={[styles.input, { borderColor: theme.border, color: theme.textPrimary, backgroundColor: theme.surfaceSecondary }]}
            placeholder="09xx xxx xxxx"
            placeholderTextColor={theme.textMuted}
            keyboardType="phone-pad"
            value={form.contact_number}
            onChangeText={v => update('contact_number', v)}
          />

          <TouchableOpacity
            style={[styles.submitBtn, { backgroundColor: theme.primary }]}
            onPress={handleRegister}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#ffffff" />
            ) : (
              <Text style={styles.submitBtnText}>Create Account</Text>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingTop: Platform.OS === 'ios' ? 50 : 30,
    paddingBottom: 40,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  backText: {
    fontSize: 14,
    fontWeight: '700',
  },
  header: {
    marginBottom: 20,
  },
  eyebrow: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.2,
    marginBottom: 4,
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 12,
    lineHeight: 18,
  },
  card: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 20,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '800',
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 5,
  },
  input: {
    height: 46,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    fontSize: 13,
  },
  submitBtn: {
    height: 48,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 24,
  },
  submitBtnText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
  },
});
