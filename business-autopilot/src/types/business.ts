export interface DashboardMetrics {
  merchantName: string;
  todayRevenue: number;
  revenueChangePct: number;
  eveningDropPct: number;
  dormantCustomersCount: number;
}

export interface RecommendationPayload {
  title: string;
  discount: string;
  minOrder: string;
  duration: string;
  targetCount: number;
}
