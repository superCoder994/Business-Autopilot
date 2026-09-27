type UploadedFile = {
  originalname: string;
  mimetype: string;
  buffer: Buffer;
};

export class ProviderServiceError extends Error {
  constructor(public readonly statusCode: number, message: string) {
    super(message);
    this.name = 'ProviderServiceError';
  }
}

type ProviderResponse = {
  output_text?: string;
  output?: { content?: { text?: string }[] }[];
  choices?: { message?: { content?: string | { text?: string }[] } }[];
  content?: { type?: string; text?: string }[];
  text?: string;
  error?: { message?: string };
};

type ChatContentPart =
  | { type: 'text'; text: string }
  | { type: 'image_url'; image_url: { url: string } }
  | { type: 'file'; file: { filename: string; file_data: string } }
  | { type: 'input_audio'; input_audio: { data: string; format: string } };

type AnthropicContentPart =
  | { type: 'text'; text: string }
  | { type: 'image'; source: { type: 'base64'; media_type: string; data: string } }
  | { type: 'document'; source: { type: 'base64'; media_type: 'application/pdf'; data: string }; title: string };

type ProviderCredentials = { provider: 'openrouter' | 'openai' | 'anthropic'; apiKey: string };

function getProviderCredentials(task: 'analysis' | 'transcription' = 'analysis'): ProviderCredentials {
  const legacyKey = process.env.OPENAI_API_KEY?.trim();
  const openRouterKey = process.env.OPENROUTER_API_KEY?.trim()
    || (legacyKey?.startsWith('sk-or-') ? legacyKey : undefined);
  const anthropicKey = process.env.ANTHROPIC_API_KEY?.trim()
    || (legacyKey?.startsWith('sk-ant-api') ? legacyKey : undefined);
  const openAiKey = legacyKey && !legacyKey.startsWith('sk-or-') && !legacyKey.startsWith('sk-ant-')
    ? legacyKey
    : undefined;

  if (openRouterKey) return { provider: 'openrouter', apiKey: openRouterKey };
  if (task === 'analysis' && anthropicKey) return { provider: 'anthropic', apiKey: anthropicKey };
  if (openAiKey) return { provider: 'openai', apiKey: openAiKey };
  if (anthropicKey) return { provider: 'anthropic', apiKey: anthropicKey };

  throw new ProviderServiceError(503, 'Set OPENROUTER_API_KEY, ANTHROPIC_API_KEY, or OPENAI_API_KEY in the backend .env to enable file analysis.');
}

function extractResponseText(payload: ProviderResponse): string {
  const chatContent = payload.choices?.[0]?.message?.content;
  const anthropicContent = payload.content
    ?.filter(block => block.type === 'text')
    .map(block => block.text ?? '')
    .join('')
    .trim();
  const text = payload.output_text
    ?? payload.output?.flatMap(item => item.content ?? []).map(item => item.text ?? '').join('').trim()
    ?? anthropicContent
    ?? (typeof chatContent === 'string'
      ? chatContent.trim()
      : chatContent?.map(item => item.text ?? '').join('').trim())
    ?? payload.text;
  if (!text) {
    throw new ProviderServiceError(502, payload.error?.message || 'The AI provider returned an empty response.');
  }
  return text;
}

export async function generateAgentReply(query: string, findings: string[]): Promise<string> {
  const { provider, apiKey } = getProviderCredentials('analysis');
  const prompt = [
    `User question: ${query}`,
    'Verified account facts:',
    ...findings.map(finding => `- ${finding}`),
    'Reply in the same language and writing system used in the user question. If it is a transcription, match the language the user spoke.',
    'Weave the relevant verified facts into the answer naturally. Give a concise, useful answer grounded only in these facts. Do not invent transaction, product, or customer details.'
  ].join('\n');

  if (provider === 'anthropic') {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: process.env.ANTHROPIC_TEXT_MODEL || process.env.ANTHROPIC_VISION_MODEL || 'claude-haiku-4-5',
        max_tokens: 500,
        messages: [{ role: 'user', content: prompt }]
      })
    });
    const payload = await response.json() as ProviderResponse;
    if (!response.ok) {
      throw new ProviderServiceError(502, payload.error?.message || 'Claude could not answer this question.');
    }
    return extractResponseText(payload);
  }

  if (provider === 'openai') {
    const response = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: process.env.OPENAI_TEXT_MODEL || process.env.OPENAI_VISION_MODEL || 'gpt-4o-mini',
        max_output_tokens: 500,
        input: [{ role: 'user', content: [{ type: 'input_text', text: prompt }] }]
      })
    });
    const payload = await response.json() as ProviderResponse;
    if (!response.ok) {
      throw new ProviderServiceError(502, payload.error?.message || 'The AI provider could not answer this question.');
    }
    return extractResponseText(payload);
  }

  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: process.env.OPENROUTER_TEXT_MODEL || process.env.OPENROUTER_VISION_MODEL || 'anthropic/claude-haiku-4.5',
      max_tokens: 500,
      messages: [{ role: 'user', content: prompt }]
    })
  });
  const payload = await response.json() as ProviderResponse;
  if (!response.ok) {
    throw new ProviderServiceError(502, payload.error?.message || 'OpenRouter could not answer this question.');
  }
  return extractResponseText(payload);
}

