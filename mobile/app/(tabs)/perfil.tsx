import { obtenerCentrosPorEmpresa } from "@/src/modules/centros-trabajo/api/services";
import { CentroTrabajo } from "@/src/modules/centros-trabajo/types/centro-trabajo";
import { Empresa } from "@/src/modules/empresas/types/empresa";
import { TipoUsuarioEnum } from "@/src/modules/usuarios/types/usuario";
import { setAuthToken } from "@/src/service/api/api";
import React, { useEffect, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, View } from "react-native";
import Animated, {
    useAnimatedStyle,
    useSharedValue,
    withTiming,
} from "react-native-reanimated";
import { useSesion } from "../../src/modules/usuarios/store/SesionContext";
import { ThemedText } from "../../src/shared/components/themed-text";
import { AppScreen, Card, Row, StatCard } from "../../src/shared/ui/AppSurface";
import { IconSymbol } from "../../src/shared/ui/icon-symbol";

export default function PerfilScreen() {
  const {
    usuarioActual,
    setUsuarioActual,
    trabajadorActual,
    empresas,
    setEmpresas,
    empresaSeleccionada,
    setEmpresaSeleccionada,
    contratoActual,
    centroTrabajoActual,
    setCentroTrabajoActual,
  } = useSesion();

  const esAdminGestoria =
    usuarioActual?.tipo_usuario === TipoUsuarioEnum.ADMIN_GESTORIA;
  const esAdminEmpresa =
    usuarioActual?.tipo_usuario === TipoUsuarioEnum.ADMIN_EMPRESA;
  const esAdmin = esAdminGestoria || esAdminEmpresa;

  const [cargandoCentros, setCargandoCentros] = useState(false);
  const [centrosDisponibles, setCentrosDisponibles] = useState<CentroTrabajo[]>(
    [],
  );

  const opacidadTarjeta = useSharedValue(0);

  useEffect(() => {
    opacidadTarjeta.value = 0;
    opacidadTarjeta.value = withTiming(1, { duration: 500 });
  }, [opacidadTarjeta]);

  // CARGA REACTIVA DE CENTROS AL CAMBIAR DE EMPRESA
  useEffect(() => {
    let isMounted = true;

    const cargarCentrosDeLaEmpresa = async () => {
      if (!empresaSeleccionada?.id) {
        if (isMounted) {
          setCentrosDisponibles([]);
          setCentroTrabajoActual(null);
        }
        return;
      }

      try {
        if (isMounted) setCargandoCentros(true);
        const centros = await obtenerCentrosPorEmpresa(empresaSeleccionada.id);

        if (!isMounted) return;

        setCentrosDisponibles(centros ?? []);

        if (centros && centros.length > 0) {
          if (
            !centroTrabajoActual ||
            centroTrabajoActual.empresa_id !== empresaSeleccionada.id
          ) {
            setCentroTrabajoActual(centros[0]);
          }
        } else {
          setCentroTrabajoActual(null);
        }
      } catch (err) {
        console.error("Error al cargar centros de trabajo:", err);
      } finally {
        if (isMounted) setCargandoCentros(false);
      }
    };

    cargarCentrosDeLaEmpresa();

    return () => {
      isMounted = false;
    };
  }, [empresaSeleccionada?.id]);

  const handleLogout = async () => {
    setAuthToken("");
    setEmpresaSeleccionada(null);
    setCentroTrabajoActual(null);
    setCentrosDisponibles([]);
    setEmpresas([]);
    setUsuarioActual(null);
  };

  const estiloTarjetaAnimada = useAnimatedStyle(() => {
    return {
      opacity: opacidadTarjeta.value,
      transform: [
        {
          translateY: withTiming(
            opacidadTarjeta.value * 0 + (1 - opacidadTarjeta.value) * 40,
          ),
        },
      ],
    };
  });

  const puedeCambiarEmpresa =
    esAdminGestoria && empresas && empresas.length > 1 && !!empresaSeleccionada;

  const renderEmpresaSelection = () => {
    return (
      <View style={styles.selectorContainer}>
        <ThemedText style={styles.detailLabel}>
          {puedeCambiarEmpresa ? "Cambiar de Empresa" : "Empresa vinculada"}
        </ThemedText>
        <View style={styles.pickerWrapper}>
          {puedeCambiarEmpresa ? (
            empresas.map((emp: Empresa) => {
              const estaSeleccionada = empresaSeleccionada?.id === emp.id;
              return (
                <Pressable
                  key={emp.id}
                  style={[
                    styles.selectorItem,
                    estaSeleccionada && styles.selectorItemActivo,
                  ]}
                  onPress={() => {
                    if (empresaSeleccionada?.id !== emp.id) {
                      setEmpresaSeleccionada(emp);
                    }
                  }}
                >
                  <ThemedText
                    style={[
                      styles.selectorItemText,
                      estaSeleccionada && styles.selectorItemTextActivo,
                    ]}
                  >
                    {emp.nombre_comercial}
                  </ThemedText>
                </Pressable>
              );
            })
          ) : (
            <ThemedText style={styles.selectorSingleText}>
              {empresaSeleccionada?.nombre_comercial ??
                "No hay empresa vinculada"}
            </ThemedText>
          )}
        </View>
      </View>
    );
  };

  if (usuarioActual && esAdmin) {
    return (
      <AppScreen title="Panel de Gestión">
        <Row>
          <StatCard
            label="Rol de Sistema"
            value={usuarioActual.tipo_usuario
              .toString()
              .replace("_", " ")
              .toUpperCase()}
          />
        </Row>

        <Animated.View
          style={[estiloTarjetaAnimada, { gap: 16, paddingBottom: 30 }]}
        >
          <Card>
            <View style={styles.seccionPerfilHeader}>
              <IconSymbol name="business" size={20} color="#EA580C" />
              <ThemedText style={[styles.perfilTitle, { color: "#EA580C" }]}>
                Mi Empresa Activa
              </ThemedText>
            </View>
            <View style={styles.separadorPerfil} />
            <View style={styles.detailGrid}>
              {renderEmpresaSelection()}
              <Detail
                label="CIF / NIF"
                value={empresaSeleccionada?.cif ?? "No disponible"}
              />
              <Detail
                label="Zona Horaria"
                value={empresaSeleccionada?.zona_horaria ?? "Europe/Madrid"}
              />
            </View>
          </Card>

          <Card>
            <View style={styles.seccionPerfilHeader}>
              <IconSymbol name="manage-accounts" size={20} color="#475569" />
              <ThemedText style={[styles.perfilTitle, { color: "#475569" }]}>
                Seguridad y Cuenta
              </ThemedText>
            </View>
            <View style={styles.separadorPerfil} />
            <View style={styles.detailGrid}>
              <Detail label="Correo Electrónico" value={usuarioActual.email} />
              <Detail
                label="Último Acceso"
                value={
                  usuarioActual.ultimo_acceso
                    ? usuarioActual.ultimo_acceso
                        .replace("T", " a las ")
                        .substring(0, 22)
                        .concat(" hs")
                    : "Sesión Actual"
                }
              />
            </View>
          </Card>

          <Pressable style={styles.logoutButton} onPress={handleLogout}>
            <IconSymbol name="logout" size={18} color="#FFFFFF" />
            <ThemedText style={styles.logoutButtonText}>
              Cerrar Sesión
            </ThemedText>
          </Pressable>
        </Animated.View>
      </AppScreen>
    );
  }

  return (
    <AppScreen title="Mi Perfil">
      <Row>
        <StatCard
          label="Estado"
          value={usuarioActual?.activo ? "Activo" : "Inactivo"}
          tone={usuarioActual?.activo ? "success" : "danger"}
        />
        <StatCard
          label="Empresa Activa"
          value={empresaSeleccionada?.nombre_comercial ?? "Sin Asignar"}
        />
      </Row>

      <Animated.View
        style={[estiloTarjetaAnimada, { gap: 16, paddingBottom: 30 }]}
      >
        <Card>
          <View style={styles.seccionPerfilHeader}>
            <IconSymbol name="person" size={20} color="#2563EB" />
            <ThemedText style={styles.perfilTitle}>
              Información Personal
            </ThemedText>
          </View>
          <View style={styles.separadorPerfil} />
          <View style={styles.detailGrid}>
            <Detail
              label="Nombre Completo"
              value={`${trabajadorActual?.nombre ?? ""} ${trabajadorActual?.apellidos ?? ""}`}
            />
            <Detail
              label="Documento (NIF/NIE)"
              value={trabajadorActual?.nif_nie ?? "-"}
            />
            <Detail
              label="Número Seguridad Social"
              value={
                trabajadorActual?.numero_seguridad_social ?? "No cumplimentado"
              }
            />
            <Detail
              label="Teléfono Móvil"
              value={trabajadorActual?.telefono ?? "No registrado"}
            />
          </View>
        </Card>

        <Card>
          <View style={styles.seccionPerfilHeader}>
            <IconSymbol name="description" size={20} color="#16A34A" />
            <ThemedText style={[styles.perfilTitle, { color: "#16A34A" }]}>
              Condiciones Contractuales
            </ThemedText>
          </View>
          <View style={styles.separadorPerfil} />
          <View style={styles.detailGrid}>
            <Detail
              label="Puesto de Trabajo"
              value={contratoActual?.puesto_trabajo ?? "Operario / No Definido"}
            />
            <Detail
              label="Tipo de Contrato"
              value={contratoActual?.tipo_contrato ?? "Régimen General"}
            />
            <Detail
              label="Fecha Alta Contrato"
              value={
                contratoActual?.fecha_inicio ??
                trabajadorActual?.fecha_alta_empresa ??
                "No consta"
              }
            />
            <Detail
              label="Vencimiento / Fin"
              value={contratoActual?.fecha_fin ?? "Indefinido / Continuo"}
            />
            <Detail
              label="Jornada Semanal"
              value={
                contratoActual?.horas_semana
                  ? `${contratoActual.horas_semana.toString().substring(0, 2)} hs/semana`
                  : "Según Convenio Colectivo"
              }
            />
          </View>
        </Card>

        <Card>
          <View style={styles.seccionPerfilHeader}>
            <IconSymbol name="business" size={20} color="#EA580C" />
            <ThemedText style={[styles.perfilTitle, { color: "#EA580C" }]}>
              Organización y Centro de Fichaje
            </ThemedText>
          </View>
          <View style={styles.separadorPerfil} />

          <View style={styles.detailGrid}>
            <View style={styles.selectorContainer}>
              <ThemedText style={styles.detailLabel}>
                {empresas && empresas.length > 1
                  ? "Cambiar de Empresa"
                  : "Empresa vinculada"}
              </ThemedText>
              {empresas && empresas.length > 1 ? (
                <View style={styles.pickerWrapper}>
                  {empresas.map((emp: Empresa) => (
                    <Pressable
                      key={emp.id}
                      style={[
                        styles.selectorItem,
                        empresaSeleccionada?.id === emp.id &&
                          styles.selectorItemActivo,
                      ]}
                      onPress={() => {
                        if (empresaSeleccionada?.id !== emp.id) {
                          setEmpresaSeleccionada(emp);
                        }
                      }}
                    >
                      <ThemedText
                        style={[
                          styles.selectorItemText,
                          empresaSeleccionada?.id === emp.id &&
                            styles.selectorItemTextActivo,
                        ]}
                      >
                        {emp.nombre_comercial}
                      </ThemedText>
                    </Pressable>
                  ))}
                </View>
              ) : (
                <View style={styles.pickerWrapper}>
                  <ThemedText style={styles.selectorSingleText}>
                    {empresaSeleccionada?.nombre_comercial ??
                      "No hay empresa vinculada"}
                  </ThemedText>
                </View>
              )}
            </View>

            <View style={styles.selectorContainer}>
              <ThemedText style={styles.detailLabel}>
                Seleccionar Sede / Centro
              </ThemedText>
              {cargandoCentros ? (
                <ActivityIndicator
                  size="small"
                  color="#EA580C"
                  style={{ marginVertical: 10 }}
                />
              ) : (
                <View style={styles.pickerWrapperHorizontal}>
                  {centrosDisponibles && centrosDisponibles.length > 0 ? (
                    centrosDisponibles.map((centro: CentroTrabajo) => (
                      <Pressable
                        key={centro.id}
                        style={[
                          styles.chipCentro,
                          centroTrabajoActual?.id === centro.id &&
                            styles.chipCentroActivo,
                        ]}
                        onPress={() => {
                          if (centroTrabajoActual?.id !== centro.id) {
                            setCentroTrabajoActual(centro);
                          }
                        }}
                      >
                        <ThemedText
                          style={[
                            styles.chipCentroText,
                            centroTrabajoActual?.id === centro.id &&
                              styles.chipCentroTextActivo,
                          ]}
                        >
                          {centro.nombre}
                        </ThemedText>
                      </Pressable>
                    ))
                  ) : (
                    <ThemedText style={styles.detailValue}>
                      No hay centros configurados para esta empresa
                    </ThemedText>
                  )}
                </View>
              )}
            </View>

            <View style={styles.zonaHorariaCard}>
              <IconSymbol name="schedule" size={16} color="#475569" />
              <ThemedText style={styles.zonaHorariaTexto}>
                Zona Horaria de Registro:{" "}
                <ThemedText style={{ fontWeight: "700", color: "#0F172A" }}>
                  {centroTrabajoActual?.zona_horaria ?? "Europe/Madrid"}
                </ThemedText>
              </ThemedText>
            </View>

            <Detail
              label="Dirección de la Sede"
              value={centroTrabajoActual?.direccion ?? "No registrada"}
            />
            <Detail
              label="CIF / NIF Empresa"
              value={empresaSeleccionada?.cif ?? "No disponible"}
            />
          </View>
        </Card>

        <Card>
          <View style={styles.seccionPerfilHeader}>
            <IconSymbol name="manage-accounts" size={20} color="#475569" />
            <ThemedText style={[styles.perfilTitle, { color: "#475569" }]}>
              Seguridad y Cuenta
            </ThemedText>
          </View>
          <View style={styles.separadorPerfil} />
          <View style={styles.detailGrid}>
            <Detail
              label="Correo Electrónico"
              value={usuarioActual?.email ?? ""}
            />
            <Detail
              label="Rol Autorizado Sistema"
              value={usuarioActual?.tipo_usuario.toString().toUpperCase() ?? ""}
            />
            <Detail
              label="Último Acceso Registrado"
              value={
                usuarioActual?.ultimo_acceso
                  ? usuarioActual.ultimo_acceso
                      .replace("T", " a las ")
                      .substring(0, 22)
                      .concat(" hs")
                  : "Sesión Actual"
              }
            />
          </View>
        </Card>

        <Pressable style={styles.logoutButton} onPress={handleLogout}>
          <IconSymbol name="logout" size={18} color="#FFFFFF" />
          <ThemedText style={styles.logoutButtonText}>Cerrar Sesión</ThemedText>
        </Pressable>
      </Animated.View>
    </AppScreen>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.detailRow}>
      <ThemedText style={styles.detailLabel}>{label}</ThemedText>
      <ThemedText style={styles.detailValue}>{value ?? "-"}</ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  perfilTitle: { color: "#2563EB", fontSize: 18, fontWeight: "800" },
  detailGrid: { gap: 12 },
  detailRow: {
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  detailLabel: {
    fontSize: 11,
    color: "#64748B",
    fontWeight: "700",
    textTransform: "uppercase",
  },
  detailValue: {
    fontSize: 15,
    color: "#0F172A",
    fontWeight: "500",
    marginTop: 2,
  },
  logoutButtonText: { color: "#FFFFFF", fontSize: 15, fontWeight: "700" },
  seccionPerfilHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    justifyContent: "center",
  },
  separadorPerfil: { height: 1, backgroundColor: "#E2E8F0", marginVertical: 6 },
  logoutButton: {
    backgroundColor: "#EF4444",
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
    paddingVertical: 14,
    borderRadius: 8,
    marginTop: 8,
  },
  selectorContainer: { marginVertical: 4 },
  pickerWrapper: { flexDirection: "column", gap: 6, marginTop: 6 },
  selectorSingleText: {
    color: "#334155",
    fontSize: 15,
    fontWeight: "600",
  },
  pickerWrapperHorizontal: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 6,
  },
  selectorItem: {
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    backgroundColor: "#F8FAFC",
  },
  selectorItemActivo: {
    borderColor: "#2563EB",
    backgroundColor: "#EFF6FF",
  },
  selectorItemText: {
    fontSize: 14,
    color: "#475569",
    fontWeight: "500",
  },
  selectorItemTextActivo: {
    color: "#1D4ED8",
    fontWeight: "700",
  },
  chipCentro: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    backgroundColor: "#F8FAFC",
  },
  chipCentroActivo: {
    borderColor: "#EA580C",
    backgroundColor: "#FFF7ED",
  },
  chipCentroText: {
    fontSize: 13,
    color: "#475569",
    fontWeight: "500",
  },
  chipCentroTextActivo: {
    color: "#C2410C",
    fontWeight: "700",
  },
  zonaHorariaCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F1F5F9",
    padding: 10,
    borderRadius: 8,
    gap: 8,
    marginVertical: 4,
  },
  zonaHorariaTexto: {
    fontSize: 13,
    color: "#475569",
  },
});
