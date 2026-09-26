import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { TrendingUp } from 'lucide-react-native';

interface Props {
  revenue: number;
  changePct: number;
}

export const RevenueCard: React.FC<Props> = ({ revenue, changePct }) => (
  <View style={styles.card}>
    <Text style={styles.label}>Today's Revenue</Text>
    <View style={styles.row}>
      <Text style={styles.amount}>₹{revenue.toLocaleString('en-IN')}</Text>
      <View style={styles.badge}>
        <TrendingUp size={16} color="#22c55e" />
        <Text style={styles.badgeText}>{changePct}%</Text>
      </View>
    </View>
  </View>
);

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#18181b',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: '#27272a',
    marginBottom: 16,
  },
  label: {
    color: '#a1a1aa',
    fontSize: 14,
    marginBottom: 8,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  amount: {
    color: '#ffffff',
    fontSize: 32,
    fontWeight: '800',
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#052e16',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    gap: 4,
  },
  badgeText: {
    color: '#22c55e',
    fontWeight: '600',
    fontSize: 14,
  },
});