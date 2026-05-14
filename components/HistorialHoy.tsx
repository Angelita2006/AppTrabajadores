import React from 'react';
import { View, StyleSheet, FlatList } from 'react-native';
import { ThemedText } from './themed-text';
import { useFichajeStore } from '@/store/useFichajeStore';

const TIPO_LABEL = {
  entrada: '📍 Entrada',
  salida: '🚪 Salida',
  descanso: '☕ Descanso',
  fin_descanso: '🔄 Fin descanso',
  horas_extra: '⏱️ Horas extra',
};

export const HistorialHoy = () => {
  const fichajeHoy = useFichajeStore((s) => s.fichajeHoy);

  // Mostrar máximo 5 registros más recientes
  const historial = fichajeHoy.slice(-5);

  if (historial.length === 0) {
    return (
      <View style={styles.card}>
        <ThemedText style={styles.label}>Actividad de hoy</ThemedText>
        <ThemedText style={styles.empty}>
          Sin fichajes registrados
        </ThemedText>
      </View>
    );
  }

  return (
    <View style={styles.card}>
      <ThemedText style={styles.label}>Actividad de hoy</ThemedText>
      <View style={styles.lista}>
        {historial.map((fichaje, index) => (
          <View key={index} style={styles.item}>
            <ThemedText style={styles.hora}>
              {new Date(fichaje.fecha_hora).toLocaleTimeString('es-ES', {
                hour: '2-digit',
                minute: '2-digit',
              })}
            </ThemedText>
            <ThemedText style={styles.tipo}>
              {TIPO_LABEL[fichaje.tipo] || fichaje.tipo}
            </ThemedText>
          </View>
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 16,
    marginVertical: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  label: {
    fontSize: 14,
    color: '#64748B',
    marginBottom: 12,
    fontWeight: '600',
  },
  empty: {
    fontSize: 14,
    color: '#94A3B8',
    fontStyle: 'italic',
  },
  lista: {
    gap: 8,
  },
  item: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  hora: {
    fontSize: 13,
    fontWeight: '600',
    color: '#0F172A',
  },
  tipo: {
    fontSize: 13,
    color: '#64748B',
  },
});