export async function analyzeUploadedFile(query: string, file: UploadedFile): Promise<string> {
  const { provider, apiKey } = getProviderCredentials();
  const base64Data = file.buffer.toString('base64');
  const dataUrl = `data:${file.mimetype};base64,${base64Data}`;
  const prompt = query || 'Summarize this business attachment and note any relevant account insights.';

  if (!file.mimetype.startsWith('image/') && file.mimetype !== 'application/pdf' && !file.mimetype.startsWith('text/')) {
    throw new ProviderServiceError(415, 'Supported attachments are images, PDF files, and text files.');
  }

  if (provider === 'openai') {
    const content: Record<string, string>[] = [{ type: 'input_text', text: prompt }];
    if (file.mimetype.startsWith('image/')) {
      content.push({ type: 'input_image', image_url: dataUrl });
    } else if (file.mimetype === 'application/pdf') {
      content.push({ type: 'input_file', filename: file.originalname, file_data: dataUrl });
    } else {
      const excerpt = file.buffer.toString('utf8').slice(0, 30_000);
      content.push({ type: 'input_text', text: `Attachment (${file.originalname}):\n${excerpt}` });
    }

    const response = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: process.env.OPENAI_VISION_MODEL || 'gpt-4o-mini',
        input: [{ role: 'user', content }]
      })
    });
    const payload = await response.json() as ProviderResponse;
    if (!response.ok) {
      throw new ProviderServiceError(502, payload.error?.message || 'OpenAI could not analyze this attachment.');
    }
    return extractResponseText(payload);
  }

  if (provider === 'anthropic') {
    const content: AnthropicContentPart[] = [{ type: 'text', text: prompt }];
    if (file.mimetype.startsWith('image/')) {
      const supportedImageTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
      if (!supportedImageTypes.includes(file.mimetype)) {
        throw new ProviderServiceError(415, 'Claude accepts JPEG, PNG, GIF, and WebP images.');
      }
      content.push({
        type: 'image',
        source: { type: 'base64', media_type: file.mimetype, data: base64Data }
      });
    } else if (file.mimetype === 'application/pdf') {
      content.push({
        type: 'document',
        source: { type: 'base64', media_type: 'application/pdf', data: base64Data },
        title: file.originalname
      });
    } else {
      const excerpt = file.buffer.toString('utf8').slice(0, 30_000);
      content.push({ type: 'text', text: `Attachment (${file.originalname}):\n${excerpt}` });
    }

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: process.env.ANTHROPIC_VISION_MODEL || 'claude-haiku-4-5',
        max_tokens: 1200,
        messages: [{ role: 'user', content }]
      })
    });
    const payload = await response.json() as ProviderResponse;
    if (!response.ok) {
      throw new ProviderServiceError(502, payload.error?.message || 'Claude could not analyze this attachment.');
    }
    return extractResponseText(payload);
  }

  const content: ChatContentPart[] = [{
    type: 'text',
    text: prompt
  }];

  if (file.mimetype.startsWith('image/')) {
    content.push({ type: 'image_url', image_url: { url: dataUrl } });
  } else if (file.mimetype === 'application/pdf') {
    content.push({ type: 'file', file: { filename: file.originalname, file_data: dataUrl } });
  } else {
    const excerpt = file.buffer.toString('utf8').slice(0, 30_000);
    content.push({ type: 'text', text: `Attachment (${file.originalname}):\n${excerpt}` });
  }

  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: process.env.OPENROUTER_VISION_MODEL || 'anthropic/claude-haiku-4.5',
      max_tokens: 1200,
      messages: [{ role: 'user', content }]
    })
  });
  const payload = await response.json() as ProviderResponse;
  if (!response.ok) {
    throw new ProviderServiceError(502, payload.error?.message || 'OpenRouter could not analyze this attachment.');
  }
  return extractResponseText(payload);
}

export async function transcribeAudio(file: UploadedFile, requestedLanguage = 'auto'): Promise<string> {
  const { provider, apiKey } = getProviderCredentials('transcription');
  if (provider === 'openai') {
    const audioBytes = new Uint8Array(file.buffer.byteLength);
    audioBytes.set(file.buffer);
    const form = new FormData();
    form.append('file', new Blob([audioBytes], { type: file.mimetype }), file.originalname);
    form.append('model', process.env.OPENAI_TRANSCRIPTION_MODEL || 'gpt-4o-mini-transcribe');
    if (requestedLanguage !== 'auto') {
      const language = requestedLanguage.split('-')[0];
      if (language) form.append('language', language);
    }

    const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}` },
      body: form
    });
    const payload = await response.json() as ProviderResponse;
    if (!response.ok) {
      throw new ProviderServiceError(502, payload.error?.message || 'OpenAI could not transcribe this recording.');
    }
    return extractResponseText(payload);
  }

  if (provider === 'anthropic') {
    throw new ProviderServiceError(503, 'Direct Claude API keys support image and document analysis, but voice transcription requires OPENROUTER_API_KEY or OPENAI_API_KEY.');
  }

  const format = file.mimetype.split('/')[1]?.split(';')[0] || 'm4a';
  const languageInstruction = requestedLanguage === 'auto' ? '' : ` Transcribe it in ${requestedLanguage}.`;
  const content: ChatContentPart[] = [
    { type: 'text', text: `Transcribe this audio recording verbatim.${languageInstruction}` },
    { type: 'input_audio', input_audio: { data: file.buffer.toString('base64'), format } }
  ];

  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: process.env.OPENROUTER_TRANSCRIPTION_MODEL || 'google/gemini-2.5-flash',
      messages: [{ role: 'user', content }]
    })
  });
  const payload = await response.json() as ProviderResponse;
  if (!response.ok) {
    throw new ProviderServiceError(502, payload.error?.message || 'OpenRouter could not transcribe this recording.');
  }
  return extractResponseText(payload);
}
