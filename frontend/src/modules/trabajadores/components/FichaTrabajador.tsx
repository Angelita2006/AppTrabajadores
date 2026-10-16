import { ThemedText } from "@/src/shared/components/ThemedText";
import { Can } from "@/src/shared/components/Can";
import { Card } from "@/src/shared/ui/AppSurface";
import { FontAwesome5, MaterialCommunityIcons } from "@expo/vector-icons";
import React, { useEffect, useState } from "react";
import { Platform, Pressable, View } from "react-native";
import { obtenerAsignacionesTurnoTrabajador } from "../../asignaciones-turno/api/services";
import { AsignacionTurno } from "../../asignaciones-turno/types/asignacion-turno";
import { obtenerContratoActivoTrabajador } from "../../contratos/api/services";
import { Contrato } from "../../contratos/types/contrato";
import { obtenerCalendariosContrato } from "../../contratos-calendarios/api/services";
import { ContratoCalendarioResponse } from "../../contratos-calendarios/types/contrato-calendario";
import { ImagenConToken } from "../../empresas/components/Archivos";
import { obtenerTurnoPorId } from "../../turnos/api/services";
import { Turno } from "../../turnos/types/turno";
import { ESTADOS_TRABAJADOR, FichaTrabajadorProps } from "../types/trabajador";

/**
 * Mapeo de los estados del trabajador a un texto legible para mostrar en pantalla.
 */
const TEXTO_ESTADOS_TRABAJADOR: Record<string, string> = {
  [ESTADOS_TRABAJADOR.INACTIVO]: "Inactivo",
  [ESTADOS_TRABAJADOR.ACTIVO]: "Activo",
  [ESTADOS_TRABAJADOR.TRABAJANDO]: "Trabajando",
  [ESTADOS_TRABAJADOR.DESCANSANDO]: "Descansando",
  [ESTADOS_TRABAJADOR.HORAS_EXTRA]: "Horas Extra",
  [ESTADOS_TRABAJADOR.VACACIONES]: "Vacaciones",
  [ESTADOS_TRABAJADOR.BAJA]: "Baja",
};

/**
 * Extendemos las props para incluir la función que maneja el modal de error desde el padre.
 */
export interface FichaTrabajadorConErrorProps extends FichaTrabajadorProps {
  onMostrarError?: (mensaje: string) => void;
}

/**
 * Componente de tarjeta informativa que representa la ficha de un trabajador.
 */
