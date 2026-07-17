import { ThemedText } from "@/src/shared/components/themed-text";
import { Card } from "@/src/shared/ui/AppSurface";
import { FontAwesome5, MaterialCommunityIcons } from "@expo/vector-icons";
import React, { useEffect, useState } from "react";
import { Pressable, View } from "react-native";
import { AsignacionTurno } from "../../asignaciones-turno/types/asignacion-turno";
import { Contrato } from "../../contratos/types/contrato";
import { ItemTurno } from "../../turnos/types/turno";
import {
  obtenerAsignacionesTurnoTrabajador,
  obtenerTurno,
} from "../api/services";

export const FichaTrabajador = ({
  item,
  trabajadorId,
  onSeleccionarTrabajador,
  setModalActivo,
  styles,
  abrirEdicionContrato,
  handleGuardarContrato,
  handleAsignarTurnoTrabajador,
}: any) => {
  const [asignacionesTurno, setAsignacionesTurno] = useState<AsignacionTurno[]>(
    [],
  );

  const [turnos, setTurnos] = useState<ItemTurno[]>([]);

  useEffect(() => {
    const cargarTurnos = async () => {
      setAsignacionesTurno([]);
      setTurnos([]);
      try {
        const asignaciones: AsignacionTurno[] =
          await obtenerAsignacionesTurnoTrabajador(trabajadorId);

        const hoyTime = new Date().getTime();

        // Filtramos las asignaciones para sacar sólo las vigentes
        const asignacionesFiltradas = asignaciones.filter((at) => {
          const fechaInicio = new Date(at.fecha_inicio).getTime();
          // si no tiene fecha de fin, la fecha de fin es la fecha de hoy
          let fechaFin = hoyTime;
          if (at.fecha_fin !== null && at.fecha_fin !== undefined)
            fechaFin = new Date(at.fecha_fin).getTime();

          return hoyTime >= fechaInicio && hoyTime <= fechaFin;
        });

        setAsignacionesTurno(asignacionesFiltradas);

        const promesasTurnos = asignacionesFiltradas.map(
          (at: AsignacionTurno) => obtenerTurno(at.turno_id),
        );

        // Esperamos a que todas las peticiones terminen
        const turnosObtenidos = await Promise.all(promesasTurnos);

        setTurnos(turnosObtenidos);
      } catch (error) {
        console.error("Error cargando turnos:", error);
      }
    };

    if (trabajadorId) {
      cargarTurnos();
    }
  }, [trabajadorId]);

  const contratoActivoDelTrabajador: Contrato = item.contratoActivo;

  const handleAccion = (tipoModal: string) => {
    onSeleccionarTrabajador(item);
    setModalActivo(tipoModal);
  };

  return (
    <Card>
      <View style={styles.cardHeader}>
        <View style={styles.avatarCirculo}>
          <ThemedText style={styles.avatarTexto}>
            {item.nombre?.charAt(0)}
            {item.apellidos?.charAt(0)}
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

      {/* DETALLES */}
      <View style={styles.gridDetalles}>
        <View style={styles.bloqueDato}>
          <ThemedText style={styles.labelDato}>
            Documento de Identidad
          </ThemedText>
          <ThemedText style={styles.valorDato}>{item.nif_nie}</ThemedText>
        </View>
        <View style={styles.bloqueDato}>
          <ThemedText style={styles.labelDato}>Número Seg. Social</ThemedText>
          <ThemedText style={styles.valorDato}>
            {item.numero_seguridad_social ?? "Pendiente"}
          </ThemedText>
        </View>
      </View>

      <View style={[styles.gridDetalles, { marginTop: 8 }]}>
        <View style={styles.bloqueDato}>
          <ThemedText style={styles.labelDato}>Teléfono Móvil</ThemedText>
          <ThemedText style={styles.valorDato}>
            {item.telefono ?? "No registrado"}
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

      {/* AUDITORÍA Y ACCIONES */}
      <View style={styles.contenedorAuditoria}>
        <View style={styles.filaAuditoriaItem}>
          <FontAwesome5
            name="file-contract"
            size={13}
            color={contratoActivoDelTrabajador ? "#16803D" : "#EA580C"}
          />
          <View style={{ flex: 1, marginLeft: 6 }}>
            <ThemedText
              style={[
                styles.textoAuditoria,
                { color: contratoActivoDelTrabajador ? "#16803D" : "#EA580C" },
              ]}
            >
              {contratoActivoDelTrabajador
                ? "Contrato en vigor registrado"
                : "⚠️ Alerta: El trabajador carece de contrato activo"}
            </ThemedText>
            {contratoActivoDelTrabajador && (
              <ThemedText
                style={{ color: "#64748B", fontSize: 12, marginTop: 2 }}
              >
                {"Tipo: " + contratoActivoDelTrabajador.tipo_contrato}
              </ThemedText>
            )}

            {/* BOTONES CONTRATO */}
            <View style={{ flexDirection: "row", marginTop: 8, gap: 8 }}>
              {contratoActivoDelTrabajador ? (
                <>
                  <Pressable
                    style={[
                      styles.botonAccionSecundario,
                      { backgroundColor: "#EFF6FF" },
                    ]}
                    onPress={() => {
                      handleAccion("editar_contrato");
                      abrirEdicionContrato();
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
                    onPress={() => handleAccion("rescindir_contrato")}
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
                    handleAccion("nuevo_contrato");
                    handleGuardarContrato();
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

        {/* SECCIÓN TURNOS */}
        <View style={styles.filaAuditoriaItem}>
          <MaterialCommunityIcons
            name="calendar-clock"
            size={15}
            color={asignacionesTurno.length > 0 ? "#16803D" : "#EA580C"}
          />
          <View style={{ flex: 1, marginLeft: 6 }}>
            <ThemedText
              style={[
                styles.textoAuditoria,
                { color: asignacionesTurno.length > 0 ? "#16803D" : "#EA580C" },
              ]}
            >
              {asignacionesTurno.length > 0
                ? "Turno asignado en cuadrante"
                : "⚠️ Sin asignación horaria de turnos en este mes"}
            </ThemedText>

            {asignacionesTurno.length > 0 && (
              <ThemedText
                style={{ color: "#64748B", fontSize: 12, marginTop: 2 }}
              >
                {"Turnos: " + turnos.map((t) => t.nombre).join(", ")}
              </ThemedText>
            )}

            <View style={{ flexDirection: "row", marginTop: 8, gap: 8 }}>
              {asignacionesTurno.length > 0 ? (
                <>
                  <Pressable
                    style={[
                      styles.botonAccionSecundario,
                      { backgroundColor: "#FDF4FF" },
                    ]}
                    onPress={() => handleAccion("reasignar_turno")}
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
                      Reasignar
                    </ThemedText>
                  </Pressable>
                  <Pressable
                    style={[
                      styles.botonAccionSecundario,
                      { backgroundColor: "#FFF5EB" },
                    ]}
                    onPress={() => handleAccion("eliminar_turno")}
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
                    handleAsignarTurnoTrabajador();
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

      {/* BAJA */}
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
              handleAccion("baja_trabajador");
            }}
          >
            <FontAwesome5 name="user-slash" size={11} color="#991B1B" />
            <ThemedText style={styles.textoBotonBajaEmpresa}>
              Tramitar Baja del Trabajador en Empresa
            </ThemedText>
          </Pressable>
        </View>
      )}

      {/* REACTIVACIÓN */}
      {!item.activo && (
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
            style={styles.botonReactivarEmpresa}
            onPress={() => {
              handleAccion("reactivar_trabajador");
            }}
          >
            <FontAwesome5 name="user-slash" size={11} color="#117937" />
            <ThemedText style={styles.textoBotonReactivarEmpresa}>
              Reactivar Trabajador en Empresa
            </ThemedText>
          </Pressable>
        </View>
      )}
    </Card>
  );
};
