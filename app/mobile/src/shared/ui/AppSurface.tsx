import { ReactNode } from "react";
import { ScrollView, StyleSheet, View } from "react-native";

import { ThemedText } from "@/shared/components/themed-text";

export function AppScreen({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
}) {
  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <ThemedText style={styles.kicker}>AppTrabajadores</ThemedText>
        <ThemedText type="title" style={styles.title}>
          {title}
        </ThemedText>
        {subtitle ? (
          <ThemedText style={styles.subtitle}>{subtitle}</ThemedText>
        ) : null}
      </View>
      {children}
    </ScrollView>
  );
}

export function Card({ children }: { children: ReactNode }) {
  return <View style={styles.card}>{children}</View>;
}

export function Row({ children }: { children: ReactNode }) {
  return <View style={styles.row}>{children}</View>;
}

export function StatCard({
  label,
  value,
  tone = "neutral",
}: {
  label: string;
  value: string;
  tone?: "neutral" | "success" | "warning" | "danger";
}) {
  return (
    <View style={[styles.stat, styles[tone]]}>
      <ThemedText style={styles.statLabel}>{label}</ThemedText>
      <ThemedText style={styles.statValue}>{value}</ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#F6F8FB",
  },
  content: {
    gap: 16,
    padding: 16,
    paddingBottom: 40,
    width: "100%",
    maxWidth: 1180,
    alignSelf: "center",
  },
  header: {
    gap: 4,
    paddingTop: 8,
  },
  kicker: {
    color: "#2563EB",
    fontSize: 12,
    fontWeight: "700",
    textTransform: "uppercase",
  },
  title: {
    color: "#111827",
    fontSize: 28,
    lineHeight: 34,
  },
  subtitle: {
    color: "#64748B",
    fontSize: 15,
    lineHeight: 22,
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderColor: "#E2E8F0",
    borderRadius: 8,
    borderWidth: 1,
    gap: 12,
    padding: 16,
  },
  row: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  stat: {
    borderRadius: 8,
    borderWidth: 1,
    flexGrow: 1,
    minWidth: 150,
    padding: 14,
  },
  neutral: {
    backgroundColor: "#F8FAFC",
    borderColor: "#E2E8F0",
  },
  success: {
    backgroundColor: "#ECFDF5",
    borderColor: "#BBF7D0",
  },
  warning: {
    backgroundColor: "#FFFBEB",
    borderColor: "#FDE68A",
  },
  danger: {
    backgroundColor: "#FEF2F2",
    borderColor: "#FECACA",
  },
  statLabel: {
    color: "#64748B",
    fontSize: 12,
    fontWeight: "600",
    textTransform: "uppercase",
  },
  statValue: {
    color: "#0F172A",
    fontSize: 22,
    fontWeight: "800",
    marginTop: 4,
  },
});

export const surfaceStyles = styles;