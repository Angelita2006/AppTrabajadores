import { obtenerMensajeAmigableError } from "@/src/utils/errorHandler";
import { FontAwesome5 } from "@expo/vector-icons";
import { Picker } from "@react-native-picker/picker";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  TextInput,
  View
} from "react-native";
import {
  EstadoCorreccion,
  IncidenciaCreateRequest,
  IncidenciaResponse,
  TipoCorreccion,
} from "../../src/modules/correcciones-fichaje/types/incidencia";
import {
  obtenerCorreccionesPorEmpresa,
  obtenerFichajesSemanaActual,
  obtenerIncidenciasTrabajador,
  resolverSolicitudCorreccion,
  solicitarCorreccionHoraria,
} from "../../src/modules/trabajadores/api/services";
import { useSesion } from "../../src/modules/trabajadores/store/SesionContext";
import { ThemedText } from "../../src/shared/components/themed-text";
import { AppScreen, Card, Row, StatCard } from "../../src/shared/ui/AppSurface";

interface FichajeSimplificado {
  id: string;
  fecha: string;
  hora: string;
  tipo_evento: string;
}

export default function IncidenciasScreen() {
  const { usuarioActual, empresaSeleccionada, trabajadorActual } = useSesion();
  const [incidencias, setIncidencias] = useState<IncidenciaResponse[]>([]);
  const [fichajesDisponibles, setFichajesDisponibles] = useState<
    FichajeSimplificado[]
  >([]);
  const [cargando, setCargando] = useState(true);

  // Estados locales del formulario
  const [tipoCorreccion, setTipoCorreccion] =
    useState<TipoCorreccion>("Alta_manual");
  const [fichajeAfectadoId, setFichajeAfectadoId] = useState("");
  const [fechaAfectada, setFechaAfectada] = useState("2026-06-29");
  const [horaRealPropuesta, setHoraRealPropuesta] = useState("10:00");

  // CORRECCIÓN 1: Forzamos string plano "ENTRADA" desde el inicio
  const [eventoSolitado, setEventoSolicitado] = useState<string>("ENTRADA");
  const [comentario, setComentario] = useState("");
  const [horaAnterior, setHoraAnterior] = useState("");
  const esAdmin = useMemo(() => {
    return (
      usuarioActual?.tipo_usuario === "Admin_empresa" ||
      usuarioActual?.tipo_usuario === "Admin_gestoría"
    );
  }, [usuarioActual?.tipo_usuario]);

  const conteoEstados = useMemo(() => {
    const pendientes = incidencias.filter(
      (i) => i.estado === EstadoCorreccion.pendiente,
    ).length;
    const aprobadas = incidencias.filter(
      (i) => i.estado === EstadoCorreccion.aprobada,
    ).length;
    const rechazadas = incidencias.filter(
      (i) => i.estado === EstadoCorreccion.rechazada,
    ).length;
    return { pendientes, aprobadas, rechazadas };
  }, [incidencias]);

  // Carga inicial sincronizada de datos
  const cargarDatosInciales = useCallback(async () => {
    try {
      setCargando(true);
      if (esAdmin) {
        if (!empresaSeleccionada?.id) return;
        const datosGlobales = await obtenerCorreccionesPorEmpresa(
          empresaSeleccionada.id,
        );
        setIncidencias(datosGlobales);
      } else {
        if (!trabajadorActual?.id) return;

        const [datosPersonales, listaFichajesRaw] = await Promise.all([
          obtenerIncidenciasTrabajador(trabajadorActual.id),
          obtenerFichajesSemanaActual(trabajadorActual.id),
        ]);

        if (!Array.isArray(listaFichajesRaw)) {
          setFichajesDisponibles([]);
          return;
        }

        const fichajesFiltrados = listaFichajesRaw.filter((fichaje) => {
          if (!fichaje || !fichaje.estado) return false;

          const estadoFichajeApi = fichaje.estado.toString();

          const esValido = estadoFichajeApi === "Válido";
          if (!esValido) return false;

          const tipoEventoStr = fichaje.tipo_evento?.toString().toUpperCase();
          return tipoEventoStr === "ENTRADA" || tipoEventoStr === "SALIDA";
        });

        const fichajesProcesados: FichajeSimplificado[] = fichajesFiltrados.map(
          (fichaje) => {
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
              tipo_evento: fichaje.tipo_evento.toString().toUpperCase(),
            };
          },
        );

        setIncidencias(datosPersonales);
        setFichajesDisponibles(fichajesProcesados);
      }
    } catch (error: any) {
      alert(obtenerMensajeAmigableError(error));
    } finally {
      setCargando(false);
    }
  }, [esAdmin, empresaSeleccionada?.id, trabajadorActual?.id]);

  useEffect(() => {
    cargarDatosInciales();
  }, [cargarDatosInciales]);

  const handleSeleccionarFichaje = (idSeleccionado: string) => {
    setFichajeAfectadoId(idSeleccionado);
    const fichaje = fichajesDisponibles.find((f) => f.id === idSeleccionado);

    if (fichaje) {
      setFechaAfectada(fichaje.fecha);
      setHoraAnterior(fichaje.hora);

      const tipoUpper = fichaje.tipo_evento.toUpperCase();
      if (tipoUpper === "ENTRADA" || tipoUpper === "SALIDA") {
        setEventoSolicitado(tipoUpper);
      }
    } else {
      setHoraAnterior("");
    }
  };

  const reportarIncidencia = useCallback(async () => {
    if (!comentario.trim()) {
      alert("Por favor, especifica el motivo o explicación.");
      return;
    }

    if (tipoCorreccion !== "Alta_manual" && !fichajeAfectadoId.trim()) {
      alert("Debes seleccionar un fichaje de la lista desplegable.");
      return;
    }

    try {
      setCargando(true);
      if (
        !usuarioActual?.id ||
        !usuarioActual?.trabajador_id ||
        !empresaSeleccionada?.id
      ) {
        alert("Expediente corporativo incompleto.");
        return;
      }

      const payload: IncidenciaCreateRequest = {
        empresa_id: empresaSeleccionada.id,
        trabajador_id: usuarioActual.trabajador_id,
        tipo_correccion: tipoCorreccion,
        solicitado_por_usuario_id: usuarioActual.id,
        motivo: comentario.trim(),
        fichaje_afectado_id:
          tipoCorreccion !== "Alta_manual" ? fichajeAfectadoId.trim() : null,
        valor_nuevo:
          tipoCorreccion !== "Anulación"
            ? {
                fecha_descuadre: fechaAfectada.trim(),
                hora_propuesta: horaRealPropuesta.trim(),
                evento_solicitado: eventoSolitado,
              }
            : {},
        valor_anterior:
          tipoCorreccion === "Modificación" || tipoCorreccion === "Anulación"
            ? { hora_anterior: horaAnterior.trim() }
            : null,
      };

      const respuestaBackend = await solicitarCorreccionHoraria(payload);
      setIncidencias((prev) => [respuestaBackend, ...prev]);
      setComentario("");
      setFichajeAfectadoId("");
      setHoraAnterior("");
      alert("La solicitud ha sido registrada correctamente.");
    } catch (error: any) {
      alert(obtenerMensajeAmigableError(error));
    } finally {
      setCargando(false);
    }
  }, [
    comentario,
    tipoCorreccion,
    fichajeAfectadoId,
    fechaAfectada,
    horaRealPropuesta,
    eventoSolitado,
    horaAnterior,
    usuarioActual,
    empresaSeleccionada,
  ]);

  const handleResolverIncidencia = useCallback(
    async (idCorreccion: string, decision: "Aprobada" | "Rechazada") => {
      try {
        setCargando(true);
        if (!usuarioActual?.id) return;

        const resuelta = await resolverSolicitudCorreccion(
          idCorreccion,
          decision,
          usuarioActual.id,
        );
        setIncidencias((prev) =>
          prev.map((item) => (item.id === idCorreccion ? resuelta : item)),
        );

        alert(`La incidencia ha sido marcada como ${decision}.`);
      } catch (error: any) {
        alert(obtenerMensajeAmigableError(error));
      } finally {
        setCargando(false);
      }
    },
    [usuarioActual?.id],
  );

  const getColoresEstado = (estado: EstadoCorreccion) => {
    switch (estado) {
      case EstadoCorreccion.aprobada:
        return { bg: "#DCFCE7", texto: "#16803D" };
      case EstadoCorreccion.rechazada:
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
                    Seleccionar Fichaje Original Afectado (Semana Actual)
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
                        label="Selecciona un fichaje de esta semana"
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
                      />
                    </View>
                  </View>

                  <ThemedText style={styles.label}>Tipo de Evento</ThemedText>
                  <View style={styles.selectorTipos}>
                    {/* CORRECCIÓN 4: Iteramos un array de strings puros estáticos */}
                    {["ENTRADA", "SALIDA"].map((evento) => (
                      <Pressable
                        key={evento}
                        style={[
                          styles.opcionTipo,
                          eventoSolitado === evento && styles.opcionTipoActiva,
                        ]}
                        onPress={() => setEventoSolicitado(evento)}
                      >
                        <ThemedText
                          style={[
                            styles.textoOpcion,
                            eventoSolitado === evento &&
                              styles.textoOpcionActiva,
                          ]}
                        >
                          {evento}
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

              <ThemedText style={styles.label}>
                Justificación para RRHH
              </ThemedText>
              <TextInput
                value={comentario}
                onChangeText={setComentario}
                style={[styles.input, styles.textArea]}
                placeholder="Indica el motivo detallado de la corrección o el olvido..."
                placeholderTextColor="#94A3B8"
                maxLength={250}
              />
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
                  Solicitar Rectificación
                </ThemedText>
              )}
            </Pressable>
          </Card>
        </>
      )}

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

            // CORRECCIÓN 5: Aseguramos fallback seguro por si viene vacío desde la base de datos
            const eventoS = item.valor_nuevo?.evento_solicitado
              ? item.valor_nuevo.evento_solicitado.toString().toUpperCase()
              : "N/A";

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
                      Propuesto: {fechaD} a las {horaP ?? "00:00"} hs ({eventoS}
                      )
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

                  {esAdmin && item.estado === EstadoCorreccion.pendiente && (
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
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
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
