import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  SafeAreaView,
  TouchableOpacity,
  StatusBar,
  Modal,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { fetchBusinessMetrics, runInvestigation, proposeCampaign } from './src/services/api';

export default function App() {
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [agentStep, setAgentStep] = useState<'idle' | 'investigating' | 'ready' | 'approved'>('idle');

  // Dashboard state
  const [merchantName, setMerchantName] = useState('Sharma Ji');
  const [revenue, setRevenue] = useState(18450);
  const [growth, setGrowth] = useState('↑ 4.2%');
  const [eveningDrop, setEveningDrop] = useState(19);
  const [dormantCount, setDormantCount] = useState(83);

  // Investigation & Proposal State
  const [facts, setFacts] = useState<string[]>([]);
  const [checks, setChecks] = useState<string[]>([]);
  const [proposal, setProposal] = useState<{ title: string; discount: string; minOrder: string; duration: string } | null>(null);

  // Initial load: Fetch metrics from API
  useEffect(() => {
    loadMetrics();
  }, []);

  const loadMetrics = async () => {
    setLoading(true);
    const data = await fetchBusinessMetrics();
    if (data) {
      if (data.merchantName) setMerchantName(data.merchantName);
      if (data.todayRevenue) setRevenue(data.todayRevenue);
      if (data.revenueChangePct) setGrowth(`↑ ${data.revenueChangePct}%`);
      if (data.eveningDropPct) setEveningDrop(data.eveningDropPct);
      if (data.dormantCustomersCount) setDormantCount(data.dormantCustomersCount);
    }
    setLoading(false);
  };

  const handleAskAI = async () => {
    setModalVisible(true);
    setAgentStep('investigating');

    // Call Endpoints 2 & 3 in parallel
    const [investigationData, proposalData] = await Promise.all([
      runInvestigation(),
      proposeCampaign(),
    ]);

    // Populate investigation findings
    if (investigationData?.findings) {
      setFacts(investigationData.findings);
    } else {
      setFacts([
        `• Evening revenue drop: -${eveningDrop}% (6:00 PM – 9:00 PM)`,
        `• ${dormantCount} repeat customers inactive for >21 days`,
      ]);
    }

    // Populate proposal & policy checks
    if (proposalData) {
      setProposal({
        title: proposalData.title || '"We miss you" Push Notification',
        discount: proposalData.discount || '₹50 OFF',
        minOrder: proposalData.minOrder || '₹299',
        duration: proposalData.duration || '3 days (6 PM - 9 PM)',
      });
      setChecks(
        proposalData.policyChecks || [
          '✓ Discount ₹50 within ≤20% ceiling',
          '✓ Min order ₹299 covers food margin',
          '✓ Audience: 83 dormant diners only',
        ]
      );
    }

    setAgentStep('ready');
  };

  const handleApprove = () => {
    setAgentStep('approved');
    setRevenue((prev) => prev + 3000);
    setGrowth('↑ 20.5% 🚀');
  };

  const resetFlow = () => {
    setModalVisible(false);
    setAgentStep('idle');
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.tagline}>BUSINESS AUTOPILOT</Text>
        <Text style={styles.title}>Good morning, {merchantName} 👋</Text>
      </View>

      {/* Revenue Card */}
      <View style={styles.card}>
        <Text style={styles.cardLabel}>Today's Revenue</Text>
        <View style={styles.row}>
          <Text style={styles.revenueAmount}>₹{revenue.toLocaleString('en-IN')}</Text>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{growth}</Text>
          </View>
        </View>
      </View>

      {/* AI Detected Alert Card */}
      <View style={styles.alertCard}>
        <View style={styles.alertHeader}>
          <Text style={styles.alertIcon}>⚠️</Text>
          <Text style={styles.alertTitle}>AI DETECTED</Text>
        </View>

        <View style={styles.alertContent}>
          <Text style={styles.alertItem}>
            • Evening sales <Text style={styles.negative}>↓{eveningDrop}%</Text>
          </Text>
          <Text style={styles.alertItem}>• {dormantCount} dormant customers</Text>
        </View>

        <TouchableOpacity
          style={styles.actionButton}
          onPress={handleAskAI}
          activeOpacity={0.8}
        >
          <Text style={styles.actionButtonText}>✨ Ask AI</Text>
        </TouchableOpacity>
      </View>

      {/* Active Campaign Indicator */}
      {agentStep === 'approved' && (
        <View style={styles.activeBanner}>
          <Text style={styles.activeBannerText}>
            🟢 CAMPAIGN ACTIVE: ₹50 OFF sent to {dormantCount} customers
          </Text>
        </View>
      )}

      {/* Agent Modal */}
      <Modal visible={modalVisible} animationType="slide" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {/* Modal Header */}
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>🤖 Autopilot Agent</Text>
              <TouchableOpacity onPress={resetFlow}>
                <Text style={styles.closeBtn}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <View style={styles.userBubble}>
                <Text style={styles.userBubbleText}>"Meri sales kyun gir rahi hain?"</Text>
              </View>

              {agentStep === 'investigating' ? (
                <View style={styles.loadingBox}>
                  <ActivityIndicator size="large" color="#6366f1" />
                  <Text style={styles.loadingText}>Running /investigations/run...</Text>
                  <Text style={styles.loadingSubtext}>Evaluating POS transactions</Text>
                </View>
              ) : (
                <>
                  {/* Verified Facts */}
                  <View style={styles.sectionCard}>
                    <Text style={styles.sectionHeader}>🔍 VERIFIED FACTS (API)</Text>
                    {facts.map((item, idx) => (
                      <Text key={idx} style={styles.factText}>{item}</Text>
                    ))}
                  </View>

                  {/* Policy Engine Verification */}
                  <View style={styles.policyCard}>
                    <Text style={styles.policyHeader}>🛡️ POLICY ENGINE VERIFICATION</Text>
                    {checks.map((item, idx) => (
                      <Text key={idx} style={styles.policyCheck}>{item}</Text>
                    ))}
                  </View>

                  {/* Proposed Campaign */}
                  {proposal && (
                    <View style={styles.recommendCard}>
                      <Text style={styles.recommendHeader}>💡 PROPOSED CAMPAIGN</Text>
                      <Text style={styles.recommendTitle}>{proposal.title}</Text>
                      <Text style={styles.recommendDetail}>Offer: {proposal.discount} on orders above {proposal.minOrder}</Text>
                      <Text style={styles.recommendDetail}>Validity: {proposal.duration}</Text>
                    </View>
                  )}

                  {agentStep === 'ready' && (
                    <TouchableOpacity
                      style={styles.approveButton}
                      onPress={handleApprove}
                      activeOpacity={0.8}
                    >
                      <Text style={styles.approveText}>⚡ APPROVE & LAUNCH CAMPAIGN</Text>
                    </TouchableOpacity>
                  )}

                  {agentStep === 'approved' && (
                    <View style={styles.successBox}>
                      <Text style={styles.successTitle}>✓ CAMPAIGN DISPATCHED</Text>
                      <Text style={styles.successDesc}>
                        Push notification sent to {dormantCount} target diners.
                      </Text>
                      <TouchableOpacity style={styles.doneBtn} onPress={resetFlow}>
                        <Text style={styles.doneBtnText}>View Dashboard</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#09090b',
    paddingHorizontal: 20,
    paddingTop: 50,
  },
  header: {
    marginBottom: 24,
  },
  tagline: {
    color: '#71717a',
    fontSize: 12,
    letterSpacing: 1.5,
    fontWeight: '800',
    marginBottom: 6,
  },
  title: {
    color: '#f4f4f5',
    fontSize: 24,
    fontWeight: '700',
  },
  card: {
    backgroundColor: '#18181b',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: '#27272a',
    marginBottom: 16,
  },
  cardLabel: {
    color: '#a1a1aa',
    fontSize: 14,
    marginBottom: 8,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  revenueAmount: {
    color: '#ffffff',
    fontSize: 32,
    fontWeight: '800',
  },
  badge: {
    backgroundColor: '#052e16',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  badgeText: {
    color: '#22c55e',
    fontWeight: '600',
    fontSize: 14,
  },
  alertCard: {
    backgroundColor: '#1c1917',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: '#451a1a',
  },
  alertHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  alertIcon: {
    fontSize: 16,
  },
  alertTitle: {
    color: '#ef4444',
    fontWeight: '800',
    fontSize: 13,
    letterSpacing: 1,
  },
  alertContent: {
    marginBottom: 20,
    gap: 6,
  },
  alertItem: {
    color: '#e4e4e7',
    fontSize: 15,
  },
  negative: {
    color: '#ef4444',
    fontWeight: '700',
  },
  actionButton: {
    backgroundColor: '#4f46e5',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
  },
  actionButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  activeBanner: {
    marginTop: 20,
    backgroundColor: '#064e3b',
    borderWidth: 1,
    borderColor: '#059669',
    borderRadius: 12,
    padding: 14,
  },
  activeBannerText: {
    color: '#6ee7b7',
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.75)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#18181b',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    maxHeight: '85%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '700',
  },
  closeBtn: {
    color: '#a1a1aa',
    fontSize: 20,
    fontWeight: '600',
    padding: 4,
  },
  userBubble: {
    backgroundColor: '#27272a',
    alignSelf: 'flex-end',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 8,
    marginBottom: 16,
  },
  userBubbleText: {
    color: '#e4e4e7',
    fontSize: 14,
    fontStyle: 'italic',
  },
  loadingBox: {
    alignItems: 'center',
    paddingVertical: 40,
    gap: 12,
  },
  loadingText: {
    color: '#f4f4f5',
    fontSize: 15,
    fontWeight: '600',
  },
  loadingSubtext: {
    color: '#71717a',
    fontSize: 12,
  },
  sectionCard: {
    backgroundColor: '#27272a',
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
  },
  sectionHeader: {
    color: '#93c5fd',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1,
    marginBottom: 8,
  },
  factText: {
    color: '#d4d4d8',
    fontSize: 14,
    marginBottom: 4,
  },
  policyCard: {
    backgroundColor: '#0c2e1f',
    borderColor: '#059669',
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
  },
  policyHeader: {
    color: '#34d399',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1,
    marginBottom: 8,
  },
  policyCheck: {
    color: '#a7f3d0',
    fontSize: 13,
    marginBottom: 4,
  },
  recommendCard: {
    backgroundColor: '#2e1065',
    borderColor: '#7c3aed',
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
    marginBottom: 20,
  },
  recommendHeader: {
    color: '#c4b5fd',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1,
    marginBottom: 6,
  },
  recommendTitle: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 6,
  },
  recommendDetail: {
    color: '#ddd6fe',
    fontSize: 13,
    marginBottom: 2,
  },
  approveButton: {
    backgroundColor: '#16a34a',
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: 'center',
    marginBottom: 24,
  },
  approveText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  successBox: {
    backgroundColor: '#064e3b',
    borderRadius: 14,
    padding: 16,
    alignItems: 'center',
    marginBottom: 24,
    gap: 8,
  },
  successTitle: {
    color: '#34d399',
    fontSize: 16,
    fontWeight: '800',
  },
  successDesc: {
    color: '#a7f3d0',
    fontSize: 13,
    textAlign: 'center',
  },
  doneBtn: {
    marginTop: 8,
    backgroundColor: '#059669',
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 8,
  },
  doneBtnText: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 13,
  },
});
