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
  text?: string;
  error?: { message?: string };
};

function getApiKey(): string {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new ProviderServiceError(503, 'File analysis and voice transcription require OPENAI_API_KEY on the backend.');
  }
  return apiKey;
}

function extractResponseText(payload: ProviderResponse): string {
  const text = payload.output_text
    ?? payload.output?.flatMap(item => item.content ?? []).map(item => item.text ?? '').join('').trim()
    ?? payload.text;
  if (!text) {
    throw new ProviderServiceError(502, payload.error?.message || 'The AI provider returned an empty response.');
  }
  return text;
}

export async function analyzeUploadedFile(query: string, file: UploadedFile): Promise<string> {
  const apiKey = getApiKey();
  const base64Data = file.buffer.toString('base64');
  const dataUrl = `data:${file.mimetype};base64,${base64Data}`;
  const content: Record<string, string>[] = [{
    type: 'input_text',
    text: query || 'Summarize this business attachment and note any relevant account insights.'
  }];

  if (file.mimetype.startsWith('image/')) {
    content.push({ type: 'input_image', image_url: dataUrl });
  } else if (file.mimetype === 'application/pdf') {
    content.push({ type: 'input_file', filename: file.originalname, file_data: dataUrl });
  } else if (file.mimetype.startsWith('text/')) {
    const excerpt = file.buffer.toString('utf8').slice(0, 30_000);
    content.push({ type: 'input_text', text: `Attachment (${file.originalname}):\n${excerpt}` });
  } else {
    throw new ProviderServiceError(415, 'Supported attachments are images, PDF files, and text files.');
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
    throw new ProviderServiceError(502, payload.error?.message || 'The AI provider could not analyze this attachment.');
  }
  return extractResponseText(payload);
}

export async function transcribeAudio(file: UploadedFile, requestedLanguage = 'auto'): Promise<string> {
  const apiKey = getApiKey();
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
    throw new ProviderServiceError(502, payload.error?.message || 'The AI provider could not transcribe this recording.');
  }
  return extractResponseText(payload);
}
