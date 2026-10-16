import { Colors } from "@/src/constants/theme";
import { useColorScheme } from "@/src/hooks/use-color-scheme";
import { usePermisos } from "@/src/hooks/usePermisos";
import { SelectorTema } from "@/src/modules/tema/components/SelectorTema";
import { ThemedText } from "@/src/shared/components/ThemedText";
import { AppModalProvider } from "@/src/shared/ui/AppModalNotification";
import { IconSymbol } from "@/src/shared/ui/IconSymbol";
import { Stack, usePathname, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { Modal, Pressable, ScrollView, StyleSheet, View } from "react-native";
import { useSesion } from "../../src/modules/usuarios/store/SesionContextZustand";

interface PantallaConfig {
  href: string;
  title: string;
  show: boolean;
  icon: string;
  seccion: string;
}

/**
 * Layout principal de navegación por pestañas/menú.
 * Reestructura dinámicamente las opciones visibles según los roles y la matriz
 * efectiva de permisos (consultar, crear, modificar, exportar) del usuario.
 */
export default function RootLayout() {
  const {
    usuarioActual,
    empresaActual,
    empresas,
    setEmpresaActual,
    cargandoSesionLocal,
  } = useSesion();
  const {
    tienePermiso,
    esSuperadministrador,
    esAdminGestoria,
    esAuditor,
    esRepresentanteLegal,
    esTrabajador,
    esRRHH,
    tipoRolActivo,
  } = usePermisos();

  const router = useRouter();
  const theme = useColorScheme();
  const colors = Colors[theme];
  const [menuVisible, setMenuVisible] = useState(false);
  const [selectorEmpresaVisible, setSelectorEmpresaVisible] = useState(false);
  const pathname = usePathname();

  const tieneSesion = usuarioActual !== null;
  // Los permisos de empresa pueden satisfacer consultas propias. El rol,
  // además del permiso, determina quién puede usar el portal de autoservicio.
  const puedeUsarPortalEmpleado = esTrabajador || esRRHH;
  const rutasPortalEmpleado = new Set([
    "fichar",
    "horarios",
    "incidencias",
    "ausencias",
    "trabajador",
  ]);

  useEffect(() => {
    const rutaActual = pathname.split("/").filter(Boolean).at(-1);
    if (
      !cargandoSesionLocal &&
      tieneSesion &&
      rutaActual &&
      rutasPortalEmpleado.has(rutaActual) &&
      !puedeUsarPortalEmpleado
    ) {
      router.replace("/(tabs)/perfil");
    }
  }, [
    cargandoSesionLocal,
    pathname,
    puedeUsarPortalEmpleado,
    router,
    tieneSesion,
  ]);

  // Catálogo integral de pantallas condicionadas por permisos efectivos
  const pantallasDisponibles: PantallaConfig[] = [
    // -------------------------------------------------------------
    // SECCIÓN 1: PORTAL DEL EMPLEADO (Self-Service)
    // -------------------------------------------------------------
    {
      href: "/(tabs)/fichar",
      title: "Fichar Entrada/Salida",
      // Exclusivo para quienes tienen permiso de registrar fichajes propios
      show:
        tieneSesion &&
        !esSuperadministrador &&
        puedeUsarPortalEmpleado &&
        tienePermiso("fichajes", "crear", "propio"),
      icon: "house.fill",
      seccion: "Portal del Empleado",
    },
    {
      href: "/(tabs)/horarios",
      title: "Mi Cuadrante y Horarios",
      show:
        tieneSesion &&
        !esSuperadministrador &&
        puedeUsarPortalEmpleado &&
        tienePermiso("asignaciones_turno", "consultar"),
      icon: "schedule",
      seccion: "Portal del Empleado",
    },
    {
      href: "/(tabs)/incidencias",
      title: "Mis Incidencias de Fichaje",
      show:
        tieneSesion &&
        !esSuperadministrador &&
        puedeUsarPortalEmpleado &&
        tienePermiso("correcciones_fichaje", "crear", "propio"),
      icon: "warning",
      seccion: "Portal del Empleado",
    },
    {
      href: "/(tabs)/ausencias",
      title: "Mis Ausencias y Vacaciones",
      show:
        tieneSesion &&
        !esSuperadministrador &&
        puedeUsarPortalEmpleado &&
        tienePermiso("ausencias", "crear", "propio"),
      icon: "event",
      seccion: "Portal del Empleado",
    },
    {
      href: "/(tabs)/trabajador",
      title: "Mi Expediente Laboral",
      show:
        tieneSesion &&
        !esSuperadministrador &&
        puedeUsarPortalEmpleado &&
        tienePermiso("trabajadores", "consultar", "propio"),
      icon: "person",
      seccion: "Portal del Empleado",
    },

    // -------------------------------------------------------------
    // SECCIÓN 2: GESTIÓN OPERATIVA Y RRHH
    // -------------------------------------------------------------
    {
      href: "/(tabs)/fichajes",
      title: "Registro de Fichajes",
      // Visible si puede consultar fichajes (alcance empresa o propio)
      show:
        tieneSesion &&
        // !esSuperadministrador &&
        tienePermiso("fichajes", "consultar"),
      icon: "folder",
      seccion: "Gestión y Supervisión",
    },
    {
      href: "/(tabs)/gestion-incidencias",
      title: "Gestión de Incidencias",
      // Requiere modificar a nivel de empresa o consultar para auditoría/inspección
      show:
        tieneSesion &&
        // !esSuperadministrador &&
        (tienePermiso("correcciones_fichaje", "modificar", "empresa") ||
          (tienePermiso("correcciones_fichaje", "consultar", "empresa") &&
            (esAuditor || esRepresentanteLegal))),
      icon: "warning",
      seccion: "Gestión y Supervisión",
    },
    {
      href: "/(tabs)/gestion-ausencias",
      title: "Gestión de Ausencias",
      // Requiere modificar a nivel de empresa o consultar para auditoría/inspección
      show:
        tieneSesion &&
        // !esSuperadministrador &&
        (tienePermiso("ausencias", "modificar", "empresa") ||
          (tienePermiso("ausencias", "consultar", "empresa") &&
            (esAuditor || esRepresentanteLegal))),
      icon: "event",
      seccion: "Gestión y Supervisión",
    },
    {
      href: "/(tabs)/empresa",
      title: "Estructura y Plantilla",
      // Visible para responsables con permisos de consulta en empresa, centros o trabajadores
      show:
        tieneSesion &&
        // !esSuperadministrador &&
        (tienePermiso("empresas", "consultar", "empresa") ||
          tienePermiso("trabajadores", "consultar", "empresa") ||
          tienePermiso("centros_trabajo", "consultar", "empresa")),
      icon: "briefcase.fill",
      seccion: "Gestión y Supervisión",
    },
    {
      href: "/(tabs)/licencias",
      title: "Licencia de Empresa",
      // Administradores y auditores consultan la suscripción del tenant
      show:
        tieneSesion &&
        // !esSuperadministrador &&
        tienePermiso("licencias", "consultar", "empresa"),
      icon: "key",
      seccion: "Gestión y Supervisión",
    },

    // -------------------------------------------------------------
    // SECCIÓN 3: PLATAFORMA SAAS (Superadministrador Global)
    // -------------------------------------------------------------
    {
      href: "/(tabs)/superadministracion/empresas",
      title: "Plataforma · Empresas",
      show: tieneSesion && tienePermiso("empresas", "consultar", "global"),
      icon: "briefcase.fill",
      seccion: "Administración Global SaaS",
    },
    {
      href: "/(tabs)/superadministracion/licencias",
      title: "Plataforma · Licencias",
      show: tieneSesion && tienePermiso("licencias", "consultar", "global"),
      icon: "key",
      seccion: "Administración Global SaaS",
    },
    {
      href: "/(tabs)/superadministracion/auditores",
      title: "Plataforma · Auditores ITSS",
      show:
        tieneSesion && tienePermiso("usuarios_empresas", "consultar", "global"),
      icon: "person.2",
      seccion: "Administración Global SaaS",
    },
    {
      href: "/(tabs)/superadministracion/auditoria",
      title: "Plataforma · Auditoría Accesos",
      show:
        tieneSesion && tienePermiso("auditoria_accesos", "consultar", "global"),
      icon: "doc.text.magnifyingglass",
      seccion: "Administración Global SaaS",
    },
    {
      href: "/(tabs)/superadministracion/informes",
      title: "Plataforma · Informes Globales",
      show:
        tieneSesion && tienePermiso("resumenes_jornada", "consultar", "global"),
      icon: "chart.bar",
      seccion: "Administración Global SaaS",
    },

    // -------------------------------------------------------------
    // SECCIÓN 4: CUENTA Y PERFIL
    // -------------------------------------------------------------
    {
      href: "/(tabs)/perfil",
      title: "Mi Perfil y Seguridad",
      show: tieneSesion,
      icon: "person",
      seccion: "Cuenta",
    },
  ].filter((pantalla) => pantalla.show);

  // Agrupar pantallas por sección funcional
  const secciones = Array.from(
    new Set(pantallasDisponibles.map((p) => p.seccion)),
  );

  return (
    <AppModalProvider>
      <Stack
        screenOptions={{
          headerShown: tieneSesion,
          headerStyle: { backgroundColor: colors.card },
          headerTintColor: colors.text,
          headerTitleStyle: { fontWeight: "700", color: colors.text },
          headerRight: () =>
            tieneSesion ? (
              <Pressable
                onPress={() => setMenuVisible(true)}
                style={{ marginRight: 15, padding: 5 }}
                accessibilityRole="button"
                accessibilityLabel="Abrir menú de navegación y roles"
              >
                <IconSymbol size={26} name="menu" color={colors.primary} />
              </Pressable>
            ) : null,
        }}
      >
        <Stack.Screen name="fichar" options={{ title: "Fichar" }} />
        <Stack.Screen name="perfil" options={{ title: "Perfil y Cuenta" }} />
        <Stack.Screen
          name="empresa"
          options={{ title: "Estructura y Plantilla" }}
        />
        <Stack.Screen
          name="licencias"
          options={{ title: "Licencia de Empresa" }}
        />
        <Stack.Screen
          name="superadministracion"
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="horarios"
          options={{ title: "Cuadrante y Horarios" }}
        />
        <Stack.Screen
          name="fichajes"
          options={{ title: "Registro de Fichajes" }}
        />
        <Stack.Screen
          name="incidencias"
          options={{ title: "Mis Incidencias" }}
        />
        <Stack.Screen
          name="gestion-incidencias"
          options={{ title: "Gestión de Incidencias" }}
        />
        <Stack.Screen name="ausencias" options={{ title: "Mis Ausencias" }} />
        <Stack.Screen
          name="gestion-ausencias"
          options={{ title: "Gestión de Ausencias" }}
        />
      </Stack>

      {/* Modal interactivo de navegación por permisos y roles */}
      <Modal
        visible={menuVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setMenuVisible(false)}
      >
        <Pressable
          style={[styles.modalOverlay, { backgroundColor: colors.overlay }]}
          onPress={() => setMenuVisible(false)}
        >
          <View
            style={[
              styles.menuContainer,
              { backgroundColor: colors.card, borderColor: colors.border },
            ]}
          >
            {/* Cabecera del usuario con rol y empresa activa */}
            <View
              style={[
                styles.usuarioHeader,
                { borderBottomColor: colors.border },
              ]}
            >
              <ThemedText style={styles.usuarioNombre} numberOfLines={1}>
                {usuarioActual?.nombre ?? "Usuario"}
              </ThemedText>
              <View style={styles.badgeRol}>
                <ThemedText style={styles.badgeRolTexto}>
                  {tipoRolActivo ?? "Rol"}
                </ThemedText>
              </View>

              {/* Selector de empresa si es Gestoría o cuenta multi-empresa */}
              {empresaActual && (
                <Pressable
                  onPress={() => {
                    if (empresas.length > 1 || esAdminGestoria) {
                      setSelectorEmpresaVisible(true);
                    }
                  }}
                  style={styles.empresaSelectorBoton}
                >
                  <ThemedText
                    style={[styles.empresaTexto, { color: colors.primary }]}
                    numberOfLines={1}
                  >
                    🏢{" "}
                    {empresaActual.nombre_comercial ||
                      empresaActual.razon_social}
                    {(empresas.length > 1 || esAdminGestoria) && " ▾"}
                  </ThemedText>
                </Pressable>
              )}
            </View>

            {/* Selector de Tema */}
            <View style={{ paddingHorizontal: 12, paddingVertical: 4 }}>
              <SelectorTema />
            </View>

            {/* Lista agrupada de opciones disponibles según permisos */}
            <ScrollView
              style={{ maxHeight: 420 }}
              showsVerticalScrollIndicator={false}
            >
              {secciones.map((seccion) => (
                <View key={seccion} style={styles.seccionContenedor}>
                  <ThemedText
                    style={[
                      styles.seccionTitulo,
                      { color: colors.textSecondary },
                    ]}
                  >
                    {seccion.toUpperCase()}
                  </ThemedText>
                  {pantallasDisponibles
                    .filter((p) => p.seccion === seccion)
                    .map((pantalla) => (
                      <Pressable
                        key={pantalla.href}
                        style={styles.menuItem}
                        onPress={() => {
                          setMenuVisible(false);
                          router.push(pantalla.href as any);
                        }}
                      >
                        <IconSymbol
                          size={18}
                          name={pantalla.icon as any}
                          color={colors.primary}
                        />
                        <ThemedText style={styles.menuItemText}>
                          {pantalla.title}
                        </ThemedText>
                      </Pressable>
                    ))}
                </View>
              ))}
            </ScrollView>
          </View>
        </Pressable>
      </Modal>

      {/* Selector modal de empresas para administradores de gestoría o multi-empresa */}
      <Modal
        visible={selectorEmpresaVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setSelectorEmpresaVisible(false)}
      >
        <Pressable
          style={[styles.modalOverlay, { backgroundColor: colors.overlay }]}
          onPress={() => setSelectorEmpresaVisible(false)}
        >
          <View
            style={[
              styles.selectorModalContainer,
              { backgroundColor: colors.card, borderColor: colors.border },
            ]}
          >
            <ThemedText style={styles.selectorModalTitulo}>
              Seleccionar Empresa Cliente
            </ThemedText>
            <ScrollView style={{ maxHeight: 300 }}>
              {empresas.map((empresa) => {
                const seleccionada = empresaActual?.id === empresa.id;
                return (
                  <Pressable
                    key={empresa.id}
                    style={[
                      styles.empresaItem,
                      seleccionada && {
                        backgroundColor: colors.primary + "15",
                      },
                    ]}
                    onPress={() => {
                      setEmpresaActual(empresa);
                      setSelectorEmpresaVisible(false);
                    }}
                  >
                    <ThemedText
                      style={[
                        styles.empresaItemTexto,
                        seleccionada && {
                          color: colors.primary,
                          fontWeight: "700",
                        },
                      ]}
                    >
                      {empresa.nombre_comercial || empresa.razon_social}
                    </ThemedText>
                    {seleccionada && (
                      <ThemedText style={{ color: colors.primary }}>
                        ✓
                      </ThemedText>
                    )}
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>
        </Pressable>
      </Modal>
    </AppModalProvider>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    justifyContent: "flex-start",
    alignItems: "flex-end",
    paddingTop: 55,
    paddingRight: 12,
  },
  menuContainer: {
    borderRadius: 14,
    borderWidth: 1,
    width: 260,
    paddingVertical: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 5,
    elevation: 8,
  },
  usuarioHeader: {
    paddingHorizontal: 16,
    paddingBottom: 10,
    marginBottom: 6,
    borderBottomWidth: 1,
  },
  usuarioNombre: {
    fontSize: 15,
    fontWeight: "700",
  },
  badgeRol: {
    alignSelf: "flex-start",
    backgroundColor: "#2563EB20",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    marginTop: 4,
  },
  badgeRolTexto: {
    fontSize: 11,
    fontWeight: "700",
    color: "#2563EB",
  },
  empresaSelectorBoton: {
    marginTop: 6,
    paddingVertical: 2,
  },
  empresaTexto: {
    fontSize: 12,
    fontWeight: "600",
  },
  seccionContenedor: {
    paddingVertical: 6,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "#E2E8F040",
  },
  seccionTitulo: {
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.8,
    paddingHorizontal: 16,
    paddingVertical: 4,
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
    paddingHorizontal: 16,
    gap: 12,
  },
  menuItemText: {
    fontSize: 13,
    fontWeight: "500",
  },
  selectorModalContainer: {
    width: 280,
    borderRadius: 14,
    borderWidth: 1,
    padding: 16,
    marginTop: 100,
    alignSelf: "center",
  },
  selectorModalTitulo: {
    fontSize: 14,
    fontWeight: "700",
    marginBottom: 12,
  },
  empresaItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginVertical: 2,
  },
  empresaItemTexto: {
    fontSize: 13,
  },
});
