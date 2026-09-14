import { ThemedText } from "@/src/shared/components/ThemedText";
import { Card } from "@/src/shared/ui/AppSurface";
import { FontAwesome5, MaterialCommunityIcons } from "@expo/vector-icons";
import React, { useEffect, useState } from "react";
import { Image, Pressable, View } from "react-native";
import { obtenerAsignacionesTurnoTrabajador } from "../../asignaciones-turno/api/services";
import { AsignacionTurno } from "../../asignaciones-turno/types/asignacion-turno";
import { obtenerContratoActivoTrabajador } from "../../contratos/api/services";
import { Contrato } from "../../contratos/types/contrato";
import { obtenerUrlLogo } from "../../empresas/api/services";
import { obtenerRolPorId } from "../../roles/api/services";
import { obtenerTurnoPorId } from "../../turnos/api/services";
import { Turno } from "../../turnos/types/turno";
import { ESTADOS_TRABAJADOR, FichaTrabajadorProps } from "../types/trabajador";

/**
 * Mapeo de los estados del trabajador a un texto legible para mostrar en pantalla.
 */
const TEXTO_ESTADOS_TRABAJADOR: Record<number, string> = {
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
  handleAsignarTurnoTrabajador,
  styles,
  onMostrarError,
}) => {
  const [turnos, setTurnos] = useState<Turno[]>([]);
  const [nombreRol, setNombreRol] = useState<string>("Sin rol");

  const [contratoActivo, setContratoActivo] = useState<Contrato | null>(null);
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

  // Efecto para buscar el nombre del rol usando el id
  useEffect(() => {
    let isMounted = true;

    const cargarRol = async () => {
      if (!item.rol_id) {
        if (isMounted) setNombreRol("Sin rol");
        return;
      }
      try {
        const rolData = await obtenerRolPorId(item.rol_id);
        if (isMounted) {
          setNombreRol(
            rolData?.nombre.toUpperCase().replace("_", " ") ||
              "Rol desconocido",
          );
        }
      } catch (error) {
        if (isMounted) {
          setNombreRol("Error al cargar rol");
        }
      }
    };

    cargarRol();

    return () => {
      isMounted = false;
    };
  }, [item.rol_id]);

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
      item.estado as keyof typeof TEXTO_ESTADOS_TRABAJADOR
    ] ?? "Desconocido";

  return (
    <Card>
      {/* Cabecera de la Ficha: Foto, Nombre completo y Estado Laboral */}
      <View style={styles.cardHeader}>
        {item.foto_url ? (
          <Image
            source={{ uri: obtenerUrlLogo(item.foto_url) || undefined }}
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
            Rol: {nombreRol} | Estado: {textoEstado}
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
            {item.telefono ?? "No registrado"}
          </ThemedText>
        </View>
        <View style={styles.bloqueDato}>
          <ThemedText style={styles.labelDato}>Correo Electrónico</ThemedText>
          <ThemedText style={styles.valorDato}>
            {item.email ?? "No registrado"}
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

            <View style={{ flexDirection: "row", marginTop: 8, gap: 8 }}>
              {contratoActivo ? (
                <>
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
                </>
              ) : (
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
              {asignacionesVigentes.length > 0 ? (
                <>
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
                </>
              ) : (
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
        </View>
      )}

      {/* Acción de Reactivación si el trabajador se encuentra dado de baja */}
      {!item.activo && (
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
      )}
    </Card>
  );
};