export const FichaTrabajador: React.FC<FichaTrabajadorConErrorProps> = ({
  item,
  onSeleccionarTrabajador,
  setModalActivo,
  abrirEdicionContrato,
  prepararAsignarTurno,
  styles,
  onMostrarError,
}) => {
  const [turnos, setTurnos] = useState<Turno[]>([]);

  const [contratoActivo, setContratoActivo] = useState<Contrato | null>(null);
  const [calendariosContrato, setCalendariosContrato] = useState<ContratoCalendarioResponse[]>([]);
  const [asignacionesTurno, setAsignacionesTurno] = useState<AsignacionTurno[]>(
    [],
  );

  const fechaHoy = new Date().toLocaleDateString("en-CA");

  const esAsignacionVigente = (asignacion: AsignacionTurno): boolean => {
    if (!asignacion) return false;
    const fechaInicio = asignacion.fecha_inicio
      ? asignacion.fecha_inicio.split("T")[0]
      : null;
    const fechaFin = asignacion.fecha_fin
      ? asignacion.fecha_fin.split("T")[0]
      : null;

    if (fechaInicio && fechaInicio > fechaHoy) return false;
    if (fechaFin && fechaFin < fechaHoy) return false;
    return true;
  };

  const asignacionesVigentes = asignacionesTurno.filter(esAsignacionVigente);

  // Efecto para buscar los datos relacionales (Contrato y Turnos) al montar o cambiar de trabajador
  useEffect(() => {
    let isMounted = true;

    const cargarDatosTrabajador = async () => {
      try {
        const [asignacionesData, contratoData] = await Promise.all([
          obtenerAsignacionesTurnoTrabajador(item.id),
          obtenerContratoActivoTrabajador(item.id, item.empresa_id).catch(
            () => null,
          ),
        ]);

        if (isMounted) {
          setAsignacionesTurno(asignacionesData || []);
          setContratoActivo(contratoData);
          if (contratoData?.id) {
            const relacionesCalendario = await obtenerCalendariosContrato(contratoData.id);
            if (isMounted) setCalendariosContrato(relacionesCalendario.filter((relacion) => relacion.activa));
          } else {
            setCalendariosContrato([]);
          }
        }
      } catch (error) {
        const mensaje = "Error al cargar los datos del trabajador: " + error;
        if (onMostrarError) {
          onMostrarError(mensaje);
        } else {
          console.error(mensaje);
        }
      }
    };

    cargarDatosTrabajador();

    return () => {
      isMounted = false;
    };
  }, [item.id, item.empresa_id, onMostrarError]);

  useEffect(() => {
    let isMounted = true;

    const cargarNombresTurnos = async () => {
      if (asignacionesVigentes.length === 0) {
        if (isMounted) setTurnos([]);
        return;
      }

      try {
        const promesasTurnos = asignacionesVigentes.map((asignacion) =>
          obtenerTurnoPorId(asignacion.turno_id),
        );
        const turnosObtenidos = await Promise.all(promesasTurnos);
        if (isMounted) setTurnos(turnosObtenidos.filter(Boolean) as Turno[]);
      } catch (error) {
        const mensaje = "Error al cargar los nombres de los turnos: " + error;
        if (onMostrarError) {
          onMostrarError(mensaje);
        } else {
          console.error(mensaje);
        }
      }
    };

    cargarNombresTurnos();

    return () => {
      isMounted = false;
    };
  }, [asignacionesVigentes.length, onMostrarError]);

  // Obtener la representación textual del estado usando el const
  const textoEstado =
    TEXTO_ESTADOS_TRABAJADOR[
      item.estado
    ] ?? "Desconocido";

  return (
    <Card>
      {/* Cabecera de la Ficha: Foto, Nombre completo y Estado Laboral */}
      <View style={styles.cardHeader}>
        {item.foto_url ? (
          <ImagenConToken
            rutaRelativa={item.foto_url}
            style={[
              styles.avatarCirculo,
              { width: 40, height: 40, borderRadius: 20 },
            ]}
          />
        ) : (
          <View style={styles.avatarCirculo}>
            <ThemedText style={styles.avatarTexto}>
              {item.nombre?.charAt(0)}
              {item.apellidos?.charAt(0)}
            </ThemedText>
          </View>
        )}
        <View style={{ flex: 1, marginLeft: 8 }}>
          <ThemedText style={styles.nombreEmpleado}>
            {item.nombre} {item.apellidos}
          </ThemedText>
          <ThemedText style={{ fontSize: 11, color: "#64748B" }}>
            Puesto: {contratoActivo?.puesto_trabajo || "Sin puesto asignado"}
            {Platform.OS == "android" ? "\n" : " | "}Estado: {textoEstado}
          </ThemedText>
        </View>
        <View
          style={[
            styles.badgeEstado,
            { backgroundColor: item.activo ? "#DCFCE7" : "#FEE2E2" },
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

      {/* Cuadrícula de datos personales e identificación */}
      <View style={styles.gridDetalles}>
        <View style={styles.bloqueDato}>
          <ThemedText style={styles.labelDato}>
            Documento de Identidad
          </ThemedText>
          <ThemedText style={styles.valorDato}>{item.dni_nif_nie}</ThemedText>
        </View>
        <View style={styles.bloqueDato}>
          <ThemedText style={styles.labelDato}>Número Seg. Social</ThemedText>
          <ThemedText style={styles.valorDato}>
            {item.numero_seguridad_social ?? "Pendiente"}
          </ThemedText>
        </View>
      </View>

      {/* Cuadrícula de contacto, fechas y detalles adicionales */}
      <View style={[styles.gridDetalles, { marginTop: 8 }]}>
        <View style={styles.bloqueDato}>
          <ThemedText style={styles.labelDato}>Teléfono Móvil</ThemedText>
          <ThemedText style={styles.valorDato}>
            {item.usuario?.telefono ?? item.telefono ?? "No registrado"}
          </ThemedText>
        </View>
        <View style={styles.bloqueDato}>
          <ThemedText style={styles.labelDato}>Correo Electrónico</ThemedText>
          <ThemedText style={styles.valorDato}>
            {item.usuario?.email ?? item.email ?? "No registrado"}
          </ThemedText>
        </View>
      </View>

      <View style={[styles.gridDetalles, { marginTop: 8 }]}>
        <View style={styles.bloqueDato}>
          <ThemedText style={styles.labelDato}>Fecha de Nacimiento</ThemedText>
          <ThemedText style={styles.valorDato}>
            {item.fecha_nacimiento}
          </ThemedText>
        </View>
        <View style={styles.bloqueDato}>
          <ThemedText style={styles.labelDato}>Fecha Alta Empresa</ThemedText>
          <ThemedText style={styles.valorDato}>
            {item.fecha_alta_empresa}
          </ThemedText>
        </View>
      </View>

      <View style={styles.separadorDashed} />

      {/* Sección de Auditoría y Gestión de Contrato */}
      <View style={styles.contenedorAuditoria}>
        <View style={styles.filaAuditoriaItem}>
          <FontAwesome5
            name="file-contract"
            size={13}
            color={contratoActivo ? "#16803D" : "#EA580C"}
          />
          <View style={{ flex: 1, marginLeft: 6 }}>
            <ThemedText
              style={[
                styles.textoAuditoria,
                { color: contratoActivo ? "#16803D" : "#EA580C" },
              ]}
            >
              {contratoActivo
                ? "Contrato en vigor registrado"
                : "⚠️ Alerta: El trabajador carece de contrato activo"}
            </ThemedText>
            {contratoActivo && (
              <ThemedText
                style={{ color: "#64748B", fontSize: 12, marginTop: 2 }}
              >
                {"Tipo: " + (contratoActivo.tipo_contrato || "N/A")}
              </ThemedText>
            )}
            {contratoActivo?.centros_trabajo?.length ? (
              <ThemedText style={{ color: "#64748B", fontSize: 12, marginTop: 3 }}>
                Centros: {contratoActivo.centros_trabajo.map((centro) => centro.nombre).join(", ")}
              </ThemedText>
            ) : null}
            {contratoActivo?.pdf_url ? (
              <ThemedText style={{ color: "#16803D", fontSize: 12, marginTop: 3 }}>Documento PDF adjunto</ThemedText>
            ) : contratoActivo ? (
              <ThemedText style={{ color: "#B45309", fontSize: 12, marginTop: 3 }}>Sin documento PDF adjunto</ThemedText>
            ) : null}
            {calendariosContrato.length > 0 ? (
              <ThemedText style={{ color: "#64748B", fontSize: 12, marginTop: 3 }}>
                Calendarios vigentes: {calendariosContrato.map((relacion) => `${relacion.calendario_laboral?.nombre ?? "Calendario"} ${relacion.calendario_laboral?.anio ?? ""}`).join(", ")}
              </ThemedText>
            ) : null}

            <View style={{ flexDirection: "row", marginTop: 8, gap: 8 }}>
              {contratoActivo ? (
                <>
                  <Can recurso="contratos" accion="modificar">
                    <Pressable
                      style={[
                        styles.botonAccionSecundario,
                        { backgroundColor: "#EFF6FF" },
                      ]}
                      onPress={() => {
                        onSeleccionarTrabajador();
                        abrirEdicionContrato(item);
                      }}
                    >
                      <FontAwesome5 name="edit" size={10} color="#2563EB" />
                      <ThemedText
                        style={{
                          color: "#2563EB",
                          fontSize: 11,
                          fontWeight: "600",
                          marginLeft: 4,
                        }}
                      >
                        Editar Contrato
                      </ThemedText>
                    </Pressable>
                  </Can>
                  <Can recurso="contratos" accion="eliminar">
                    <Pressable
                      style={[
                        styles.botonAccionSecundario,
                        { backgroundColor: "#FEF2F2" },
                      ]}
                      onPress={() => {
                        onSeleccionarTrabajador();
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
                  </Can>
                </>
              ) : (
                <Can recurso="contratos" accion="crear">
                  <Pressable
                    style={[
                      styles.botonAccionSecundario,
                      { backgroundColor: "#2563EB" },
                    ]}
                    onPress={() => {
                      onSeleccionarTrabajador();
                      abrirEdicionContrato(item);
                    }}
                  >
                    <FontAwesome5 name="plus" size={10} color="#FFFFFF" />
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
                </Can>
              )}
            </View>
          </View>
        </View>

        <View style={[styles.separador, { marginVertical: 12 }]} />

        {/* Sección de Cuadrante y Gestión de Turnos */}
        <View style={styles.filaAuditoriaItem}>
          <MaterialCommunityIcons
            name="calendar-clock"
            size={15}
            color={asignacionesVigentes.length > 0 ? "#16803D" : "#EA580C"}
          />
          <View style={{ flex: 1, marginLeft: 6 }}>
            <ThemedText
              style={[
                styles.textoAuditoria,
                {
                  color:
                    asignacionesVigentes.length > 0 ? "#16803D" : "#EA580C",
                },
              ]}
            >
              {asignacionesVigentes.length > 0
                ? "Turnos asignados en cuadrante"
                : "⚠️ Sin asignaciones horarias de turnos vigentes"}
            </ThemedText>

            {asignacionesVigentes.length > 0 && (
              <ThemedText
                style={{ color: "#64748B", fontSize: 12, marginTop: 2 }}
              >
                {"Turnos: " +
                  turnos
                    .map((t) => t?.nombre)
                    .filter(Boolean)
                    .join(", ")}
              </ThemedText>
            )}

            <View style={{ flexDirection: "row", marginTop: 8, gap: 8 }}>
              {contratoActivo && asignacionesVigentes.length > 0 ? (
                <>
                  <Can recurso="asignaciones_turno" accion="crear">
                    <Pressable
                      style={[
                        styles.botonAccionSecundario,
                        { backgroundColor: "#FDF4FF" },
                      ]}
                      onPress={() => {
                        onSeleccionarTrabajador();
                        prepararAsignarTurno(item);
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
                        Reasignar Turnos
                      </ThemedText>
                    </Pressable>
                  </Can>
                  <Can recurso="asignaciones_turno" accion="eliminar">
                    <Pressable
                      style={[
                        styles.botonAccionSecundario,
                        { backgroundColor: "#FFF5EB" },
                      ]}
                      onPress={() => {
                        onSeleccionarTrabajador();
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
                        Eliminar
                      </ThemedText>
                    </Pressable>
                  </Can>
                </>
              ) : contratoActivo ? (
                <Can recurso="asignaciones_turno" accion="crear">
                  <Pressable
                    style={[
                      styles.botonAccionSecundario,
                      { backgroundColor: "#16A34A" },
                    ]}
                    onPress={() => {
                      onSeleccionarTrabajador();
                      setModalActivo("asignar_turno");
                    }}
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
                </Can>
              ) : (
                <ThemedText style={{ color: "#64748B", fontSize: 12, marginTop: 8 }}>
                  El turno se configura al formalizar el contrato.
                </ThemedText>
              )}
            </View>
          </View>
        </View>
      </View>

      {/* Acciones Generales del Expediente */}
      {item.activo && (
        <View
          style={{
            marginTop: 8,
            paddingTop: 10,
            borderTopWidth: 1,
            borderTopColor: "#E2E8F0",
            borderStyle: "dashed",
            flexDirection: "row",
            gap: 8,
          }}
        >
          <Can recurso="trabajadores" accion="modificar">
            <Pressable
              onPress={() => {
                onSeleccionarTrabajador();
                setModalActivo("editar_trabajador");
              }}
              style={{
                flex: 1,
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: "#EFF6FF",
                paddingVertical: 10,
                paddingHorizontal: 12,
                borderRadius: 8,
              }}
            >
              <FontAwesome5 name="user-edit" size={13} color="#2563EB" />
              <ThemedText
                style={{
                  color: "#2563EB",
                  fontSize: 12,
                  fontWeight: "600",
                  marginLeft: 6,
                }}
              >
                Editar Datos
              </ThemedText>
            </Pressable>
          </Can>

          <Can recurso="trabajadores" accion="eliminar">
            <Pressable
              onPress={() => {
                onSeleccionarTrabajador();
                setModalActivo("baja_trabajador");
              }}
              style={{
                flex: 1,
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: "#FEF2F2",
                paddingVertical: 10,
                paddingHorizontal: 12,
                borderRadius: 8,
              }}
            >
              <FontAwesome5 name="user-slash" size={12} color="#DC2626" />
              <ThemedText
                style={{
                  color: "#DC2626",
                  fontSize: 12,
                  fontWeight: "600",
                  marginLeft: 6,
                }}
              >
                Tramitar Baja
              </ThemedText>
            </Pressable>
          </Can>
        </View>
      )}

      {/* Acción de Reactivación si el trabajador se encuentra dado de baja */}
      {!item.activo && (
        <Can recurso="trabajadores" accion="modificar">
          <View
            style={{
              marginTop: 8,
              paddingTop: 10,
              borderTopWidth: 1,
              borderTopColor: "#E2E8F0",
              borderStyle: "dashed",
            }}
          >
            <Pressable
              onPress={() => {
                onSeleccionarTrabajador();
                setModalActivo("reactivar_trabajador");
              }}
              style={{
                flex: 1,
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: "#DCFCE7",
                paddingVertical: 10,
                paddingHorizontal: 12,
                borderRadius: 8,
              }}
            >
              <FontAwesome5 name="user-check" size={13} color="#16803D" />
              <ThemedText
                style={{
                  color: "#16803D",
                  fontSize: 12,
                  fontWeight: "600",
                  marginLeft: 6,
                }}
              >
                Reactivar Trabajador en Empresa
              </ThemedText>
            </Pressable>
          </View>
        </Can>
      )}
    </Card>
  );
};
