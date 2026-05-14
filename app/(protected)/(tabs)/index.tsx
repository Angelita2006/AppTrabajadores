import React, { useEffect } from 'react';
import { SafeAreaView, ScrollView, StyleSheet } from 'react-native';

import { Header } from '@/components/Header';
import { EmpresaSelector } from '@/components/EmpresaSelector';
import { EstadoActualCard } from '@/components/EstadoActualCard';
import { TimerCard } from '@/components/TimerCard';
import { MainActionButton } from '@/components/MainActionButton';
import { QuickActions } from '@/components/QuickActions';
import { HistorialHoy } from '@/components/HistorialHoy';

import { useTrabajador } from '@/context/TrabajadorContext';
import { useFichajeStore } from '@/store/useFichajeStore';

export default function HomeScreen() {
  const { trabajadorActual, empresaSeleccionada } = useTrabajador();

  useEffect(() => {
    if (trabajadorActual?.id) {
      useFichajeStore.getState().setTrabajador(trabajadorActual.id);
    }
  }, [trabajadorActual?.id]);

  useEffect(() => {
    if (empresaSeleccionada?.id) {
      useFichajeStore.getState().setEmpresa(empresaSeleccionada.id);
    }
  }, [empresaSeleccionada?.id]);

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <Header />
        <EmpresaSelector />
        <EstadoActualCard />
        <TimerCard />
        <MainActionButton />
        <QuickActions />
        <HistorialHoy />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  content: {
    padding: 16,
    gap: 0,
  },
});
