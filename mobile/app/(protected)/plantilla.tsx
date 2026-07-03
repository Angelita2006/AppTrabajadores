import { FontAwesome5, MaterialCommunityIcons } from "@expo/vector-icons";
import React, { useEffect, useMemo, useState } from "react";
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
// IMPORTACIÓN DE LOS NUEVOS MÉTODOS DEL SERVICIO
import {
  asignarTurnoTrabajador,
  crearContrato,
  crearTrabajador,
  obtenerTrabajadores,
} from "../../src/modules/trabajadores/api/services";
import { useSesion } from "../../src/modules/trabajadores/store/SesionContext";
import {
  TipoUsuario,
  Trabajador,
} from "../../src/modules/trabajadores/types/trabajador";
import { ThemedText } from "../../src/shared/components/themed-text";
import { AppScreen, Card } from "../../src/shared/ui/AppSurface";

type TipoModal = "alta_trabajador" | "nuevo_contrato" | "asignar_turno" | null;

export default function PlantillaScreen() {
  const { usuarioActual } = useSesion();
  const [plantilla, setPlantilla] = useState<Trabajador[]>([]);
  const [cargando, setCargando] = useState(true);
  const [procesando, setProcesando] = useState(false);
  const [filtroEstado] = useState<"todos" | "altas">("todos");

  // Control de Modales
  const [modalActivo, setModalActivo] = useState<TipoModal>(null);
  const [trabajadorSeleccionado, setTrabajadorSeleccionado] =
    useState<Trabajador | null>(null);

  // Formulario 1: Alta de Trabajador (Ajustado a TrabajadorCreate de tu API FastAPI)
  const [nombre, setNombre] = useState("");
  const [apellidos, setApellidos] = useState("");
  const [nifNie, setNifNie] = useState("");
  const [email, setEmail] = useState("");
  const [telefono, setTelefono] = useState("");
  const [nss, setNss] = useState("");
  const [fechaNacimiento, setFechaNacimiento] = useState("");

  // Formulario 2: Alta de Contrato (Campos requeridos por la base de datos)
  const [tipoContrato, setTipoContrato] = useState("");
  const [tipoJornada, setTipoJornada] = useState("Completa");
  const [horasSemana, setHorasSemana] = useState("40");
  const [centroTrabajoId, setCentroTrabajoId] = useState(""); // Requerido por la relación física

  // Formulario 3: Asignación de Turno
  const [turnoId, setTurnoId] = useState("");

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
      const esElJefeActual = item.id === usuarioActual?.trabajador_id;
      if (esElJefeActual && esAdminEmpresa) return false;

      const coincideTenant = esGestoria
        ? true
        : item.empresa_id === usuarioActual?.empresa_id;
      const coincideEstado = filtroEstado === "todos" || item.activo;

      return coincideTenant && coincideEstado;
    });
  }, [plantilla, filtroEstado, usuarioActual, esGestoria, esAdminEmpresa]);

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
    setTurnoId("");
  };

  // 1. API: GUARDAR NUEVO TRABAJADOR USANDO TU MÉTODO DEL SERVICIO
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
          : undefined, // AAAA-MM-DD
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

  // 2. API: ASOCIAR UN CONTRATO LEGAL USANDO TU MÉTODO DEL SERVICIO
  const handleGuardarContrato = async () => {
    if (
      !tipoContrato ||
      !centroTrabajoId ||
      !trabajadorSeleccionado ||
      !usuarioActual?.empresa_id
    ) {
      Alert.alert(
        "Campos insuficientes",
        "Se requiere el Tipo de Contrato y el UUID del Centro de Trabajo.",
      );
      return;
    }
    try {
      setProcesando(true);
      const hoy = new Date().toISOString().split("T")[0]; // Genera 'AAAA-MM-DD' seguro

      await crearContrato({
        trabajador_id: trabajadorSeleccionado.id,
        empresa_id: usuarioActual.empresa_id,
        centro_trabajo_id: centroTrabajoId.trim(),
        tipo_contrato: tipoContrato.trim(),
        tipo_jornada: tipoJornada,
        horas_semana: parseInt(horasSemana, 10) || 40,
        fecha_inicio: hoy,
      });

      Alert.alert(
        "Contrato Activo",
        "Vínculo contractual formalizado en PostgreSQL.",
      );
      cerrarModales();
      await cargarPlantilla();
    } catch (err: any) {
      Alert.alert(
        "Error",
        err.response?.data?.detail ||
          "No se pudo registrar el contrato laboral.",
      );
    } finally {
      setProcesando(false);
    }
  };

  // 3. API: VINCULAR UN TURNO MAESTRO USANDO TU MÉTODO DEL SERVICIO
  const handleAsignarTurnoTrabajador = async () => {
    if (!turnoId || !trabajadorSeleccionado) {
      Alert.alert("Error", "Debes ingresar un ID de turno válido.");
      return;
    }
    try {
      setProcesando(true);
      const hoy = new Date().toISOString().split("T")[0]; // Genera 'AAAA-MM-DD' seguro

      await asignarTurnoTrabajador({
        trabajador_id: trabajadorSeleccionado.id,
        turno_id: turnoId.trim(),
        fecha_inicio: hoy,
      });

      Alert.alert(
        "Planificación Sincronizada",
        "Turno operativo inyectado en el cuadrante.",
      );
      cerrarModales();
      await cargarPlantilla();
    } catch (err: any) {
      Alert.alert(
        "Error",
        err.response?.data?.detail || "Fallo al asignar el turno.",
      );
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

        {cargando ? (
          <ActivityIndicator
            size="large"
            color="#2563EB"
            style={{ marginTop: 40 }}
          />
        ) : (
          <View style={styles.contenedorLista}>
            {plantillaFiltrada.map((item) => {
              const esUsuarioAdministrativo =
                item.id === usuarioActual?.trabajador_id && esAdminEmpresa;
              const tieneContratoActivo =
                item.activo && !esUsuarioAdministrativo;
              const tieneTurnoAsignado = Array.isArray(
                (item as any).asignaciones_turnos,
              )
                ? (item as any).asignaciones_turnos.length > 0
                : item.activo && !esUsuarioAdministrativo;

              return (
                <Card key={item.id}>
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
                          {
                            color: tieneContratoActivo ? "#16803D" : "#EA580C",
                          },
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

                  <View style={styles.panelAccionesJefe}>
                    {!tieneContratoActivo && (
                      <Pressable
                        style={[styles.botonAccionAdmin, styles.botonContrato]}
                        onPress={() => {
                          setTrabajadorSeleccionado(item);
                          setModalActivo("nuevo_contrato");
                        }}
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
                        onPress={() => {
                          setTrabajadorSeleccionado(item);
                          setModalActivo("asignar_turno");
                        }}
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
                No hay expedientes disponibles para mostrar.
              </ThemedText>
            )}
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
                {modalActivo === "asignar_turno" && "Asignar Turno de Trabajo"}
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
                    <View
                      style={{
                        flexDirection: "row",
                        justifyContent: "space-between",
                      }}
                    >
                      <ThemedText style={styles.labelForm}>
                        Email Opcional
                      </ThemedText>
                    </View>
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
                        Guardar Expediente Físico
                      </ThemedText>
                    )}
                  </Pressable>
                </View>
              )}

              {/* FORMULARIO: ALTA CONTRATO */}
              {modalActivo === "nuevo_contrato" && (
                <View>
                  <ThemedText style={styles.subtituloModal}>
                    Trabajador: {trabajadorSeleccionado?.nombre}{" "}
                    {trabajadorSeleccionado?.apellidos}
                  </ThemedText>
                  <View style={styles.campoForm}>
                    <ThemedText style={styles.labelForm}>
                      UUID Centro de Trabajo *
                    </ThemedText>
                    <TextInput
                      style={styles.inputForm}
                      value={centroTrabajoId}
                      onChangeText={setCentroTrabajoId}
                      placeholder="Pega el UUID del centro asignado"
                    />
                  </View>
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
                      { backgroundColor: "#16A34A" },
                    ]}
                    onPress={handleGuardarContrato}
                    disabled={procesando}
                  >
                    {procesando ? (
                      <ActivityIndicator size="small" color="#FFFFFF" />
                    ) : (
                      <ThemedText style={styles.btnGuardarModalTexto}>
                        Formalizar Alta Contrato
                      </ThemedText>
                    )}
                  </Pressable>
                </View>
              )}

              {/* FORMULARIO: ASIGNAR TURNO */}
              {modalActivo === "asignar_turno" && (
                <View>
                  <ThemedText style={styles.subtituloModal}>
                    Trabajador: {trabajadorSeleccionado?.nombre}{" "}
                    {trabajadorSeleccionado?.apellidos}
                  </ThemedText>
                  <View style={styles.campoForm}>
                    <ThemedText style={styles.labelForm}>
                      UUID de Turno Maestro de Empresa *
                    </ThemedText>
                    <TextInput
                      style={styles.inputForm}
                      value={turnoId}
                      onChangeText={setTurnoId}
                      placeholder="Pega el UUID del turno estructural"
                    />
                  </View>
                  <Pressable
                    style={[
                      styles.btnGuardarModal,
                      { backgroundColor: "#2563EB" },
                    ]}
                    onPress={handleAsignarTurnoTrabajador}
                    disabled={procesando}
                  >
                    {procesando ? (
                      <ActivityIndicator size="small" color="#FFFFFF" />
                    ) : (
                      <ThemedText style={styles.btnGuardarModalTexto}>
                        Inyectar Turno en Calendario
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

// Los estilos (styles) permanecen intactos abajo
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
  btnGuardarModal: {
    backgroundColor: "#0F172A",
    height: 46,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 14,
  },
  btnGuardarModalTexto: { color: "#FFFFFF", fontSize: 14, fontWeight: "700" },
});
