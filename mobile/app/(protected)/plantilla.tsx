import { ItemTurno } from "@/src/modules/turnos/types/turno";
import { FontAwesome5, MaterialCommunityIcons } from "@expo/vector-icons";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from "react-native";
import {
  asignarTurnosTrabajador,
  crearContrato,
  crearTrabajador,
  obtenerAsignacionesPorTrabajador,
  obtenerCentrosPorEmpresa,
  obtenerContratosPorTrabajador,
  obtenerTrabajadores,
  obtenerTurnoPorId,
  obtenerTurnosEmpresa,
} from "../../src/modules/trabajadores/api/services";
import { useSesion } from "../../src/modules/trabajadores/store/SesionContext";
import {
  TipoUsuario,
  Trabajador,
} from "../../src/modules/trabajadores/types/trabajador";
import { ThemedText } from "../../src/shared/components/themed-text";
import { AppScreen, Card } from "../../src/shared/ui/AppSurface";

type TipoModal =
  | "alta_trabajador"
  | "nuevo_contrato"
  | "asignar_turno"
  | "cambiar_contrato"
  | "reasignar_turno"
  | "rescindir_contrato"
  | "eliminar_turno"
  | "baja_trabajador"
  | null;

// Interfaces genéricas para los selectores
interface CentroTrabajo {
  id: string;
  nombre: string;
}

