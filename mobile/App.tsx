import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Platform,
  BackHandler,
  Alert,
  useColorScheme,
} from 'react-native';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  Home,
  ClipboardList,
  Bell,
  Settings as SettingsIcon,
} from 'lucide-react-native';

import { colors, type ThemeColors } from './src/theme';
import { getSavedUser, clearSession, setSessionExpiredHandler } from './src/api';
import type { User, ThemeMode } from './src/types';

import { LoginScreen } from './src/screens/LoginScreen';
import { RegisterScreen } from './src/screens/RegisterScreen';
import { DashboardScreen } from './src/screens/DashboardScreen';
import { RequestsScreen } from './src/screens/RequestsScreen';
import { AnnouncementsScreen } from './src/screens/AnnouncementsScreen';
import { SettingsScreen } from './src/screens/SettingsScreen';
import { ReportsScreen } from './src/screens/ReportsScreen';

const THEME_KEY = 'barangaylink_mobile_theme';

type Tab = 'home' | 'requests' | 'notices' | 'reports' | 'settings';

export default function App() {
  return (
    <SafeAreaProvider>
      <MainApp />
    </SafeAreaProvider>
  );
}

function MainApp() {
  const insets = useSafeAreaInsets();
  const systemScheme = useColorScheme();
  const [themeMode, setThemeMode] = useState<ThemeMode>('light');
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [authScreen, setAuthScreen] = useState<'login' | 'register'>('login');

  // Navigation tab state
  const [currentTab, setCurrentTab] = useState<Tab>('home');
  const [openNewRequestOnNav, setOpenNewRequestOnNav] = useState(false);

  // Clear app state when an authenticated API request reports an expired/invalid session.
  useEffect(() => {
    setSessionExpiredHandler(() => {
      setUser(null);
      setCurrentTab('home');
      setAuthScreen('login');
    });
    return () => setSessionExpiredHandler(null);
  }, []);

  // Load saved theme and session on startup
  useEffect(() => {
    (async () => {
      try {
        const [savedTheme, savedUser] = await Promise.all([
          AsyncStorage.getItem(THEME_KEY),
          getSavedUser(),
        ]);

        if (savedTheme === 'light' || savedTheme === 'dark') {
          setThemeMode(savedTheme);
        } else if (systemScheme === 'dark') {
          setThemeMode('dark');
        }

        if (savedUser) {
          setUser(savedUser);
        }
      } catch (e) {
        console.warn('Startup load error:', e);
      } finally {
        setLoading(false);
      }
    })();
  }, [systemScheme]);

  // Handle Android hardware/system back button
  useEffect(() => {
    const onBackPress = () => {
      // Unauthenticated: back to login if on register screen
      if (!user) {
        if (authScreen === 'register') {
          setAuthScreen('login');
          return true;
        }
        return false;
      }

      // Authenticated: if in requests, notices, or settings tab, return to home
      if (currentTab !== 'home') {
        setCurrentTab('home');
        return true;
      }

      // If already on home dashboard, confirm before exiting
      Alert.alert(
        'Exit BarangayLink',
        'Are you sure you want to exit the app?',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Exit', style: 'destructive', onPress: () => BackHandler.exitApp() },
        ],
        { cancelable: true }
      );
      return true;
    };

    const backSub = BackHandler.addEventListener('hardwareBackPress', onBackPress);
    return () => backSub.remove();
  }, [user, authScreen, currentTab]);

  const toggleTheme = async () => {
    const next: ThemeMode = themeMode === 'dark' ? 'light' : 'dark';
    setThemeMode(next);
    await AsyncStorage.setItem(THEME_KEY, next);
  };

  const handleLogout = async () => {
    await clearSession();
    setUser(null);
    setCurrentTab('home');
    setAuthScreen('login');
  };

  const currentTheme: ThemeColors = colors[themeMode];
  const isDark = themeMode === 'dark';

  // Bottom navigation safe inset: elevates tab bar above Android 3-button nav & iOS home indicator
  const bottomNavPadding =
    Platform.OS === 'android'
      ? Math.max(insets.bottom, 24)
      : Math.max(insets.bottom, 12);

  if (loading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: currentTheme.background }]}>
        <ActivityIndicator size="large" color={currentTheme.primary} />
      </View>
    );
  }

  // Unauthenticated Flow
  if (!user) {
    return (
      <View
        style={[
          styles.safeArea,
          {
            backgroundColor: currentTheme.background,
            paddingTop: insets.top,
            paddingBottom: insets.bottom,
          },
        ]}
      >
        <StatusBar style={isDark ? 'light' : 'dark'} />
        {authScreen === 'login' ? (
          <LoginScreen
            theme={currentTheme}
            isDark={isDark}
            onLoginSuccess={u => setUser(u)}
            onNavigateRegister={() => setAuthScreen('register')}
          />
        ) : (
          <RegisterScreen
            theme={currentTheme}
            onNavigateLogin={() => setAuthScreen('login')}
          />
        )}
      </View>
    );
  }

  // Authenticated App with Bottom Tabs
  return (
    <View
      style={[
        styles.safeArea,
        {
          backgroundColor: currentTheme.background,
          paddingTop: insets.top,
        },
      ]}
    >
      <StatusBar style={isDark ? 'light' : 'dark'} />

      {/* Screen Body */}
      <View style={styles.body}>
        {currentTab === 'home' && (
          <DashboardScreen
            theme={currentTheme}
            user={user}
            onNavigateRequests={() => setCurrentTab('requests')}
            onNavigateNewRequest={() => {
              setOpenNewRequestOnNav(true);
              setCurrentTab('requests');
            }}
            onNavigateAnnouncements={() => setCurrentTab('notices')}
            onNavigateSettings={() => setCurrentTab('settings')}
          />
        )}

        {currentTab === 'requests' && (
          <RequestsScreen
            theme={currentTheme}
            user={user}
            showCreateModalInitially={openNewRequestOnNav}
            onCloseInitialModal={() => setOpenNewRequestOnNav(false)}
            onNavigateBack={() => setCurrentTab('home')}
          />
        )}

        {currentTab === 'notices' && (
          <AnnouncementsScreen
            theme={currentTheme}
            onNavigateBack={() => setCurrentTab('home')}
          />
        )}

        {currentTab === 'reports' && user.role !== 'Resident' && <ReportsScreen theme={currentTheme} onNavigateBack={() => setCurrentTab('home')} />}

        {currentTab === 'settings' && (
          <SettingsScreen
            theme={currentTheme}
            user={user}
            isDark={isDark}
            onToggleTheme={toggleTheme}
            onLogout={handleLogout}
            onNavigateBack={() => setCurrentTab('home')}
          />
        )}
      </View>

      {/* Bottom Tab Bar with Safe Area Elevation */}
      <View
        style={[
          styles.tabBar,
          {
            backgroundColor: currentTheme.surface,
            borderColor: currentTheme.border,
            paddingBottom: bottomNavPadding,
            minHeight: 56 + bottomNavPadding,
          },
        ]}
      >
        <TouchableOpacity
          style={styles.tabItem}
          onPress={() => setCurrentTab('home')}
          activeOpacity={0.7}
          accessibilityLabel="Home Dashboard"
        >
          <Home
            size={22}
            color={currentTab === 'home' ? currentTheme.primary : currentTheme.textMuted}
          />
          <Text
            style={[
              styles.tabText,
              {
                color: currentTab === 'home' ? currentTheme.primary : currentTheme.textMuted,
                fontWeight: currentTab === 'home' ? '700' : '500',
              },
            ]}
          >
            Home
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.tabItem}
          onPress={() => setCurrentTab('requests')}
          activeOpacity={0.7}
          accessibilityLabel="Document Requests"
        >
          <ClipboardList
            size={22}
            color={currentTab === 'requests' ? currentTheme.primary : currentTheme.textMuted}
          />
          <Text
            style={[
              styles.tabText,
              {
                color: currentTab === 'requests' ? currentTheme.primary : currentTheme.textMuted,
                fontWeight: currentTab === 'requests' ? '700' : '500',
              },
            ]}
          >
            Requests
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.tabItem}
          onPress={() => setCurrentTab('notices')}
          activeOpacity={0.7}
          accessibilityLabel="Community Notices"
        >
          <Bell
            size={22}
            color={currentTab === 'notices' ? currentTheme.primary : currentTheme.textMuted}
          />
          <Text
            style={[
              styles.tabText,
              {
                color: currentTab === 'notices' ? currentTheme.primary : currentTheme.textMuted,
                fontWeight: currentTab === 'notices' ? '700' : '500',
              },
            ]}
          >
            Notices
          </Text>
        </TouchableOpacity>

        {user.role !== 'Resident' && <TouchableOpacity style={styles.tabItem} onPress={() => setCurrentTab('reports')} activeOpacity={0.7} accessibilityLabel="Reports and analytics"><ClipboardList size={22} color={currentTab === 'reports' ? currentTheme.primary : currentTheme.textMuted}/><Text style={[styles.tabText,{color:currentTab === 'reports' ? currentTheme.primary : currentTheme.textMuted,fontWeight:currentTab === 'reports' ? '700' : '500'}]}>Reports</Text></TouchableOpacity>}

        <TouchableOpacity
          style={styles.tabItem}
          onPress={() => setCurrentTab('settings')}
          activeOpacity={0.7}
          accessibilityLabel="Settings and Account"
        >
          <SettingsIcon
            size={22}
            color={currentTab === 'settings' ? currentTheme.primary : currentTheme.textMuted}
          />
          <Text
            style={[
              styles.tabText,
              {
                color: currentTab === 'settings' ? currentTheme.primary : currentTheme.textMuted,
                fontWeight: currentTab === 'settings' ? '700' : '500',
              },
            ]}
          >
            Settings
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  body: {
    flex: 1,
  },
  tabBar: {
    flexDirection: 'row',
    borderTopWidth: 1,
    paddingTop: 8,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 4,
    paddingBottom: 2,
    gap: 3,
  },
  tabText: {
    fontSize: 11,
  },
});
