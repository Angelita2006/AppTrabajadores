import {
  crearCorreccion,
  obtenerCorreccionesPorEmpresa,
  resolverCorreccion,
} from "@/src/modules/correcciones-fichaje/api/services";
import { obtenerTrabajadoresEmpresa } from "@/src/modules/empresas/api/services";
import { obtenerFichajesTrabajadorEntreFechas } from "@/src/modules/fichajes/api/services";
import { RegistroFichaje } from "@/src/modules/fichajes/types/registrofichaje";
// Ya no necesitamos obtenerRolPorId ni obtenerTrabajador uno a uno si el backend puede devolver los datos poblados o si filtramos por rol_id directamente si viene incluido en el objeto Trabajador.
import { obtenerRolPorId } from "@/src/modules/roles/api/services";
import {
  obtenerTipoEventoPorId,
  obtenerTiposEventosEmpresa,
} from "@/src/modules/tipos_eventos_fichaje/api/services";
import { TipoEventoFichaje } from "@/src/modules/tipos_eventos_fichaje/types/tipos_evento_fichaje";
import { Trabajador } from "@/src/modules/trabajadores/types/trabajador";
import { useAppModal } from "@/src/shared/ui/AppModalNotification";
import { formatearFecha } from "@/src/utils/formaters";
import { FontAwesome5 } from "@expo/vector-icons";
import { Picker } from "@react-native-picker/picker";
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
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

