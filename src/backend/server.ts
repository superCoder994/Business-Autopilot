/** Express HTTP Server */

import express, { Request, Response } from 'express';
import cors from 'cors';
import multer from 'multer';
import { autopilot } from './index';
import { analyzeUploadedFile, ProviderServiceError, transcribeAudio } from './providerService';

const app = express();
const PORT = Number(process.env.PORT || 3000);
const HOST = process.env.HOST || '0.0.0.0';

app.use(cors());
app.use(express.json());
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024, files: 1 }
});

app.get('/api/v1/health', (_req: Request, res: Response) => {
  res.json({ success: true, data: { status: 'ok' } });
});

app.get('/api/v1/business/metrics', (_req: Request, res: Response) => {
  try {
    res.json({ success: true, data: autopilot.getBusinessState() });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({ success: false, error: message });
  }
});

app.post('/api/v1/investigations/run', upload.single('file'), async (req: Request, res: Response) => {
  try {
    const query = typeof req.body?.query === 'string' ? req.body.query.trim() : '';
    if (!query) {
      res.status(400).json({ success: false, error: 'A non-empty query is required.' });
      return;
    }

    const result = await autopilot.investigateDrop(query);
    if (req.file) result.reply = await analyzeUploadedFile(query, req.file);
    res.json({ success: true, data: result });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to run this investigation.';
    const statusCode = error instanceof ProviderServiceError ? error.statusCode : 500;
    res.status(statusCode).json({ success: false, error: message });
  }
});

app.post('/api/v1/transcriptions', upload.single('file'), async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      res.status(400).json({ success: false, error: 'An audio file is required.' });
      return;
    }
    if (!req.file.mimetype.startsWith('audio/')) {
      res.status(415).json({ success: false, error: 'The uploaded file must be audio.' });
      return;
    }

    const language = typeof req.body?.language === 'string' ? req.body.language : 'auto';
    const text = await transcribeAudio(req.file, language);
    res.json({ success: true, data: { text } });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to transcribe this recording.';
    const statusCode = error instanceof ProviderServiceError ? error.statusCode : 500;
    res.status(statusCode).json({ success: false, error: message });
  }
});

app.post('/api/v1/campaigns/generate', async (_req: Request, res: Response) => {
  try {
    res.json({ success: true, data: await autopilot.generateAndVerifyCampaign() });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({ success: false, error: message });
  }
});

app.post('/api/v1/campaigns/verify', (req: Request, res: Response) => {
  try {
    res.json({ success: true, data: autopilot.verifyCampaign(req.body) });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    res.status(400).json({ success: false, error: message });
  }
});

app.get('/api/v1/campaigns/:id', (req: Request, res: Response) => {
  try {
    res.json({ success: true, data: autopilot.getCampaign(String(req.params.id)) });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Campaign not found';
    res.status(404).json({ success: false, error: message });
  }
});

app.post('/api/v1/campaigns/:id/approve', (req: Request, res: Response) => {
  try {
    res.json({ success: true, data: autopilot.approveCampaign(String(req.params.id)) });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to approve campaign';
    res.status(400).json({ success: false, error: message });
  }
});

app.post('/api/v1/campaigns/:id/reject', (req: Request, res: Response) => {
  try {
    res.json({ success: true, data: autopilot.rejectCampaign(String(req.params.id)) });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to reject campaign';
    res.status(400).json({ success: false, error: message });
  }
});

app.post('/api/v1/campaigns/:id/activate', (req: Request, res: Response) => {
  try {
    res.json({ success: true, data: autopilot.activateCampaign(String(req.params.id)) });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to activate campaign';
    res.status(400).json({ success: false, error: message });
  }
});

app.use((error: Error, _req: Request, res: Response, _next: (error?: unknown) => void) => {
  const isUploadError = error instanceof multer.MulterError;
  const statusCode = isUploadError && error.code === 'LIMIT_FILE_SIZE' ? 413 : isUploadError ? 400 : 500;
  const message = isUploadError && error.code === 'LIMIT_FILE_SIZE'
    ? 'Uploads are limited to 10 MB.'
    : error.message || 'Unexpected server error.';
  res.status(statusCode).json({ success: false, error: message });
});

app.listen(PORT, HOST, () => {
  console.log(`🚀 Autopilot Express Server running on http://localhost:${PORT}`);
  console.log(`📡 Metrics: http://localhost:${PORT}/api/v1/business/metrics`);
});
