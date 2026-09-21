import {
  crearCorreccion,
  obtenerCorreccionesPorEmpresa,
  obtenerCorreccionesPorTrabajador,
  resolverCorreccion,
} from "@/src/modules/correcciones-fichaje/api/services";
import { obtenerFichajesTrabajadorEntreFechas } from "@/src/modules/fichajes/api/services";
import { RegistroFichaje } from "@/src/modules/fichajes/types/registrofichaje";
import {
  obtenerTipoEventoPorId,
  obtenerTiposEventosEmpresa,
} from "@/src/modules/tipos_eventos_fichaje/api/services";
import { TipoEventoFichaje } from "@/src/modules/tipos_eventos_fichaje/types/tipos_evento_fichaje";
import { useAppModal } from "@/src/shared/ui/AppModalNotification";
import { formatearFecha } from "@/src/utils/formaters";
import { FontAwesome5 } from "@expo/vector-icons";
import { Picker } from "@react-native-picker/picker";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  TextInput,
  View,
} from "react-native";
import {
  CorreccionFichajeCreate,
  CorreccionFichajeResponse,
  EstadoCorreccion,
  TipoCorreccion,
} from "../../src/modules/correcciones-fichaje/types/correccion";
import { useSesion } from "../../src/modules/usuarios/store/SesionContextZustand";
import { SignatureCapture } from "../../src/shared/components/SignatureCapture";
import { ThemedText } from "../../src/shared/components/ThemedText";
import { AppScreen, Card, Row, StatCard } from "../../src/shared/ui/AppSurface";

interface FichajeSimplificado {
  id: string;
  fecha: string;
  hora: string;
  tipo_evento: string;
}

