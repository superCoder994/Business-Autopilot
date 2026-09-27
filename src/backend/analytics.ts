import { Customer, RevenueWindow, Transaction } from './types';

function round(value: number, decimals = 1): number {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

export function calculateRevenueForDate(
  transactions: Transaction[],
  date = new Date(),
  timezoneOffsetMinutes = 0
): number {
  const target = new Date(date.getTime() + timezoneOffsetMinutes * 60_000)
    .toISOString()
    .slice(0, 10);

  return transactions
    .filter(t => {
      const d = new Date(t.timestamp);
      const local = new Date(d.getTime() + timezoneOffsetMinutes * 60_000)
        .toISOString()
        .slice(0, 10);
      return local === target;
    })
    .reduce((sum, t) => sum + t.amount, 0);
}

export function calculateRevenueByTwoHourWindow(
  transactions: Transaction[],
  date = new Date(),
  timezoneOffsetMinutes = 0
): RevenueWindow[] {
  const targetDate = new Date(date.getTime() + timezoneOffsetMinutes * 60_000).toISOString().slice(0, 10);
  const windows = Array.from({ length: 12 }, (_, index) => ({ startHour: index * 2, amount: 0 }));

  for (const transaction of transactions) {
    const local = new Date(new Date(transaction.timestamp).getTime() + timezoneOffsetMinutes * 60_000);
    if (local.toISOString().slice(0, 10) !== targetDate) continue;
    const windowIndex = Math.floor(local.getUTCHours() / 2);
    const window = windows[windowIndex];
    if (window) window.amount += transaction.amount;
  }

  return windows;
}

export function calculateEveningDrop(
  transactions: Transaction[],
  baselineAmount = 10000,
  eveningStartHour = 18,
  eveningEndHour = 21,
  timezoneOffsetMinutes = 0
): { current: number; dropPct: number } {
  const currentEveningSales = transactions
    .filter(t => {
      const date = new Date(t.timestamp);
      const local = new Date(date.getTime() + timezoneOffsetMinutes * 60_000);
      const hour = local.getUTCHours();
      return hour >= eveningStartHour && hour < eveningEndHour;
    })
    .reduce((sum, t) => sum + t.amount, 0);

  if (baselineAmount <= 0) {
    return { current: currentEveningSales, dropPct: 0 };
  }

  const dropPct = ((baselineAmount - currentEveningSales) / baselineAmount) * 100;
  return {
    current: currentEveningSales,
    dropPct: round(dropPct)
  };
}

export function getDormantCustomers(customers: Customer[], daysThreshold = 21, now = new Date()): Customer[] {
  const cutoff = new Date(now.getTime());
  cutoff.setDate(cutoff.getDate() - daysThreshold);

  return customers.filter(c => new Date(c.lastOrderTimestamp) < cutoff);
}

export function calculateRevenueChangePct(currentRevenue: number, previousRevenue?: number): number {
  if (previousRevenue === undefined || previousRevenue <= 0) return 0;
  return round(((currentRevenue - previousRevenue) / previousRevenue) * 100);
}
