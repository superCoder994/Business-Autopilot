export const BACKEND_IP = '10.2.37.174'; 
const BASE_URL = `http://${BACKEND_IP}:3000/api/v1`;

// Fallback data if Member 2's server is unreachable
const FALLBACK = {
  metrics: {
    merchantName: 'Sharma Ji',
    todayRevenue: 18450,
    revenueChangePct: 4.2,
    eveningDropPct: 19,
    dormantCustomersCount: 83
  },
  investigation: {
    findings: [
      'Evening revenue drop: -19% (6:00 PM – 9:00 PM)',
      '83 repeat customers inactive for >21 days'
    ],
    rootCause: 'Low dinner footfall among previous repeat diners'
  },
  proposal: {
    title: 'We miss you Push Notification',
    discount: '₹50 OFF',
    minOrder: '₹299',
    duration: '3 days (6 PM - 9 PM)',
    policyChecks: [
      '✓ Discount ₹50 within ≤20% ceiling',
      '✓ Min order ₹299 covers food margin',
      '✓ Audience: 83 dormant diners only'
    ]
  }
};

export const fetchBusinessMetrics = async () => {
  try {
    const res = await fetch(`${BASE_URL}/business/metrics`, { method: 'GET' });
    if (!res.ok) throw new Error('Metrics API failed');
    return await res.json();
  } catch (err) {
    console.warn('Backend unavailable, using fallback metrics:', err);
    return FALLBACK.metrics;
  }
};

export const runInvestigation = async () => {
  try {
    const res = await fetch(`${BASE_URL}/investigations/run`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ window: 'evening', days: 21 }),
    });
    if (!res.ok) throw new Error('Investigation API failed');
    return await res.json();
  } catch (err) {
    console.warn('Backend unavailable, using fallback investigation:', err);
    return FALLBACK.investigation;
  }
};

export const proposeCampaign = async () => {
  try {
    const res = await fetch(`${BASE_URL}/campaigns/generates`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ targetSegment: 'dormant_21d', defaultDiscount: 50 }),
    });
    if (!res.ok) throw new Error('Propose API failed');
    return await res.json();
  } catch (err) {
    console.warn('Backend unavailable, using fallback proposal:', err);
    return FALLBACK.proposal;
  }
};
