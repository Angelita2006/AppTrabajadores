import { ImagenConToken } from "@/src/modules/empresas/components/Archivos";
import {
    actualizarFotoTrabajador,
    actualizarTrabajador,
    obtenerTrabajador,
} from "@/src/modules/trabajadores/api/services";
import { CalendarLaboralAnual } from "@/src/shared/components/Calendar";
import { useAppModal } from "@/src/shared/ui/AppModalNotification";
import { obtenerMensajeAmigableError } from "@/src/utils/errorHandler";
import * as ImagePicker from "expo-image-picker";
import React, { useEffect, useState } from "react";
import {
    ActivityIndicator,
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
import { useSesion } from "../../src/modules/usuarios/store/SesionContextZustand";
import { ThemedText } from "../../src/shared/components/ThemedText";
import { AppScreen, Card, Row, StatCard } from "../../src/shared/ui/AppSurface";
import { IconSymbol } from "../../src/shared/ui/IconSymbol";

interface PerfilTrabajadorScreenProps {
  /** ID opcional del trabajador a consultar (si lo visualiza un admin). Si no se provee, usa el del usuario en sesión. */
  trabajadorIdOverride?: string;
}

export default function PerfilTrabajadorScreen({
  trabajadorIdOverride,
}: PerfilTrabajadorScreenProps) {
  const { usuarioActual, trabajadorActual, empresaActual } = useSesion();

  const [trabajador, setTrabajador] = useState(trabajadorActual);
  const [cargando, setCargando] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [guardando, setGuardando] = useState(false);

  // Estados editables de la información personal del trabajador
  const [nombre, setNombre] = useState(trabajador?.nombre ?? "");
  const [apellidos, setApellidos] = useState(trabajador?.apellidos ?? "");
  const [telefono, setTelefono] = useState(trabajador?.telefono ?? "");
  const [nss, setNss] = useState(trabajador?.numero_seguridad_social ?? "");
  const [fotoUrl, setFotoUrl] = useState(trabajador?.foto_url ?? "");
  const [nuevaFotoAsset, setNuevaFotoAsset] =
    useState<ImagePicker.ImagePickerAsset | null>(null);

  const opacidadTarjeta = useSharedValue(0);
  const { mostrarError, mostrarMensaje } = useAppModal();

  useEffect(() => {
    opacidadTarjeta.value = 0;
    opacidadTarjeta.value = withTiming(1, { duration: 500 });
  }, [opacidadTarjeta]);

  useEffect(() => {
    if (trabajador) {
      setNombre(trabajador.nombre ?? "");
      setApellidos(trabajador.apellidos ?? "");
      setTelefono(trabajador.telefono ?? "");
      setNss(trabajador.numero_seguridad_social ?? "");
      setFotoUrl(trabajador.foto_url ?? "");
    }
  }, [trabajador]);

  // Si se pasa un override por props, se cargan los datos de ese trabajador específico
  useEffect(() => {
    let isMounted = true;
    const cargarDatosTrabajador = async () => {
      const idAConsultar = trabajadorIdOverride || trabajadorActual?.id;
      if (!idAConsultar) return;
      try {
        setCargando(true);
        const data = await obtenerTrabajador(idAConsultar);
        if (isMounted && data) {
          setTrabajador(data);
        }
      } catch (error: any) {
        mostrarError(
          "Error al cargar la ficha del trabajador: " +
            obtenerMensajeAmigableError(error),
        );
      } finally {
        if (isMounted) setCargando(false);
      }
    };
    cargarDatosTrabajador();
    return () => {
      isMounted = false;
    };
  }, [trabajadorIdOverride, trabajadorActual?.id]);

  const handleCambiarFoto = async () => {
    if (!isEditing || !trabajador) return;
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
        "Error al seleccionar imagen: " + obtenerMensajeAmigableError(error),
      );
    }
  };

  const handleGuardarPerfil = async () => {
    try {
      setGuardando(true);
      if (!trabajador) return;

      // 1. Subir nueva foto si se seleccionó una
      if (nuevaFotoAsset) {
        const filename =
          nuevaFotoAsset.fileName ||
          nuevaFotoAsset.uri.split("/").pop() ||
          "foto.jpg";
        const match = /\.(\w+)$/.exec(filename);
        const type = match ? `image/${match[1]}` : `image/jpeg`;
        await actualizarFotoTrabajador(
          trabajador.id,
          nuevaFotoAsset.uri,
          filename,
          type,
        );
      }

      // 2. Actualizar campos editables de texto
      await actualizarTrabajador(trabajador.id, {
        nombre: nombre.trim(),
        apellidos: apellidos.trim(),
        numero_seguridad_social: nss.trim() || undefined,
      });

      // 3. Refrescar datos del servidor
      const datosFrescos = await obtenerTrabajador(trabajador.id);
      const cacheBustUrl = datosFrescos.foto_url
        ? `${datosFrescos.foto_url.split("?")[0]}?t=${Date.now()}`
        : "";
      setTrabajador({
        ...datosFrescos,
        foto_url: cacheBustUrl,
      });
      setFotoUrl(cacheBustUrl);
      setNuevaFotoAsset(null);
      setIsEditing(false);
      mostrarMensaje(
        "Éxito",
        "Perfil de trabajador actualizado correctamente.",
      );
    } catch (error: any) {
      mostrarError(
        "Error al guardar perfil: " + obtenerMensajeAmigableError(error),
      );
    } finally {
      setGuardando(false);
    }
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

  if (cargando) {
    return (
      <AppScreen title="Perfil de Trabajador">
        <View style={styles.loaderContainer}>
          <ActivityIndicator size="large" color="#2563EB" />
          <ThemedText style={{ marginTop: 12 }}>
            Cargando perfil laboral...
          </ThemedText>
        </View>
      </AppScreen>
    );
  }

  const contratoActivo = trabajador?.contratoActivo;
  const centrosTrabajo = contratoActivo?.centros_trabajo ?? [];
  const departamento = contratoActivo?.departamento;

  return (
    <AppScreen title="Ficha y Perfil de Trabajador">
      <Row>
        <StatCard
          label="Estado Laboral"
          value={trabajador?.estado ?? "ACTIVO"}
          tone={trabajador?.estado === "Activo" ? "success" : "warning"}
        />
        <StatCard
          label="Empresa Vinculada"
          value={
            trabajador?.empresa?.nombre_comercial ??
            empresaActual?.nombre_comercial ??
            "Sin Asignar"
          }
        />
      </Row>

      <Animated.View
        style={[estiloTarjetaAnimada, { gap: 16, paddingBottom: 30 }]}
      >
        {/* ================= 1. INFORMACIÓN PERSONAL (EDITABLE) ================= */}
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
                if (isEditing && trabajador) {
                  setNombre(trabajador.nombre ?? "");
                  setApellidos(trabajador.apellidos ?? "");
                  setTelefono(trabajador.telefono ?? "");
                  setNss(trabajador.numero_seguridad_social ?? "");
                  setFotoUrl(trabajador.foto_url ?? "");
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
                <ImagenConToken
                  rutaRelativa={fotoUrl}
                  style={{ width: 72, height: 72, borderRadius: 36 }}
                />
              ) : (
                <ThemedText style={{ fontSize: 28 }}>👤</ThemedText>
              )}
            </Pressable>
            {isEditing && (
              <ThemedText style={styles.avatarHintText}>
                Toca la foto para cambiarla
              </ThemedText>
            )}
          </View>

          <View style={styles.detailGrid}>
            {isEditing ? (
              <>
                <View style={styles.inputGroup}>
                  <ThemedText style={styles.detailLabel}>Nombre</ThemedText>
                  <TextInput
                    style={styles.inputEdit}
                    value={nombre}
                    onChangeText={setNombre}
                    placeholder="Nombre"
                    placeholderTextColor="#94A3B8"
                  />
                </View>
                <View style={styles.inputGroup}>
                  <ThemedText style={styles.detailLabel}>Apellidos</ThemedText>
                  <TextInput
                    style={styles.inputEdit}
                    value={apellidos}
                    onChangeText={setApellidos}
                    placeholder="Apellidos"
                    placeholderTextColor="#94A3B8"
                  />
                </View>
              </>
            ) : (
              <Detail
                label="Nombre Completo"
                value={`${trabajador?.nombre ?? ""} ${trabajador?.apellidos ?? ""}`}
              />
            )}

            <Detail
              label="Documento (NIF / NIE)"
              value={trabajador?.dni_nif_nie ?? "-"}
            />

            {isEditing ? (
              <View style={styles.inputGroup}>
                <ThemedText style={styles.detailLabel}>
                  Número de Seguridad Social
                </ThemedText>
                <TextInput
                  style={styles.inputEdit}
                  value={nss}
                  onChangeText={setNss}
                  placeholder="NSS"
                  placeholderTextColor="#94A3B8"
                />
              </View>
            ) : (
              <Detail
                label="Número de Seguridad Social"
                value={
                  trabajador?.numero_seguridad_social ?? "No cumplimentado"
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
                value={trabajador?.telefono ?? "No registrado"}
              />
            )}

            <Detail
              label="Fecha de Nacimiento"
              value={trabajador?.fecha_nacimiento ?? "No consta"}
            />
          </View>

          {isEditing && (
            <Pressable
              style={styles.saveButton}
              onPress={handleGuardarPerfil}
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

        {/* ================= 2. DATOS DE CONTRATO (NO MODIFICABLE) ================= */}
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
              label="Tipo de Contrato"
              value={contratoActivo?.tipo_contrato ?? "Régimen General"}
            />
            <Detail
              label="Régimen de Jornada"
              value={contratoActivo?.tipo_jornada ?? "Tiempo Completo"}
            />
            <Detail
              label="Puesto de Trabajo"
              value={contratoActivo?.puesto_trabajo ?? "Operario / Sin Definir"}
            />
            <Detail
              label="Categoría Profesional"
              value={contratoActivo?.categoria_profesional ?? "No especificada"}
            />
            <Detail
              label="Horas Semanales"
              value={
                contratoActivo?.horas_semana
                  ? `${contratoActivo.horas_semana} hrs/semana`
                  : "Según Convenio"
              }
            />
            <Detail
              label="Fecha de Alta en Empresa"
              value={trabajador?.fecha_alta_empresa ?? "No consta"}
            />
            <Detail
              label="Vencimiento de Contrato"
              value={contratoActivo?.fecha_fin ?? "Indefinido"}
            />
          </View>
        </Card>

        {/* ================= 3. ORGANIZACIÓN, CENTRO Y DEPARTAMENTO ================= */}
        <Card>
          <View style={styles.seccionPerfilHeader}>
            <IconSymbol name="business" size={20} color="#EA580C" />
            <ThemedText style={[styles.perfilTitle, { color: "#EA580C" }]}>
              Organización, Centro y Departamento
            </ThemedText>
          </View>
          <View style={styles.separadorPerfil} />
          <View style={styles.detailGrid}>
            <Detail
              label="Centro de Trabajo Asignado"
              value={centrosTrabajo.map((centro) => centro.nombre).join(", ") || "Sin centros asignados"}
            />
            <Detail
              label="Dirección del Centro"
              value={centrosTrabajo.map((centro) => centro.direccion).filter(Boolean).join(" · ") || "Sin dirección registrada"}
            />
            <Detail
              label="Zona Horaria"
              value={centrosTrabajo[0]?.zona_horaria ?? "Europe/Madrid"}
            />
            <Detail
              label="Departamento Asignado"
              value={departamento?.nombre ?? "Sin departamento asignado"}
            />
          </View>
        </Card>

        {/* ================= 4. TURNO ASIGNADO VIGENTE ================= */}
        <Card>
          <View style={styles.seccionPerfilHeader}>
            <IconSymbol name="schedule" size={20} color="#8B5CF6" />
            <ThemedText style={[styles.perfilTitle, { color: "#8B5CF6" }]}>
              Turno Asignado Vigente
            </ThemedText>
          </View>
          <View style={styles.separadorPerfil} />
          {trabajador?.turnoAsignadoVigente?.turno ? (
            <View style={styles.detailGrid}>
              <Detail
                label="Nombre del Turno"
                value={trabajador.turnoAsignadoVigente.turno.nombre}
              />
              <Detail
                label="Horario Teórico"
                value={`${trabajador.turnoAsignadoVigente.turno.hora_inicio} - ${trabajador.turnoAsignadoVigente.turno.hora_fin}`}
              />
              <Detail
                label="Vigencia de la Asignación"
                value={`Desde ${trabajador.turnoAsignadoVigente.fecha_inicio} ${trabajador.turnoAsignadoVigente.fecha_fin ? `hasta ${trabajador.turnoAsignadoVigente.fecha_fin}` : "(Indefinido)"}`}
              />
            </View>
          ) : (
            <ThemedText style={styles.detailValue}>
              No hay ningún turno estructurado asignado actualmente.
            </ThemedText>
          )}
        </Card>

        {/* ================= 5. CALENDARIO Y FESTIVOS ================= */}
        <Card>
          <View style={styles.seccionPerfilHeader}>
            <IconSymbol name="event" size={20} color="#0284C7" />
            <ThemedText style={[styles.perfilTitle, { color: "#0284C7" }]}>
              Calendario Laboral y Festivos
            </ThemedText>
          </View>
          <View style={styles.separadorPerfil} />
          <ThemedText style={[styles.detailLabel, { marginBottom: 8 }]}>
            Calendario Anual Vigente ({new Date().getFullYear()})
          </ThemedText>
          <CalendarLaboralAnual anio={new Date().getFullYear()} festivos={[]} />
        </Card>

        {/* ================= 6. MOTIVOS DE PAUSA DISPONIBLES ================= */}
        <Card>
          <View style={styles.seccionPerfilHeader}>
            <IconSymbol name="coffee" size={20} color="#D97706" />
            <ThemedText style={[styles.perfilTitle, { color: "#D97706" }]}>
              Motivos de Pausa Disponibles
            </ThemedText>
          </View>
          <View style={styles.separadorPerfil} />
          <ThemedText style={styles.detailValue}>
            • Descanso reglamentario / Comida (Computa o no según
            normativa)[cite: 10]
          </ThemedText>
          <ThemedText style={styles.detailValue}>
            • Pausa médico / Asuntos particulares
          </ThemedText>
        </Card>

        {/* ================= 7. DISPOSITIVOS DE FICHAJE DISPONIBLES ================= */}
        <Card>
          <View style={styles.seccionPerfilHeader}>
            <IconSymbol name="devices" size={20} color="#475569" />
            <ThemedText style={[styles.perfilTitle, { color: "#475569" }]}>
              Dispositivos de Fichaje Autorizados
            </ThemedText>
          </View>
          <View style={styles.separadorPerfil} />
          <View style={styles.detailGrid}>
            <Detail label="App Móvil SaaS" value="Habilitado" />
            <Detail label="Terminal Web / Portal" value="Habilitado" />
            <Detail label="Geolocalización GPS" value="Activa en fichaje" />
          </View>
        </Card>

        {/* ================= 8. POLÍTICA DE RETENCIÓN APLICABLE ================= */}
        <Card>
          <View style={styles.seccionPerfilHeader}>
            <IconSymbol name="security" size={20} color="#64748B" />
            <ThemedText style={[styles.perfilTitle, { color: "#64748B" }]}>
              Política de Retención Legal de Registros
            </ThemedText>
          </View>
          <View style={styles.separadorPerfil} />
          <View style={styles.detailGrid}>
            <Detail
              label="Período de Conservación"
              value="4 Años mínimos obligatorios"
            />
            <Detail
              label="Acción tras Periodo"
              value="Archivar / Cumplimiento Ley de Control Horario"
            />
          </View>
        </Card>
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
  loaderContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 40,
  },
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
    width: 72,
    height: 72,
    borderRadius: 36,
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
    marginTop: 12,
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
  seccionPerfilHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  separadorPerfil: { height: 1, backgroundColor: "#E2E8F0", marginVertical: 6 },
});
