/** Express HTTP Server */

import express, { Request, Response } from 'express';
import cors from 'cors';
import { autopilot } from './index';

const app = express();
const PORT = Number(process.env.PORT || 3000);
const HOST = process.env.HOST || '0.0.0.0';

app.use(cors());
app.use(express.json());

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

app.post('/api/v1/investigations/run', async (_req: Request, res: Response) => {
  try {
    res.json({ success: true, data: await autopilot.investigateDrop() });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({ success: false, error: message });
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

app.listen(PORT, HOST, () => {
  console.log(`🚀 Autopilot Express Server running on http://localhost:${PORT}`);
  console.log(`📡 Metrics: http://localhost:${PORT}/api/v1/business/metrics`);
});
