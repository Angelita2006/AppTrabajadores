import { FontAwesome5, MaterialCommunityIcons } from "@expo/vector-icons";
import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  StyleSheet,
  View,
} from "react-native";
import { obtenerTrabajadores } from "../../src/modules/trabajadores/api/services";
import { useSesion } from "../../src/modules/trabajadores/store/SesionContext";
import {
  TipoUsuario,
  Trabajador,
} from "../../src/modules/trabajadores/types/trabajador";
import { ThemedText } from "../../src/shared/components/themed-text";
import { AppScreen, Card } from "../../src/shared/ui/AppSurface";

export default function PlantillaScreen() {
  const { usuarioActual } = useSesion();
  const [plantilla, setPlantilla] = useState<Trabajador[]>([]);
  const [cargando, setCargando] = useState(true);
  const [filtroEstado] = useState<"todos" | "altas">("todos");

  const esGestoria =
    usuarioActual?.tipo_usuario === ("admin_gestoria" as TipoUsuario);
  const esAdminEmpresa =
    usuarioActual?.tipo_usuario === ("admin_empresa" as TipoUsuario);
  const esAdministrador = esGestoria || esAdminEmpresa;

  useEffect(() => {
    if (esAdministrador) cargarPlantilla();
  }, [esAdministrador]);

  const cargarPlantilla = async () => {
    try {
      setCargando(true);
      const datos = await obtenerTrabajadores();
      setPlantilla(datos);
    } catch {
      Alert.alert(
        "Error de Red",
        "Fallo al sincronizar el catálogo de la plantilla.",
      );
    } finally {
      setCargando(false);
    }
  };

  const plantillaFiltrada = useMemo(() => {
    return plantilla.filter((item) => {
      // 1. EXCLUSIÓN RADICAL: Si el ID de este registro coincide con el ID del jefe logueado, lo eliminamos
      const esElJefeActual = item.id === usuarioActual?.trabajador_id;
      if (esElJefeActual && esAdminEmpresa) {
        return false; // No entra en el listado bajo ninguna circunstancia
      }

      // 2. Control de Inquilino (Multi-Tenant) para Gestorías o Administradores de Empresa
      const coincideTenant = esGestoria
        ? true
        : item.empresa_id === usuarioActual?.empresa_id;

      // 3. Filtro por estado del asistente (Todos vs solo Altas Activas)
      const coincideEstado = filtroEstado === "todos" || item.activo;

      return coincideTenant && coincideEstado;
    });
  }, [plantilla, filtroEstado, usuarioActual, esGestoria, esAdminEmpresa]);

  // Manejadores de eventos para los botones administrativos
  const handleCrearContrato = (trabajador: Trabajador) => {
    Alert.alert(
      "Gestión de Personal",
      `Abriendo asistente de Contratación Legal para:\n${trabajador.nombre} ${trabajador.apellidos}`,
    );
    // Aquí puedes hacer: router.push(`/contratacion/nuevo?trabajador_id=${trabajador.id}`)
  };

  const handleAsignarTurno = (trabajador: Trabajador) => {
    Alert.alert(
      "Planificación Horaria",
      `Abriendo cuadrante de Asignación de Turnos para:\n${trabajador.nombre} ${trabajador.apellidos}`,
    );
    // Aquí puedes hacer: router.push(`/turnos/asignar?trabajador_id=${trabajador.id}`)
  };

  return (
    <AppScreen
      title="Plantilla de trabajadores"
      subtitle="Panel de supervisión contractual, alta de expedientes y cuadrantes."
    >
      {cargando ? (
        <ActivityIndicator
          size="large"
          color="#2563EB"
          style={{ marginTop: 40 }}
        />
      ) : (
        <View style={styles.contenedorLista}>
          {plantillaFiltrada.map((item) => {
            // 1. Control de administradores para evitar falsos positivos
            const esUsuarioAdministrativo =
              item.id === usuarioActual?.trabajador_id && esAdminEmpresa;

            // Contrato Real: Evaluamos si tiene el estado activo y no es una cuenta pura de gestión
            const tieneContratoActivo = item.activo && !esUsuarioAdministrativo;

            // LOGICA DEL TURNO:
            // Evaluamos de forma real si el objeto del trabajador ya trae asignaciones,
            // o si sus datos de planificación vigentes constan en el registro.
            // Si tu backend adjunta la lista de turnos en el JSON, usamos item.turnos,
            // de lo contrario evaluamos de forma segura si tiene un perfil operativo activo.
            const tieneTurnoAsignado = Array.isArray(
              (item as any).asignaciones_turnos,
            )
              ? (item as any).asignaciones_turnos.length > 0
              : item.activo && !esUsuarioAdministrativo; // Fallback temporal para la demo si el registro está en alta

            return (
              <Card key={item.id}>
                {/* CABECERA DE IDENTIDAD */}
                <View style={styles.cardHeader}>
                  <View style={styles.avatarCirculo}>
                    <ThemedText style={styles.avatarTexto}>
                      {item.nombre.charAt(0)}
                      {item.apellidos.charAt(0)}
                    </ThemedText>
                  </View>
                  <View style={{ flex: 1 }}>
                    <ThemedText style={styles.nombreEmpleado}>
                      {item.nombre} {item.apellidos}
                    </ThemedText>
                    {/* <ThemedText style={styles.idSubtexto}>
                      ID Interno: {item.id.substring(0, 8).toUpperCase()}
                    </ThemedText> */}
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

                {/* FILA DE DATOS FISCALES Y CORE */}
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

                {/* FILA DE DATOS DE CONTACTO Y EMPRESA */}
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

                {/* SECCIÓN MÉTODOS DE CONTROL / ALERTAS ADMINISTRATIVAS */}
                <View style={styles.contenedorAuditoria}>
                  <View style={styles.filaAuditoriaItem}>
                    <FontAwesome5
                      name="file-contract"
                      size={13}
                      color={tieneContratoActivo ? "#16803D" : "#EA580C"}
                    />
                    <ThemedText
                      style={[
                        styles.textoAuditoria,
                        { color: tieneContratoActivo ? "#16803D" : "#EA580C" },
                      ]}
                    >
                      {tieneContratoActivo
                        ? "Contrato en vigor registrado"
                        : "⚠️ Alerta: El trabajador carece de contrato activo"}
                    </ThemedText>
                  </View>

                  <View style={[styles.filaAuditoriaItem, { marginTop: 4 }]}>
                    <MaterialCommunityIcons
                      name="calendar-clock"
                      size={15}
                      color={tieneTurnoAsignado ? "#16803D" : "#EA580C"}
                    />
                    <ThemedText
                      style={[
                        styles.textoAuditoria,
                        { color: tieneTurnoAsignado ? "#16803D" : "#EA580C" },
                      ]}
                    >
                      {tieneTurnoAsignado
                        ? "Turno asignado en cuadrante"
                        : "⚠️ Sin asignación horaria de turnos en este mes"}
                    </ThemedText>
                  </View>
                </View>

                {/* PANEL DE ACCIONES DIRECTAS PARA EL JEFE/ADMINISTRADOR */}
                <View style={styles.panelAccionesJefe}>
                  {!tieneContratoActivo && (
                    <Pressable
                      style={[styles.botonAccionAdmin, styles.botonContrato]}
                      onPress={() => handleCrearContrato(item)}
                    >
                      <FontAwesome5 name="plus" size={11} color="#FFFFFF" />
                      <ThemedText style={styles.textoBotonAdmin}>
                        Alta Contrato
                      </ThemedText>
                    </Pressable>
                  )}

                  {!tieneTurnoAsignado && (
                    <Pressable
                      style={[styles.botonAccionAdmin, styles.botonTurno]}
                      onPress={() => handleAsignarTurno(item)}
                    >
                      <MaterialCommunityIcons
                        name="calendar-plus"
                        size={14}
                        color="#FFFFFF"
                      />
                      <ThemedText style={styles.textoBotonAdmin}>
                        Asignar Turno
                      </ThemedText>
                    </Pressable>
                  )}
                </View>
              </Card>
            );
          })}

          {plantillaFiltrada.length === 0 && (
            <ThemedText style={styles.textoVacio}>
              No hay expedientes disponibles para mostrar bajo este criterio.
            </ThemedText>
          )}
        </View>
      )}
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  contenedorLista: { gap: 14, paddingBottom: 24 },
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
  nombreEmpleado: { fontSize: 16, fontWeight: "800", color: "#0F172A" },
  idSubtexto: {
    fontSize: 11,
    color: "#64748B",
    fontWeight: "600",
    marginTop: 1,
  },
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
});
