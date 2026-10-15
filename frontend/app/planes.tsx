import { useEffect, useMemo, useState } from "react";
import { useRouter } from "expo-router";
import * as Crypto from "expo-crypto";
import * as WebBrowser from "expo-web-browser";
import { ActivityIndicator, Platform, Pressable, StyleSheet, TextInput, View } from "react-native";
import { AppScreen, Card } from "@/src/shared/ui/AppSurface";
import { ThemedText } from "@/src/shared/components/ThemedText";
import { PlanLicenciaEnum } from "@/src/constants/enums";
import { crearSesionCompra, obtenerPreciosComerciales, PrecioPlanComercial } from "@/src/modules/licencias/api/services";

const planes = [
  { nombre: "Prueba", descripcion: "Prueba gratuita para conocer Fichapp con una empresa.", caracteristicas: ["Registro horario", "Aplicación web y móvil", "Informes de jornada"], destacado: false },
  { nombre: PlanLicenciaEnum.BASICO, descripcion: "Las funciones esenciales para gestionar el registro horario.", caracteristicas: ["Registro horario", "Informes de jornada", "Gestión de trabajadores"], destacado: false },
  { nombre: PlanLicenciaEnum.PRO, descripcion: "Más herramientas para organizar equipos y su actividad.", caracteristicas: ["Todo lo de Básico", "Vacaciones y ausencias", "Turnos y soporte prioritario"], destacado: true },
  { nombre: PlanLicenciaEnum.ENTERPRISE, descripcion: "Una configuración para organizaciones con necesidades avanzadas.", caracteristicas: ["Todo lo de Pro", "Integraciones empresariales", "Opciones avanzadas"], destacado: false },
];

function mostrarPrecio(precio: PrecioPlanComercial): string {
  if (precio.importe_menor_unidad == null) return "Precio no disponible";
  const decimales = new Intl.NumberFormat("es-ES", {
    style: "currency",
    currency: precio.moneda,
  }).resolvedOptions().maximumFractionDigits ?? 2;
  return new Intl.NumberFormat("es-ES", {
    style: "currency",
    currency: precio.moneda,
  }).format(precio.importe_menor_unidad / 10 ** decimales);
}

