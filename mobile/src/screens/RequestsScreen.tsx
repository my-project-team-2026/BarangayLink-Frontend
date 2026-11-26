import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Modal,
  TextInput,
  Alert,
  Platform,
} from 'react-native';
import { Plus, X, FileText, CheckCircle2, Clock, AlertCircle, ArrowLeft } from 'lucide-react-native';
import { mobileApi } from '../api';
import type { ThemeColors } from '../theme';
import type { DocumentRequest, User } from '../types';

const DOC_TYPES = [
  'Barangay Clearance',
  'Certificate of Residency',
  'Certificate of Indigency',
  'Barangay Certificate',
  'Other',
];

interface RequestsScreenProps {
  theme: ThemeColors;
  user: User;
  showCreateModalInitially?: boolean;
  onCloseInitialModal?: () => void;
  onNavigateBack?: () => void;
}

export function RequestsScreen({
  theme,
  user,
  showCreateModalInitially = false,
  onCloseInitialModal,
  onNavigateBack,
}: RequestsScreenProps) {
  const [requests, setRequests] = useState<DocumentRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [statusFilter, setStatusFilter] = useState('All');

  // New Request Modal state
  const [modalVisible, setModalVisible] = useState(showCreateModalInitially);
  const [selectedDocType, setSelectedDocType] = useState(DOC_TYPES[0]);
  const [purpose, setPurpose] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [statusTarget,setStatusTarget]=useState<{id:string;status:string;existingRemarks:string}|null>(null);
  const [statusRemarks,setStatusRemarks]=useState('');
  const [updatingStatus,setUpdatingStatus]=useState(false);

  useEffect(() => {
    if (showCreateModalInitially) {
      setModalVisible(true);
    }
  }, [showCreateModalInitially]);

  const loadRequests = async () => {
    try {
      const res = await mobileApi.requests();
      if (res && res.data) {
        setRequests(res.data);
      }
    } catch (e) {
      console.warn('Could not load requests:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    void loadRequests();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    void loadRequests();
  };

  const handleCreateRequest = async () => {
    if (!purpose.trim()) {
      Alert.alert('Required', 'Please describe the purpose for this document request.');
      return;
    }

    setSubmitting(true);
    try {
      await mobileApi.createRequest(selectedDocType, purpose.trim());
      Alert.alert('Success', 'Your document request has been submitted.');
      setPurpose('');
      setModalVisible(false);
      if (onCloseInitialModal) onCloseInitialModal();
      void loadRequests();
    } catch (err) {
      Alert.alert('Error', err instanceof Error ? err.message : 'Could not submit request.');
    } finally {
      setSubmitting(false);
    }
  };

  const updateStatus = async () => { if(!statusTarget)return; if(statusTarget.status==='Rejected'&&!statusRemarks.trim()){Alert.alert('Reason required','Enter a reason before rejecting this request.');return;} setUpdatingStatus(true); try{await mobileApi.updateRequestStatus(statusTarget.id,statusTarget.status,statusRemarks.trim());setStatusTarget(null);setStatusRemarks('');await loadRequests();Alert.alert('Updated',`Request moved to ${statusTarget.status}.`)}catch(e){Alert.alert('Error',e instanceof Error?e.message:'Could not update request.')}finally{setUpdatingStatus(false)} };

  const filtered = requests.filter(r => (statusFilter === 'All' ? true : r.status === statusFilter));

  const filterTabs = ['All', 'Pending', 'Approved', 'Ready for Release', 'Released'];

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
            <Text style={[styles.screenTitle, { color: theme.textPrimary }]}>Document Requests</Text>
            <Text style={[styles.screenSubtitle, { color: theme.textSecondary }]}>
              {requests.length} total submissions &bull; Track in real-time
            </Text>
          </View>
        </View>

        {user.role === 'Resident' && (
          <TouchableOpacity
            style={[styles.addBtn, { backgroundColor: theme.primary }]}
            onPress={() => setModalVisible(true)}
          >
            <Plus size={18} color="#ffffff" />
            <Text style={styles.addBtnText}>New</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Filter Chips Bar */}
      <View style={[styles.filterBar, { backgroundColor: theme.surface, borderBottomColor: theme.border }]}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.filterScrollView}
          contentContainerStyle={styles.filterScroll}
        >
          {filterTabs.map(tab => {
            const active = statusFilter === tab;
            return (
              <TouchableOpacity
                key={tab}
                style={[
                  styles.filterChip,
                  {
                    backgroundColor: active ? theme.primary : theme.surfaceSecondary,
                    borderColor: active ? theme.primary : theme.border,
                  },
                ]}
                onPress={() => setStatusFilter(tab)}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    styles.filterChipText,
                    {
                      color: active ? '#ffffff' : theme.textSecondary,
                      fontWeight: active ? '700' : '600',
                    },
                  ]}
                >
                  {tab}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Requests List */}
      <ScrollView
        style={styles.listScrollView}
        contentContainerStyle={styles.listContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.primary} />}
      >
        {loading ? (
          <ActivityIndicator style={{ marginTop: 30 }} color={theme.primary} />
        ) : filtered.length === 0 ? (
          <View style={[styles.emptyBox, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <FileText size={32} color={theme.textMuted} />
            <Text style={[styles.emptyTitle, { color: theme.textPrimary }]}>No requests found</Text>
            <Text style={[styles.emptySub, { color: theme.textSecondary }]}>
              {statusFilter === 'All'
                ? 'Tap "+ New" above to request a barangay document.'
                : `No requests with status "${statusFilter}".`}
            </Text>
          </View>
        ) : (
          filtered.map(r => {
            const isDone = r.status === 'Approved' || r.status === 'Released' || r.status === 'Ready for Release';
            const isPending = r.status === 'Pending';

            return (
              <View
                key={r.id}
                style={[styles.itemCard, { backgroundColor: theme.surface, borderColor: theme.border }]}
              >
                <View style={styles.itemHeader}>
                  <Text style={[styles.trackingNumber, { color: theme.primary }]}>{r.tracking_number}</Text>
                  <View
                    style={[
                      styles.statusPill,
                      {
                        backgroundColor: isDone ? theme.successBg : isPending ? theme.warningBg : theme.dangerBg,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.statusPillText,
                        {
                          color: isDone ? theme.success : isPending ? theme.warning : theme.danger,
                        },
                      ]}
                    >
                      {r.status}
                    </Text>
                  </View>
                </View>

                <Text style={[styles.docType, { color: theme.textPrimary }]}>{r.document_type}</Text>

                <Text style={[styles.purposeLabel, { color: theme.textMuted }]}>Purpose:</Text>
                <Text style={[styles.purposeText, { color: theme.textSecondary }]}>{r.purpose}</Text>

                {r.remarks && (
                  <View style={[styles.remarksBox, { backgroundColor: theme.surfaceSecondary }]}>
                    <Text style={[styles.remarksText, { color: theme.textSecondary }]}>
                      Staff Remarks: {r.remarks}
                    </Text>
                  </View>
                )}

                {user.role !== 'Resident' && (['Pending','Approved','Ready for Release'].includes(r.status)) && <View style={styles.itemFooter}>{(({Pending:['Approved','Rejected'],Approved:['Ready for Release','Released','Rejected'],'Ready for Release':['Released','Rejected']} as Record<string,string[]>)[r.status]||[]).map(next=><TouchableOpacity key={next} style={[styles.staffAction,{backgroundColor:theme.primary}]} onPress={()=>{setStatusTarget({id:r.id,status:next,existingRemarks:r.remarks||''});setStatusRemarks(r.remarks||'')}}><Text style={styles.submitBtnText}>{next}</Text></TouchableOpacity>)}</View>}
                <View style={styles.itemFooter}>
                  <Text style={[styles.dateText, { color: theme.textMuted }]}>
                    Date: {new Date(r.created_at).toLocaleDateString()}
                  </Text>
                </View>
              </View>
            );
          })
        )}
      </ScrollView>

      <Modal visible={!!statusTarget} animationType="fade" transparent onRequestClose={()=>setStatusTarget(null)}><View style={styles.modalOverlay}><View style={[styles.modalSheet,{backgroundColor:theme.surface,borderColor:theme.border}]}><Text style={[styles.modalTitle,{color:theme.textPrimary}]}>Update request status</Text><Text style={[styles.modalSubtitle,{color:theme.textSecondary}]}>Move this request to {statusTarget?.status}. {statusTarget?.status==='Rejected'?'A reason is required.':statusTarget?.existingRemarks?'You can update the existing note.':'No existing remarks.'}</Text>{(!!statusTarget?.existingRemarks || statusTarget?.status==='Rejected') && <TextInput multiline numberOfLines={4} value={statusRemarks} onChangeText={setStatusRemarks} placeholder="Remarks…" placeholderTextColor={theme.textMuted} style={[styles.textArea,{borderColor:theme.border,color:theme.textPrimary,backgroundColor:theme.surfaceSecondary}]}/>}<View style={styles.modalButtons}><TouchableOpacity style={[styles.cancelBtn,{borderColor:theme.border}]} onPress={()=>setStatusTarget(null)}><Text style={{color:theme.textSecondary,fontWeight:'600'}}>Cancel</Text></TouchableOpacity><TouchableOpacity style={[styles.submitBtn,{backgroundColor:theme.primary}]} disabled={updatingStatus} onPress={updateStatus}>{updatingStatus?<ActivityIndicator color="#fff"/>:<Text style={styles.submitBtnText}>Confirm</Text>}</TouchableOpacity></View></View></View></Modal>

      {/* New Request Modal */}
      <Modal visible={modalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalSheet, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <View style={styles.modalHead}>
              <View>
                <Text style={[styles.modalEyebrow, { color: theme.cyan }]}>SERVICE DESK</Text>
                <Text style={[styles.modalTitle, { color: theme.textPrimary }]}>Request Document</Text>
              </View>
              <TouchableOpacity
                onPress={() => {
                  setModalVisible(false);
                  if (onCloseInitialModal) onCloseInitialModal();
                }}
              >
                <X size={22} color={theme.textSecondary} />
              </TouchableOpacity>
            </View>

            <Text style={[styles.modalSubtitle, { color: theme.textSecondary }]}>
              Select the document type you need and state your purpose.
            </Text>

            <Text style={[styles.fieldLabel, { color: theme.textSecondary }]}>Document Type</Text>
            <View style={styles.docTypeSelectRow}>
              {DOC_TYPES.map(type => {
                const isSelected = selectedDocType === type;
                return (
                  <TouchableOpacity
                    key={type}
                    style={[
                      styles.docTypeChip,
                      {
                        backgroundColor: isSelected ? theme.primaryLight : theme.surfaceSecondary,
                        borderColor: isSelected ? theme.primary : theme.border,
                      },
                    ]}
                    onPress={() => setSelectedDocType(type)}
                  >
                    <Text
                      style={[
                        styles.docTypeChipText,
                        { color: isSelected ? theme.primary : theme.textSecondary, fontWeight: isSelected ? '700' : '500' },
                      ]}
                    >
                      {type}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <Text style={[styles.fieldLabel, { color: theme.textSecondary, marginTop: 14 }]}>
              Purpose *
            </Text>
            <TextInput
              style={[
                styles.textArea,
                { borderColor: theme.border, color: theme.textPrimary, backgroundColor: theme.surfaceSecondary },
              ]}
              multiline
              numberOfLines={3}
              placeholder="e.g. For employment requirements, loan application, school enrollment…"
              placeholderTextColor={theme.textMuted}
              value={purpose}
              onChangeText={setPurpose}
            />

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.cancelBtn, { borderColor: theme.border }]}
                onPress={() => {
                  setModalVisible(false);
                  if (onCloseInitialModal) onCloseInitialModal();
                }}
              >
                <Text style={{ color: theme.textSecondary, fontWeight: '600' }}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.submitBtn, { backgroundColor: theme.primary }]}
                onPress={handleCreateRequest}
                disabled={submitting}
              >
                {submitting ? (
                  <ActivityIndicator color="#ffffff" />
                ) : (
                  <Text style={styles.submitBtnText}>Submit Request</Text>
                )}
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 14,
    borderBottomWidth: 1,
  },
  headerLeftCol: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
    marginRight: 10,
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
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 20,
  },
  addBtnText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '700',
  },
  filterBar: {
    borderBottomWidth: 1,
    paddingVertical: 10,
    flexShrink: 0,
  },
  filterScrollView: {
    flexGrow: 0,
  },
  filterScroll: {
    paddingHorizontal: 16,
    gap: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },
  filterChip: {
    borderWidth: 1,
    borderRadius: 20,
    paddingVertical: 7,
    paddingHorizontal: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterChipText: {
    fontSize: 13,
  },
  listScrollView: {
    flex: 1,
  },
  listContent: {
    padding: 16,
    paddingBottom: 40,
  },
  itemCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    marginBottom: 12,
  },
  itemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  trackingNumber: {
    fontSize: 13,
    fontWeight: '800',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  staffAction: { paddingHorizontal:12, paddingVertical:8, borderRadius:9, marginRight:7, marginTop:8 },
  statusPill: {
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 12,
  },
  statusPillText: {
    fontSize: 10,
    fontWeight: '800',
  },
  docType: {
    fontSize: 15,
    fontWeight: '800',
    marginBottom: 6,
  },
  purposeLabel: {
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  purposeText: {
    fontSize: 12,
    lineHeight: 16,
    marginBottom: 8,
  },
  remarksBox: {
    padding: 8,
    borderRadius: 8,
    marginBottom: 8,
  },
  remarksText: {
    fontSize: 11,
    fontStyle: 'italic',
  },
  itemFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    borderTopWidth: 1,
    borderTopColor: 'rgba(150, 150, 150, 0.1)',
    paddingTop: 8,
  },
  dateText: {
    fontSize: 10,
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderTopWidth: 1,
    padding: 24,
    paddingBottom: Platform.OS === 'ios' ? 44 : 24,
  },
  modalHead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  modalEyebrow: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 1,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '800',
  },
  modalSubtitle: {
    fontSize: 12,
    marginBottom: 16,
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 8,
  },
  docTypeSelectRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 10,
  },
  docTypeChip: {
    borderWidth: 1,
    borderRadius: 8,
    paddingVertical: 7,
    paddingHorizontal: 10,
  },
  docTypeChipText: {
    fontSize: 11,
  },
  textArea: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
    fontSize: 13,
    textAlignVertical: 'top',
    height: 80,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 20,
  },
  cancelBtn: {
    flex: 1,
    borderWidth: 1,
    height: 46,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  submitBtn: {
    flex: 2,
    height: 46,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  submitBtnText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
  },
});
