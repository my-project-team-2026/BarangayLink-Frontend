import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  RefreshControl,
  ActivityIndicator,
  TouchableOpacity,
  Platform,
} from 'react-native';
import { Bell, Pin, Calendar, User, ArrowLeft } from 'lucide-react-native';
import { mobileApi } from '../api';
import type { ThemeColors } from '../theme';
import type { Announcement } from '../types';

interface AnnouncementsScreenProps {
  theme: ThemeColors;
  onNavigateBack?: () => void;
}

export function AnnouncementsScreen({ theme, onNavigateBack }: AnnouncementsScreenProps) {
  const [items, setItems] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadAnnouncements = async () => {
    try {
      const res = await mobileApi.announcements();
      if (res && res.data) {
        setItems(res.data);
      }
    } catch (e) {
      console.warn('Could not load announcements:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    void loadAnnouncements();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    void loadAnnouncements();
  };

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
            <Text style={[styles.screenTitle, { color: theme.textPrimary }]}>Community Notices</Text>
            <Text style={[styles.screenSubtitle, { color: theme.textSecondary }]}>
              Official barangay updates, events & advisories
            </Text>
          </View>
        </View>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={styles.listContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.primary} />}
      >
        {loading ? (
          <ActivityIndicator style={{ marginTop: 30 }} color={theme.primary} />
        ) : items.length === 0 ? (
          <View style={[styles.emptyBox, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <Bell size={32} color={theme.textMuted} />
            <Text style={[styles.emptyTitle, { color: theme.textPrimary }]}>No announcements</Text>
            <Text style={[styles.emptySub, { color: theme.textSecondary }]}>
              Check back soon for community announcements and notices.
            </Text>
          </View>
        ) : (
          items.map(a => (
            <View
              key={a.id}
              style={[
                styles.card,
                {
                  backgroundColor: theme.surface,
                  borderColor: a.is_pinned ? theme.warning : theme.border,
                },
              ]}
            >
              <View style={styles.cardHeader}>
                <View style={[styles.categoryBadge, { backgroundColor: theme.primaryLight }]}>
                  <Text style={[styles.categoryText, { color: theme.primary }]}>
                    {a.category || 'General'}
                  </Text>
                </View>

                {a.is_pinned && (
                  <View style={[styles.pinnedBadge, { backgroundColor: theme.warningBg }]}>
                    <Pin size={12} color={theme.warning} />
                    <Text style={[styles.pinnedText, { color: theme.warning }]}>Pinned</Text>
                  </View>
                )}
              </View>

              <Text style={[styles.cardTitle, { color: theme.textPrimary }]}>{a.title}</Text>
              <Text style={[styles.cardContent, { color: theme.textSecondary }]}>{a.content}</Text>

              <View style={styles.cardFooter}>
                {a.publisher_name && (
                  <View style={styles.footerItem}>
                    <User size={12} color={theme.textMuted} />
                    <Text style={[styles.footerText, { color: theme.textMuted }]}>{a.publisher_name}</Text>
                  </View>
                )}
                <View style={styles.footerItem}>
                  <Calendar size={12} color={theme.textMuted} />
                  <Text style={[styles.footerText, { color: theme.textMuted }]}>
                    {new Date(a.created_at).toLocaleDateString()}
                  </Text>
                </View>
              </View>
            </View>
          ))
        )}
      </ScrollView>
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
  listContent: {
    padding: 16,
    paddingBottom: 40,
  },
  card: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 18,
    marginBottom: 14,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  categoryBadge: {
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 6,
  },
  categoryText: {
    fontSize: 10,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  pinnedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 12,
  },
  pinnedText: {
    fontSize: 10,
    fontWeight: '800',
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 8,
    lineHeight: 22,
  },
  cardContent: {
    fontSize: 13,
    lineHeight: 19,
    marginBottom: 14,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: 'rgba(150, 150, 150, 0.1)',
    paddingTop: 10,
  },
  footerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  footerText: {
    fontSize: 11,
  },
  emptyBox: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 30,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '700',
    marginTop: 8,
    marginBottom: 4,
  },
  emptySub: {
    fontSize: 12,
    textAlign: 'center',
  },
});