export default function IncidenciasScreen() {
  const { usuarioActual, empresaActual, trabajadorActual } = useSesion();
  const [incidencias, setIncidencias] = useState<CorreccionFichajeResponse[]>(
    [],
  );
  const [fichajesDisponibles, setFichajesDisponibles] = useState<
    FichajeSimplificado[]
  >([]);

  const [tiposEventosEmpresa, setTiposEventosEmpresa] = useState<
    TipoEventoFichaje[]
  >([]);
  const [cargando, setCargando] = useState(true);

  // Estados locales del formulario
  const [tipoCorreccion, setTipoCorreccion] =
    useState<TipoCorreccion>("Alta_manual");
  const [fichajeAfectadoId, setFichajeAfectadoId] = useState("");
  const [fechaAfectada, setFechaAfectada] = useState("");
  const [horaRealPropuesta, setHoraRealPropuesta] = useState("10:00");

  const [tipoEventoIdSolicitado, setTipoEventoIdSolicitado] =
    useState<string>("");
  const [comentario, setComentario] = useState("");
  const [horaAnterior, setHoraAnterior] = useState("");
  const [firmaSolicitante, setFirmaSolicitante] = useState<string | null>(null);
  const [capturandoFirma, setCapturandoFirma] = useState(false);
  const [correccionResolviendo, setCorreccionResolviendo] = useState<{
    id: string;
    decision: "Aprobada" | "Rechazada";
  } | null>(null);

  const { mostrarError, mostrarMensaje } = useAppModal();

  const esAdmin = useMemo(() => {
    return (
      usuarioActual?.tipo_usuario === "Admin_empresa" ||
      usuarioActual?.tipo_usuario === "Admin_gestoría"
    );
  }, [usuarioActual?.tipo_usuario]);

  const conteoEstados = useMemo(() => {
    const pendientes = incidencias.filter(
      (i) => i.estado === "Pendiente",
    ).length;
    const aprobadas = incidencias.filter((i) => i.estado === "Aprobada").length;
    const rechazadas = incidencias.filter(
      (i) => i.estado === "Rechazada",
    ).length;
    return { pendientes, aprobadas, rechazadas };
  }, [incidencias]);

  // Carga inicial sincronizada de datos (dependencias limpiadas para evitar bucles)
  const cargarDatosInciales = useCallback(async () => {
    try {
      setCargando(true);
      if (!empresaActual?.id) return;

      const eventosEmpresa = await obtenerTiposEventosEmpresa(empresaActual.id);
      if (Array.isArray(eventosEmpresa)) {
        setTiposEventosEmpresa(eventosEmpresa);
        setTipoEventoIdSolicitado((prev) =>
          !prev && eventosEmpresa.length > 0 ? eventosEmpresa[0].id : prev,
        );
      }

      if (esAdmin) {
        const datosGlobales = await obtenerCorreccionesPorEmpresa(
          empresaActual.id,
        );
        setIncidencias(datosGlobales);
      } else {
        if (!usuarioActual || !trabajadorActual?.id) return;

        const hoy = new Date();
        const diaSemana = hoy.getDay();
        const diferenciaLunes =
          hoy.getDate() - diaSemana + (diaSemana === 0 ? -6 : 1);

        const fechaLunes = new Date(new Date().setDate(diferenciaLunes));
        const fechaDomingo = new Date(fechaLunes);
        fechaDomingo.setDate(fechaLunes.getDate() + 6);

        const fechaInicioStr = formatearFecha(fechaLunes);
        const fechaFinStr = formatearFecha(fechaDomingo);

        const [datosPersonales, listaFichajesRaw] = await Promise.all([
          obtenerCorreccionesPorTrabajador(trabajadorActual.id),
          obtenerFichajesTrabajadorEntreFechas(
            trabajadorActual.id,
            fechaInicioStr,
            fechaFinStr,
          ),
        ]);

        if (!Array.isArray(listaFichajesRaw)) {
          setFichajesDisponibles([]);
          setIncidencias(datosPersonales);
          return;
        }

        const fichajesProcesadosPromises = listaFichajesRaw.map(
          async (fichaje: RegistroFichaje) => {
            if (!fichaje || !fichaje.estado) return null;
            if (fichaje.estado.toString() !== "Válido") return null;
            if (!fichaje.tipo_evento_id) return null;

            const tipoEvento = await obtenerTipoEventoPorId(
              fichaje.tipo_evento_id,
            );
            const codigoEvento = tipoEvento?.codigo?.toUpperCase() || "";

            const fechaHoraStr = fichaje.fecha_hora || "";
            const [fecha, horaCompleta] = fechaHoraStr.includes("T")
              ? fechaHoraStr.split("T")
              : fechaHoraStr.split(" ");

            const horaMinutos = horaCompleta
              ? horaCompleta.substring(0, 5)
              : "00:00";

            return {
              id: fichaje.id,
              fecha: fecha,
              hora: horaMinutos,
              tipo_evento: codigoEvento,
            };
          },
        );

        const resultados = await Promise.all(fichajesProcesadosPromises);
        const fichajesValidos: FichajeSimplificado[] = resultados.filter(
          (f): f is FichajeSimplificado => f !== null,
        );

        setIncidencias(datosPersonales);
        setFichajesDisponibles(fichajesValidos);
      }
    } catch (error: any) {
      mostrarError(
        "Error al cargar los centros de trabajo de la empresa: " +
          error.message,
      );
    } finally {
      setCargando(false);
    }
  }, [esAdmin, empresaActual?.id, trabajadorActual?.id, usuarioActual]);

  useEffect(() => {
    cargarDatosInciales();
  }, [cargarDatosInciales]);

  const handleSeleccionarFichaje = (idSeleccionado: string) => {
    setFichajeAfectadoId(idSeleccionado);
    const fichaje = fichajesDisponibles.find((f) => f.id === idSeleccionado);

    if (fichaje) {
      setFechaAfectada(fichaje.fecha);
      setHoraAnterior(fichaje.hora);
    } else {
      setHoraAnterior("");
      setFechaAfectada("");
    }
  };

  const reportarIncidencia = useCallback(async () => {
    if (!comentario.trim()) {
      mostrarMensaje(
        "Alerta",
        "Por favor, especifica el motivo o explicación.",
      );
      return;
    }

    if (tipoCorreccion !== "Alta_manual" && !fichajeAfectadoId.trim()) {
      mostrarMensaje(
        "Alerta",
        "Debes seleccionar un fichaje de la lista desplegable.",
      );
      return;
    }

    if (!firmaSolicitante) {
      mostrarMensaje(
        "Firma requerida",
        "Debes firmar la solicitud de corrección antes de enviarla.",
      );
      return;
    }

    if (tipoCorreccion !== "Anulación") {
      if (!fechaAfectada.trim() || !horaRealPropuesta.trim()) {
        mostrarMensaje(
          "Alerta",
          "Debes indicar la fecha del descuadre y la hora propuesta.",
        );
        return;
      }
    }

    try {
      setCargando(true);

      const idTrabajadorEfectivo =
        trabajadorActual?.id || usuarioActual?.trabajador_id;
      if (!usuarioActual?.id || !empresaActual?.id || !idTrabajadorEfectivo) {
        mostrarMensaje(
          "Alerta",
          "Expediente corporativo incompleto o faltan datos de sesión.",
        );
        return;
      }

      const payload: CorreccionFichajeCreate = {
        empresa_id: empresaActual.id,
        trabajador_id: idTrabajadorEfectivo,
        tipo_correccion: tipoCorreccion,
        tipo_evento_id: tipoEventoIdSolicitado,
        solicitado_por_usuario_id: usuarioActual.id,
        firma_solicitante: firmaSolicitante,
        motivo: comentario.trim(),
        fichaje_afectado_id:
          tipoCorreccion !== "Alta_manual" ? fichajeAfectadoId : null,
        valor_nuevo:
          tipoCorreccion !== "Anulación"
            ? {
                fecha_descuadre: fechaAfectada.trim(),
                hora_propuesta: horaRealPropuesta.trim(),
                tipo_evento_id: tipoEventoIdSolicitado,
              }
            : {},
        valor_anterior:
          tipoCorreccion === "Modificación" || tipoCorreccion === "Anulación"
            ? { hora_anterior: horaAnterior ? horaAnterior.trim() : "00:00" }
            : null,
      };

      const respuestaBackend = await crearCorreccion(payload);
      setIncidencias((prev) => [respuestaBackend, ...prev]);

      setComentario("");
      setFichajeAfectadoId("");
      setHoraAnterior("");
      setFechaAfectada("");
    } catch (error: any) {
      mostrarError(
        "Error al cargar los centros de trabajo de la empresa: " +
          error.message,
      );
    } finally {
      setCargando(false);
    }
  }, [
    comentario,
    tipoCorreccion,
    fichajeAfectadoId,
    fechaAfectada,
    horaRealPropuesta,
    tipoEventoIdSolicitado,
    horaAnterior,
    firmaSolicitante,
    usuarioActual,
    trabajadorActual,
    empresaActual,
  ]);

  const handleResolverIncidencia = useCallback(
    async (idCorreccion: string, decision: "Aprobada" | "Rechazada") => {
      if (!usuarioActual?.id) return;
      setCorreccionResolviendo({ id: idCorreccion, decision });
    },
    [usuarioActual?.id],
  );

  const resolverConFirma = useCallback(
    async (firma: string) => {
      if (!usuarioActual?.id || !correccionResolviendo) return;
      try {
        setCargando(true);
        const resuelta = await resolverCorreccion(
          correccionResolviendo.id,
          correccionResolviendo.decision,
          usuarioActual.id,
          firma,
        );
        setIncidencias((prev) =>
          prev.map((item) =>
            item.id === correccionResolviendo.id ? resuelta : item,
          ),
        );
      } catch (error: any) {
        mostrarError("Error al resolver la corrección: " + error.message);
      } finally {
        setCargando(false);
        setCorreccionResolviendo(null);
      }
    },
    [correccionResolviendo, usuarioActual?.id],
  );

  const getColoresEstado = (estado: EstadoCorreccion) => {
    switch (estado) {
      case "Aprobada":
        return { bg: "#DCFCE7", texto: "#16803D" };
      case "Rechazada":
        return { bg: "#FEE2E2", texto: "#B91C1C" };
      default:
        return { bg: "#FFEDD5", texto: "#D97706" };
    }
  };

  return (
    <AppScreen
      title={esAdmin ? "Auditoría de Incidencias" : "Incidencias y Errores"}
      subtitle={
        esAdmin
          ? "Consola de validación y resolución legal de marcajes."
          : "Solicita correcciones sobre tus fichajes."
      }
    >
      <Row>
        <StatCard
          label="Rechazadas"
          value={conteoEstados.rechazadas.toString()}
          tone="danger"
        />
        <StatCard
          label="Aprobadas"
          value={conteoEstados.aprobadas.toString()}
          tone="success"
        />
        <StatCard
          label="Pendientes"
          value={conteoEstados.pendientes.toString()}
          tone="warning"
        />
      </Row>

      {!esAdmin && (
        <>
          <ThemedText style={styles.sectionTitle}>
            Reportar Error de Marcaje
          </ThemedText>
          <Card>
            <View style={styles.contenedorForm}>
              <ThemedText style={styles.label}>Tipo de Acción</ThemedText>
              <View style={styles.selectorTipos}>
                {(
                  [
                    "Alta_manual",
                    "Modificación",
                    "Anulación",
                  ] as TipoCorreccion[]
                ).map((tipo) => (
                  <Pressable
                    key={tipo}
                    style={[
                      styles.opcionTipo,
                      tipoCorreccion === tipo && styles.opcionTipoActiva,
                    ]}
                    onPress={() => {
                      setTipoCorreccion(tipo);
                      setFichajeAfectadoId("");
                      setHoraAnterior("");
                      setFechaAfectada("");
                    }}
                  >
                    <ThemedText
                      style={[
                        styles.textoOpcion,
                        tipoCorreccion === tipo && styles.textoOpcionActiva,
                      ]}
                    >
                      {(tipo || "").replace("_", " ")}
                    </ThemedText>
                  </Pressable>
                ))}
              </View>

              {tipoCorreccion !== "Alta_manual" && (
                <View style={{ marginBottom: 12 }}>
                  <ThemedText style={styles.label}>
                    Seleccionar Fichaje Original Afectado
                  </ThemedText>
                  <View style={styles.pickerContainer}>
                    <Picker
                      selectedValue={fichajeAfectadoId}
                      onValueChange={(itemValue: string) =>
                        handleSeleccionarFichaje(itemValue)
                      }
                      style={styles.picker}
                      dropdownIconColor="#EA580C"
                    >
                      <Picker.Item
                        label="Selecciona un fichaje"
                        value=""
                        enabled={false}
                      />
                      {fichajesDisponibles.map((fichaje) => (
                        <Picker.Item
                          key={fichaje.id}
                          label={`${fichaje.fecha} | ${fichaje.hora} hs - (${fichaje.tipo_evento})`}
                          value={fichaje.id}
                        />
                      ))}
                    </Picker>
                  </View>
                </View>
              )}

              {tipoCorreccion !== "Anulación" && (
                <>
                  <View style={styles.filaCampos}>
                    <View style={{ flex: 1 }}>
                      <ThemedText style={styles.label}>
                        Fecha del Descuadre
                      </ThemedText>
                      <TextInput
                        value={fechaAfectada}
                        onChangeText={setFechaAfectada}
                        style={styles.input}
                        placeholder="AAAA-MM-DD"
                        placeholderTextColor="#94A3B8"
                      />
                    </View>
                    <View style={{ flex: 1 }}>
                      <ThemedText style={styles.label}>
                        Hora Propuesta
                      </ThemedText>
                      <TextInput
                        value={horaRealPropuesta}
                        onChangeText={setHoraRealPropuesta}
                        style={styles.input}
                        placeholder="HH:MM"
                        placeholderTextColor="#94A3B8"
                      />
                    </View>
                  </View>

                  <ThemedText style={styles.label}>Tipo de Evento</ThemedText>
                  <View style={styles.selectorTipos}>
                    {tiposEventosEmpresa.map((evento) => (
                      <Pressable
                        key={evento.id}
                        style={[
                          styles.opcionTipo,
                          tipoEventoIdSolicitado === evento.id &&
                            styles.opcionTipoActiva,
                        ]}
                        onPress={() => setTipoEventoIdSolicitado(evento.id)}
                      >
                        <ThemedText
                          style={[
                            styles.textoOpcion,
                            tipoEventoIdSolicitado === evento.id &&
                              styles.textoOpcionActiva,
                          ]}
                        >
                          {evento.codigo.replace("_", " ").toUpperCase()}
                        </ThemedText>
                      </Pressable>
                    ))}
                  </View>
                </>
              )}

              {tipoCorreccion === "Modificación" && horaAnterior !== "" && (
                <View>
                  <ThemedText style={styles.label}>
                    Hora Anterior Detectada (Original)
                  </ThemedText>
                  <TextInput
                    value={horaAnterior}
                    editable={false}
                    style={[
                      styles.input,
                      { backgroundColor: "#E2E8F0", color: "#64748B" },
                    ]}
                  />
                </View>
              )}

              <ThemedText style={styles.label}>Justificación</ThemedText>
              <TextInput
                value={comentario}
                onChangeText={setComentario}
                style={[styles.input, styles.textArea]}
                placeholder="Indica el motivo detallado de la corrección..."
                placeholderTextColor="#94A3B8"
                maxLength={250}
              />
              <Pressable
                style={styles.signatureButton}
                onPress={() => setCapturandoFirma(true)}
              >
                <ThemedText style={styles.signatureButtonText}>
                  {firmaSolicitante
                    ? "Firma guardada · cambiar"
                    : "Firmar solicitud"}
                </ThemedText>
              </Pressable>
            </View>
            <Pressable
              style={[styles.submitButton, cargando && styles.disabled]}
              onPress={reportarIncidencia}
              disabled={cargando}
            >
              {cargando ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <ThemedText style={styles.submitText}>
                  Solicitar corrección
                </ThemedText>
              )}
            </Pressable>
          </Card>
        </>
      )}

      <SignatureCapture
        visible={capturandoFirma || correccionResolviendo !== null}
        title={
          correccionResolviendo
            ? `Firma para ${correccionResolviendo.decision.toLowerCase()} la corrección`
            : "Firma de la persona solicitante"
        }
        onCancel={() => {
          setCapturandoFirma(false);
          setCorreccionResolviendo(null);
        }}
        onConfirm={(firma) => {
          if (correccionResolviendo) {
            void resolverConFirma(firma);
          } else {
            setFirmaSolicitante(firma);
            setCapturandoFirma(false);
          }
        }}
      />

      <ThemedText style={styles.sectionTitle}>
        {esAdmin
          ? "Historial de Incidencias Global de la Empresa"
          : "Trazabilidad de Ajustes"}
      </ThemedText>

      {cargando && incidencias.length === 0 ? (
        <ActivityIndicator
          size="large"
          color="#EA580C"
          style={{ marginTop: 24 }}
        />
      ) : incidencias.length === 0 ? (
        <ThemedText style={styles.empty}>
          No constan registros de incidencias para auditar.
        </ThemedText>
      ) : (
        <View style={{ paddingBottom: 24 }}>
          {incidencias.map((item) => {
            const colores = getColoresEstado(item.estado);
            const tieneValoresNuevos =
              item.valor_nuevo && Object.keys(item.valor_nuevo).length > 0;
            const fechaD = item.valor_nuevo?.fecha_descuadre;
            const horaP = item.valor_nuevo?.hora_propuesta;

            return (
              <Card key={item.id}>
                <View style={styles.itemCard}>
                  <View style={styles.headerCard}>
                    <ThemedText style={styles.itemFecha}>
                      {(item.tipo_correccion || "")
                        .replace("_", " ")
                        .toUpperCase()}
                    </ThemedText>
                    <View
                      style={[styles.badge, { backgroundColor: colores.bg }]}
                    >
                      <ThemedText
                        style={[styles.badgeText, { color: colores.texto }]}
                      >
                        {(item.estado || "").toUpperCase()}
                      </ThemedText>
                    </View>
                  </View>

                  {tieneValoresNuevos && fechaD && (
                    <ThemedText style={styles.itemTipo}>
                      Propuesto: {fechaD} a las {horaP ?? "00:00"} hs
                    </ThemedText>
                  )}

                  {item.valor_anterior?.hora_anterior && (
                    <ThemedText style={styles.itemIdAfectado}>
                      Valor anterior: {item.valor_anterior?.hora_anterior} hs
                    </ThemedText>
                  )}

                  <ThemedText style={styles.itemMotivo}>
                    Motivo: "{item.motivo}"
                  </ThemedText>

                  {esAdmin && item.estado === "Pendiente" && (
                    <View style={styles.panelControlJefe}>
                      <Pressable
                        style={[styles.botonResolutor, styles.botonRechazar]}
                        onPress={() =>
                          handleResolverIncidencia(item.id, "Rechazada")
                        }
                      >
                        <FontAwesome5 name="times" size={12} color="#FFFFFF" />
                        <ThemedText style={styles.textoBotonResolutor}>
                          Rechazar
                        </ThemedText>
                      </Pressable>
                      <Pressable
                        style={[styles.botonResolutor, styles.botonAprobar]}
                        onPress={() =>
                          handleResolverIncidencia(item.id, "Aprobada")
                        }
                      >
                        <FontAwesome5 name="check" size={12} color="#FFFFFF" />
                        <ThemedText style={styles.textoBotonResolutor}>
                          Aprobar
                        </ThemedText>
                      </Pressable>
                    </View>
                  )}
                </View>
              </Card>
            );
          })}
        </View>
      )}
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  sectionTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#1E293B",
    marginVertical: 14,
  },
  contenedorForm: { padding: 4, width: "100%" },
  filaCampos: { flexDirection: "row", gap: 12, marginBottom: 4 },
  label: {
    fontSize: 11,
    fontWeight: "700",
    color: "#475569",
    marginBottom: 6,
    textTransform: "uppercase",
  },
  selectorTipos: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginBottom: 12,
  },
  opcionTipo: {
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: "#F1F5F9",
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  opcionTipoActiva: { backgroundColor: "#FFEDD5", borderColor: "#EA580C" },
  textoOpcion: {
    fontSize: 10,
    color: "#64748B",
    fontWeight: "600",
    textTransform: "uppercase",
  },
  textoOpcionActiva: { fontSize: 12, color: "#C2410C", fontWeight: "700" },
  pickerContainer: {
    borderWidth: 1.5,
    borderColor: "#E2E8F0",
    borderRadius: 10,
    backgroundColor: "#F8FAFC",
    marginBottom: 12,
    overflow: "hidden",
  },
  picker: { height: 50, width: "100%", color: "#0F172A" },
  input: {
    height: 46,
    borderWidth: 1.5,
    borderColor: "#E2E8F0",
    borderRadius: 10,
    paddingHorizontal: 12,
    backgroundColor: "#F8FAFC",
    fontSize: 14,
    color: "#0F172A",
    marginBottom: 12,
  },
  textArea: {
    minHeight: 65,
    textAlignVertical: "top",
    paddingTop: 10,
    marginBottom: 16,
  },
  submitButton: {
    height: 48,
    backgroundColor: "#EA580C",
    borderRadius: 15,
    justifyContent: "center",
    alignItems: "center",
  },
  signatureButton: {
    alignItems: "center",
    paddingVertical: 11,
    marginBottom: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#2563EB",
    backgroundColor: "#EFF6FF",
  },
  signatureButtonText: { color: "#1D4ED8", fontSize: 13, fontWeight: "700" },
  disabled: { opacity: 0.6 },
  submitText: { color: "#FFFFFF", fontSize: 15, fontWeight: "700" },
  itemCard: { width: "100%", paddingVertical: 2 },
  headerCard: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  itemFecha: { fontSize: 14, fontWeight: "800", color: "#0F172A" },
  itemIdAfectado: { fontSize: 12, color: "#64748B", marginTop: 2 },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    marginLeft: "auto",
  },
  badgeText: { fontSize: 11, fontWeight: "700" },
  itemTipo: { fontSize: 13, color: "#1E293B", fontWeight: "600" },
  itemMotivo: {
    fontSize: 13,
    color: "#64748B",
    marginTop: 2,
    fontStyle: "italic",
  },
  empty: { textAlign: "center", color: "#64748B", marginTop: 10 },
  panelControlJefe: {
    flexDirection: "row",
    gap: 10,
    marginTop: 12,
    justifyContent: "flex-end",
  },
  botonResolutor: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 6,
    minWidth: 100,
  },
  botonRechazar: { backgroundColor: "#DC2626" },
  botonAprobar: { backgroundColor: "#16A34A" },
  textoBotonResolutor: { color: "#FFFFFF", fontSize: 12, fontWeight: "700" },
});
function formatearFechaAString(fechaLunes: any) {
  throw new Error("Function not implemented.");
}