export default function PlantillaScreen() {
  const { usuarioActual } = useSesion();
  const [plantilla, setPlantilla] = useState<Trabajador[]>([]);
  const [cargando, setCargando] = useState(true);
  const [procesando, setProcesando] = useState(false);
  const [filtroEstado] = useState<"todos" | "altas">("todos");

  // Listados para selectores
  const [turnosEmpresa, setTurnosEmpresa] = useState<ItemTurno[]>([]);
  const [cargandoSelectores, setCargandoSelectores] = useState(false);

  // Control de Modales
  const [modalActivo, setModalActivo] = useState<TipoModal>(null);
  const [trabajadorSeleccionado, setTrabajadorSeleccionado] =
    useState<Trabajador | null>(null);

  // Formulario 1: Alta de Trabajador
  const [nombre, setNombre] = useState("");
  const [apellidos, setApellidos] = useState("");
  const [nifNie, setNifNie] = useState("");
  const [email, setEmail] = useState("");
  const [telefono, setTelefono] = useState("");
  const [nss, setNss] = useState("");
  const [fechaNacimiento, setFechaNacimiento] = useState("");

  // Formulario 2: Alta de Contrato
  const [tipoContrato, setTipoContrato] = useState("");
  const [tipoJornada, setTipoJornada] = useState("Completa");
  const [horasSemana, setHorasSemana] = useState("40");
  const [centroTrabajoId, setCentroTrabajoId] = useState("");

  // Formulario 3: Asignación de Turno
  const [turnosSeleccionados, setTurnosSeleccionados] = useState<any[]>([]);

  const esGestoria =
    usuarioActual?.tipo_usuario === ("admin_gestoria" as TipoUsuario);
  const esAdminEmpresa =
    usuarioActual?.tipo_usuario === ("admin_empresa" as TipoUsuario);
  const esAdministrador = esGestoria || esAdminEmpresa;

  // 1. Carga de plantilla optimizada con useCallback
  const cargarPlantilla = useCallback(async () => {
    try {
      setCargando(true);
      const trabajadores = await obtenerTrabajadores();

      const plantillaCompleta = await Promise.all(
        trabajadores.map(async (trabajador: any) => {
          try {
            const [contratos, asignaciones] = await Promise.all([
              obtenerContratosPorTrabajador(trabajador.id),
              obtenerAsignacionesPorTrabajador(trabajador.id),
            ]);

            const asignacionesConTurnoDetalle = await Promise.all(
              asignaciones.map(async (asignacion: any) => {
                try {
                  const turnoDetalle = await obtenerTurnoPorId(
                    asignacion.turno_id,
                  );
                  return { ...asignacion, turno: turnoDetalle };
                } catch (errorTurno) {
                  console.error(
                    `Error al recuperar turno maestro ${asignacion.turno_id}:`,
                    errorTurno,
                  );
                  return { ...asignacion, turno: null };
                }
              }),
            );

            return {
              ...trabajador,
              contratos: contratos || [],
              contratoActivo:
                contratos?.find((c: any) => c.activo === true) || null,
              asignacionesTurno: asignacionesConTurnoDetalle || [],
            };
          } catch (errorEmpleado) {
            console.error(
              `Error procesando relaciones para el trabajador ${trabajador.id}:`,
              errorEmpleado,
            );
            return {
              ...trabajador,
              contratos: [],
              contratoActivo: null,
              asignacionesTurno: [],
            };
          }
        }),
      );

      setPlantilla(plantillaCompleta);
    } catch (error) {
      console.error("Error global en cargarPlantilla:", error);
      Alert.alert(
        "Error de Red",
        "Fallo al sincronizar el catálogo de la plantilla.",
      );
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    if (esAdministrador) {
      cargarPlantilla();
    }
  }, [esAdministrador, cargarPlantilla]);

  // 2. Filtrado de plantilla mediante useMemo
  const plantillaFiltrada = useMemo(() => {
    return plantilla.filter((item) => {
      const esElJefeActual = item.id === usuarioActual?.trabajador_id;
      if (esElJefeActual && esAdminEmpresa) return false;

      const coincideTenant = esGestoria
        ? true
        : item.empresa_id === usuarioActual?.empresa_id;
      const coincideEstado = filtroEstado === "todos" || item.activo;

      return coincideTenant && coincideEstado;
    });
  }, [plantilla, filtroEstado, usuarioActual, esGestoria, esAdminEmpresa]);

  // CORRECCIÓN CRÍTICA: Se eliminó el useEffect extractor de turnos que causaba bucle infinito.
  // Ahora los turnos de la empresa disponibles se calculan al vuelo de forma reactiva y limpia.
  const todosLosTurnosAsignados = useMemo(() => {
    return plantillaFiltrada.flatMap((item: any) => {
      const asignaciones = Array.isArray(item.asignacionesTurno)
        ? item.asignacionesTurno
        : [];
      return asignaciones.map((a: any) => a.turno).filter(Boolean);
    });
  }, [plantillaFiltrada]);

  // Funciones de preparación de formularios
  const prepararNuevoContrato = async (trabajador: Trabajador) => {
    try {
      setCargandoSelectores(true);
      if (!usuarioActual?.empresa_id) {
        Alert.alert("Error", "No se pudo obtener el ID de la empresa.");
        return;
      }

      const datosCentros: CentroTrabajo[] = await obtenerCentrosPorEmpresa(
        usuarioActual.empresa_id,
      );

      if (datosCentros.length === 0) {
        Alert.alert(
          "Configuración requerida",
          "No se puede formalizar el contrato porque no hay ningún centro de trabajo creado. Crea uno primero.",
        );
        return;
      }

      setTrabajadorSeleccionado(trabajador);
      setModalActivo("nuevo_contrato");
    } catch {
      Alert.alert("Error", "No se pudieron obtener los centros de trabajo.");
    } finally {
      setCargandoSelectores(false);
    }
  };

  const prepararAsignarTurno = async (trabajador: Trabajador) => {
    try {
      setCargandoSelectores(true);
      if (!usuarioActual?.empresa_id) {
        Alert.alert("Error", "No se pudo obtener el ID de la empresa.");
        return;
      }
      const datosTurnos: ItemTurno[] = await obtenerTurnosEmpresa(
        usuarioActual.empresa_id,
      );

      if (datosTurnos.length === 0) {
        Alert.alert(
          "Acción bloqueada",
          "Hasta que la empresa no tenga turnos estructurales creados, no se podrá asignar un turno.",
        );
        return;
      }

      setTurnosEmpresa(datosTurnos);
      setTrabajadorSeleccionado(trabajador);
      setModalActivo("asignar_turno");
    } catch {
      Alert.alert("Error", "No se pudieron obtener los turnos de la empresa.");
    } finally {
      setCargandoSelectores(false);
    }
  };

  const cerrarModales = () => {
    setModalActivo(null);
    setTrabajadorSeleccionado(null);
    setNombre("");
    setApellidos("");
    setNifNie("");
    setEmail("");
    setTelefono("");
    setNss("");
    setFechaNacimiento("");
    setTipoContrato("");
    setCentroTrabajoId("");
    setTurnosEmpresa([]);
  };

  const handleAltaTrabajadorCompleta = async () => {
    if (!nombre || !apellidos || !nifNie || !usuarioActual?.empresa_id) {
      Alert.alert(
        "Campos obligatorios",
        "Por favor, completa los datos de identidad mínimos del operario.",
      );
      return;
    }
    try {
      setProcesando(true);
      await crearTrabajador({
        empresa_id: usuarioActual.empresa_id,
        nif_nie: nifNie.trim().toUpperCase(),
        nombre: nombre.trim(),
        apellidos: apellidos.trim(),
        email: email.trim() ? email.trim().toLowerCase() : undefined,
        telefono: telefono.trim() ? telefono.trim() : undefined,
        numero_seguridad_social: nss.trim() ? nss.trim() : undefined,
        fecha_nacimiento: fechaNacimiento.trim()
          ? fechaNacimiento.trim()
          : undefined,
      });

      Alert.alert(
        "Éxito",
        "El expediente del trabajador ha sido creado en el sistema.",
      );
      cerrarModales();
      await cargarPlantilla();
    } catch (err: any) {
      Alert.alert(
        "Error en Alta",
        err.response?.data?.detail || "No se pudo registrar el expediente.",
      );
    } finally {
      setProcesando(false);
    }
  };

  const handleGuardarContrato = async () => {
    if (
      !tipoContrato ||
      !trabajadorSeleccionado ||
      !usuarioActual?.empresa_id
    ) {
      Alert.alert(
        "Campos insuficientes",
        "Se requiere definir el Tipo de Contrato y tener un trabajador seleccionado.",
      );
      return;
    }

    try {
      setProcesando(true);
      const hoy = new Date().toISOString().split("T")[0];

      const centroIdFinal = centroTrabajoId || "1";

      await crearContrato({
        trabajador_id: trabajadorSeleccionado.id,
        empresa_id: usuarioActual.empresa_id,
        centro_trabajo_id: centroIdFinal,
        tipo_contrato: tipoContrato.trim(),
        tipo_jornada: tipoJornada,
        horas_semana: parseInt(horasSemana, 10) || 40,
        fecha_inicio: hoy,
      });

      Alert.alert("Contrato Activo", "Vínculo contractual formalizado.");
      cerrarModales();
      await cargarPlantilla();
    } catch (err: any) {
      console.error("Error al guardar contrato:", err);
      Alert.alert(
        "Error",
        err.response?.data?.detail ||
          "No se pudo registrar el contrato laboral.",
      );
    } finally {
      setProcesando(false);
    }
  };

  const handleAsignarTurnoTrabajador = async () => {
    if (!trabajadorSeleccionado) {
      Alert.alert(
        "Error",
        "No se ha detectado ningún trabajador seleccionado en el estado actual.",
      );
      return;
    }

    if (turnosSeleccionados.length === 0) {
      Alert.alert(
        "Error",
        "Debes seleccionar al menos un turno de la lista marcando las casillas.",
      );
      return;
    }

    try {
      setProcesando(true);

      await asignarTurnosTrabajador(
        trabajadorSeleccionado.id,
        turnosSeleccionados,
      );

      Alert.alert(
        "Planificación Sincronizada",
        "Los turnos operativos han sido inyectados en el cuadrante con éxito.",
      );

      setTurnosSeleccionados([]);
      cerrarModales();
      await cargarPlantilla();
    } catch (err: any) {
      console.error("Error al asignar turnos:", err);
      Alert.alert(
        "Error",
        err.response?.data?.detail || "Fallo al asignar los turnos laborales.",
      );
    } finally {
      setProcesando(false);
    }
  };

  useEffect(() => {
    if (plantillaFiltrada && plantillaFiltrada.length > 0) {
      // Extrae y aplana todos los turnos de todos los trabajadores de forma segura
      const todosLosTurnos = plantillaFiltrada.flatMap((item: any) => {
        const asignaciones = Array.isArray(item.asignacionesTurno)
          ? item.asignacionesTurno
          : [];
        return asignaciones.map((a: any) => a.turno).filter(Boolean);
      });

      setTurnosEmpresa(todosLosTurnos);
    }
  }, [plantillaFiltrada]);

  const handleEliminarTurnos = async () => {
    if (!trabajadorSeleccionado) return;
    try {
      setProcesando(true);
      // Enviamos un array vacío al backend para limpiar sus asignaciones
      await asignarTurnosTrabajador(trabajadorSeleccionado.id, []);
      Alert.alert("Éxito", "Asignaciones removidas del cuadrante.");
      cerrarModales();
      await cargarPlantilla();
    } catch (err) {
      Alert.alert("Error", "No se pudo eliminar la asignación.");
    } finally {
      setProcesando(false);
    }
  };

  return (
    <AppScreen
      title="Plantilla de trabajadores"
      subtitle="Panel de supervisión contractual, alta de expedientes y cuadrantes."
    >
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 24 }}
      >
        <Pressable
          style={styles.botonAltaGlobal}
          onPress={() => setModalActivo("alta_trabajador")}
        >
          <FontAwesome5 name="user-plus" size={14} color="#FFFFFF" />
          <ThemedText style={styles.textoAltaGlobal}>
            Dar de Alta Nuevo Trabajador
          </ThemedText>
        </Pressable>

        {cargando || cargandoSelectores ? (
          <ActivityIndicator
            size="large"
            color="#2563EB"
            style={{ marginTop: 40 }}
          />
        ) : (
          <View style={styles.contenedorLista}>
            {plantillaFiltrada.map((item) => {
              // 1. Extraemos los contratos de forma segura en una constante local
              const contratosDelTrabajador = Array.isArray(
                (item as any).contratos,
              )
                ? (item as any).contratos
                : [];

              // 2. Evaluamos si tiene contrato activo
              const tieneContratoActivo =
                contratosDelTrabajador.length > 0
                  ? true
                  : !!(item as any).contratoActivo;

              // 3. Extraemos las asignaciones de este trabajador específico
              const asignacionesDelTrabajador = Array.isArray(
                (item as any).asignacionesTurno,
              )
                ? (item as any).asignacionesTurno
                : [];

              const tieneTurnoAsignado = asignacionesDelTrabajador.length > 0;

              return (
                <Card key={item.id}>
                  {/* CABECERA: AVATAR Y ESTADO */}
                  <View style={styles.cardHeader}>
                    <View style={styles.avatarCirculo}>
                      <ThemedText style={styles.avatarTexto}>
                        {item.nombre ? item.nombre.charAt(0) : ""}
                        {item.apellidos ? item.apellidos.charAt(0) : ""}
                      </ThemedText>
                    </View>
                    <View style={{ flex: 1 }}>
                      <ThemedText style={styles.nombreEmpleado}>
                        {item.nombre} {item.apellidos}
                      </ThemedText>
                    </View>
                    <View
                      style={[
                        styles.badgeEstado,
                        {
                          backgroundColor: item.activo ? "#DCFCE7" : "#FEE2E2",
                        },
                      ]}
                    >
                      <ThemedText
                        style={[
                          styles.textoBadge,
                          { color: item.activo ? "#16803D" : "#991B1B" },
                        ]}
                      >
                        {item.activo ? "Alta Laboral" : "Baja"}
                      </ThemedText>
                    </View>
                  </View>

                  <View style={styles.separador} />

                  {/* DETALLES DE IDENTIDAD Y SEGURIDAD SOCIAL */}
                  <View style={styles.gridDetalles}>
                    <View style={styles.bloqueDato}>
                      <ThemedText style={styles.labelDato}>
                        Documento de Identidad
                      </ThemedText>
                      <ThemedText style={styles.valorDato}>
                        {item.nif_nie}
                      </ThemedText>
                    </View>
                    <View style={styles.bloqueDato}>
                      <ThemedText style={styles.labelDato}>
                        Número Seg. Social
                      </ThemedText>
                      <ThemedText style={styles.valorDato}>
                        {item.numero_seguridad_social ?? "Pendiente"}
                      </ThemedText>
                    </View>
                  </View>

                  <View style={[styles.gridDetalles, { marginTop: 8 }]}>
                    <View style={styles.bloqueDato}>
                      <ThemedText style={styles.labelDato}>
                        Teléfono Móvil
                      </ThemedText>
                      <ThemedText style={styles.valorDato}>
                        {item.telefono ?? "No registrado"}
                      </ThemedText>
                    </View>
                    <View style={styles.bloqueDato}>
                      <ThemedText style={styles.labelDato}>
                        Fecha Alta Empresa
                      </ThemedText>
                      <ThemedText style={styles.valorDato}>
                        {item.fecha_alta_empresa}
                      </ThemedText>
                    </View>
                  </View>

                  <View style={styles.separadorDashed} />

                  {/* CONTENEDOR PRINCIPAL DE AUDITORÍA Y ACCIONES INTERNAS */}
                  <View style={styles.contenedorAuditoria}>
                    {/* SECCIÓN 1: CONTRATO */}
                    <View style={styles.filaAuditoriaItem}>
                      <FontAwesome5
                        name="file-contract"
                        size={13}
                        color={tieneContratoActivo ? "#16803D" : "#EA580C"}
                      />
                      <View
                        style={{
                          flex: 1,
                          flexDirection: "column",
                          marginLeft: 6,
                        }}
                      >
                        <ThemedText
                          style={[
                            styles.textoAuditoria,
                            {
                              color: tieneContratoActivo
                                ? "#16803D"
                                : "#EA580C",
                            },
                          ]}
                        >
                          {tieneContratoActivo
                            ? "Contrato en vigor registrado"
                            : "⚠️ Alerta: El trabajador carece de contrato activo"}
                        </ThemedText>

                        {tieneContratoActivo &&
                          contratosDelTrabajador.length > 0 && (
                            <ThemedText
                              style={{
                                color: "#64748B",
                                fontSize: 12,
                                marginTop: 2,
                              }}
                            >
                              {"Tipo: " +
                                contratosDelTrabajador
                                  .map((c: any) => c.tipo_contrato || "General")
                                  .join(", ")}
                            </ThemedText>
                          )}

                        {/* OPCIONES ABAJO DEL CONTRATO */}
                        {tieneContratoActivo ? (
                          <View
                            style={{
                              flexDirection: "row",
                              marginTop: 8,
                              gap: 8,
                            }}
                          >
                            <Pressable
                              style={[
                                styles.botonAccionSecundario,
                                { backgroundColor: "#EFF6FF" },
                              ]}
                              onPress={() => {
                                setTrabajadorSeleccionado(item);
                                setModalActivo("cambiar_contrato");
                              }}
                            >
                              <FontAwesome5
                                name="edit"
                                size={10}
                                color="#2563EB"
                              />
                              <ThemedText
                                style={{
                                  color: "#2563EB",
                                  fontSize: 11,
                                  fontWeight: "600",
                                  marginLeft: 4,
                                }}
                              >
                                Cambiar Contrato
                              </ThemedText>
                            </Pressable>

                            <Pressable
                              style={[
                                styles.botonAccionSecundario,
                                { backgroundColor: "#FEF2F2" },
                              ]}
                              onPress={() => {
                                setTrabajadorSeleccionado(item);
                                setModalActivo("rescindir_contrato");
                              }}
                            >
                              <FontAwesome5
                                name="file-signature"
                                size={10}
                                color="#DC2626"
                              />
                              <ThemedText
                                style={{
                                  color: "#DC2626",
                                  fontSize: 11,
                                  fontWeight: "600",
                                  marginLeft: 4,
                                }}
                              >
                                Rescindir
                              </ThemedText>
                            </Pressable>
                          </View>
                        ) : (
                          <View style={{ flexDirection: "row", marginTop: 8 }}>
                            <Pressable
                              style={[
                                styles.botonAccionSecundario,
                                { backgroundColor: "#2563EB" },
                              ]}
                              onPress={() => {
                                setTrabajadorSeleccionado(item);
                                setModalActivo("nuevo_contrato");
                              }}
                            >
                              <FontAwesome5
                                name="plus"
                                size={10}
                                color="#FFFFFF"
                              />
                              <ThemedText
                                style={{
                                  color: "#FFFFFF",
                                  fontSize: 11,
                                  fontWeight: "600",
                                  marginLeft: 4,
                                }}
                              >
                                Alta Contrato
                              </ThemedText>
                            </Pressable>
                          </View>
                        )}
                      </View>
                    </View>

                    <View style={[styles.separador, { marginVertical: 12 }]} />

                    {/* SECCIÓN 2: TURNOS */}
                    <View style={styles.filaAuditoriaItem}>
                      <MaterialCommunityIcons
                        name="calendar-clock"
                        size={15}
                        color={tieneTurnoAsignado ? "#16803D" : "#EA580C"}
                      />
                      <View
                        style={{
                          flex: 1,
                          flexDirection: "column",
                          marginLeft: 6,
                        }}
                      >
                        <ThemedText
                          style={[
                            styles.textoAuditoria,
                            {
                              color: tieneTurnoAsignado ? "#16803D" : "#EA580C",
                            },
                          ]}
                        >
                          {tieneTurnoAsignado
                            ? "Turno asignado en cuadrante"
                            : "⚠️ Sin asignación horaria de turnos en este mes"}
                        </ThemedText>

                        {tieneTurnoAsignado && (
                          <ThemedText
                            style={{
                              color: "#64748B",
                              fontSize: 12,
                              marginTop: 2,
                            }}
                          >
                            {"Turnos: " +
                              asignacionesDelTrabajador
                                .map((t: any) => t.turno?.nombre || t.turno_id)
                                .join(", ")}
                          </ThemedText>
                        )}

                        {/* OPCIONES ABAJO DE LOS TURNOS */}
                        {tieneTurnoAsignado ? (
                          <View
                            style={{
                              flexDirection: "row",
                              marginTop: 8,
                              gap: 8,
                            }}
                          >
                            <Pressable
                              style={[
                                styles.botonAccionSecundario,
                                { backgroundColor: "#FDF4FF" },
                              ]}
                              onPress={() => {
                                setTrabajadorSeleccionado(item);
                                setModalActivo("reasignar_turno");
                              }}
                            >
                              <MaterialCommunityIcons
                                name="calendar-refresh"
                                size={12}
                                color="#D946EF"
                              />
                              <ThemedText
                                style={{
                                  color: "#D946EF",
                                  fontSize: 11,
                                  fontWeight: "600",
                                  marginLeft: 4,
                                }}
                              >
                                Reasignar Turno
                              </ThemedText>
                            </Pressable>

                            <Pressable
                              style={[
                                styles.botonAccionSecundario,
                                { backgroundColor: "#FFF5EB" },
                              ]}
                              onPress={() => {
                                setTrabajadorSeleccionado(item);
                                setModalActivo("eliminar_turno");
                              }}
                            >
                              <MaterialCommunityIcons
                                name="calendar-remove"
                                size={12}
                                color="#EA580C"
                              />
                              <ThemedText
                                style={{
                                  color: "#EA580C",
                                  fontSize: 11,
                                  fontWeight: "600",
                                  marginLeft: 4,
                                }}
                              >
                                Eliminar Asignación
                              </ThemedText>
                            </Pressable>
                          </View>
                        ) : (
                          <View style={{ flexDirection: "row", marginTop: 8 }}>
                            <Pressable
                              style={[
                                styles.botonAccionSecundario,
                                { backgroundColor: "#16A34A" },
                              ]}
                              onPress={() => prepararAsignarTurno(item)}
                            >
                              <MaterialCommunityIcons
                                name="calendar-plus"
                                size={12}
                                color="#FFFFFF"
                              />
                              <ThemedText
                                style={{
                                  color: "#FFFFFF",
                                  fontSize: 11,
                                  fontWeight: "600",
                                  marginLeft: 4,
                                }}
                              >
                                Asignar Turno
                              </ThemedText>
                            </Pressable>
                          </View>
                        )}
                      </View>
                    </View>
                  </View>

                  {/* SECCIÓN 3: DAR DE BAJA AL TRABAJADOR (ABAJO DE AMBOS BLOQUES) */}
                  {item.activo && (
                    <View
                      style={{
                        marginTop: 4,
                        paddingTop: 8,
                        borderTopWidth: 1,
                        borderTopColor: "#E2E8F0",
                        borderStyle: "dashed",
                      }}
                    >
                      <Pressable
                        style={styles.botonBajaEmpresa}
                        onPress={() => {
                          setTrabajadorSeleccionado(item);
                          setModalActivo("baja_trabajador");
                        }}
                      >
                        <FontAwesome5
                          name="user-slash"
                          size={11}
                          color="#991B1B"
                        />
                        <ThemedText style={styles.textoBotonBajaEmpresa}>
                          Tramitar Baja del Trabajador en Empresa
                        </ThemedText>
                      </Pressable>
                    </View>
                  )}
                </Card>
              );
            })}
          </View>
        )}
      </ScrollView>

      {/* MODAL MODULAR PARA OPERACIONES ADMINISTRATIVAS */}
      <Modal visible={modalActivo !== null} animationType="slide" transparent>
        <View style={styles.overlayModal}>
          <View style={styles.ventanaModal}>
            <View style={styles.modalHeader}>
              <ThemedText style={styles.modalTitulo}>
                {modalActivo === "alta_trabajador" &&
                  "Alta de Expediente (Trabajador)"}
                {modalActivo === "nuevo_contrato" &&
                  "Formalizar Contrato Legal"}
                {modalActivo === "cambiar_contrato" &&
                  "Modificar Contrato Existente"}
                {modalActivo === "rescindir_contrato" &&
                  "Rescindir Contrato Laboral"}
                {modalActivo === "baja_trabajador" &&
                  "Tramitar Baja en Empresa"}
                {modalActivo === "asignar_turno" && "Asignar Turno de Trabajo"}
                {modalActivo === "reasignar_turno" &&
                  "Reasignar Turno (Modificación)"}
                {modalActivo === "eliminar_turno" && "Quitar Turno Asignado"}
              </ThemedText>
              <Pressable onPress={cerrarModales}>
                <FontAwesome5 name="times" size={18} color="#64748B" />
              </Pressable>
            </View>

            <ScrollView contentContainerStyle={{ paddingVertical: 10 }}>
              {/* FORMULARIO: REGISTRO DE TRABAJADOR */}
              {modalActivo === "alta_trabajador" && (
                <View>
                  <View style={styles.campoForm}>
                    <ThemedText style={styles.labelForm}>Nombre *</ThemedText>
                    <TextInput
                      style={styles.inputForm}
                      value={nombre}
                      onChangeText={setNombre}
                      placeholder="Nombre de pila"
                    />
                  </View>
                  <View style={styles.campoForm}>
                    <ThemedText style={styles.labelForm}>
                      Apellidos *
                    </ThemedText>
                    <TextInput
                      style={styles.inputForm}
                      value={apellidos}
                      onChangeText={setApellidos}
                      placeholder="Apellidos completos"
                    />
                  </View>
                  <View style={styles.campoForm}>
                    <ThemedText style={styles.labelForm}>
                      NIF / NIE *
                    </ThemedText>
                    <TextInput
                      style={styles.inputForm}
                      value={nifNie}
                      onChangeText={setNifNie}
                      autoCapitalize="characters"
                      placeholder="Ej: 12345678Z"
                    />
                  </View>
                  <View style={styles.campoForm}>
                    <ThemedText style={styles.labelForm}>
                      Email Opcional
                    </ThemedText>
                    <TextInput
                      style={styles.inputForm}
                      value={email}
                      onChangeText={setEmail}
                      keyboardType="email-address"
                      autoCapitalize="none"
                      placeholder="correo@empresa.com"
                    />
                  </View>
                  <View style={styles.campoForm}>
                    <ThemedText style={styles.labelForm}>
                      Teléfono Móvil
                    </ThemedText>
                    <TextInput
                      style={styles.inputForm}
                      value={telefono}
                      onChangeText={setTelefono}
                      keyboardType="phone-pad"
                      placeholder="Ej: +34600111222"
                    />
                  </View>
                  <View style={styles.campoForm}>
                    <ThemedText style={styles.labelForm}>
                      Número Seguridad Social
                    </ThemedText>
                    <TextInput
                      style={styles.inputForm}
                      value={nss}
                      onChangeText={setNss}
                      keyboardType="numeric"
                      placeholder="Ej: 281234567890"
                    />
                  </View>
                  <View style={styles.campoForm}>
                    <ThemedText style={styles.labelForm}>
                      Fecha Nacimiento (AAAA-MM-DD)
                    </ThemedText>
                    <TextInput
                      style={styles.inputForm}
                      value={fechaNacimiento}
                      onChangeText={setFechaNacimiento}
                      placeholder="Ej: 1995-04-25"
                    />
                  </View>
                  <Pressable
                    style={styles.btnGuardarModal}
                    onPress={handleAltaTrabajadorCompleta}
                    disabled={procesando}
                  >
                    {procesando ? (
                      <ActivityIndicator size="small" color="#FFFFFF" />
                    ) : (
                      <ThemedText style={styles.btnGuardarModalTexto}>
                        Guardar Expediente
                      </ThemedText>
                    )}
                  </Pressable>
                </View>
              )}

              {/* FORMULARIO: ALTA / CAMBIO DE CONTRATO */}
              {(modalActivo === "nuevo_contrato" ||
                modalActivo === "cambiar_contrato") && (
                <View>
                  <ThemedText style={styles.subtituloModal}>
                    Trabajador: {trabajadorSeleccionado?.nombre}{" "}
                    {trabajadorSeleccionado?.apellidos}
                  </ThemedText>

                  <View style={styles.campoForm}>
                    <ThemedText style={styles.labelForm}>
                      Tipo de Contrato *
                    </ThemedText>
                    <TextInput
                      style={styles.inputForm}
                      value={tipoContrato}
                      onChangeText={setTipoContrato}
                      placeholder="Ej: INDEFINIDO, TEMPORAL..."
                    />
                  </View>
                  <View style={styles.campoForm}>
                    <ThemedText style={styles.labelForm}>
                      Tipo Jornada
                    </ThemedText>
                    <TextInput
                      style={styles.inputForm}
                      value={tipoJornada}
                      onChangeText={setTipoJornada}
                      placeholder="Ej: Completa / Parcial"
                    />
                  </View>
                  <View style={styles.campoForm}>
                    <ThemedText style={styles.labelForm}>
                      Horas por Semana
                    </ThemedText>
                    <TextInput
                      style={styles.inputForm}
                      value={horasSemana}
                      onChangeText={setHorasSemana}
                      keyboardType="numeric"
                      placeholder="40"
                    />
                  </View>
                  <Pressable
                    style={[
                      styles.btnGuardarModal,
                      {
                        backgroundColor:
                          modalActivo === "cambiar_contrato"
                            ? "#2563EB"
                            : "#16A34A",
                      },
                    ]}
                    onPress={handleGuardarContrato}
                    disabled={procesando}
                  >
                    {procesando ? (
                      <ActivityIndicator size="small" color="#FFFFFF" />
                    ) : (
                      <ThemedText style={styles.btnGuardarModalTexto}>
                        {modalActivo === "cambiar_contrato"
                          ? "Actualizar Contrato"
                          : "Formalizar Alta Contrato"}
                      </ThemedText>
                    )}
                  </Pressable>
                </View>
              )}

              {/* FORMULARIO: RESCINDIR CONTRATO O BAJA TRABAJADOR */}
              {(modalActivo === "rescindir_contrato" ||
                modalActivo === "baja_trabajador") && (
                <View>
                  <ThemedText
                    style={[
                      styles.subtituloModal,
                      { color: "#991B1B", marginBottom: 16 },
                    ]}
                  >
                    ¿Está seguro de que desea proceder con esta operación para{" "}
                    {trabajadorSeleccionado?.nombre}? Esta acción modificará su
                    estado laboral inmediato.
                  </ThemedText>
                  <Pressable
                    style={[
                      styles.btnGuardarModal,
                      { backgroundColor: "#DC2626" },
                    ]}
                    onPress={
                      modalActivo === "rescindir_contrato"
                        ? handleGuardarContrato
                        : handleAltaTrabajadorCompleta
                    }
                    disabled={procesando}
                  >
                    {procesando ? (
                      <ActivityIndicator size="small" color="#FFFFFF" />
                    ) : (
                      <ThemedText style={styles.btnGuardarModalTexto}>
                        Confirmar Operación
                      </ThemedText>
                    )}
                  </Pressable>
                </View>
              )}
              {/* FORMULARIO: ASIGNAR / REASIGNAR TURNO (MULTISELECCIÓN) */}
              {(modalActivo === "asignar_turno" ||
                modalActivo === "reasignar_turno") && (
                <View style={styles.contenedorModal}>
                  <View style={styles.campoForm}>
                    <ThemedText style={styles.labelForm}>
                      {modalActivo === "reasignar_turno"
                        ? "Seleccione los Nuevos Turnos (Puede elegir varios) *"
                        : "Turnos de la Empresa (Puede elegir varios) *"}
                    </ThemedText>

                    <View style={styles.contenedorSelectorScroll}>
                      <ScrollView
                        style={{ maxHeight: 160 }}
                        nestedScrollEnabled={true}
                        showsVerticalScrollIndicator={true}
                      >
                        {turnosEmpresa.length === 0 ? (
                          <View style={{ padding: 16, alignItems: "center" }}>
                            <ThemedText
                              style={{ color: "#6B7280", fontSize: 14 }}
                            >
                              No hay turnos disponibles configurados.
                            </ThemedText>
                          </View>
                        ) : (
                          turnosEmpresa.map((turno: ItemTurno) => {
                            // NOTA CRÍTICA: Si tus turnos repiten ID entre semanas, usa una clave compuesta única.
                            // Por ejemplo: const identificadorUnico = `${turno.id}-${turno.fecha O turno.semana}`;
                            // Si cada objeto en 'turnosEmpresa' ya tiene un ID 100% único global, usa solo 'turno.id'.
                            const identificadorUnico = turno.id;

                            // Comprobamos si este identificador específico ya está en el array de seleccionados
                            const seleccionado =
                              turnosSeleccionados.includes(identificadorUnico);

                            const handleManejarSeleccion = () => {
                              if (seleccionado) {
                                // Si ya estaba seleccionado, lo removemos del array
                                setTurnosSeleccionados(
                                  turnosSeleccionados.filter(
                                    (id) => id !== identificadorUnico,
                                  ),
                                );
                              } else {
                                // Si no estaba, lo agregamos conservando los anteriores
                                setTurnosSeleccionados([
                                  ...turnosSeleccionados,
                                  identificadorUnico,
                                ]);
                              }
                            };

                            return (
                              <Pressable
                                key={identificadorUnico}
                                accessible={true}
                                accessibilityRole="checkbox" // Cambiado a checkbox porque ahora es selección múltiple
                                accessibilityState={{ checked: seleccionado }}
                                accessibilityLabel={`Turno ${turno.nombre}`}
                                style={[
                                  styles.opcionSelector,
                                  seleccionado &&
                                    styles.opcionSelectorSeleccionada,
                                ]}
                                onPress={handleManejarSeleccion}
                              >
                                <View style={{ flex: 1 }}>
                                  <ThemedText
                                    style={[
                                      styles.textoOpcion,
                                      seleccionado &&
                                        styles.textoOpcionSeleccionada,
                                    ]}
                                  >
                                    {turno.nombre}
                                  </ThemedText>
                                  {/* Opcional: Si el objeto trae información de la semana/fecha, muéstrala aquí para diferenciarlos */}
                                  {turno.fecha_real && (
                                    <ThemedText
                                      style={{
                                        fontSize: 11,
                                        color: "#6B7280",
                                        marginTop: 2,
                                      }}
                                    >
                                      {turno.fecha_real}
                                    </ThemedText>
                                  )}
                                </View>

                                {seleccionado && (
                                  <FontAwesome5
                                    name="check-square"
                                    size={16}
                                    color="#2563EB"
                                  />
                                )}
                              </Pressable>
                            );
                          })
                        )}
                      </ScrollView>
                    </View>
                  </View>

                  {/* BOTONES DE ACCIÓN */}
                  <View style={styles.contenedorAccionesModal}>
                    <Pressable
                      accessible={true}
                      accessibilityRole="button"
                      style={styles.btnCancelarModal}
                      onPress={() => {
                        setTurnosSeleccionados([]); // Limpiamos la selección al cerrar
                        setModalActivo(null);
                      }}
                      disabled={procesando}
                    >
                      <ThemedText style={styles.btnCancelarModalTexto}>
                        Cancelar
                      </ThemedText>
                    </Pressable>

                    <Pressable
                      accessible={true}
                      accessibilityRole="button"
                      accessibilityState={{
                        disabled:
                          procesando || turnosSeleccionados.length === 0,
                      }}
                      style={[
                        styles.btnGuardarModal,
                        {
                          backgroundColor:
                            modalActivo === "reasignar_turno"
                              ? "#D946EF"
                              : "#2563EB",
                        },
                        (procesando || turnosSeleccionados.length === 0) && {
                          opacity: 0.5,
                        },
                      ]}
                      onPress={handleAsignarTurnoTrabajador} // Pasamos el array de IDs seleccionados
                      disabled={procesando || turnosSeleccionados.length === 0}
                    >
                      {procesando ? (
                        <ActivityIndicator size="small" color="#FFFFFF" />
                      ) : (
                        <ThemedText style={styles.btnGuardarModalTexto}>
                          {modalActivo === "reasignar_turno"
                            ? `Actualizar (${turnosSeleccionados.length})`
                            : `Asignar (${turnosSeleccionados.length})`}
                        </ThemedText>
                      )}
                    </Pressable>
                  </View>
                </View>
              )}

              {/* FORMULARIO: ELIMINAR ASIGNACIÓN DE TURNO */}
              {modalActivo === "eliminar_turno" && (
                <View>
                  <ThemedText
                    style={[styles.subtituloModal, { marginBottom: 16 }]}
                  >
                    ¿Desea desvincular los turnos activos de{" "}
                    {trabajadorSeleccionado?.nombre} para el mes actual?
                  </ThemedText>
                  <Pressable
                    style={[
                      styles.btnGuardarModal,
                      { backgroundColor: "#EA580C" },
                    ]}
                    onPress={handleEliminarTurnos}
                    disabled={procesando}
                  >
                    {procesando ? (
                      <ActivityIndicator size="small" color="#FFFFFF" />
                    ) : (
                      <ThemedText style={styles.btnGuardarModalTexto}>
                        Confirmar Eliminación de Asignación
                      </ThemedText>
                    )}
                  </Pressable>
                </View>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  contenedorLista: { gap: 14, marginTop: 14 },
  botonAltaGlobal: {
    flexDirection: "row",
    backgroundColor: "#0F172A",
    height: 46,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
    marginTop: 4,
  },
  textoAltaGlobal: { color: "#FFFFFF", fontSize: 14, fontWeight: "700" },
  cardHeader: { flexDirection: "row", alignItems: "center", gap: 10 },
  avatarCirculo: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#EFF6FF",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#BFDBFE",
  },
  avatarTexto: { fontSize: 14, fontWeight: "800", color: "#2563EB" },
  nombreEmpleado: { fontSize: 15, fontWeight: "800", color: "#0F172A" },
  badgeEstado: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  textoBadge: { fontSize: 11, fontWeight: "700", textTransform: "uppercase" },
  separador: { height: 1, backgroundColor: "#F1F5F9", marginVertical: 10 },
  separadorDashed: {
    height: 1,
    backgroundColor: "#E2E8F0",
    marginVertical: 10,
    borderStyle: "dashed",
    borderWidth: 1,
    borderRadius: 1,
  },
  gridDetalles: { flexDirection: "row", width: "100%", gap: 12 },
  bloqueDato: { flex: 1 },
  labelDato: { fontSize: 11, color: "#64748B", fontWeight: "600" },
  valorDato: {
    fontSize: 13,
    color: "#334155",
    fontWeight: "700",
    marginTop: 2,
  },
  contenedorAuditoria: {
    backgroundColor: "#F8FAFC",
    padding: 8,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  filaAuditoriaItem: { flexDirection: "row", alignItems: "center", gap: 6 },
  textoAuditoria: { fontSize: 12, fontWeight: "600" },
  panelAccionesJefe: {
    flexDirection: "row",
    gap: 10,
    marginTop: 12,
    justifyContent: "flex-end",
  },
  botonAccionAdmin: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    minWidth: 110,
  },
  botonContrato: { backgroundColor: "#16A34A" },
  botonTurno: { backgroundColor: "#2563EB" },
  textoBotonAdmin: { color: "#FFFFFF", fontSize: 12, fontWeight: "700" },
  textoVacio: {
    textAlign: "center",
    color: "#64748B",
    marginTop: 32,
    fontStyle: "italic",
  },
  overlayModal: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.6)",
    justifyContent: "flex-end",
  },
  ventanaModal: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    maxHeight: "85%",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  modalTitulo: { fontSize: 16, fontWeight: "900", color: "#0F172A" },
  subtituloModal: {
    fontSize: 13,
    fontWeight: "600",
    color: "#475569",
    marginBottom: 12,
  },
  campoForm: { marginBottom: 12 },
  labelForm: {
    fontSize: 12,
    fontWeight: "700",
    color: "#475569",
    marginBottom: 4,
  },
  inputForm: {
    borderWidth: 1.5,
    borderColor: "#E2E8F0",
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 44,
    backgroundColor: "#F8FAFC",
    fontSize: 14,
    color: "#0F172A",
  },
  contenedorSelectorScroll: {
    borderWidth: 1.5,
    borderColor: "#E2E8F0",
    borderRadius: 10,
    backgroundColor: "#F8FAFC",
    padding: 4,
  },
  opcionSelector: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 6,
  },
  opcionSelectorSeleccionada: {
    backgroundColor: "#EFF6FF",
  },
  textoOpcion: {
    fontSize: 14,
    color: "#334155",
  },
  textoOpcionSeleccionada: {
    color: "#2563EB",
    fontWeight: "700",
  },
  btnGuardarModal: {
    backgroundColor: "#0F172A",
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
  },
  btnGuardarModalTexto: { color: "#FFFFFF", fontSize: 14, fontWeight: "700" },
  botonAccionSecundario: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 0.5,
    borderColor: "rgba(0,0,0,0.05)",
  },
  botonBajaEmpresa: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FEE2E2",
    paddingVertical: 10,
    borderRadius: 8,
    marginTop: 4,
  },
  textoBotonBajaEmpresa: {
    color: "#991B1B",
    fontSize: 12,
    fontWeight: "700",
    marginLeft: 8,
  },
  contenedorModal: {
    padding: 16,
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    marginTop: 10,
  },
  tituloModalInterno: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 8,
    color: "#1F2937",
  },
  contenedorAccionesModal: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 12,
    marginTop: 20,
  },
  btnCancelarModal: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    backgroundColor: "#F3F4F6",
    justifyContent: "center",
    alignItems: "center",
  },
  btnCancelarModalTexto: {
    color: "#4B5563",
    fontWeight: "600",
    fontSize: 14,
  },
});
