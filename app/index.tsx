import { SafeAreaView, ScrollView, StyleSheet } from "react-native";

import { EmpresaSelector } from "../components/EmpresaSelector";
import { EstadoActualCard } from "../components/EstadoActualCard";
import { Header } from "../components/Header";
import { HistorialHoy } from "../components/HistorialHoy";
import { MainActionButton } from "../components/MainActionButton";
import { QuickActions } from "../components/QuickActions";
import { TimerCard } from "../components/TimerCard";

export default function HomeScreen() {
  // Logic moved to a custom hook or centralized in the Store/Context provider

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
    backgroundColor: "#FFFFFF",
  },
  content: {
    padding: 16,
    gap: 0,
  },
});
