import { ReactNode } from "react";
import { ActivityIndicator, Pressable, StyleSheet, View } from "react-native";
import { AppScreen, Card, Row } from "@/src/shared/ui/AppSurface";
import { ThemedText } from "@/src/shared/components/ThemedText";

export function PlataformaScreen({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
}) {
  return <AppScreen title={title} subtitle={subtitle}>{children}</AppScreen>;
}

export function PlataformaCard({
  title,
  detail,
  onPress,
}: {
  title: string;
  detail?: string;
  onPress?: () => void;
}) {
  const content = (
    <Card>
      <ThemedText style={styles.cardTitle}>{title}</ThemedText>
      {detail ? <ThemedText style={styles.detail}>{detail}</ThemedText> : null}
    </Card>
  );
  return onPress ? (
    <Pressable accessibilityRole="button" onPress={onPress} style={styles.action}>
      {content}
    </Pressable>
  ) : content;
}

export function PlataformaMetrica({ label, value }: { label: string; value: string | number }) {
  return (
    <View style={styles.metric}>
      <ThemedText style={styles.metricLabel}>{label}</ThemedText>
      <ThemedText style={styles.metricValue}>{value}</ThemedText>
    </View>
  );
}

export function EstadoCarga({ cargando, error, onRetry }: { cargando: boolean; error?: string | null; onRetry?: () => void }) {
  if (cargando) return <ActivityIndicator size="large" />;
  if (!error) return null;
  return (
    <Card>
      <ThemedText>{error}</ThemedText>
      {onRetry ? <Pressable onPress={onRetry} style={styles.retry}><ThemedText style={styles.retryText}>Reintentar</ThemedText></Pressable> : null}
    </Card>
  );
}

export function PlataformaSection({ title, children }: { title: string; children: ReactNode }) {
  return <View style={styles.section}><ThemedText style={styles.sectionTitle}>{title}</ThemedText>{children}</View>;
}

export function PlataformaGrid({ children }: { children: ReactNode }) {
  return <Row>{children}</Row>;
}

const styles = StyleSheet.create({
  action: { flexGrow: 1, flexBasis: 230 },
  cardTitle: { fontSize: 16, fontWeight: "700" },
  detail: { lineHeight: 21, opacity: 0.78 },
  metric: { flexGrow: 1, flexBasis: 155, padding: 16, borderRadius: 10, backgroundColor: "#EFF6FF", gap: 7 },
  metricLabel: { fontSize: 12, opacity: 0.72, textTransform: "uppercase" },
  metricValue: { fontSize: 26, fontWeight: "800", color: "#1D4ED8" },
  section: { gap: 10, marginTop: 8 },
  sectionTitle: { fontSize: 19, fontWeight: "800" },
  retry: { alignSelf: "flex-start", padding: 10 },
  retryText: { fontWeight: "700", color: "#2563EB" },
});
