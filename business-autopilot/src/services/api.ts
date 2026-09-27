import type { CampaignProposal, DashboardMetrics, InvestigationResult, PolicyCheckResult } from '../types/business';
import { File as ExpoFile } from 'expo-file-system';
import { Platform } from 'react-native';

const DEFAULT_API_HOST = typeof window !== 'undefined' && typeof window.location !== 'undefined'
  ? window.location.hostname || '10.2.37.182'
  : '10.2.37.182';
const DEFAULT_API_URL = `http://${DEFAULT_API_HOST}:3000`;
const API_ROOT = (process.env.EXPO_PUBLIC_API_URL || DEFAULT_API_URL).replace(/\/+$/, '');
const BASE_URL = API_ROOT.endsWith('/api/v1') ? API_ROOT : `${API_ROOT}/api/v1`;

interface ApiEnvelope<T> {
  success: boolean;
  data?: T;
  error?: string;
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const response = await fetch(`${BASE_URL}${path}`, init);
  const payload = await response.json().catch(() => null) as ApiEnvelope<T> | null;
  if (!response.ok || !payload?.success || payload.data === undefined) {
    throw new Error(payload?.error || `Request failed (${response.status}).`);
  }
  return payload.data;
}

export const fetchBusinessMetrics = () => request<DashboardMetrics>('/business/metrics');

export const generateCampaign = () => request<{
  campaign: CampaignProposal;
  policyResult: PolicyCheckResult;
}>('/campaigns/generate', { method: 'POST' });

export const approveCampaign = (id: string) => request<CampaignProposal>(
  `/campaigns/${encodeURIComponent(id)}/approve`,
  { method: 'POST' }
);

export const activateCampaign = (id: string) => request<CampaignProposal>(
  `/campaigns/${encodeURIComponent(id)}/activate`,
  { method: 'POST' }
);

export const askAutopilotAgent = async (userPrompt: string): Promise<InvestigationResult> => {
  const result = await request<InvestigationResult>('/investigations/run', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query: userPrompt }),
  });
  if (!result.hasProposal) return result;

  const proposal = await generateCampaign();
  return { ...result, ...proposal };
};

export type AgentAttachment = {
  uri: string;
  name: string;
  mimeType: string;
};

const appendUpload = async (body: FormData, uri: string, name: string, mimeType: string) => {
  if (Platform.OS === 'web') {
    const response = await fetch(uri);
    if (!response.ok) throw new Error('Unable to read the selected file.');
    const blob = await response.blob();
    body.append('file', new Blob([blob], { type: mimeType || blob.type }), name);
    return;
  }

  const file = new ExpoFile(uri);
  body.append('file', file, name);
};

export const askAutopilotAgentWithAttachment = async (
  userPrompt: string,
  attachment: AgentAttachment
): Promise<InvestigationResult> => {
  const body = new FormData();
  body.append('query', userPrompt);
  await appendUpload(body, attachment.uri, attachment.name, attachment.mimeType);
  const result = await request<InvestigationResult>('/investigations/run', { method: 'POST', body });
  if (!result.hasProposal) return result;

  const proposal = await generateCampaign();
  return { ...result, ...proposal };
};

export const transcribeVoice = async (audioUri: string): Promise<string> => {
  const body = new FormData();
  await appendUpload(body, audioUri, 'voice-question.m4a', 'audio/m4a');
  body.append('language', 'auto');
  const result = await request<{ text: string }>('/transcriptions', { method: 'POST', body });
  return result.text;
};
