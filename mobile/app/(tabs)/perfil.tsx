import { obtenerCentrosTrabajoPorEmpresa } from "@/src/modules/centros-trabajo/api/services";
import { CentroTrabajo } from "@/src/modules/centros-trabajo/types/centro-trabajo";
import { obtenerUrlLogo } from "@/src/modules/empresas/api/services";
import {
  actualizarFotoTrabajador,
  actualizarTrabajador,
  obtenerTrabajador,
} from "@/src/modules/trabajadores/api/services";
import { setAuthToken } from "@/src/service/api/api";
import { mostrarError, mostrarMensaje } from "@/src/utils/errorHandler";
import * as ImagePicker from "expo-image-picker";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Pressable,
  StyleSheet,
  TextInput,
  View,
} from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { useSesion } from "../../src/modules/usuarios/store/SesionContext";
import { ThemedText } from "../../src/shared/components/ThemedText";
import { AppScreen, Card, Row, StatCard } from "../../src/shared/ui/AppSurface";
import { IconSymbol } from "../../src/shared/ui/IconSymbol";

export default function PerfilScreen() {
  const {
    usuarioActual,
    setUsuarioActual,
    trabajadorActual,
    setTrabajadorActual,
    empresaActual,
    setEmpresaActual,
    contratoActual,
    centroTrabajoActual,
    setCentroTrabajoActual,
  } = useSesion();

  const esAdminGestoria = usuarioActual?.tipo_usuario === "Admin_gestoría";
  const esAdminEmpresa = usuarioActual?.tipo_usuario === "Admin_empresa";
  const esAdmin = esAdminGestoria || esAdminEmpresa;

  const [cargandoCentros, setCargandoCentros] = useState(false);
  const [centrosDisponibles, setCentrosDisponibles] = useState<CentroTrabajo[]>(
    [],
  );

  const [isEditing, setIsEditing] = useState(false);
  const [guardando, setGuardando] = useState(false);

  const [telefono, setTelefono] = useState(trabajadorActual?.telefono ?? "");
  const [nss, setNss] = useState(
    trabajadorActual?.numero_seguridad_social ?? "",
  );
  const [fotoUrl, setFotoUrl] = useState(trabajadorActual?.foto_url ?? "");
  const [nuevaFotoAsset, setNuevaFotoAsset] =
    useState<ImagePicker.ImagePickerAsset | null>(null);

  const opacidadTarjeta = useSharedValue(0);

  useEffect(() => {
    opacidadTarjeta.value = 0;
    opacidadTarjeta.value = withTiming(1, { duration: 500 });
  }, [opacidadTarjeta]);

  useEffect(() => {
    if (trabajadorActual) {
      setTelefono(trabajadorActual.telefono ?? "");
      setNss(trabajadorActual.numero_seguridad_social ?? "");
      setFotoUrl(trabajadorActual.foto_url ?? "");
      setNuevaFotoAsset(null);
    }
  }, [trabajadorActual]);

  useEffect(() => {
    let isMounted = true;

    const cargarCentrosDeLaEmpresa = async () => {
      if (!empresaActual?.id) {
        if (isMounted) {
          setCentrosDisponibles([]);
          setCentroTrabajoActual(null);
        }
        return;
      }

      try {
        if (isMounted) setCargandoCentros(true);
        const centros = await obtenerCentrosTrabajoPorEmpresa(empresaActual.id);

        if (!isMounted) return;

        setCentrosDisponibles(centros ?? []);

        if (centros && centros.length > 0) {
          if (
            !centroTrabajoActual ||
            centroTrabajoActual.empresa_id !== empresaActual.id
          ) {
            setCentroTrabajoActual(centros[0]);
          }
        } else {
          setCentroTrabajoActual(null);
        }
      } catch (error: any) {
        mostrarError(
          "Error al cargar los centros de trabajo de la empresa: " + error,
        );
      } finally {
        if (isMounted) setCargandoCentros(false);
      }
    };

    cargarCentrosDeLaEmpresa();

    return () => {
      isMounted = false;
    };
  }, [empresaActual?.id]);

  const handleCambiarFoto = async () => {
    if (!isEditing || !trabajadorActual) return;

    try {
      const permisoResult =
        await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permisoResult.granted) {
        mostrarMensaje(
          "Permiso denegado",
          "Se requiere permiso para acceder a la galería de fotos.",
        );
        return;
      }

      const resultado = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (
        !resultado.canceled &&
        resultado.assets &&
        resultado.assets.length > 0
      ) {
        const asset = resultado.assets[0];
        setNuevaFotoAsset(asset);
        setFotoUrl(asset.uri);
      }
    } catch (error: any) {
      mostrarError(
        "Error al seleccionar o procesar la imagen de perfil: " + error,
      );
    }
  };

  const handleSaveProfile = async () => {
    try {
      setGuardando(true);
      if (trabajadorActual) {
        let trabajadorActualizado = { ...trabajadorActual };

        if (nuevaFotoAsset) {
          const filename =
            nuevaFotoAsset.fileName ||
            nuevaFotoAsset.uri.split("/").pop() ||
            "foto.jpg";
          const match = /\.(\w+)$/.exec(filename);
          const type = match ? `image/${match[1]}` : `image/jpeg`;

          trabajadorActualizado = await actualizarFotoTrabajador(
            trabajadorActual.id,
            nuevaFotoAsset.uri,
            filename,
            type,
          );
        }

        const trabajadorActualizadoDatos = {
          ...trabajadorActualizado,
          telefono: telefono.trim() || undefined,
          numero_seguridad_social: nss.trim() || undefined,
        };

        await actualizarTrabajador(
          trabajadorActual.id,
          trabajadorActualizadoDatos,
        );

        const datosFrescos = await obtenerTrabajador(trabajadorActual.id);
        const cacheBustUrl = datosFrescos.foto_url
          ? `${datosFrescos.foto_url.split("?")[0]}?t=${Date.now()}`
          : "";

        setTrabajadorActual({
          ...datosFrescos,
          foto_url: cacheBustUrl,
        });
        setFotoUrl(cacheBustUrl);
        setNuevaFotoAsset(null);
        setIsEditing(false);

        mostrarMensaje("Éxito", "Perfil actualizado correctamente.");
      }
    } catch (error: any) {
      mostrarError("Error al guardar los cambios del perfil: " + error);
    } finally {
      setGuardando(false);
    }
  };

  const handleLogout = async () => {
    setAuthToken("");
    setEmpresaActual(null);
    setCentroTrabajoActual(null);
    setCentrosDisponibles([]);
    setUsuarioActual(null);
  };

  const estiloTarjetaAnimada = useAnimatedStyle(() => {
    return {
      opacity: opacidadTarjeta.value,
      transform: [
        {
          translateY:
            opacidadTarjeta.value * 0 + (1 - opacidadTarjeta.value) * 40,
        },
      ],
    };
  });

  // Mostrar el panel de gestión simplificado solo si es admin y NO tiene ficha de trabajador vinculada
  if (usuarioActual && esAdmin && !trabajadorActual) {
    return (
      <AppScreen title="Panel de Gestión">
        <Row>
          <StatCard
            label="Rol de Sistema"
            value={
              usuarioActual.tipo_usuario
                ? usuarioActual.tipo_usuario
                    .toString()
                    .replace("_", " ")
                    .toUpperCase()
                : "SIN ROL"
            }
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
              <View style={styles.selectorContainer}>
                <ThemedText style={styles.detailLabel}>
                  Empresa vinculada
                </ThemedText>
                <View style={styles.pickerWrapper}>
                  <ThemedText style={styles.selectorSingleText}>
                    {empresaActual?.nombre_comercial ??
                      "No hay empresa vinculada"}
                  </ThemedText>
                </View>
              </View>
              <Detail
                label="CIF / NIF"
                value={empresaActual?.cif ?? "No disponible"}
              />
              <Detail
                label="Zona Horaria"
                value={empresaActual?.zona_horaria ?? "Europe/Madrid"}
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
          value={empresaActual?.nombre_comercial ?? "Sin Asignar"}
        />
      </Row>

      <Animated.View
        style={[estiloTarjetaAnimada, { gap: 16, paddingBottom: 30 }]}
      >
        <Card>
          <View style={styles.headerConAccion}>
            <View style={styles.seccionPerfilHeader}>
              <IconSymbol name="person" size={20} color="#2563EB" />
              <ThemedText style={styles.perfilTitle}>
                Información Personal
              </ThemedText>
            </View>
            <Pressable
              style={styles.botonAccionHeader}
              onPress={() => {
                if (isEditing) {
                  setTelefono(trabajadorActual?.telefono ?? "");
                  setNss(trabajadorActual?.numero_seguridad_social ?? "");
                  setFotoUrl(trabajadorActual?.foto_url ?? "");
                  setNuevaFotoAsset(null);
                }
                setIsEditing(!isEditing);
              }}
            >
              <ThemedText style={styles.textoBotonAccionHeader}>
                {isEditing ? "Cancelar" : "Editar"}
              </ThemedText>
            </Pressable>
          </View>
          <View style={styles.separadorPerfil} />

          <View style={styles.avatarContainer}>
            <Pressable
              onPress={handleCambiarFoto}
              disabled={!isEditing || guardando}
              style={[
                styles.avatarPressable,
                isEditing && styles.avatarPressableEditing,
              ]}
            >
              {guardando ? (
                <ActivityIndicator size="small" color="#2563EB" />
              ) : fotoUrl ? (
                <Image
                  source={{
                    uri: nuevaFotoAsset
                      ? nuevaFotoAsset.uri
                      : obtenerUrlLogo(fotoUrl) || undefined,
                  }}
                  style={{ width: 64, height: 64 }}
                  resizeMode="cover"
                />
              ) : (
                <ThemedText style={{ fontSize: 26 }}>👤</ThemedText>
              )}
            </Pressable>
            {isEditing && (
              <ThemedText style={styles.avatarHintText}>
                Toca la foto para cambiarla
              </ThemedText>
            )}
          </View>

          <View style={styles.detailGrid}>
            <Detail
              label="Nombre Completo"
              value={`${trabajadorActual?.nombre ?? ""} ${trabajadorActual?.apellidos ?? ""}`}
            />
            <Detail
              label="Documento (NIF/NIE)"
              value={trabajadorActual?.dni_nif_nie ?? "-"}
            />

            {isEditing ? (
              <View style={styles.inputGroup}>
                <ThemedText style={styles.detailLabel}>
                  Número Seguridad Social
                </ThemedText>
                <TextInput
                  style={styles.inputEdit}
                  value={nss}
                  onChangeText={setNss}
                  placeholder="Número de seguridad social"
                  placeholderTextColor="#94A3B8"
                />
              </View>
            ) : (
              <Detail
                label="Número Seguridad Social"
                value={
                  trabajadorActual?.numero_seguridad_social ??
                  "No cumplimentado"
                }
              />
            )}

            {isEditing ? (
              <View style={styles.inputGroup}>
                <ThemedText style={styles.detailLabel}>
                  Teléfono Móvil
                </ThemedText>
                <TextInput
                  style={styles.inputEdit}
                  value={telefono}
                  onChangeText={setTelefono}
                  placeholder="Teléfono móvil"
                  placeholderTextColor="#94A3B8"
                  keyboardType="phone-pad"
                />
              </View>
            ) : (
              <Detail
                label="Teléfono Móvil"
                value={trabajadorActual?.telefono ?? "No registrado"}
              />
            )}
          </View>

          {isEditing && (
            <Pressable
              style={styles.saveButton}
              onPress={handleSaveProfile}
              disabled={guardando}
            >
              {guardando ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <ThemedText style={styles.saveButtonText}>
                  Guardar Cambios
                </ThemedText>
              )}
            </Pressable>
          )}
        </Card>

        {/* La tarjeta de Condiciones Contractuales solo se muestra si NO es un admin sin contrato, o se oculta si es admin puro */}
        {!esAdmin && (
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
                value={
                  contratoActual?.puesto_trabajo ?? "Operario / No Definido"
                }
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
        )}
        {!esAdmin && (
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
                  Empresa vinculada
                </ThemedText>
                <View style={styles.pickerWrapper}>
                  <ThemedText style={styles.selectorSingleText}>
                    {empresaActual?.nombre_comercial ??
                      "No hay empresa vinculada"}
                  </ThemedText>
                </View>
              </View>

              <View style={styles.selectorContainer}>
                <ThemedText style={styles.detailLabel}>
                  Seleccionar Centro
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
                value={empresaActual?.cif ?? "No disponible"}
              />
            </View>
          </Card>
        )}

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
              value={
                usuarioActual?.tipo_usuario
                  ? usuarioActual.tipo_usuario
                      .toString()
                      .replace("_", " ")
                      .toUpperCase()
                  : ""
              }
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
  headerConAccion: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  botonAccionHeader: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: "#EFF6FF",
    borderWidth: 1,
    borderColor: "#BFDBFE",
  },
  textoBotonAccionHeader: {
    color: "#2563EB",
    fontSize: 12,
    fontWeight: "700",
  },
  avatarContainer: {
    alignItems: "center",
    marginVertical: 12,
    gap: 6,
  },
  avatarPressable: {
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 1,
    borderColor: "#CBD5E1",
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F8FAFC",
    overflow: "hidden",
  },
  avatarPressableEditing: {
    borderColor: "#2563EB",
    borderStyle: "dashed",
  },
  avatarHintText: {
    fontSize: 12,
    color: "#2563EB",
    fontWeight: "600",
  },
  inputGroup: {
    paddingVertical: 4,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  inputEdit: {
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#CBD5E1",
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 15,
    color: "#0F172A",
    marginTop: 4,
  },
  saveButton: {
    backgroundColor: "#16A34A",
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: "center",
    marginTop: 16,
  },
  saveButtonText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "700",
  },
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
