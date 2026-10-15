import { useCallback, useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, View } from "react-native";
import { useRouter } from "expo-router";
import { TipoRolEnum } from "@/src/constants/enums";
import { obtenerLicencias } from "@/src/modules/licencias/api/services";
import { Licencia } from "@/src/modules/licencias/types/licencia";
import { obtenerEmpresas } from "@/src/modules/empresas/api/services";
import { Empresa } from "@/src/modules/empresas/types/empresa";
import { obtenerAutorizacionesGestorias } from "@/src/modules/gestorias-empresas/api/services";
import { GestoriaEmpresaResponse } from "@/src/modules/gestorias-empresas/types/gestoria-empresa";
import { useSesion } from "@/src/modules/usuarios/store/SesionContextZustand";
import { ThemedText } from "@/src/shared/components/ThemedText";
import { AppScreen, Card } from "@/src/shared/ui/AppSurface";

type Resumen = {
  licencias: Licencia[];
  empresas: Empresa[];
  relacionesGestoria: GestoriaEmpresaResponse[];
};

export default function SuperadministracionScreen() {
  const router = useRouter();
  const { usuarioActual, rolActual } = useSesion();
  const esSuperadministrador =
    rolActual === TipoRolEnum.SUPERADMINISTRADOR ||
    usuarioActual?.tipo_usuario === TipoRolEnum.SUPERADMINISTRADOR;
  const [resumen, setResumen] = useState<Resumen>({
    licencias: [],
    empresas: [],
    relacionesGestoria: [],
  });
  const [cargando, setCargando] = useState(true);
  const [errorCarga, setErrorCarga] = useState(false);

  const cargar = useCallback(async () => {
    setCargando(true);
    setErrorCarga(false);
    const [licencias, empresas, relacionesGestoria] = await Promise.allSettled([
      obtenerLicencias(),
      obtenerEmpresas(),
      obtenerAutorizacionesGestorias(),
    ]);
    setResumen({
      licencias: licencias.status === "fulfilled" ? licencias.value : [],
      empresas: empresas.status === "fulfilled" ? empresas.value : [],
      relacionesGestoria:
        relacionesGestoria.status === "fulfilled" ? relacionesGestoria.value : [],
    });
    setErrorCarga(
      licencias.status === "rejected" ||
        empresas.status === "rejected" ||
        relacionesGestoria.status === "rejected",
    );
    setCargando(false);
  }, []);

  useEffect(() => {
    if (esSuperadministrador) void cargar();
    else setCargando(false);
  }, [cargar, esSuperadministrador]);

  const licenciasActivas = useMemo(
    () => resumen.licencias.filter((licencia) => licencia.estado === "Activa" || licencia.estado === "Trialing").length,
    [resumen.licencias],
  );

  if (!esSuperadministrador) {
    return (
      <AppScreen title="Consola de plataforma">
        <Card><ThemedText>Esta consola está reservada al superadministrador global.</ThemedText></Card>
      </AppScreen>
    );
  }

  return (
    <AppScreen title="Consola de plataforma" subtitle="Operación global de Fichapp">
      {cargando ? (
        <ActivityIndicator size="large" />
      ) : (
        <>
          <View style={styles.metricas}>
            <Metrica titulo="Empresas visibles" valor={String(resumen.empresas.length)} />
            <Metrica titulo="Licencias" valor={String(resumen.licencias.length)} />
            <Metrica titulo="Activas o en prueba" valor={String(licenciasActivas)} />
            <Metrica titulo="Relaciones de gestoría" valor={String(resumen.relacionesGestoria.length)} />
          </View>

          {errorCarga && (
            <Card>
              <ThemedText>
                Algunos indicadores no se pudieron cargar con los permisos o endpoints disponibles. Puedes reintentar.
              </ThemedText>
              <Pressable onPress={() => void cargar()} style={styles.botonSecundario}>
                <ThemedText style={styles.textoAccion}>Reintentar</ThemedText>
              </Pressable>
            </Card>
          )}

          <ThemedText style={styles.encabezado}>Administración</ThemedText>
          <View style={styles.acciones}>
            <Accion titulo="Licencias" detalle="Emitir, consultar y revocar códigos" onPress={() => router.push("/licencias")} />
            <Accion titulo="Empresas" detalle="Consultar las empresas disponibles para esta cuenta" onPress={() => router.push("/empresa")} />
            <Accion titulo="Gestión de jornada" detalle="Consultar fichajes, ausencias e incidencias" onPress={() => router.push("/fichajes")} />
          </View>

          <ThemedText style={styles.encabezado}>Cobertura actual</ThemedText>
          <Card>
            <ThemedText style={styles.tituloCard}>Lo que ya permite esta consola</ThemedText>
            <ThemedText style={styles.textoCuerpo}>
              La API disponible permite consultar empresas y relaciones de gestoría, y administrar licencias mediante sus endpoints actuales.
            </ThemedText>
            <ThemedText style={styles.textoCuerpo}>
              La compra con pago automático, los informes exportables globales y la administración central de usuarios, auditores, permisos y todos los datos de cada empresa requieren endpoints y flujos de backend adicionales.
            </ThemedText>
          </Card>
        </>
      )}
    </AppScreen>
  );
}

function Metrica({ titulo, valor }: { titulo: string; valor: string }) {
  return (
    <Card>
      <ThemedText style={styles.tituloMetrica}>{titulo}</ThemedText>
      <ThemedText style={styles.valorMetrica}>{valor}</ThemedText>
    </Card>
  );
}

function Accion({ titulo, detalle, onPress }: { titulo: string; detalle: string; onPress: () => void }) {
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={styles.accion}>
      <Card>
        <ThemedText style={styles.tituloCard}>{titulo}</ThemedText>
        <ThemedText style={styles.textoCuerpo}>{detalle}</ThemedText>
      </Card>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  metricas: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  tituloMetrica: { fontSize: 13, opacity: 0.75 },
  valorMetrica: { fontSize: 26, fontWeight: "800", marginTop: 6 },
  encabezado: { fontSize: 19, fontWeight: "800", marginTop: 24, marginBottom: 10 },
  acciones: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  accion: { flexGrow: 1, flexBasis: 220 },
  tituloCard: { fontSize: 16, fontWeight: "700", marginBottom: 8 },
  textoCuerpo: { lineHeight: 21, marginTop: 6, opacity: 0.82 },
  botonSecundario: { marginTop: 12, alignSelf: "flex-start", padding: 10, borderRadius: 8, backgroundColor: "#E2E8F0" },
  textoAccion: { fontWeight: "700" },
});
