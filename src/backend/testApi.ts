/**
 * src/backend/testApi.ts
 * Automated API Integration Verification Suite
 */

/** API integration checks for the dashboard and agent workflows. */

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000/api/v1';

type ApiResult = {
  success?: boolean;
  data?: any;
  error?: string;
};

let passed = 0;
let failed = 0;

async function test(name: string, run: () => Promise<void>) {
  try {
    await run();
    console.log(`PASS ${name}`);
    passed++;
  } catch (error) {
    console.error(`FAIL ${name}: ${error instanceof Error ? error.message : String(error)}`);
    failed++;
  }
}

async function request(path: string, init: RequestInit = {}) {
  const response = await fetch(`${BASE_URL}${path}`, init);
  const body = await response.json() as ApiResult;
  return { response, body };
}

async function main() {
  let campaignId = '';

  await test('GET /health', async () => {
    const { response, body } = await request('/health');
    if (!response.ok || !body.success || body.data?.status !== 'ok') throw new Error('Health response did not match the API contract.');
  });

  await test('GET /business/metrics returns dashboard fields', async () => {
    const { response, body } = await request('/business/metrics');
    const metrics = body.data;
    if (!response.ok || !body.success || typeof metrics?.todayRevenue !== 'number'
      || typeof metrics?.eveningDropPct !== 'number'
      || typeof metrics?.dormantCustomerCount !== 'number'
      || !('activeCampaign' in metrics)) {
      throw new Error('Metrics response does not match DashboardMetrics.');
    }
  });

  await test('POST /investigations/run returns query-aware account facts', async () => {
    const { response, body } = await request('/investigations/run', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: 'Why are evening sales down?' })
    });
    if (!response.ok || !body.success || typeof body.data?.reply !== 'string'
      || !Array.isArray(body.data?.findings) || body.data?.hasProposal !== true) {
      throw new Error('Investigation response does not match the agent contract.');
    }
  });

  await test('POST /investigations/run rejects an empty query', async () => {
    const { response, body } = await request('/investigations/run', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: '  ' })
    });
    if (response.status !== 400 || body.success !== false) throw new Error('Expected HTTP 400 for an empty query.');
  });

  await test('POST /campaigns/generate returns a valid proposal', async () => {
    const { response, body } = await request('/campaigns/generate', { method: 'POST' });
    campaignId = body.data?.campaign?.id;
    if (!response.ok || !body.success || !campaignId || !body.data?.policyResult?.isValid) {
      throw new Error('Campaign proposal is missing or failed policy checks.');
    }
  });

  await test('campaign approval returns approved status and timestamp', async () => {
    const { response, body } = await request(`/campaigns/${encodeURIComponent(campaignId)}/approve`, { method: 'POST' });
    if (!response.ok || body.data?.status !== 'approved' || !body.data?.approvedAt) {
      throw new Error('Campaign was not approved with a timestamp.');
    }
  });

  await test('campaign activation returns active status and timestamp', async () => {
    const { response, body } = await request(`/campaigns/${encodeURIComponent(campaignId)}/activate`, { method: 'POST' });
    if (!response.ok || body.data?.status !== 'active' || !body.data?.activatedAt) {
      throw new Error('Campaign was not activated with a timestamp.');
    }
  });

  await test('POST /transcriptions requires an audio file', async () => {
    const { response, body } = await request('/transcriptions', { method: 'POST' });
    if (response.status !== 400 || body.success !== false) throw new Error('Expected HTTP 400 when no audio file is provided.');
  });

  await test('POST /transcriptions rejects non-audio files', async () => {
    const form = new FormData();
    form.append('file', new Blob(['not audio'], { type: 'text/plain' }), 'notes.txt');
    const { response, body } = await request('/transcriptions', { method: 'POST', body: form });
    if (response.status !== 415 || body.success !== false) throw new Error('Expected HTTP 415 for a non-audio upload.');
  });

  console.log(`\nRESULTS: ${passed} passed | ${failed} failed`);
  if (failed > 0) process.exitCode = 1;
}

void main();