export default function PlanesScreen() {
  const router = useRouter();
  const [precios, setPrecios] = useState<PrecioPlanComercial[]>([]);
  const [ciclo, setCiclo] = useState<"Mensual" | "Anual">("Mensual");
  const [email, setEmail] = useState("");
  const [cargandoPrecios, setCargandoPrecios] = useState(true);
  const [compraEnCurso, setCompraEnCurso] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let activo = true;
    obtenerPreciosComerciales()
      .then((resultado) => { if (activo) setPrecios(resultado); })
      .catch((e: Error) => { if (activo) setError(e.message); })
      .finally(() => { if (activo) setCargandoPrecios(false); });
    return () => { activo = false; };
  }, []);

  const preciosPorPlan = useMemo(
    () => new Map(precios.filter((precio) => precio.ciclo === ciclo).map((precio) => [precio.plan, precio])),
    [precios, ciclo],
  );

  async function comprar(plan: PrecioPlanComercial["plan"]) {
    if (!email.trim()) {
      setError("Introduce el correo electrónico que usarás para registrar la empresa.");
      return;
    }
    setCompraEnCurso(true);
    setError(null);
    try {
      const sesion = await crearSesionCompra({
        email: email.trim().toLowerCase(),
        plan,
        ciclo,
        clave_idempotencia: Crypto.randomUUID(),
      });
      if (Platform.OS === "web") window.location.assign(sesion.url);
      else {
        await WebBrowser.openBrowserAsync(sesion.url);
        setCompraEnCurso(false);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo iniciar la compra.");
      setCompraEnCurso(false);
    }
  }

  return (
    <AppScreen title="Planes de Fichapp" subtitle="Elige cómo empezar a gestionar la jornada de tu equipo.">
      <View style={styles.lista}>
        <View style={styles.ciclos}>
          {(["Mensual", "Anual"] as const).map((opcion) => (
            <Pressable key={opcion} accessibilityRole="button" accessibilityState={{ selected: ciclo === opcion }} onPress={() => setCiclo(opcion)} style={[styles.selectorCiclo, ciclo === opcion && styles.selectorActivo]}>
              <ThemedText style={ciclo === opcion ? styles.textoActivo : undefined}>{opcion}</ThemedText>
            </Pressable>
          ))}
        </View>
        <ThemedText style={styles.label}>Correo para la compra</ThemedText>
        <TextInput value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" autoComplete="email" editable={!compraEnCurso} placeholder="admin@empresa.com" style={styles.input} />
        {cargandoPrecios && <ActivityIndicator accessibilityLabel="Cargando precios" />}
        {planes.map((plan) => {
          const precio = plan.nombre === "Prueba" ? undefined : preciosPorPlan.get(plan.nombre as PrecioPlanComercial["plan"]);
          return (
            <Card key={plan.nombre}>
              <View style={styles.cabecera}>
                <View style={styles.tituloPlan}>
                  <ThemedText style={styles.nombre}>{plan.nombre}</ThemedText>
                  <ThemedText style={styles.ciclo}>{plan.nombre === "Prueba" ? "14 días" : ciclo}</ThemedText>
                </View>
                <ThemedText style={styles.precio}>{plan.nombre === "Prueba" ? "Gratis" : precio ? `${mostrarPrecio(precio)} / ${ciclo === "Mensual" ? "mes" : "año"}` : "No disponible"}</ThemedText>
              </View>
              <ThemedText style={styles.descripcion}>{plan.descripcion}</ThemedText>
              {plan.caracteristicas.map((caracteristica) => <ThemedText key={caracteristica} style={styles.caracteristica}>✓ {caracteristica}</ThemedText>)}
              {plan.nombre === "Prueba" ? (
                <Pressable accessibilityRole="button" onPress={() => router.push({ pathname: "/(authentication)/registro-empresa", params: { prueba: "1" } })} style={styles.boton}>
                  <ThemedText style={styles.textoBoton}>Empezar prueba gratuita</ThemedText>
                </Pressable>
              ) : (
                <Pressable accessibilityRole="button" disabled={!precio || compraEnCurso} onPress={() => precio && void comprar(precio.plan)} style={[styles.boton, plan.destacado && styles.botonDestacado, (!precio || compraEnCurso) && styles.botonDeshabilitado]}>
                  <ThemedText style={styles.textoBoton}>{compraEnCurso ? "Abriendo pago…" : precio ? `Comprar plan ${ciclo.toLowerCase()}` : "Próximamente"}</ThemedText>
                </Pressable>
              )}
            </Card>
          );
        })}
        {error && <ThemedText accessibilityRole="alert" style={styles.error}>{error}</ThemedText>}
      </View>
      <ThemedText style={styles.nota}>El pago se procesa en Stripe. El importe y el tratamiento fiscal dependen del precio y de la configuración fiscal del vendedor. La suscripción se renueva según el ciclo elegido.</ThemedText>
      <Pressable accessibilityRole="link" onPress={() => router.push("/")} style={styles.enlace}><ThemedText>¿Ya tienes una cuenta? Inicia sesión</ThemedText></Pressable>
      <ThemedText style={styles.distribucion}>La descarga APK y los enlaces de Google Play y App Store se mostrarán cuando estén publicados.</ThemedText>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  lista: { gap: 16, width: "100%", maxWidth: 920, alignSelf: "center" },
  ciclos: { flexDirection: "row", gap: 8, alignSelf: "center", marginBottom: 8 },
  selectorCiclo: { paddingVertical: 10, paddingHorizontal: 20, borderWidth: 1, borderColor: "#CBD5E1", borderRadius: 10 },
  selectorActivo: { backgroundColor: "#1D4ED8", borderColor: "#1D4ED8" },
  textoActivo: { color: "#FFFFFF", fontWeight: "700" },
  label: { fontWeight: "700" },
  input: { width: "100%", borderColor: "#CBD5E1", borderWidth: 1, borderRadius: 10, padding: 12, color: "#0F172A", backgroundColor: "#FFFFFF" },
  cabecera: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", gap: 12 },
  tituloPlan: { flexShrink: 1 },
  nombre: { fontSize: 21, fontWeight: "800" },
  ciclo: { opacity: 0.7, marginTop: 4 },
  precio: { fontSize: 18, fontWeight: "700", textAlign: "right", flexShrink: 1 },
  descripcion: { marginTop: 14, marginBottom: 10, lineHeight: 22 },
  caracteristica: { marginTop: 7 },
  boton: { marginTop: 18, borderRadius: 10, padding: 13, alignItems: "center", backgroundColor: "#1D4ED8" },
  botonDestacado: { backgroundColor: "#0F766E" },
  botonDeshabilitado: { opacity: 0.55 },
  textoBoton: { color: "#FFFFFF", fontWeight: "700" },
  error: { color: "#B91C1C", lineHeight: 21 },
  nota: { maxWidth: 920, alignSelf: "center", marginTop: 18, lineHeight: 21, opacity: 0.7 },
  enlace: { alignSelf: "center", padding: 14, marginTop: 8 },
  distribucion: { textAlign: "center", opacity: 0.65, marginTop: 8, marginBottom: 20 },
});
