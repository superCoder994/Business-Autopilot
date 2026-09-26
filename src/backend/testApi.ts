/**
 * src/backend/testApi.ts
 * Automated API Integration Verification Suite
 */

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000/api/v1';

async function testApiEndpoints() {
  console.log('==================================================');
  console.log('🚀 TESTING EXPRESS REST API ENDPOINTS');
  console.log('==================================================\n');

  let passed = 0;
  let failed = 0;

  // Helper function to validate status code and log results
  async function runTest(
    name: string,
    url: string,
    options: RequestInit = {}
  ) {
    try {
      const response = await fetch(url, {
        headers: { 'Content-Type': 'application/json' },
        ...options,
      });

      const data = await response.json();

      if (response.status === 200 && data.success) {
        console.log(`✅ [200 OK] ${name}`);
        passed++;
      } else {
        console.log(`❌ [FAIL ${response.status}] ${name}`);
        failed++;
      }
    } catch (err: any) {
      console.log(`❌ [CONNECTION ERROR] ${name}: ${err.message}`);
      failed++;
    }
  }

  // 1. Test Business Metrics Endpoint
  await runTest(
    'GET /business/metrics',
    `${BASE_URL}/business/metrics`
  );

  // 2. Test AI Investigation Endpoint
  await runTest(
    'POST /investigations/run',
    `${BASE_URL}/investigations/run`,
    { method: 'POST' }
  );

  // 3. Test Campaign Generation Endpoint
  await runTest(
    'POST /campaigns/generate',
    `${BASE_URL}/campaigns/generate`,
    { method: 'POST' }
  );

  // 4. Test Campaign Policy Verification Endpoint
  await runTest(
    'POST /campaigns/verify',
    `${BASE_URL}/campaigns/verify`,
    {
      method: 'POST',
      body: JSON.stringify({
        id: 'test_camp_01',
        title: 'Validation Special',
        discountAmount: 50,
        minOrderValue: 299,
        targetCohortSize: 83,
        durationDays: 3,
        status: 'proposed',
      }),
    }
  );

  console.log('\n==================================================');
  console.log(`RESULTS: ${passed} PASSED | ${failed} FAILED`);
  console.log('==================================================');
}

testApiEndpoints();