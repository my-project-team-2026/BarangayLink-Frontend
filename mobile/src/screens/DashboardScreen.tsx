import React, { useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Platform,
} from 'react-native';
import {
  Landmark,
  FileText,
  Clock,
  CheckCircle2,
  Bell,
  ArrowRight,
  ShieldCheck,
  Plus,
  Settings as SettingsIcon,
} from 'lucide-react-native';
import { mobileApi } from '../api';
import type { ThemeColors } from '../theme';
import type { DashboardSummary, DocumentRequest, User } from '../types';

interface DashboardScreenProps {
  theme: ThemeColors;
  user: User;
  onNavigateRequests: () => void;
  onNavigateNewRequest: () => void;
  onNavigateAnnouncements: () => void;
  onNavigateSettings?: () => void;
}

export function DashboardScreen({
  theme,
  user,
  onNavigateRequests,
  onNavigateNewRequest,
  onNavigateAnnouncements,
  onNavigateSettings,
}: DashboardScreenProps) {
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [requests, setRequests] = useState<DocumentRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [hasNewAnnouncements, setHasNewAnnouncements] = useState(false);

  const isStaff = user.role !== 'Resident';

  const loadData = async () => {
    try {
      const [reqRes, sumRes, noticeRes] = await Promise.allSettled([
        mobileApi.requests(),
        isStaff ? mobileApi.dashboard() : Promise.resolve(null),
        mobileApi.announcements(),
      ]);

      if (reqRes.status === 'fulfilled' && reqRes.value.data) {
        setRequests(reqRes.value.data);
      }
      if (sumRes.status === 'fulfilled' && sumRes.value && 'data' in sumRes.value) {
        setSummary(sumRes.value.data);
      }
      if (noticeRes.status === 'fulfilled') { const newest=(noticeRes.value.data ?? []).reduce((v,a)=>Math.max(v,new Date(a.created_at).getTime()||0),0); const seen=Number(await AsyncStorage.getItem('barangaylink_seen_announcement')||0); setHasNewAnnouncements(newest>seen); }
    } catch {
      // network errors leave the previous data in place
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    void loadData();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    void loadData();
  };

  const pendingCount = requests.filter(r => r.status === 'Pending').length;
  const readyCount = requests.filter(r => r.status === 'Ready for Release').length;

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: theme.background }]}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.primary} />}
    >
      {/* Top Banner */}
      <View style={[styles.welcomeBanner, { backgroundColor: theme.navy }]}>
        <View style={styles.bannerHeaderRow}>
          <View style={styles.bannerPill}>
            <View style={[styles.pillDot, { backgroundColor: theme.cyan }]} />
            <Text style={[styles.pillText, { color: theme.cyan }]}>BARANGAYLINK PORTAL</Text>
          </View>
          {onNavigateSettings && (
            <TouchableOpacity
              style={styles.bannerSettingsBtn}
              onPress={onNavigateSettings}
              accessibilityLabel="Settings"
            >
              <SettingsIcon size={16} color="#ffffff" />
            </TouchableOpacity>
          )}
        </View>

        <Text style={styles.bannerTitle}>
          Good day, <Text style={{ color: theme.cyan }}>{user.name ? user.name.split(' ')[0] : 'Resident'}</Text>
        </Text>
        <Text style={styles.bannerDesc}>
          {isStaff
            ? 'Review and manage community records & requests.'
            : 'Track your document requests and stay updated with community notices.'}
        </Text>

        <View style={styles.bannerRoleChip}>
          <ShieldCheck size={13} color="#ffffff" />
          <Text style={styles.bannerRoleText}>{user.role} Workspace</Text>
        </View>
      </View>

      {/* Quick Actions */}
      <Text style={[styles.sectionHeading, { color: theme.textPrimary }]}>Quick Actions</Text>
      <View style={styles.quickGrid}>
        {!isStaff && (
          <TouchableOpacity
            style={[styles.quickCard, { backgroundColor: theme.surface, borderColor: theme.border }]}
            onPress={onNavigateNewRequest}
          >
            <View style={[styles.quickIcon, { backgroundColor: theme.primaryLight }]}>
              <Plus size={20} color={theme.primary} />
            </View>
            <Text style={[styles.quickTitle, { color: theme.textPrimary }]}>New Request</Text>
            <Text style={[styles.quickSub, { color: theme.textSecondary }]}>Request document</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity
          style={[styles.quickCard, { backgroundColor: theme.surface, borderColor: theme.border }]}
          onPress={onNavigateRequests}
        >
          <View style={[styles.quickIcon, { backgroundColor: theme.warningBg }]}>
            <FileText size={20} color={theme.warning} />
          </View>
          <Text style={[styles.quickTitle, { color: theme.textPrimary }]}>Requests</Text>
          <Text style={[styles.quickSub, { color: theme.textSecondary }]}>
            {pendingCount} Pending review
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.quickCard, { backgroundColor: theme.surface, borderColor: theme.border }]}
          onPress={async () => { if(hasNewAnnouncements){const latest=Date.now(); await AsyncStorage.setItem('barangaylink_seen_announcement',String(latest));setHasNewAnnouncements(false)} onNavigateAnnouncements() }}
        >
          <View style={[styles.quickIcon, { backgroundColor: theme.successBg }]}>
            <Bell size={20} color={theme.success} />{hasNewAnnouncements && <View style={{position:'absolute',right:8,top:7,width:9,height:9,borderRadius:5,backgroundColor:'#e34b4b',borderWidth:1,borderColor:theme.surface}} />}
          </View>
          <Text style={[styles.quickTitle, { color: theme.textPrimary }]}>Notices</Text>
          <Text style={[styles.quickSub, { color: theme.textSecondary }]}>Community board</Text>
        </TouchableOpacity>
      </View>

      {/* Stats Summary */}
      <Text style={[styles.sectionHeading, { color: theme.textPrimary }]}>Activity Overview</Text>
      <View style={styles.statsRow}>
        <View style={[styles.statBox, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <View style={[styles.statIconBadge, { backgroundColor: theme.primaryLight }]}>
            <FileText size={16} color={theme.primary} />
          </View>
          <Text style={[styles.statNumber, { color: theme.textPrimary }]}>
            {loading ? '…' : requests.length}
          </Text>
          <Text style={[styles.statLabel, { color: theme.textSecondary }]}>Total Requests</Text>
        </View>

        <View style={[styles.statBox, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <View style={[styles.statIconBadge, { backgroundColor: theme.warningBg }]}>
            <Clock size={16} color={theme.warning} />
          </View>
          <Text style={[styles.statNumber, { color: theme.textPrimary }]}>
            {loading ? '…' : pendingCount}
          </Text>
          <Text style={[styles.statLabel, { color: theme.textSecondary }]}>Pending</Text>
        </View>

        <View style={[styles.statBox, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <View style={[styles.statIconBadge, { backgroundColor: theme.successBg }]}>
            <CheckCircle2 size={16} color={theme.success} />
          </View>
          <Text style={[styles.statNumber, { color: theme.textPrimary }]}>
            {loading ? '…' : readyCount}
          </Text>
          <Text style={[styles.statLabel, { color: theme.textSecondary }]}>Ready</Text>
        </View>
      </View>

      {/* Recent Requests Section */}
      <View style={styles.sectionHeaderRow}>
        <Text style={[styles.sectionHeading, { color: theme.textPrimary, marginBottom: 0 }]}>
          Recent Requests
        </Text>
        <TouchableOpacity onPress={onNavigateRequests} style={styles.viewAllBtn}>
          <Text style={[styles.viewAllText, { color: theme.primary }]}>View All</Text>
          <ArrowRight size={14} color={theme.primary} />
        </TouchableOpacity>
      </View>

      {loading ? (
        <ActivityIndicator style={{ marginTop: 24 }} color={theme.primary} />
      ) : requests.length === 0 ? (
        <View style={[styles.emptyCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <FileText size={28} color={theme.textMuted} />
          <Text style={[styles.emptyTitle, { color: theme.textPrimary }]}>No document requests yet</Text>
          <Text style={[styles.emptySub, { color: theme.textSecondary }]}>
            Submit your first document request through the New Request button.
          </Text>
        </View>
      ) : (
        requests.slice(0, 3).map(req => (
          <TouchableOpacity
            key={req.id}
            style={[styles.requestCard, { backgroundColor: theme.surface, borderColor: theme.border }]}
            onPress={onNavigateRequests}
            activeOpacity={0.8}
          >
            <View style={styles.reqTopRow}>
              <Text style={[styles.trackingNum, { color: theme.primary }]}>{req.tracking_number}</Text>
              <View
                style={[
                  styles.statusBadge,
                  {
                    backgroundColor:
                      req.status === 'Approved' || req.status === 'Released'
                        ? theme.successBg
                        : req.status === 'Pending'
                        ? theme.warningBg
                        : theme.dangerBg,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.statusText,
                    {
                      color:
                        req.status === 'Approved' || req.status === 'Released'
                          ? theme.success
                          : req.status === 'Pending'
                          ? theme.warning
                          : theme.danger,
                    },
                  ]}
                >
                  {req.status}
                </Text>
              </View>
            </View>
            <Text style={[styles.reqDocType, { color: theme.textPrimary }]}>{req.document_type}</Text>
            <Text style={[styles.reqPurpose, { color: theme.textSecondary }]} numberOfLines={1}>
              {req.purpose}
            </Text>
          </TouchableOpacity>
        ))
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 18,
    paddingBottom: 40,
  },
  welcomeBanner: {
    borderRadius: 20,
    padding: 22,
    marginBottom: 24,
    elevation: 3,
  },
  bannerHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  bannerSettingsBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  bannerPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  pillDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  pillText: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 1.2,
  },
  bannerTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#ffffff',
    marginBottom: 6,
  },
  bannerDesc: {
    fontSize: 12,
    color: '#cbd5e1',
    lineHeight: 18,
    marginBottom: 16,
  },
  bannerRoleChip: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 20,
  },
  bannerRoleText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '700',
  },
  sectionHeading: {
    fontSize: 15,
    fontWeight: '800',
    marginBottom: 12,
  },
  quickGrid: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 24,
  },
  quickCard: {
    flex: 1,
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
  },
  quickIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  quickTitle: {
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 2,
  },
  quickSub: {
    fontSize: 10,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 24,
  },
  statBox: {
    flex: 1,
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    alignItems: 'center',
  },
  statIconBadge: {
    width: 30,
    height: 30,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  statNumber: {
    fontSize: 20,
    fontWeight: '800',
    marginBottom: 2,
  },
  statLabel: {
    fontSize: 10,
    fontWeight: '600',
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  viewAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  viewAllText: {
    fontSize: 12,
    fontWeight: '700',
  },
  requestCard: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 16,
    marginBottom: 10,
  },
  reqTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  trackingNum: {
    fontSize: 13,
    fontWeight: '800',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  statusBadge: {
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '800',
  },
  reqDocType: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 4,
  },
  reqPurpose: {
    fontSize: 11,
  },
  emptyCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTitle: {
    fontSize: 14,
    fontWeight: '700',
    marginTop: 8,
    marginBottom: 4,
  },
  emptySub: {
    fontSize: 11,
    textAlign: 'center',
  },
});
