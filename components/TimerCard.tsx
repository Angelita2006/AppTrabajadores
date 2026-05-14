import React from 'react';
import { View, StyleSheet } from 'react-native';
import { ThemedText } from './themed-text';
import { useCurrentTimer } from '@/hooks/useCurrentTimer';

export const TimerCard = () => {
  const { horas, minutos, segundos } = useCurrentTimer();

  const formatoHora = `${String(horas).padStart(2, '0')}h ${String(minutos).padStart(2, '0')}m ${String(segundos).padStart(2, '0')}s`;

  return (
    <View style={styles.card}>
      <ThemedText style={styles.label}>Tiempo trabajado hoy</ThemedText>
      <ThemedText style={styles.tiempo}>{formatoHora}</ThemedText>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 20,
    marginVertical: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  label: {
    fontSize: 14,
    color: '#64748B',
    marginBottom: 8,
    fontWeight: '500',
  },
  tiempo: {
    fontSize: 32,
    fontWeight: '700',
    color: '#2563EB',
    letterSpacing: 0.5,
  },
});
