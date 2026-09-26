import React, { useState } from 'react';
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
  askAutopilotAgent,
  askAutopilotAgentWithAttachment,
  transcribeVoice,
} from './src/services/api';

export default function App() {
  const [modalVisible, setModalVisible] = useState(false);
  const [agentStep, setAgentStep] = useState<'idle' | 'investigating' | 'ready' | 'approved'>('idle');
  const [revenue, setRevenue] = useState(18450);
  const [growth, setGrowth] = useState('↑ 4.2%');
  const [question, setQuestion] = useState('');
  const [submittedQuestion, setSubmittedQuestion] = useState('');
  const [agentResponse, setAgentResponse] = useState<any>(null);
  const [campaignOutcome, setCampaignOutcome] = useState<{
    previousRevenue: number;
    currentRevenue: number;
    changePercent: number;
    actionAt: string;
  } | null>(null);
  const [attachment, setAttachment] = useState<{ uri: string; name: string; mimeType: string } | null>(null);
  const [recording, setRecording] = useState(false);
  const audioRecorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);

  const askAgent = async (prompt: string, file: typeof attachment = attachment) => {
    const cleanPrompt = prompt.trim() || 'Give me a summary of my account, sales, and recommendations.';
    setModalVisible(true);
    setAgentStep('investigating');
    setSubmittedQuestion(cleanPrompt);
    setQuestion('');
    const response = file
      ? await askAutopilotAgentWithAttachment(cleanPrompt, file)
      : await askAutopilotAgent(cleanPrompt);
    setAgentResponse(response);
    setAgentStep('ready');
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
        const transcript = await transcribeVoice(audioRecorder.uri);
        if (transcript) {
          setQuestion(transcript);
        } else {
          Alert.alert('Voice input unavailable', 'The transcription service did not return text.');
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

  const handleApprove = () => {
    const previousRevenue = revenue;
    const currentRevenue = 21450;
    const changePercent = Number((((currentRevenue - previousRevenue) / previousRevenue) * 100).toFixed(1));
    const actionAt = new Date();
    const formattedDate = actionAt.toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });
    const formattedTime = actionAt.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
    }).replace(' ', '');
    setAgentStep('approved');
    setRevenue(currentRevenue);
    setGrowth(`↑ ${changePercent}%`);
    setCampaignOutcome({ previousRevenue, currentRevenue, changePercent, actionAt: `${formattedDate}, ${formattedTime}` });
  };

  const resetFlow = () => {
    setModalVisible(false);
    setAgentStep('idle');
    setAgentResponse(null);
    setAttachment(null);
    setQuestion('');
    setSubmittedQuestion('');
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />

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
          <Feather name="message-circle" size={21} color="#ffffff" />
        </TouchableOpacity>
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

      {campaignOutcome ? (
        <>
          <View style={styles.outcomeCard}>
            <View style={styles.alertHeader}>
              <Feather name="trending-up" size={18} color="#34d399" />
              <Text style={styles.outcomeTitle}>AI DETECTION UPDATED</Text>
            </View>
            <Text style={styles.outcomeHeadline}>
              Campaign impact: +{campaignOutcome.changePercent}% revenue
            </Text>
            <Text style={styles.outcomeDetail}>
              Revenue moved from ₹{campaignOutcome.previousRevenue.toLocaleString('en-IN')} to ₹{campaignOutcome.currentRevenue.toLocaleString('en-IN')}.
            </Text>
            <View style={styles.outcomeActionBox}>
              <Text style={styles.outcomeActionLabel}>ACTION TAKEN</Text>
              <Text style={styles.outcomeAction}>₹50 OFF push notification sent to 83 dormant customers for 3 days, 6 PM - 9 PM.</Text>
            </View>
            <Text style={styles.outcomeTimestamp}>AI detection updated {campaignOutcome.actionAt}</Text>
          </View>

          <View style={[styles.alertCard, styles.resolvedAlertCard]}>
            <View style={styles.alertHeader}>
              <Feather name="check-circle" size={17} color="#a1a1aa" />
              <Text style={styles.resolvedAlertTitle}>PREVIOUS DETECTION • RESOLVED</Text>
            </View>
            <Text style={styles.resolvedAlertText}>Evening sales were down 19% and 83 customers were dormant.</Text>
            <Text style={styles.resolvedActionLabel}>ACTION TAKEN</Text>
            <Text style={styles.resolvedActionText}>₹50 OFF push notification sent to 83 dormant customers for 3 days, 6 PM - 9 PM.</Text>
            <Text style={styles.resolvedTimestamp}>Action taken {campaignOutcome.actionAt}</Text>
          </View>
        </>
      ) : (
      /* AI Detected Alert Card */
      <View style={styles.alertCard}>
        <View style={styles.alertHeader}>
          <Text style={styles.alertIcon}>⚠️</Text>
          <Text style={styles.alertTitle}>AI DETECTED</Text>
        </View>

        <View style={styles.alertContent}>
          <Text style={styles.alertItem}>
            • Evening sales <Text style={styles.negative}>↓19%</Text>
          </Text>
          <Text style={styles.alertItem}>• 83 dormant customers</Text>
        </View>

        <View style={styles.quickPromptRow}>
          {[
            'Why are evening sales down?',
            'Show my top-selling items',
            'How can I re-engage dormant customers?',
          ].map((prompt) => (
            <TouchableOpacity
              key={prompt}
              style={styles.quickPrompt}
              onPress={() => void askAgent(prompt, null)}
              accessibilityRole="button"
              accessibilityLabel={prompt}
            >
              <Text style={styles.quickPromptText}>{prompt}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity
          style={styles.actionButton}
          onPress={openAgent}
          activeOpacity={0.8}
        >
          <Feather name="zap" size={18} color="#ffffff" />
          <Text style={styles.actionButtonText}>Ask AI</Text>
        </TouchableOpacity>
      </View>
      )}

      {/* Active Campaign Badge (Appears once approved) */}
      {agentStep === 'approved' && (
        <View style={styles.activeBanner}>
          <Text style={styles.activeBannerText}>
            🟢 CAMPAIGN ACTIVE: ₹50 OFF sent to 83 customers
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
                <TouchableOpacity style={styles.inputAction} onPress={() => void chooseImage(true)} accessibilityLabel="Take a photo" accessibilityRole="button">
                  <Feather name="camera" size={18} color="#d4d4d8" />
                </TouchableOpacity>
                <TouchableOpacity style={styles.inputAction} onPress={() => void chooseImage(false)} accessibilityLabel="Choose a photo" accessibilityRole="button">
                  <Feather name="image" size={18} color="#d4d4d8" />
                </TouchableOpacity>
                <TouchableOpacity style={styles.inputAction} onPress={() => void chooseDocument()} accessibilityLabel="Attach a file" accessibilityRole="button">
                  <Feather name="file-text" size={18} color="#d4d4d8" />
                </TouchableOpacity>
                <TouchableOpacity style={[styles.inputAction, recording && styles.recordingAction]} onPress={() => void toggleRecording()} accessibilityLabel={recording ? 'Stop voice recording' : 'Record a voice question'} accessibilityRole="button">
                  {recording ? <Feather name="square" size={18} color="#ffffff" /> : <Feather name="mic" size={18} color="#d4d4d8" />}
                </TouchableOpacity>
                <TouchableOpacity style={styles.sendButton} onPress={() => void askAgent(question)} accessibilityLabel="Send question" accessibilityRole="button">
                  <Feather name="send" size={18} color="#ffffff" />
                </TouchableOpacity>
              </View>
              {attachment && (
                <View style={styles.attachmentRow}>
                  <Feather name="paperclip" size={13} color="#a5b4fc" />
                  <Text style={styles.attachmentText}>{attachment.name}</Text>
                </View>
              )}
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              {submittedQuestion ? (
                <View style={styles.userBubble}>
                  <Text style={styles.userBubbleText}>"{submittedQuestion}"</Text>
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
                        <Text style={styles.answerHeader}>AGENT ANSWER</Text>
                        <TouchableOpacity
                          onPress={() => readAnswerAloud(agentResponse.reply, agentResponse.language)}
                          accessibilityRole="button"
                          accessibilityLabel="Read answer aloud"
                        >
                          <Feather name="volume-2" size={18} color="#bfdbfe" />
                        </TouchableOpacity>
                      </View>
                      <Text style={styles.answerText}>{agentResponse.reply}</Text>
                    </View>
                  )}

                  {/* Step 1: Investigation Findings */}
                  <View style={styles.sectionCard}>
                    <Text style={styles.sectionHeader}>🔍 VERIFIED FACTS</Text>
                    {(agentResponse?.findings || [
                      'Evening revenue drop: -19% (6:00 PM – 9:00 PM)',
                      '83 repeat customers inactive for >21 days',
                    ]).map((finding: string) => (
                      <Text style={styles.factText} key={finding}>• {finding}</Text>
                    ))}
                  </View>

                  {/* Step 2: Policy Engine Verification */}
                  <View style={styles.policyCard}>
                    <Text style={styles.policyHeader}>🛡️ POLICY ENGINE VERIFICATION</Text>
                    <Text style={styles.policyCheck}>✓ Discount ₹50 within ≤20% ceiling</Text>
                    <Text style={styles.policyCheck}>✓ Min order ₹299 covers food margin</Text>
                    <Text style={styles.policyCheck}>✓ Audience: 83 dormant diners only</Text>
                  </View>

                  {/* Step 3: Recommendation / Action */}
                  <View style={styles.recommendCard}>
                    <Text style={styles.recommendHeader}>💡 PROPOSED CAMPAIGN</Text>
                    <Text style={styles.recommendTitle}>"We miss you" Push Notification</Text>
                    <Text style={styles.recommendDetail}>Offer: ₹50 OFF on orders above ₹299</Text>
                    <Text style={styles.recommendDetail}>Validity: 3 days (6 PM - 9 PM)</Text>
                  </View>

                  {/* Action / Approval Buttons */}
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
                        83 notifications pushed. Simulated sales spike triggered.
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
    borderRadius: 12,
    backgroundColor: '#27272a',
    borderWidth: 1,
    borderColor: '#3f3f46',
    alignItems: 'center',
    justifyContent: 'center',
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
  outcomeCard: {
    backgroundColor: '#052e16',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: '#059669',
    marginBottom: 12,
  },
  outcomeTitle: {
    color: '#34d399',
    fontWeight: '800',
    fontSize: 13,
    letterSpacing: 1,
  },
  outcomeHeadline: {
    color: '#ecfdf5',
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 8,
  },
  outcomeDetail: {
    color: '#a7f3d0',
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 10,
  },
  outcomeAction: {
    color: '#d1fae5',
    fontSize: 13,
    lineHeight: 19,
  },
  outcomeActionBox: {
    backgroundColor: '#064e3b',
    borderColor: '#10b981',
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
    marginBottom: 10,
  },
  outcomeActionLabel: {
    color: '#6ee7b7',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.8,
    marginBottom: 5,
  },
  outcomeTimestamp: {
    color: '#a7f3d0',
    fontSize: 12,
  },
  resolvedAlertCard: {
    opacity: 0.65,
    marginBottom: 16,
  },
  resolvedAlertTitle: {
    color: '#a1a1aa',
    fontWeight: '800',
    fontSize: 12,
    letterSpacing: 0.8,
  },
  resolvedAlertText: {
    color: '#a1a1aa',
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 8,
  },
  resolvedActionLabel: {
    color: '#a1a1aa',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.7,
    marginBottom: 4,
  },
  resolvedActionText: {
    color: '#d4d4d8',
    fontSize: 13,
    lineHeight: 19,
    marginBottom: 8,
  },
  resolvedTimestamp: {
    color: '#a1a1aa',
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
    backgroundColor: '#292524',
    borderColor: '#57534e',
    borderWidth: 1,
    borderRadius: 9,
    paddingHorizontal: 11,
    paddingVertical: 9,
  },
  quickPromptText: {
    color: '#d6d3d1',
    fontSize: 13,
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
    gap: 8,
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
  composer: {
    backgroundColor: '#27272a',
    borderRadius: 12,
    padding: 10,
    marginBottom: 12,
  },
  questionInput: {
    color: '#ffffff',
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
    borderColor: '#52525b',
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  recordingAction: {
    backgroundColor: '#991b1b',
    borderColor: '#ef4444',
  },
  inputActionText: {
    color: '#d4d4d8',
    fontSize: 11,
    fontWeight: '600',
  },
  sendButton: {
    backgroundColor: '#4f46e5',
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
    color: '#a5b4fc',
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
  attachmentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 7,
  },
  emptyState: {
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 44,
  },
  emptyStateTitle: {
    color: '#f4f4f5',
    fontSize: 16,
    fontWeight: '700',
    marginTop: 12,
    marginBottom: 6,
  },
  emptyStateText: {
    color: '#a1a1aa',
    fontSize: 13,
    lineHeight: 19,
    textAlign: 'center',
  },
  answerCard: {
    backgroundColor: '#172554',
    borderColor: '#3b82f6',
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
  },
  answerHeader: {
    color: '#93c5fd',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1,
    marginBottom: 7,
  },
  answerHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  answerText: {
    color: '#eff6ff',
    fontSize: 14,
    lineHeight: 20,
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
  boldRed: {
    color: '#ef4444',
    fontWeight: '700',
  },
  boldWhite: {
    color: '#ffffff',
    fontWeight: '700',
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

