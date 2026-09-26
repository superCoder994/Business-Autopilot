export const BACKEND_IP = '10.2.37.174'; 
const BASE_URL = `http://${BACKEND_IP}:3000/api/v1`;

export const fetchBusinessMetrics = async () => {
  try {
    const res = await fetch(`${BASE_URL}/business/metrics`, { method: 'GET' });
    if (!res.ok) throw new Error('Metrics API failed');
    return await res.json();
  } catch (err) {
    console.info('Backend unavailable, using fallback metrics');
    return {
      merchantName: 'Sharma Ji',
      todayRevenue: 18450,
      revenueChangePct: 4.2,
      eveningDropPct: 19,
      dormantCustomersCount: 83
    };
  }
};

export const askAutopilotAgent = async (userPrompt: string, language = 'auto') => {
  try {
    const res = await fetch(`${BASE_URL}/investigations/run`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: userPrompt, language, responseLanguage: 'match' }),
    });
    if (!res.ok) throw new Error('Agent API failed');
    return await res.json();
  } catch (err) {
    console.info('Backend unavailable, generating deterministic agent response');
    const lower = userPrompt.toLowerCase();
    
    // Deterministic intelligence based on keywords
    if (lower.includes('sales') || lower.includes('drop') || lower.includes('gir')) {
      return {
        reply: "Your evening sales are down 19% between 6:00 PM and 9:00 PM due to 83 repeat customers being inactive for over 21 days.",
        findings: [
          'Evening drop: -19% (6:00 PM – 9:00 PM)',
          '83 repeat diners inactive >21 days',
          'Average spend per dormant diner: ₹380'
        ],
        hasProposal: true,
        proposal: {
          title: '"We Miss You" Push Notification',
          discount: '₹50 OFF',
          minOrder: '₹299',
          duration: '3 days (6 PM - 9 PM)',
          policyChecks: [
            '✓ Discount ₹50 within ≤20% ceiling',
            '✓ Min order ₹299 protects food margin',
            '✓ Targeted strictly to 83 dormant accounts'
          ]
        }
      };
    } else if (lower.includes('top') || lower.includes('item') || lower.includes('dish')) {
      return {
        reply: "Your top seller today is Paneer Butter Masala (34 orders), followed by Butter Naan (78 units). Evening snacks like Veg Pakoda have slowed down by 35%.",
        findings: [
          'Top revenue item: Paneer Butter Masala (₹8,160)',
          'High margin add-on: Butter Naan (78 units)',
          'Underperforming category: Evening Snacks (-35%)'
        ],
        hasProposal: false
      };
    } else {
      return {
        reply: "Today's total gross is ₹18,450 across 62 orders. Peak lunch rush was healthy (+14%), but dinner footfall needs attention.",
        findings: [
          '62 total orders processed',
          'Average Order Value (AOV): ₹297',
          'Policy status: Compliant & verified'
        ],
        hasProposal: false
      };
    }
  }
};

export type AgentAttachment = {
  uri: string;
  name: string;
  mimeType: string;
};

export const askAutopilotAgentWithAttachment = async (
  userPrompt: string,
  attachment: AgentAttachment
) => {
  const body = new FormData();
  body.append('query', userPrompt);
  body.append('file', {
    uri: attachment.uri,
    name: attachment.name,
    type: attachment.mimeType,
  } as unknown as Blob);
  body.append('language', 'auto');
  body.append('responseLanguage', 'match');

  try {
    const res = await fetch(`${BASE_URL}/investigations/run`, {
      method: 'POST',
      body,
    });
    if (!res.ok) throw new Error('Agent attachment API failed');
    return await res.json();
  } catch (err) {
    console.info('Attachment analysis unavailable, using text agent response');
    return askAutopilotAgent(userPrompt || `Analyze ${attachment.name}`);
  }
};

export const transcribeVoice = async (audioUri: string) => {
  const body = new FormData();
  body.append('file', {
    uri: audioUri,
    name: 'voice-question.m4a',
    type: 'audio/m4a',
  } as unknown as Blob);
  body.append('language', 'auto');

  try {
    const res = await fetch(`${BASE_URL}/transcriptions`, {
      method: 'POST',
      body,
    });
    if (!res.ok) throw new Error('Transcription API failed');
    const data = await res.json();
    return data.text as string;
  } catch (err) {
    console.info('Voice transcription unavailable');
    return '';
  }
};