export default function GestionIncidenciasScreen() {
  const { usuarioActual, empresaActual, trabajadorActual } = useSesion();
  const [incidencias, setIncidencias] = useState<CorreccionFichajeResponse[]>(
    [],
  );
  const [trabajadores, setTrabajadores] = useState<Trabajador[]>([]);
  const [trabajadorSeleccionadoId, setTrabajadorSeleccionadoId] =
    useState<string>("");
  const [fichajesDisponibles, setFichajesDisponibles] = useState<
    FichajeSimplificado[]
  >([]);
  const [tiposEventosEmpresa, setTiposEventosEmpresa] = useState<
    TipoEventoFichaje[]
  >([]);
  const [cargando, setCargando] = useState(true);
  const [procesandoId, setProcesandoId] = useState<string | null>(null);
  const [filtroEstado, setFiltroEstado] = useState<"todas" | "pendientes">(
    "pendientes",
  );
  const [busquedaHistorial, setBusquedaHistorial] = useState("");
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

  // Referencias para el control del foco por teclado
  const horaPropuestaRef = useRef<TextInput>(null);
  const comentarioRef = useRef<TextInput>(null);

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

  const { mostrarError, mostrarMensaje } = useAppModal();

  // 1. Carga optimizada de trabajadores
  useEffect(() => {
    async function cargarTrabajadores() {
      if (!empresaActual?.id) return;
      try {
        const lista = await obtenerTrabajadoresEmpresa(empresaActual.id);
        if (Array.isArray(lista)) {
          const trabajadoresSinAdmin = (
            await Promise.all(
              lista.map(async (t: Trabajador) => {
                if (!t.rol_id) return t;
                try {
                  const rol = await obtenerRolPorId(t.rol_id);
                  const esAdmin =
                    rol?.nombre === "Admin_empresa" ||
                    rol?.nombre === "Admin_gestoría";
                  const esActivo = t.activo;
                  return esAdmin ? null : esActivo ? t : null;
                } catch {
                  return t;
                }
              }),
            )
          ).filter(Boolean) as Trabajador[];

          const trabajadoresFiltrados = trabajadoresSinAdmin.sort((a, b) => {
            const nombreA = `${a.nombre ?? ""} ${a.apellidos ?? ""}`
              .trim()
              .toLowerCase();
            const nombreB = `${b.nombre ?? ""} ${b.apellidos ?? ""}`
              .trim()
              .toLowerCase();
            return nombreA.localeCompare(nombreB);
          });

          setTrabajadores(trabajadoresFiltrados);
          if (trabajadoresFiltrados.length > 0 && !trabajadorSeleccionadoId) {
            setTrabajadorSeleccionadoId(trabajadoresFiltrados[0].id);
          }
        }
      } catch (error: any) {
        mostrarError(
          "Error al cargar la lista de trabajadores de la empresa: " +
            error.message,
        );
      }
    }
    cargarTrabajadores();
  }, [empresaActual?.id]);

  // 2. Carga global optimizada: Mapeo directo sin llamadas unitarias por cada incidencia
  const cargarDatosGlobalesYPersonales = useCallback(async () => {
    if (!empresaActual?.id) {
      setCargando(false);
      return;
    }
    try {
      setCargando(true);
      const [eventosEmpresa, datosGlobales] = await Promise.all([
        obtenerTiposEventosEmpresa(empresaActual.id),
        obtenerCorreccionesPorEmpresa(empresaActual.id),
      ]);

      if (Array.isArray(eventosEmpresa)) {
        setTiposEventosEmpresa(eventosEmpresa);
        setTipoEventoIdSolicitado((prev) =>
          !prev && eventosEmpresa.length > 0 ? eventosEmpresa[0].id : prev,
        );
      }

      // Creamos un diccionario rápido de trabajadores en memoria para evitar llamadas repetidas
      const mapaTrabajadores = new Map(trabajadores.map((t) => [t.id, t]));
      const incidenciasConTrabajador = (datosGlobales || []).map(
        (incidencia: CorreccionFichajeResponse) => {
          const trabajador = mapaTrabajadores.get(incidencia.trabajador_id);
          const nombreCompleto = trabajador
            ? `${trabajador.nombre ?? ""} ${trabajador.apellidos ?? ""}`.trim()
            : incidencia.trabajador_id;

          return {
            ...incidencia,
            trabajador_nombre_completo: nombreCompleto,
          };
        },
      );

      setIncidencias(incidenciasConTrabajador);
    } catch (error: any) {
      mostrarError(
        "Error al cargar las incidencias y tipos de eventos globales: " +
          error.message,
      );
    } finally {
      setCargando(false);
    }
  }, [empresaActual?.id, trabajadores]);

  useEffect(() => {
    if (trabajadores.length > 0) {
      cargarDatosGlobalesYPersonales();
    }
  }, [cargarDatosGlobalesYPersonales, trabajadores.length]);

  // Carga de fichajes del trabajador seleccionado
  useEffect(() => {
    async function cargarFichajesTrabajadorSeleccionado() {
      const targetId = trabajadorSeleccionadoId || trabajadorActual?.id;
      if (!targetId) return;

      try {
        const hoy = new Date();
        const diaSemana = hoy.getDay();
        const diferenciaLunes =
          hoy.getDate() - diaSemana + (diaSemana === 0 ? -6 : 1);

        const fechaLunes = new Date(new Date().setDate(diferenciaLunes));
        const fechaDomingo = new Date(fechaLunes);
        fechaDomingo.setDate(fechaLunes.getDate() + 6);

        const fechaInicioStr = formatearFecha(fechaLunes);
        const fechaFinStr = formatearFecha(fechaDomingo);

        const listaFichajesRaw = await obtenerFichajesTrabajadorEntreFechas(
          targetId,
          fechaInicioStr,
          fechaFinStr,
        );

        if (Array.isArray(listaFichajesRaw)) {
          const fichajesProcesadosPromises = listaFichajesRaw.map(
            async (fichaje: RegistroFichaje) => {
              if (
                !fichaje ||
                !fichaje.estado ||
                fichaje.estado.toString() !== "Válido" ||
                !fichaje.tipo_evento_id
              )
                return null;

              const tipoEventoStr = await obtenerTipoEventoPorId(
                fichaje.tipo_evento_id,
              );
              const codigoEvento = tipoEventoStr?.codigo?.toUpperCase() || "";
              const fechaHoraStr = fichaje.fecha_hora || "";
              const [fecha, horaCompleta] = fechaHoraStr.includes("T")
                ? fechaHoraStr.split("T")
                : fechaHoraStr.split(" ");
              return {
                id: fichaje.id,
                fecha,
                hora: horaCompleta ? horaCompleta.substring(0, 5) : "00:00",
                tipo_evento: codigoEvento,
              };
            },
          );

          const resultados = await Promise.all(fichajesProcesadosPromises);
          setFichajesDisponibles(
            resultados.filter((f): f is FichajeSimplificado => f !== null),
          );
        }
      } catch (error: any) {
        mostrarError(
          "Error al cargar los fichajes del trabajador seleccionado: " +
            error.message,
        );
        setFichajesDisponibles([]);
      }
    }

    cargarFichajesTrabajadorSeleccionado();
  }, [trabajadorSeleccionadoId, trabajadorActual?.id]);

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
    if (!trabajadorSeleccionadoId) {
      mostrarMensaje(
        "Aviso",
        "Por favor, selecciona un trabajador al que aplicar la corrección.",
      );
      return;
    }
    if (tipoCorreccion !== "Anulación") {
      const regexFecha = /^\d{4}-\d{2}-\d{2}$/;
      const fechaLimpia = fechaAfectada.trim();

      if (
        !regexFecha.test(fechaLimpia) ||
        Number.isNaN(Date.parse(fechaLimpia))
      ) {
        mostrarMensaje(
          "Fecha Inválida",
          "Por favor, introduce una fecha válida con el formato AAAA-MM-DD.",
        );
        return;
      }
    }
    if (!comentario.trim()) {
      mostrarMensaje("Aviso", "Por favor, especifica el motivo o explicación.");
      return;
    }
    if (tipoCorreccion !== "Alta_manual" && !fichajeAfectadoId.trim()) {
      mostrarMensaje(
        "Aviso",
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

    try {
      setCargando(true);
      if (!usuarioActual?.id || !empresaActual?.id) return;

      const payload: CorreccionFichajeCreate = {
        empresa_id: empresaActual.id,
        trabajador_id: trabajadorSeleccionadoId,
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
      const trabajador = trabajadores.find(
        (t) => t.id === trabajadorSeleccionadoId,
      );
      const nombreCompleto = trabajador
        ? `${trabajador.nombre ?? ""} ${trabajador.apellidos ?? ""}`.trim()
        : trabajadorSeleccionadoId;

      const incidenciaConNombre = {
        ...respuestaBackend,
        trabajador_nombre_completo: nombreCompleto || "Trabajador Desconocido",
      };

      setIncidencias((prev) => [incidenciaConNombre, ...prev]);
      setComentario("");
      setFichajeAfectadoId("");
      setHoraAnterior("");
      setFechaAfectada("");
      setFirmaSolicitante(null);
    } catch (error: any) {
      mostrarError(
        "Error al crear o reportar la nueva corrección de fichaje: " +
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
    usuarioActual,
    trabajadorSeleccionadoId,
    empresaActual,
    trabajadores,
    firmaSolicitante,
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
      const { id: idCorreccion, decision } = correccionResolviendo;
      setProcesandoId(idCorreccion);
      try {
        const resuelta = await resolverCorreccion(
          idCorreccion,
          decision,
          usuarioActual.id,
          firma,
        );
        const nuevoEstado = resuelta?.estado ?? decision;
        setIncidencias((prev) =>
          prev.map((item) =>
            item.id === idCorreccion
              ? { ...item, ...resuelta, estado: nuevoEstado }
              : item,
          ),
        );
      } catch (error: any) {
        mostrarError(
          "Error al resolver la incidencia de fichaje (" +
            decision +
            "): " +
            error.message,
        );
      } finally {
        setProcesandoId(null);
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

  const listaFiltrada = useMemo(() => {
    let result = incidencias;
    if (filtroEstado === "pendientes") {
      result = result.filter((i) => i.estado === "Pendiente");
    }
    if (busquedaHistorial.trim()) {
      const query = busquedaHistorial.toLowerCase().trim();
      result = result.filter((i: any) => {
        const nombreTrabajador = (
          i.trabajador_nombre_completo || ""
        ).toLowerCase();
        const motivo = (i.motivo || "").toLowerCase();
        return nombreTrabajador.includes(query) || motivo.includes(query);
      });
    }
    return result;
  }, [incidencias, filtroEstado, busquedaHistorial]);

  return (
    <AppScreen
      title="Gestión de Incidencias"
      subtitle={`Panel integral de administración: ${empresaActual?.nombre_comercial ?? "Global"}`}
    >
      <Row>
        <StatCard
          label="Pendientes"
          value={conteoEstados.pendientes.toString()}
          tone="warning"
        />
        <StatCard
          label="Aprobadas"
          value={conteoEstados.aprobadas.toString()}
          tone="success"
        />
        <StatCard
          label="Rechazadas"
          value={conteoEstados.rechazadas.toString()}
          tone="danger"
        />
      </Row>

      <View style={styles.contenedorFiltros}>
        <Pressable
          style={[
            styles.miniBoton,
            filtroEstado === "pendientes" && styles.miniBotonActivo,
          ]}
          onPress={() => setFiltroEstado("pendientes")}
        >
          <ThemedText
            style={[
              styles.textoMiniBoton,
              filtroEstado === "pendientes" && styles.textoMiniBotonActivo,
            ]}
          >
            Pendientes ({conteoEstados.pendientes})
          </ThemedText>
        </Pressable>
        <Pressable
          style={[
            styles.miniBoton,
            filtroEstado === "todas" && styles.miniBotonActivo,
          ]}
          onPress={() => setFiltroEstado("todas")}
        >
          <ThemedText
            style={[
              styles.textoMiniBoton,
              filtroEstado === "todas" && styles.textoMiniBotonActivo,
            ]}
          >
            Historial General
          </ThemedText>
        </Pressable>
      </View>

      {filtroEstado === "pendientes" && (
        <>
          <ThemedText style={styles.sectionTitle}>
            Crear Rectificación para Trabajador
          </ThemedText>
          <Card>
            <View style={styles.contenedorForm}>
              <ThemedText style={styles.label}>
                1. Seleccionar Trabajador
              </ThemedText>
              <View style={styles.pickerContainer}>
                <Picker
                  selectedValue={trabajadorSeleccionadoId}
                  onValueChange={(val) => setTrabajadorSeleccionadoId(val)}
                  style={styles.picker}
                >
                  <Picker.Item
                    label="Selecciona un trabajador"
                    value=""
                    enabled={false}
                  />
                  {trabajadores.map((t) => (
                    <Picker.Item
                      key={t.id}
                      label={`${t.nombre} ${t.apellidos ?? ""}`.trim()}
                      value={t.id}
                    />
                  ))}
                </Picker>
              </View>

              <ThemedText style={styles.label}>2. Tipo de Acción</ThemedText>
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
                      {tipo.replace("_", " ")}
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
                      onValueChange={(val) => handleSeleccionarFichaje(val)}
                      style={styles.picker}
                    >
                      <Picker.Item
                        label="Selecciona un fichaje"
                        value=""
                        enabled={false}
                      />
                      {fichajesDisponibles.map((f) => (
                        <Picker.Item
                          key={f.id}
                          label={`${f.fecha} | ${f.hora} hs - (${f.tipo_evento})`}
                          value={f.id}
                        />
                      ))}
                    </Picker>
                  </View>
                </View>
              )}

              {tipoCorreccion !== "Anulación" && (
                <View style={styles.filaCampos}>
                  <View style={{ flex: 1 }}>
                    <ThemedText style={styles.label}>
                      Fecha Descuadre
                    </ThemedText>
                    <TextInput
                      value={fechaAfectada}
                      onChangeText={setFechaAfectada}
                      style={styles.input}
                      placeholder="AAAA-MM-DD"
                      placeholderTextColor="#94A3B8"
                      returnKeyType="next"
                      onSubmitEditing={() => horaPropuestaRef.current?.focus()}
                      blurOnSubmit={false}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <ThemedText style={styles.label}>Hora Propuesta</ThemedText>
                    <TextInput
                      ref={horaPropuestaRef}
                      value={horaRealPropuesta}
                      onChangeText={setHoraRealPropuesta}
                      style={styles.input}
                      placeholder="HH:MM"
                      placeholderTextColor="#94A3B8"
                      returnKeyType="next"
                      onSubmitEditing={() => comentarioRef.current?.focus()}
                      blurOnSubmit={false}
                    />
                  </View>
                </View>
              )}

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

              <ThemedText style={styles.label}>
                Justificación / Notas
              </ThemedText>
              <TextInput
                ref={comentarioRef}
                value={comentario}
                onChangeText={setComentario}
                style={[styles.input, styles.textArea]}
                placeholder="Motivo detallado..."
                placeholderTextColor="#94A3B8"
                maxLength={250}
                returnKeyType="done"
                onSubmitEditing={reportarIncidencia}
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

      <ThemedText style={styles.sectionTitle}>
        Auditoría y Resolución de Solicitudes
      </ThemedText>

      <View style={styles.contenedorBuscador}>
        <FontAwesome5
          name="search"
          size={14}
          color="#94A3B8"
          style={{ marginRight: 8 }}
        />
        <TextInput
          value={busquedaHistorial}
          onChangeText={setBusquedaHistorial}
          style={styles.inputBuscador}
          placeholder="Buscar por trabajador o motivo..."
          placeholderTextColor="#94A3B8"
          returnKeyType="search"
        />
        {busquedaHistorial !== "" && (
          <Pressable onPress={() => setBusquedaHistorial("")}>
            <FontAwesome5 name="times-circle" size={16} color="#94A3B8" />
          </Pressable>
        )}
      </View>

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

      {cargando && incidencias.length === 0 ? (
        <ActivityIndicator
          size="large"
          color="#EA580C"
          style={{ marginTop: 24 }}
        />
      ) : listaFiltrada.length === 0 ? (
        <ThemedText style={styles.empty}>
          No constan registros en este apartado.
        </ThemedText>
      ) : (
        <View style={{ paddingBottom: 40 }}>
          {listaFiltrada.map((item: any) => {
            const colores = getColoresEstado(item.estado);
            const isBusy = procesandoId !== null;
            const isCurrentProcessing = procesandoId === item.id;

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

                  <ThemedText style={styles.nombreTrabajador}>
                    👤 Trabajador:{" "}
                    {item.trabajador?.nombre
                      ? item.trabajador.nombre.concat(
                          " ",
                          item.trabajador.apellidos,
                          " ",
                          item.trabajador.dni_nif_nie,
                        )
                      : (item.trabajador_nombre_completo ?? "N/A")}
                  </ThemedText>
                  <ThemedText style={styles.itemMotivo}>
                    Motivo: "{item.motivo}"
                  </ThemedText>

                  {item.estado === "Pendiente" && (
                    <View style={styles.panelControlJefe}>
                      <Pressable
                        disabled={isBusy}
                        style={[
                          styles.botonResolutor,
                          styles.botonRechazar,
                          isBusy && styles.disabled,
                        ]}
                        onPress={() =>
                          handleResolverIncidencia(item.id, "Rechazada")
                        }
                      >
                        <FontAwesome5 name="times" size={12} color="#FFFFFF" />
                        <ThemedText style={styles.textoBotonResolutor}>
                          {isCurrentProcessing ? "Procesando..." : "Rechazar"}
                        </ThemedText>
                      </Pressable>
                      <Pressable
                        disabled={isBusy}
                        style={[
                          styles.botonResolutor,
                          styles.botonAprobar,
                          isBusy && styles.disabled,
                        ]}
                        onPress={() =>
                          handleResolverIncidencia(item.id, "Aprobada")
                        }
                      >
                        <FontAwesome5 name="check" size={12} color="#FFFFFF" />
                        <ThemedText style={styles.textoBotonResolutor}>
                          {isCurrentProcessing ? "Procesando..." : "Aprobar"}
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
    fontSize: 15,
    fontWeight: "800",
    color: "#1E293B",
    marginVertical: 14,
    textTransform: "uppercase",
  },
  contenedorFiltros: {
    flexDirection: "row",
    gap: 8,
    marginTop: 14,
    marginBottom: 4,
  },
  miniBoton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: "#F1F5F9",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  miniBotonActivo: { backgroundColor: "#EA580C", borderColor: "#C2410C" },
  textoMiniBoton: { fontSize: 12, color: "#475569", fontWeight: "600" },
  textoMiniBotonActivo: { color: "#FFFFFF", fontWeight: "700" },
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
  textArea: { minHeight: 65, textAlignVertical: "top", marginBottom: 16 },
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
  contenedorBuscador: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F8FAFC",
    borderWidth: 1.5,
    borderColor: "#E2E8F0",
    borderRadius: 10,
    paddingHorizontal: 12,
    marginBottom: 12,
    height: 44,
  },
  inputBuscador: { flex: 1, fontSize: 13, color: "#0F172A" },
  itemCard: { width: "100%", paddingVertical: 4 },
  headerCard: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  itemFecha: { fontSize: 13, fontWeight: "800", color: "#475569" },
  nombreTrabajador: {
    fontSize: 14,
    fontWeight: "700",
    color: "#0F172A",
    marginBottom: 6,
    backgroundColor: "#F8FAFC",
    padding: 6,
    borderRadius: 6,
  },
  itemMotivo: {
    fontSize: 13,
    color: "#64748B",
    marginTop: 6,
    fontStyle: "italic",
    lineHeight: 18,
  },
  empty: { textAlign: "center", color: "#64748B", marginTop: 24, fontSize: 14 },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6 },
  badgeText: { fontSize: 11, fontWeight: "700" },
  panelControlJefe: {
    flexDirection: "row",
    gap: 10,
    marginTop: 16,
    justifyContent: "flex-end",
    borderTopWidth: 1,
    borderTopColor: "#F1F5F9",
  },
  botonResolutor: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    minWidth: 110,
  },
  botonRechazar: { backgroundColor: "#DC2626" },
  botonAprobar: { backgroundColor: "#16A34A" },
  textoBotonResolutor: { color: "#FFFFFF", fontSize: 13, fontWeight: "700" },
});
