import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

interface Props {
  merchantName: string;
}

export const Header: React.FC<Props> = ({ merchantName }) => (
  <View style={styles.container}>
    <Text style={styles.tagline}>BUSINESS AUTOPILOT</Text>
    <Text style={styles.title}>Good morning, {merchantName} 👋</Text>
  </View>
);

const styles = StyleSheet.create({
  container: {
    marginBottom: 20,
  },
  tagline: {
    color: '#71717a',
    fontSize: 12,
    letterSpacing: 1.5,
    fontWeight: '800',
    marginBottom: 4,
  },
  title: {
    color: '#f4f4f5',
    fontSize: 22,
    fontWeight: '700',
  },
});