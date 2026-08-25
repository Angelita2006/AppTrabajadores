import { ThemedText } from "@/src/shared/components/themed-text";
import { Card } from "@/src/shared/ui/AppSurface";
import { FontAwesome5, MaterialCommunityIcons } from "@expo/vector-icons";
import React, { useEffect, useState } from "react";
import { Pressable, View } from "react-native";
import { AsignacionTurno } from "../../asignaciones-turno/types/asignacion-turno";
import { Contrato } from "../../contratos/types/contrato";
import { obtenerTurno } from "../../turnos/api/services";
import { Turno } from "../../turnos/types/turno";

export const FichaTrabajador = ({
  item,
  onSeleccionarTrabajador,
  setModalActivo,
  styles,
  abrirEdicionContrato,
  handleAsignarTurnoTrabajador,
  prepararAsignarTurno,
}: any) => {
  const [turnos, setTurnos] = useState<Turno[]>([]);

  const contratoActivoDelTrabajador: Contrato = item.contratoActivo;

  // Las asignaciones de turno ya vienen directamente en el item
  const asignacionesTurno: AsignacionTurno[] = item.asignacionesTurno || [];

  // Buscamos la información de los turnos usando el turno_id de las asignaciones del item
  useEffect(() => {
    const cargarNombresTurnos = async () => {
      if (asignacionesTurno.length === 0) {
        setTurnos([]);
        return;
      }

      try {
        const promesasTurnos = asignacionesTurno.map((at: AsignacionTurno) =>
          obtenerTurno(at.turno_id),
        );
        const turnosObtenidos = await Promise.all(promesasTurnos);
        setTurnos(turnosObtenidos);
      } catch (error) {
        console.error("Error cargando detalles de los turnos:", error);
      }
    };

    cargarNombresTurnos();
  }, [asignacionesTurno]);

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
                      onSeleccionarTrabajador(item);
                      setModalActivo("editar_contrato");
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
                    onPress={() => {
                      onSeleccionarTrabajador(item);
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
                    onSeleccionarTrabajador(item);
                    setModalActivo("nuevo_contrato");
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
                ? "Turnos asignados en cuadrante"
                : "⚠️ Sin asignaciones horarias de turnos vigentes"}
            </ThemedText>

            {asignacionesTurno.length > 0 && (
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
              {asignacionesTurno.length > 0 ? (
                <>
                  <Pressable
                    style={[
                      styles.botonAccionSecundario,
                      { backgroundColor: "#FDF4FF" },
                    ]}
                    onPress={() => {
                      onSeleccionarTrabajador(item);
                      setModalActivo("reasignar_turno");
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
                      Reasignar
                    </ThemedText>
                  </Pressable>
                  <Pressable
                    style={[
                      styles.botonAccionSecundario,
                      { backgroundColor: "#FFF5EB" },
                    ]}
                    onPress={() => {
                      onSeleccionarTrabajador(item);
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
                    onSeleccionarTrabajador(item);
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
            marginTop: 8,
            paddingTop: 10,
            borderTopWidth: 1,
            borderTopColor: "#E2E8F0",
            borderStyle: "dashed",
            flexDirection: "row",
            gap: 8,
          }}
        >
          {/* Botón Editar Datos */}
          <Pressable
            onPress={() => {
              onSeleccionarTrabajador(item);
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

          {/* Botón Tramitar Baja */}
          <Pressable
            onPress={() => {
              onSeleccionarTrabajador(item);
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
              onSeleccionarTrabajador(item);
              setModalActivo("reactivar_trabajador");
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
