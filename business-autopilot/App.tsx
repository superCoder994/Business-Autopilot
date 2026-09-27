import React, { useEffect, useState } from 'react';
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
  TextInput,
  Alert,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import * as Speech from 'expo-speech';
import { AudioModule, RecordingPresets, useAudioRecorder } from 'expo-audio';
import { Feather } from '@expo/vector-icons';
import {
  activateCampaign,
  approveCampaign,
  askAutopilotAgent,
  askAutopilotAgentWithAttachment,
  fetchBusinessMetrics,
  transcribeVoice,
} from './src/services/api';
import type { CampaignProposal, DashboardMetrics, InvestigationResult, RevenueWindow } from './src/types/business';

const formatTimestamp = (timestamp: string) => {
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) return timestamp;
  const datePart = date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
  const timePart = date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }).replace(' ', '');
  return `${datePart}, ${timePart}`;
};

const describeCampaignAction = (campaign: CampaignProposal) =>
  `₹${campaign.discountAmount} OFF on orders of ₹${campaign.minOrderValue} or more, activated for ${campaign.targetCohortSize} dormant customers for ${campaign.durationDays} days.`;
const formatHour = (hour: number) => `${String(hour).padStart(2, '0')}:00`;

export default function App() {
  const [modalVisible, setModalVisible] = useState(false);
  const [agentStep, setAgentStep] = useState<'idle' | 'investigating' | 'ready' | 'approved'>('idle');
  const [revenue, setRevenue] = useState(0);
  const [growth, setGrowth] = useState('—');
  const [revenueWindows, setRevenueWindows] = useState<RevenueWindow[]>([]);
  const [eveningDropPct, setEveningDropPct] = useState<number | null>(null);
  const [dormantCustomerCount, setDormantCustomerCount] = useState<number | null>(null);
  const [question, setQuestion] = useState('');
  const [submittedQuestion, setSubmittedQuestion] = useState('');
  const [submittedAttachment, setSubmittedAttachment] = useState<{ name: string; mimeType: string } | null>(null);
  const [agentResponse, setAgentResponse] = useState<InvestigationResult | null>(null);
  const [campaignOutcome, setCampaignOutcome] = useState<{
    campaign: CampaignProposal;
    actionAt: string;
  } | null>(null);
  const [attachment, setAttachment] = useState<{ uri: string; name: string; mimeType: string } | null>(null);
  const [recording, setRecording] = useState(false);
  const audioRecorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const maximumWindowRevenue = Math.max(1, ...revenueWindows.map(window => window.amount));
  const peakRevenueWindow = revenueWindows.reduce(
    (peak, window) => window.amount > peak.amount ? window : peak,
    { startHour: 18, amount: 0 }
  );
  const hasSalesDrop = eveningDropPct !== null && eveningDropPct > 0;
  const isSalesIncrease = eveningDropPct !== null && eveningDropPct < 0;

  useEffect(() => {
    let mounted = true;
    fetchBusinessMetrics().then((metrics: DashboardMetrics) => {
      if (!mounted) return;
      setRevenue(metrics.todayRevenue);
      setRevenueWindows(metrics.revenueByTwoHourWindow);
      setEveningDropPct(metrics.eveningDropPct);
      setDormantCustomerCount(metrics.dormantCustomerCount);
      const change = metrics.revenueChangePct;
      setGrowth(change === 0 ? '—' : `${change > 0 ? '↑' : '↓'} ${Math.abs(change)}%`);
      if (metrics.activeCampaign?.status === 'active') {
        setCampaignOutcome({
          campaign: metrics.activeCampaign,
          actionAt: formatTimestamp(metrics.activeCampaign.activatedAt || new Date().toISOString()),
        });
      }
    }).catch((error: unknown) => {
      if (mounted) {
        Alert.alert('Dashboard unavailable', error instanceof Error ? error.message : 'Unable to load account metrics.');
      }
    });
    return () => { mounted = false; };
  }, []);

  const askAgent = async (prompt: string, file: typeof attachment = attachment) => {
    const cleanPrompt = prompt.trim() || 'Give me a summary of my account, sales, and recommendations.';
    setModalVisible(true);
    setAgentStep('investigating');
    setSubmittedQuestion(cleanPrompt);
    setSubmittedAttachment(file ? { name: file.name, mimeType: file.mimeType } : null);
    setQuestion('');
    setAttachment(null);
    try {
      const response = file
        ? await askAutopilotAgentWithAttachment(cleanPrompt, file)
        : await askAutopilotAgent(cleanPrompt);
      setAgentResponse(response);
      setAgentStep('ready');
    } catch (error) {
      setAgentStep('idle');
      Alert.alert('Agent unavailable', error instanceof Error ? error.message : 'Unable to answer this question.');
    }
  };

  const getSpeechLanguage = (text: string, responseLanguage?: string) => {
    if (responseLanguage && responseLanguage !== 'auto') return responseLanguage;
    if (/[\u0c00-\u0c7f]/.test(text)) return 'te-IN';
    if (/[\u0c80-\u0cff]/.test(text)) return 'kn-IN';
    if (/[\u0900-\u097f]/.test(text)) return 'hi-IN';
    return 'en-IN';
  };

  const readAnswerAloud = (answer: string, language?: string) => {
    void Speech.stop();
    void Speech.speak(answer, { language: getSpeechLanguage(submittedQuestion, language) });
  };

  const openAgent = () => {
    setModalVisible(true);
    setAgentStep('idle');
    setQuestion('');
    setSubmittedQuestion('');
    setSubmittedAttachment(null);
    setAgentResponse(null);
    setAttachment(null);
  };

  const chooseImage = async (useCamera: boolean) => {
    const result = useCamera
      ? await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], quality: 0.8 })
      : await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.8 });
    if (!result.canceled && result.assets[0]) {
      const image = result.assets[0];
      setAttachment({ uri: image.uri, name: 'business-image.jpg', mimeType: image.mimeType || 'image/jpeg' });
    }
  };

  const chooseDocument = async () => {
    const result = await DocumentPicker.getDocumentAsync({ type: ['application/pdf', 'text/*', 'application/*'], copyToCacheDirectory: true });
    if (!result.canceled && result.assets[0]) {
      const document = result.assets[0];
      setAttachment({ uri: document.uri, name: document.name, mimeType: document.mimeType || 'application/octet-stream' });
    }
  };

  const toggleRecording = async () => {
    if (recording) {
      await audioRecorder.stop();
      setRecording(false);
      if (audioRecorder.uri) {
        try {
          const transcript = await transcribeVoice(audioRecorder.uri);
          if (transcript) {
            setQuestion(transcript);
          } else {
            Alert.alert('Voice input unavailable', 'The transcription service did not return text.');
          }
        } catch (error) {
          Alert.alert('Voice input unavailable', error instanceof Error ? error.message : 'Unable to transcribe this recording.');
        }
      }
      return;
    }
    const permission = await AudioModule.requestRecordingPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Microphone permission needed', 'Allow microphone access to ask the agent by voice.');
      return;
    }
    await audioRecorder.prepareToRecordAsync();
    audioRecorder.record();
    setRecording(true);
  };

  const handleApprove = async () => {
    const campaign = agentResponse?.campaign;
    if (!campaign || !agentResponse.policyResult?.isValid) return;
    setAgentStep('investigating');
    try {
      const approvedCampaign = campaign.status === 'proposed'
        ? await approveCampaign(campaign.id)
        : campaign;
      setAgentResponse({ ...agentResponse, campaign: approvedCampaign });
      const activeCampaign = await activateCampaign(campaign.id);
      setAgentResponse({ ...agentResponse, campaign: activeCampaign });
      setCampaignOutcome({
        campaign: activeCampaign,
        actionAt: formatTimestamp(activeCampaign.activatedAt || new Date().toISOString()),
      });
      setAgentStep('approved');
    } catch (error) {
      setAgentStep('ready');
      Alert.alert('Campaign could not be activated', error instanceof Error ? error.message : 'Please try again.');
    }
  };

  const resetFlow = () => {
    setModalVisible(false);
    setAgentStep('idle');
    setAgentResponse(null);
    setAttachment(null);
    setQuestion('');
    setSubmittedQuestion('');
    setSubmittedAttachment(null);
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerCopy}>
          <Text style={styles.tagline}>BUSINESS AUTOPILOT</Text>
          <Text style={styles.title}>Good morning, Sharma Ji 👋</Text>
        </View>
        <TouchableOpacity
          style={styles.chatButton}
          onPress={openAgent}
          accessibilityRole="button"
          accessibilityLabel="Chat with the account agent"
        >
          <Feather name="message-circle" size={21} color="#2563eb" />
        </TouchableOpacity>
      </View>

      {/* Revenue Card */}
      <View style={styles.card}>
        <Text style={styles.cardLabel}>Today's Revenue</Text>
        <View style={styles.row}>
          <Text style={styles.revenueAmount}>₹{revenue.toLocaleString('en-IN')}</Text>
          <View style={styles.revenueTrend}>
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{growth}</Text>
            </View>
            <Feather name="bar-chart-2" size={32} color="#60a5fa" />
          </View>
        </View>
        <View style={styles.revenueChartHeader}>
          <Text style={styles.revenueChartTitle}>TODAY'S SALES · ₹ THOUSANDS</Text>
          <Text style={styles.rushHourLabel}>RUSH HOUR {formatHour(peakRevenueWindow.startHour)}</Text>
        </View>
        <View style={styles.revenueChart}>
          {revenueWindows.map((window, index) => {
            const previousWindow = revenueWindows[index - 1];
            const isFalling = previousWindow !== undefined && window.amount < previousWindow.amount;
            return (
              <View key={window.startHour} style={styles.revenueWindow}>
                <View style={styles.revenueBarTrack}>
                  <View
                    style={[
                      styles.revenueBar,
                      { height: Math.max(5, Math.round((window.amount / maximumWindowRevenue) * 62)) },
                      window.startHour === peakRevenueWindow.startHour && styles.peakRevenueBar,
                      isFalling && styles.fallingRevenueBar,
                    ]}
                  />
                </View>
                <Text style={styles.revenueWindowHour}>{String(window.startHour).padStart(2, '0')}</Text>
                <Text style={styles.revenueWindowAmount}>{(window.amount / 1000).toFixed(1)}</Text>
              </View>
            );
          })}
        </View>
        <Text style={styles.revenueChartCaption}>Sales rise through rush hour, then taper in the evening.</Text>
      </View>

      {campaignOutcome ? (
        <>
          <View style={styles.outcomeCard}>
            <View style={styles.alertHeader}>
              <Feather name="check-circle" size={18} color="#15803d" />
              <Text style={styles.outcomeTitle}>CAMPAIGN SUCCESS</Text>
            </View>
            <Text style={styles.outcomeHeadline}>
              Campaign activated
            </Text>
            <Text style={styles.outcomeDetail}>
              The offer is active for {campaignOutcome.campaign.targetCohortSize} dormant customers.
            </Text>
            <View style={styles.outcomeActionBox}>
              <Text style={styles.outcomeActionLabel}>ACTION TAKEN</Text>
              <Text style={styles.outcomeAction}>{describeCampaignAction(campaignOutcome.campaign)}</Text>
            </View>
            <Text style={styles.outcomeTimestamp}>Campaign activated {campaignOutcome.actionAt}</Text>
          </View>

          <View style={[styles.alertCard, styles.resolvedAlertCard]}>
            <View style={styles.alertHeader}>
              <Feather name="check-circle" size={17} color="#a1a1aa" />
              <Text style={styles.resolvedAlertTitle}>DROP IN SALES • RESOLVED</Text>
            </View>
            <Text style={styles.resolvedAlertText}>Evening sales were down {eveningDropPct ?? '—'}% and {dormantCustomerCount ?? '—'} customers were dormant.</Text>
            <Text style={styles.resolvedActionLabel}>ACTION TAKEN</Text>
            <Text style={styles.resolvedActionText}>{describeCampaignAction(campaignOutcome.campaign)}</Text>
            <Text style={styles.resolvedTimestamp}>Action taken {campaignOutcome.actionAt}</Text>
          </View>
        </>
      ) : (
      <>
      {/* AI Detected Alert Card */}
      <View style={styles.alertCard}>
        <View style={styles.alertHeader}>
          <Feather
            name={hasSalesDrop ? 'alert-triangle' : 'trending-up'}
            size={20}
            color={hasSalesDrop ? '#c2410c' : '#15803d'}
          />
          <Text style={[styles.alertTitle, isSalesIncrease && styles.alertIncreaseTitle]}>
            {eveningDropPct === null ? 'SALES TREND' : hasSalesDrop ? 'DROP IN SALES' : eveningDropPct < 0 ? 'INCREASE IN SALES' : 'SALES ON TRACK'}
          </Text>
        </View>

        <View style={styles.alertContent}>
          <Text style={styles.alertItem}>
            • Evening sales <Text style={hasSalesDrop ? styles.negative : isSalesIncrease ? styles.positive : undefined}>{eveningDropPct === null ? '—' : `${eveningDropPct > 0 ? '↓' : isSalesIncrease ? '↑' : ''}${Math.abs(eveningDropPct)}%`}</Text>
          </Text>
          <Text style={styles.alertItem}>• {dormantCustomerCount ?? '—'} dormant customers</Text>
        </View>

        <View style={styles.quickPromptRow}>
          {([
            { prompt: 'Why are evening sales down?', icon: 'shopping-bag' },
            { prompt: 'Show my top-selling items', icon: 'list' },
            { prompt: 'How can I re-engage dormant customers?', icon: 'users' },
          ] as const).map(({ prompt, icon }) => (
            <TouchableOpacity
              key={prompt}
              style={styles.quickPrompt}
              onPress={() => void askAgent(prompt, null)}
              accessibilityRole="button"
              accessibilityLabel={prompt}
            >
              <Feather name={icon} size={19} color="#2563eb" />
              <Text style={styles.quickPromptText}>{prompt}</Text>
              <Feather name="chevron-right" size={18} color="#94a3b8" />
            </TouchableOpacity>
          ))}
        </View>
      </View>
      <TouchableOpacity
        style={styles.actionButton}
        onPress={openAgent}
        activeOpacity={0.8}
      >
        <Feather name="zap" size={22} color="#ffffff" />
        <Text style={styles.actionButtonText}>Ask AI</Text>
      </TouchableOpacity>
      </>
      )}

      {/* Active Campaign Badge (Appears once approved) */}
      {agentStep === 'approved' && (
        <View style={styles.activeBanner}>
          <Text style={styles.activeBannerText}>
            CAMPAIGN ACTIVE: {campaignOutcome?.campaign.title}
          </Text>
        </View>
      )}
      {/* Agent Modal / Drawer */}
      <Modal visible={modalVisible} animationType="slide" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {/* Modal Header */}
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>🤖 Autopilot Agent</Text>
              <TouchableOpacity onPress={resetFlow} accessibilityLabel="Close agent" accessibilityRole="button">
                <Feather name="x" size={22} color="#a1a1aa" />
              </TouchableOpacity>
            </View>

            <View style={styles.composer}>
              <TextInput
                value={question}
                onChangeText={setQuestion}
                placeholder="Ask about sales, transactions, or recommendations..."
                placeholderTextColor="#71717a"
                style={styles.questionInput}
                multiline
                maxLength={500}
                submitBehavior="submit"
                onSubmitEditing={() => void askAgent(question)}
              />
              <View style={styles.inputActions}>
                <TouchableOpacity style={[styles.inputAction, styles.cameraAction]} onPress={() => void chooseImage(true)} accessibilityLabel="Take a photo" accessibilityRole="button">
                  <Feather name="camera" size={18} color="#2563eb" />
                </TouchableOpacity>
                <TouchableOpacity style={[styles.inputAction, styles.imageAction]} onPress={() => void chooseImage(false)} accessibilityLabel="Choose a photo" accessibilityRole="button">
                  <Feather name="image" size={18} color="#059669" />
                </TouchableOpacity>
                <TouchableOpacity style={[styles.inputAction, styles.documentAction]} onPress={() => void chooseDocument()} accessibilityLabel="Attach a file" accessibilityRole="button">
                  <Feather name="file-text" size={18} color="#d97706" />
                </TouchableOpacity>
                <TouchableOpacity style={[styles.inputAction, !recording && styles.microphoneAction, recording && styles.recordingAction]} onPress={() => void toggleRecording()} accessibilityLabel={recording ? 'Stop voice recording' : 'Record a voice question'} accessibilityRole="button">
                  {recording ? <Feather name="square" size={18} color="#ffffff" /> : <Feather name="mic" size={18} color="#e11d48" />}
                </TouchableOpacity>
                <TouchableOpacity style={styles.sendButton} onPress={() => void askAgent(question)} accessibilityLabel="Send question" accessibilityRole="button">
                  <Feather name="send" size={18} color="#ffffff" />
                </TouchableOpacity>
              </View>
              {attachment && (
                <View style={styles.attachmentRow}>
                  <Feather name="paperclip" size={13} color="#a5b4fc" />
                  <Text style={styles.attachmentText}>{attachment.name}</Text>
                  <TouchableOpacity
                    style={styles.removeAttachmentButton}
                    onPress={() => setAttachment(null)}
                    accessibilityRole="button"
                    accessibilityLabel="Remove attachment"
                  >
                    <Feather name="x" size={16} color="#64748b" />
                  </TouchableOpacity>
                </View>
              )}
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              {submittedQuestion ? (
                <View style={styles.userBubble}>
                  <Text style={styles.userBubbleText}>"{submittedQuestion}"</Text>
                  {submittedAttachment && (
                    <View style={styles.sentAttachmentRow}>
                      <Feather name="paperclip" size={14} color="#1d4ed8" />
                      <Text style={styles.sentAttachmentName}>{submittedAttachment.name}</Text>
                      <Text style={styles.sentAttachmentType}>{submittedAttachment.mimeType}</Text>
                    </View>
                  )}
                </View>
              ) : null}

              {agentStep === 'idle' ? (
                <View style={styles.emptyState}>
                  <Feather name="zap" size={24} color="#818cf8" />
                  <Text style={styles.emptyStateTitle}>What would you like to know?</Text>
                  <Text style={styles.emptyStateText}>Ask about your account, transactions, sales, or recommendations.</Text>
                </View>
              ) : agentStep === 'investigating' ? (
                <View style={styles.loadingBox}>
                  <ActivityIndicator size="large" color="#6366f1" />
                  <Text style={styles.loadingText}>Calling Analytics Engine tools...</Text>
                  <Text style={styles.loadingSubtext}>getEveningSales() • getDormantCustomers()</Text>
                </View>
              ) : (
                <>
                  {agentResponse?.reply && (
                    <View style={styles.answerCard}>
                      <View style={styles.answerHeaderRow}>
                        <View style={styles.answerBrand}>
                          <View style={styles.answerAgentIcon}>
                            <Feather name="zap" size={13} color="#047857" />
                          </View>
                          <Text style={styles.answerHeader}>AUTOPILOT AGENT</Text>
                        </View>
                        <TouchableOpacity
                          onPress={() => readAnswerAloud(agentResponse.reply)}
                          accessibilityRole="button"
                          accessibilityLabel="Read answer aloud"
                        >
                          <Feather name="volume-2" size={18} color="#0f766e" />
                        </TouchableOpacity>
                      </View>
                      <Text style={styles.answerText}>{agentResponse.reply}</Text>
                    </View>
                  )}

                  {agentResponse?.campaign && agentResponse.policyResult && (
                    <>
                      <View style={styles.policyCard}>
                        <Text style={styles.policyHeader}>POLICY ENGINE VERIFICATION</Text>
                        {agentResponse.policyResult.rules.map((rule) => (
                          <Text key={rule.ruleName} style={[styles.policyCheck, !rule.passed && styles.policyFailed]}>
                            {rule.passed ? '✓' : '✕'} {rule.ruleName}{rule.reason ? `: ${rule.reason}` : ''}
                          </Text>
                        ))}
                      </View>

                      <View style={styles.recommendCard}>
                        <Text style={styles.recommendHeader}>PROPOSED CAMPAIGN</Text>
                        <Text style={styles.recommendTitle}>{agentResponse.campaign.title}</Text>
                        <Text style={styles.recommendDetail}>Offer: ₹{agentResponse.campaign.discountAmount} OFF on orders above ₹{agentResponse.campaign.minOrderValue}</Text>
                        <Text style={styles.recommendDetail}>Audience: {agentResponse.campaign.targetCohortSize} dormant customers</Text>
                        <Text style={styles.recommendDetail}>Duration: {agentResponse.campaign.durationDays} days</Text>
                      </View>
                    </>
                  )}

                  {/* Action / Approval Buttons */}
                  {agentStep === 'ready' && agentResponse?.campaign && agentResponse.policyResult?.isValid && (
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
                      <Text style={styles.successTitle}>✓ CAMPAIGN ACTIVATED</Text>
                      <Text style={styles.successDesc}>
                        Campaign status is active for {campaignOutcome?.campaign.targetCohortSize ?? 0} customers. Message delivery is not connected yet.
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
    backgroundColor: '#f7faff',
    paddingHorizontal: 20,
    paddingTop: 50,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  headerCopy: {
    flex: 1,
    paddingRight: 12,
  },
  chatButton: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: '#eff6ff',
    borderWidth: 1,
    borderColor: '#dbeafe',
    alignItems: 'center',
    justifyContent: 'center',
  },
  tagline: {
    color: '#5b7baa',
    fontSize: 12,
    letterSpacing: 1.5,
    fontWeight: '800',
    marginBottom: 6,
  },
  title: {
    color: '#14284b',
    fontSize: 27,
    fontWeight: '800',
  },
  card: {
    backgroundColor: '#eff6ff',
    borderRadius: 14,
    padding: 22,
    borderWidth: 1,
    borderColor: '#dbeafe',
    marginBottom: 16,
  },
  cardLabel: {
    color: '#44618d',
    fontSize: 16,
    marginBottom: 10,
  },
  revenueChartHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 20,
    marginBottom: 8,
  },
  revenueChartTitle: {
    color: '#64748b',
    fontSize: 9,
    fontWeight: '800',
  },
  rushHourLabel: {
    color: '#b45309',
    fontSize: 10,
    fontWeight: '800',
  },
  revenueChart: {
    height: 96,
    flexDirection: 'row',
    alignItems: 'stretch',
    gap: 2,
  },
  revenueWindow: {
    flex: 1,
    minWidth: 0,
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 3,
  },
  revenueBarTrack: {
    width: '100%',
    height: 64,
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  revenueBar: {
    width: '58%',
    maxWidth: 18,
    borderTopLeftRadius: 4,
    borderTopRightRadius: 4,
    backgroundColor: '#2a9d8f',
  },
  peakRevenueBar: {
    backgroundColor: '#f59e0b',
  },
  fallingRevenueBar: {
    backgroundColor: '#e76f51',
  },
  revenueWindowHour: {
    color: '#64748b',
    fontSize: 8,
    fontWeight: '700',
  },
  revenueWindowAmount: {
    color: '#334155',
    fontSize: 8,
    fontWeight: '700',
  },
  revenueChartCaption: {
    color: '#64748b',
    fontSize: 11,
    marginTop: 8,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  revenueAmount: {
    color: '#14284b',
    fontSize: 36,
    fontWeight: '800',
  },
  revenueTrend: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  badge: {
    backgroundColor: '#d1fae5',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
  },
  badgeText: {
    color: '#16a34a',
    fontWeight: '700',
    fontSize: 14,
  },
  alertCard: {
    backgroundColor: '#ffffff',
    borderRadius: 14,
    padding: 20,
    borderWidth: 1,
    borderColor: '#fecaca',
    marginBottom: 16,
  },
  outcomeCard: {
    backgroundColor: '#f0fdf4',
    borderRadius: 14,
    padding: 20,
    borderWidth: 1,
    borderColor: '#86efac',
    marginBottom: 12,
  },
  outcomeTitle: {
    color: '#15803d',
    fontWeight: '800',
    fontSize: 13,
    letterSpacing: 1,
  },
  outcomeHeadline: {
    color: '#14532d',
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 8,
  },
  outcomeDetail: {
    color: '#3f6f50',
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 10,
  },
  outcomeAction: {
    color: '#14532d',
    fontSize: 13,
    lineHeight: 19,
  },
  outcomeActionBox: {
    backgroundColor: '#dcfce7',
    borderColor: '#86efac',
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
    marginBottom: 10,
  },
  outcomeActionLabel: {
    color: '#15803d',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.8,
    marginBottom: 5,
  },
  outcomeTimestamp: {
    color: '#4b7558',
    fontSize: 12,
  },
  resolvedAlertCard: {
    backgroundColor: '#f8fafc',
    borderColor: '#e2e8f0',
    marginBottom: 16,
  },
  resolvedAlertTitle: {
    color: '#64748b',
    fontWeight: '800',
    fontSize: 12,
    letterSpacing: 0.8,
  },
  resolvedAlertText: {
    color: '#475569',
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 8,
  },
  resolvedActionLabel: {
    color: '#64748b',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.7,
    marginBottom: 4,
  },
  resolvedActionText: {
    color: '#334155',
    fontSize: 13,
    lineHeight: 19,
    marginBottom: 8,
  },
  resolvedTimestamp: {
    color: '#64748b',
    fontSize: 12,
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
  quickPromptRow: {
    gap: 8,
    marginTop: 4,
    marginBottom: 16,
  },
  quickPrompt: {
    backgroundColor: '#f8fbff',
    borderColor: '#dbeafe',
    borderWidth: 1,
    borderRadius: 10,
    minHeight: 54,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  quickPromptText: {
    flex: 1,
    color: '#1e355b',
    fontSize: 13,
  },
  alertItem: {
    color: '#1e355b',
    fontSize: 15,
  },
  negative: {
    color: '#ef4444',
    fontWeight: '700',
  },
  positive: {
    color: '#15803d',
    fontWeight: '700',
  },
  alertIncreaseTitle: {
    color: '#15803d',
  },
  actionButton: {
    backgroundColor: '#2563eb',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
    borderRadius: 14,
    marginBottom: 16,
  },
  actionButtonText: {
    color: '#ffffff',
    fontSize: 19,
    fontWeight: '700',
  },
  activeBanner: {
    marginTop: 20,
    backgroundColor: '#dcfce7',
    borderWidth: 1,
    borderColor: '#86efac',
    borderRadius: 10,
    padding: 14,
  },
  activeBannerText: {
    color: '#166534',
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15,23,42,0.42)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#ffffff',
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
    color: '#14284b',
    fontSize: 18,
    fontWeight: '700',
  },
  composer: {
    backgroundColor: '#f1f5f9',
    borderRadius: 12,
    padding: 10,
    marginBottom: 12,
  },
  questionInput: {
    color: '#14284b',
    minHeight: 44,
    maxHeight: 90,
    fontSize: 14,
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  inputActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 6,
  },
  inputAction: {
    width: 36,
    height: 36,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cameraAction: {
    backgroundColor: '#eff6ff',
    borderColor: '#bfdbfe',
  },
  imageAction: {
    backgroundColor: '#ecfdf5',
    borderColor: '#a7f3d0',
  },
  documentAction: {
    backgroundColor: '#fffbeb',
    borderColor: '#fde68a',
  },
  microphoneAction: {
    backgroundColor: '#fff1f2',
    borderColor: '#fecdd3',
  },
  recordingAction: {
    backgroundColor: '#991b1b',
    borderColor: '#ef4444',
  },
  inputActionText: {
    color: '#475569',
    fontSize: 11,
    fontWeight: '600',
  },
  sendButton: {
    backgroundColor: '#2563eb',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginLeft: 'auto',
  },
  sendButtonText: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 12,
  },
  attachmentText: {
    color: '#2563eb',
    fontSize: 11,
    marginLeft: 4,
  },
  closeBtn: {
    color: '#a1a1aa',
    fontSize: 20,
    fontWeight: '600',
    padding: 4,
  },
  userBubble: {
    maxWidth: '90%',
    backgroundColor: '#1d4ed8',
    alignSelf: 'flex-end',
    borderRadius: 14,
    borderBottomRightRadius: 4,
    paddingHorizontal: 14,
    paddingVertical: 11,
    marginBottom: 16,
  },
  userBubbleText: {
    color: '#ffffff',
    fontSize: 14,
    lineHeight: 20,
  },
  attachmentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 7,
  },
  removeAttachmentButton: {
    padding: 4,
  },
  sentAttachmentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 8,
    paddingTop: 7,
    borderTopWidth: 1,
    borderTopColor: '#93c5fd',
  },
  sentAttachmentName: {
    flex: 1,
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '700',
  },
  sentAttachmentType: {
    color: '#dbeafe',
    fontSize: 10,
  },
  emptyState: {
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 44,
  },
  emptyStateTitle: {
    color: '#14284b',
    fontSize: 16,
    fontWeight: '700',
    marginTop: 12,
    marginBottom: 6,
  },
  emptyStateText: {
    color: '#64748b',
    fontSize: 13,
    lineHeight: 19,
    textAlign: 'center',
  },
  answerCard: {
    backgroundColor: '#ffffff',
    borderColor: '#d1dbe5',
    borderWidth: 1,
    borderLeftWidth: 3,
    borderLeftColor: '#0f766e',
    borderRadius: 10,
    padding: 16,
    marginBottom: 12,
  },
  answerHeader: {
    color: '#0f766e',
    fontSize: 11,
    fontWeight: '800',
  },
  answerBrand: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  answerAgentIcon: {
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 7,
    backgroundColor: '#d1fae5',
  },
  answerHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  answerText: {
    color: '#1f2937',
    fontSize: 15,
    lineHeight: 22,
    marginTop: 10,
  },
  loadingBox: {
    alignItems: 'center',
    paddingVertical: 40,
    gap: 12,
  },
  loadingText: {
    color: '#14284b',
    fontSize: 15,
    fontWeight: '600',
  },
  loadingSubtext: {
    color: '#64748b',
    fontSize: 12,
  },
  boldRed: {
    color: '#ef4444',
    fontWeight: '700',
  },
  boldWhite: {
    color: '#14284b',
    fontWeight: '700',
  },
  policyCard: {
    backgroundColor: '#f0fdf4',
    borderColor: '#86efac',
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
  },
  policyHeader: {
    color: '#15803d',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1,
    marginBottom: 8,
  },
  policyCheck: {
    color: '#166534',
    fontSize: 13,
    marginBottom: 4,
  },
  policyFailed: {
    color: '#b91c1c',
  },
  recommendCard: {
    backgroundColor: '#eff6ff',
    borderColor: '#bfdbfe',
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
    marginBottom: 20,
  },
  recommendHeader: {
    color: '#2563eb',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1,
    marginBottom: 6,
  },
  recommendTitle: {
    color: '#14284b',
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 6,
  },
  recommendDetail: {
    color: '#475569',
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
    backgroundColor: '#16a34a',
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

