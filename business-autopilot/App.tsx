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
import { AudioModule, RecordingPresets, useAudioRecorder } from 'expo-audio';
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
  const [agentResponse, setAgentResponse] = useState<any>(null);
  const [attachment, setAttachment] = useState<{ uri: string; name: string; mimeType: string } | null>(null);
  const [recording, setRecording] = useState(false);
  const audioRecorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);

  const askAgent = async (prompt: string, file = attachment) => {
    const cleanPrompt = prompt.trim() || 'Give me a summary of my account, sales, and recommendations.';
    setModalVisible(true);
    setAgentStep('investigating');
    setQuestion(cleanPrompt);
    const response = file
      ? await askAutopilotAgentWithAttachment(cleanPrompt, file)
      : await askAutopilotAgent(cleanPrompt);
    setAgentResponse(response);
    setAgentStep('ready');
  };

  const startInvestigation = () => {
    void askAgent('Meri sales kyun gir rahi hain?');
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
          void askAgent(transcript);
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
    setAgentStep('approved');
    // Simulate real-time campaign impact
    setRevenue(21450);
    setGrowth('↑ 20.5% 🚀');
  };

  const resetFlow = () => {
    setModalVisible(false);
    setAgentStep('idle');
    setAgentResponse(null);
    setAttachment(null);
    setQuestion('');
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.tagline}>BUSINESS AUTOPILOT</Text>
        <Text style={styles.title}>Good morning, Sharma Ji 👋</Text>
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
            • Evening sales <Text style={styles.negative}>↓19%</Text>
          </Text>
          <Text style={styles.alertItem}>• 83 dormant customers</Text>
        </View>

        <TouchableOpacity
          style={styles.actionButton}
          onPress={startInvestigation}
          activeOpacity={0.8}
        >
          <Text style={styles.actionButtonText}>✨ Ask AI</Text>
        </TouchableOpacity>
      </View>

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
              <TouchableOpacity onPress={resetFlow}>
                <Text style={styles.closeBtn}>✕</Text>
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
                onSubmitEditing={() => void askAgent(question)}
              />
              <View style={styles.inputActions}>
                <TouchableOpacity style={styles.inputAction} onPress={() => void chooseImage(true)}>
                  <Text style={styles.inputActionText}>Camera</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.inputAction} onPress={() => void chooseImage(false)}>
                  <Text style={styles.inputActionText}>Photo</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.inputAction} onPress={() => void chooseDocument()}>
                  <Text style={styles.inputActionText}>File</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.inputAction, recording && styles.recordingAction]} onPress={() => void toggleRecording()}>
                  <Text style={styles.inputActionText}>{recording ? 'Stop' : 'Voice'}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.sendButton} onPress={() => void askAgent(question)}>
                  <Text style={styles.sendButtonText}>Send</Text>
                </TouchableOpacity>
              </View>
              {attachment && (
                <Text style={styles.attachmentText}>Attached: {attachment.name}</Text>
              )}
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              {question ? (
                <View style={styles.userBubble}>
                  <Text style={styles.userBubbleText}>"{question}"</Text>
                </View>
              ) : null}

              {agentStep === 'investigating' ? (
                <View style={styles.loadingBox}>
                  <ActivityIndicator size="large" color="#6366f1" />
                  <Text style={styles.loadingText}>Calling Analytics Engine tools...</Text>
                  <Text style={styles.loadingSubtext}>getEveningSales() • getDormantCustomers()</Text>
                </View>
              ) : (
                <>
                  {agentResponse?.reply && (
                    <View style={styles.answerCard}>
                      <Text style={styles.answerHeader}>AGENT ANSWER</Text>
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
    borderWidth: 1,
    borderColor: '#52525b',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 7,
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
    marginTop: 7,
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

