import { Contrato } from "@/src/modules/contratos/types/contrato";
import { Departamento } from "@/src/modules/departamentos/types/departamento";
import {
  PlantillaProvider,
  usePlantilla,
} from "@/src/modules/empresas/components/PlantillaProvider";
import { FichaTrabajador } from "@/src/modules/trabajadores/components/FichaTrabajador";
import { ItemTurno } from "@/src/modules/turnos/types/turno";
import { FontAwesome5 } from "@expo/vector-icons";
import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from "react-native";
import {
  actualizarContratoActivoTrabajador,
  asignarTurnosTrabajador,
  crearContrato,
  crearTrabajador,
  obtenerCentrosPorEmpresa,
  obtenerContratoActivoTrabajador,
  obtenerDepartamentosEmpresa,
  obtenerTurnosEmpresa,
} from "../../src/modules/trabajadores/api/services";
import { useSesion } from "../../src/modules/trabajadores/store/SesionContext";
import {
  TipoUsuario,
  Trabajador,
  TrabajadorPlantilla,
} from "../../src/modules/trabajadores/types/trabajador";
import { ThemedText } from "../../src/shared/components/themed-text";
import { AppScreen } from "../../src/shared/ui/AppSurface";

type TipoModal =
  | "alta_trabajador"
  | "nuevo_contrato"
  | "asignar_turno"
  | "editar_contrato"
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

export default function PlantillaWrapper() {
  return (
    <PlantillaProvider>
      <PlantillaScreen />
    </PlantillaProvider>
  );
}

function PlantillaScreen() {
  const { usuarioActual } = useSesion();
  const { plantilla, cargando, cargarPlantilla, inicializado } = usePlantilla();

  const [procesando, setProcesando] = useState(false);
  const [filtroEstado] = useState<"todos" | "altas">("todos");

  const [turnosEmpresa, setTurnosEmpresa] = useState<ItemTurno[]>([]);
  const [cargandoSelectores, setCargandoSelectores] = useState(false);

  const [modalActivo, setModalActivo] = useState<TipoModal>(null);
  const [trabajadorSeleccionado, setTrabajadorSeleccionado] =
    useState<Trabajador | null>(null);

  const [nombre, setNombre] = useState("");
  const [apellidos, setApellidos] = useState("");
  const [nifNie, setNifNie] = useState("");
  const [email, setEmail] = useState("");
  const [telefono, setTelefono] = useState("");
  const [nss, setNss] = useState("");
  const [fechaNacimiento, setFechaNacimiento] = useState("");
  const [fechaInicio, setFechaInicio] = useState(
    new Date().toISOString().split("T")[0],
  );
  const [fechaFin, setFechaFin] = useState("");
  const [departamentoId, setDepartamentoId] = useState<string>("");
  const [puestoTrabajo, setPuestoTrabajo] = useState("");
  const [categoriaProfesional, setCategoriaProfesional] = useState<string>("");
  const [tipoContrato, setTipoContrato] = useState("");
  const [tipoJornada, setTipoJornada] = useState("");
  const [horasSemana, setHorasSemana] = useState("");
  const [centroTrabajoId, setCentroTrabajoId] = useState("");
  const [listaCentros, setListaCentros] = useState<CentroTrabajo[]>([]);
  const [listaDepartamentos, setListaDepartamentos] = useState<Departamento[]>(
    [],
  );
  const [contratoAEditar, setContratoAEditar] = useState<Contrato>();
  const [turnosSeleccionados, setTurnosSeleccionados] = useState<ItemTurno[]>(
    [],
  );

  const esGestoria =
    usuarioActual?.tipo_usuario === ("Admin_gestoría" as TipoUsuario);
  const esAdminEmpresa =
    usuarioActual?.tipo_usuario === ("Admin_empresa" as TipoUsuario);
  const esAdministrador = esGestoria || esAdminEmpresa;

  useEffect(() => {
    if (usuarioActual?.empresa_id) {
      obtenerCentrosPorEmpresa(usuarioActual.empresa_id).then(setListaCentros);
      obtenerDepartamentosEmpresa(usuarioActual.empresa_id).then(
        setListaDepartamentos,
      );
    }
  }, [usuarioActual?.empresa_id]);

  useEffect(() => {
    if (usuarioActual?.empresa_id && esAdministrador && !inicializado) {
      cargarPlantilla();
    }
  }, [
    cargarPlantilla,
    esAdministrador,
    usuarioActual?.empresa_id,
    inicializado,
  ]);

  useEffect(() => {
    if (!modalActivo) return;

    const esEdicion = modalActivo === "editar_contrato";
    const esCreacion =
      modalActivo === "nuevo_contrato" || modalActivo === "alta_trabajador";

    if (esEdicion && contratoAEditar) {
      setTipoContrato(contratoAEditar.tipo_contrato || "");
      setTipoJornada(contratoAEditar.tipo_jornada || "");
      setHorasSemana(contratoAEditar.horas_semana?.toString() || "");
      setFechaInicio(contratoAEditar.fecha_inicio || "");
      setFechaFin(contratoAEditar.fecha_fin || "");
      setPuestoTrabajo(contratoAEditar.puesto_trabajo || "");
      setCategoriaProfesional(contratoAEditar.categoria_profesional || "");
      setDepartamentoId(contratoAEditar.departamento_id || "");
    } else if (esCreacion) {
      setNombre("");
      setApellidos("");
      setNifNie("");
      setEmail("");
      setTelefono("");
      setNss("");
      setFechaNacimiento("");
      setTipoContrato("");
      setTipoJornada("");
      setHorasSemana("");
      setFechaInicio(new Date().toISOString().split("T")[0]);
      setFechaFin("");
      setPuestoTrabajo("");
      setCategoriaProfesional("");
      setDepartamentoId("");
      setCentroTrabajoId("");
    }
  }, [modalActivo, contratoAEditar]);

  const plantillaFiltrada = useMemo(() => {
    return plantilla.filter((item: TrabajadorPlantilla) => {
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
    setTurnosEmpresa([]);
  };

  const handleAltaTrabajadorCompleta = async () => {
    if (!nombre || !apellidos || !nifNie || !usuarioActual?.empresa_id) return;
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
      cerrarModales();
      await cargarPlantilla();
    } catch (err: any) {
      console.error(err);
    } finally {
      setProcesando(false);
    }
  };

  const handleGuardarContrato = async () => {
    if (!tipoContrato || !centroTrabajoId) {
      console.error("Campos obligatorios incompletos");
      return;
    }

    try {
      setProcesando(true);
      const datosContrato = {
        empresa_id: usuarioActual!.empresa_id || "",
        centro_trabajo_id: centroTrabajoId,
        tipo_contrato: tipoContrato,
        tipo_jornada: tipoJornada,
        horas_semana: Number(horasSemana),
        fecha_inicio: fechaInicio,
        fecha_fin: fechaFin,
        departamento_id: departamentoId,
        puesto_trabajo: puestoTrabajo,
        categoria_profesional: categoriaProfesional,
      };

      if (modalActivo === "editar_contrato" && contratoAEditar) {
        await actualizarContratoActivoTrabajador(
          contratoAEditar.id,
          datosContrato,
        );
      } else {
        await crearContrato({
          ...datosContrato,
          trabajador_id: trabajadorSeleccionado!.id,
        });
      }

      await cargarPlantilla();
      cerrarModales();
    } catch (err) {
      console.error("Error al guardar contrato:", err);
    } finally {
      setProcesando(false);
    }
  };

  const handleAsignarTurnoTrabajador = async () => {
    if (!trabajadorSeleccionado || turnosSeleccionados.length === 0) return;
    const idsTurnos: string[] = [];
    turnosSeleccionados.forEach((t) => {
      idsTurnos.push(t.id);
    });
    try {
      setProcesando(true);
      await asignarTurnosTrabajador(trabajadorSeleccionado.id, idsTurnos);
      await cargarPlantilla();
      cerrarModales();
    } catch (err) {
      console.error("Error al asignar turnos:", err);
    } finally {
      setProcesando(false);
    }
  };

  const handleEliminarTurnos = async () => {
    if (!trabajadorSeleccionado) return;
    try {
      setProcesando(true);
      await asignarTurnosTrabajador(trabajadorSeleccionado.id, []);
      cerrarModales();
      await cargarPlantilla();
    } catch (err: any) {
      console.error(err);
    } finally {
      setProcesando(false);
    }
  };

  const prepararAsignarTurno = async (trabajador: Trabajador) => {
    try {
      setCargandoSelectores(true);
      if (!usuarioActual?.empresa_id) {
        console.error("No se pudo obtener el ID de la empresa.");
        return;
      }

      const datosTurnos: ItemTurno[] = await obtenerTurnosEmpresa(
        usuarioActual.empresa_id,
      );

      if (datosTurnos.length === 0) {
        console.warn("La empresa no tiene turnos estructurales creados.");
        return;
      }

      setTurnosEmpresa(datosTurnos);
      setTrabajadorSeleccionado(trabajador);
      setModalActivo("asignar_turno");
    } catch (error) {
      console.error("Error al preparar asignación de turnos:", error);
    } finally {
      setCargandoSelectores(false);
    }
  };

  const abrirEdicionContrato = async (trabajador: Trabajador) => {
    setTrabajadorSeleccionado(trabajador);

    if (!trabajador?.id) return;

    try {
      const contratoActivoDelTrabajador = await obtenerContratoActivoTrabajador(
        trabajador.id,
        trabajador.empresa_id,
      );

      if (
        contratoActivoDelTrabajador &&
        contratoActivoDelTrabajador.puesto_trabajo !== null &&
        contratoActivoDelTrabajador.categoria_profesional !== null &&
        contratoActivoDelTrabajador.departamento_id !== null
      ) {
        setTipoContrato(contratoActivoDelTrabajador.tipo_contrato);
        setTipoJornada(contratoActivoDelTrabajador.tipo_jornada);
        setHorasSemana(
          contratoActivoDelTrabajador.horas_semana?.toString() || "",
        );
        setFechaInicio(contratoActivoDelTrabajador.fecha_inicio);
        setFechaFin(contratoActivoDelTrabajador.fecha_fin || "");
        setPuestoTrabajo(contratoActivoDelTrabajador.puesto_trabajo);
        setCategoriaProfesional(
          contratoActivoDelTrabajador.categoria_profesional,
        );
        setCentroTrabajoId(contratoActivoDelTrabajador.centro_trabajo_id);
        setDepartamentoId(contratoActivoDelTrabajador.departamento_id);
      }
    } catch (error) {
      console.error("Error al obtener el contrato:", error);
    } finally {
      setModalActivo("editar_contrato");
    }
  };

  const seleccionarYAbrirModal = (trabajador: Trabajador, tipo: TipoModal) => {
    setTrabajadorSeleccionado(trabajador);
    setModalActivo(tipo);
  };

  if (cargando) {
    return (
      <View>
        <ActivityIndicator size="large" color="#0000ff" />
      </View>
    );
  }

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
            {plantillaFiltrada.map((item: TrabajadorPlantilla) => {
              return (
                <FichaTrabajador
                  key={item.id}
                  item={item}
                  trabajadorId={item.id}
                  onSeleccionarTrabajador={(tipo: TipoModal) =>
                    seleccionarYAbrirModal(item, tipo)
                  }
                  setModalActivo={setModalActivo}
                  styles={styles}
                  abrirEdicionContrato={() => abrirEdicionContrato(item)}
                  handleGuardarContrato={handleGuardarContrato}
                  handleAsignarTurnoTrabajador={handleAsignarTurnoTrabajador}
                  prepararAsignarTurno={prepararAsignarTurno}
                />
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
                {modalActivo === "editar_contrato" &&
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
                modalActivo === "editar_contrato") && (
                <View>
                  <ThemedText style={styles.subtituloModal}>
                    Trabajador: {trabajadorSeleccionado?.nombre}{" "}
                    {trabajadorSeleccionado?.apellidos}
                  </ThemedText>

                  {/* Campos básicos */}
                  <View style={styles.campoForm}>
                    <ThemedText style={styles.labelForm}>
                      Tipo de Contrato *
                    </ThemedText>
                    <TextInput
                      style={styles.inputForm}
                      value={tipoContrato}
                      onChangeText={setTipoContrato}
                      placeholder="Ej: INDEFINIDO"
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
                      placeholder="Completa / Parcial"
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
                    />
                  </View>

                  {/* NUEVOS CAMPOS */}
                  <View style={styles.campoForm}>
                    <ThemedText style={styles.labelForm}>
                      Fecha Inicio (AAAA-MM-DD)
                    </ThemedText>
                    <TextInput
                      style={styles.inputForm}
                      value={fechaInicio}
                      onChangeText={setFechaInicio}
                    />
                  </View>

                  <View style={styles.campoForm}>
                    <ThemedText style={styles.labelForm}>
                      Fecha Fin (Opcional)
                    </ThemedText>
                    <TextInput
                      style={styles.inputForm}
                      value={fechaFin}
                      onChangeText={setFechaFin}
                      placeholder="AAAA-MM-DD"
                    />
                  </View>

                  <View style={styles.campoForm}>
                    <ThemedText style={styles.labelForm}>
                      Puesto de Trabajo
                    </ThemedText>
                    <TextInput
                      style={styles.inputForm}
                      value={puestoTrabajo}
                      onChangeText={setPuestoTrabajo}
                    />
                  </View>

                  <View style={styles.campoForm}>
                    <ThemedText style={styles.labelForm}>
                      Categoría Profesional
                    </ThemedText>
                    <TextInput
                      style={styles.inputForm}
                      value={categoriaProfesional ?? ""}
                      onChangeText={setCategoriaProfesional}
                    />
                  </View>

                  {/* Selector de Centro de Trabajo */}
                  <View style={styles.campoForm}>
                    <ThemedText style={styles.labelForm}>
                      Centro de Trabajo *
                    </ThemedText>
                    <ScrollView
                      horizontal
                      showsHorizontalScrollIndicator={false}
                      style={{ marginTop: 5 }}
                    >
                      {listaCentros.map((centro: CentroTrabajo) => (
                        <Pressable
                          key={centro.id}
                          style={[
                            styles.chipCentro,
                            centroTrabajoId === centro.id &&
                              styles.chipCentroActivo,
                          ]}
                          onPress={() => setCentroTrabajoId(centro.id)}
                        >
                          <ThemedText
                            style={
                              centroTrabajoId === centro.id
                                ? styles.chipCentroTextActivo
                                : styles.chipCentroText
                            }
                          >
                            {centro.nombre}
                          </ThemedText>
                        </Pressable>
                      ))}
                    </ScrollView>
                  </View>

                  {/* Selector de Departamento */}
                  <View style={styles.campoForm}>
                    <ThemedText style={styles.labelForm}>
                      Departamento
                    </ThemedText>
                    <ScrollView
                      horizontal
                      showsHorizontalScrollIndicator={false}
                      style={{ marginTop: 5 }}
                    >
                      {listaDepartamentos.map((depto: Departamento) => (
                        <Pressable
                          key={depto.id}
                          style={[
                            styles.chipCentro,
                            departamentoId === depto.id &&
                              styles.chipCentroActivo,
                          ]}
                          onPress={() => setDepartamentoId(depto.id)}
                        >
                          <ThemedText
                            style={
                              departamentoId === depto.id
                                ? styles.chipCentroTextActivo
                                : styles.chipCentroText
                            }
                          >
                            {depto.nombre}
                          </ThemedText>
                        </Pressable>
                      ))}
                    </ScrollView>
                  </View>

                  <Pressable
                    style={styles.btnGuardarModal}
                    onPress={handleGuardarContrato}
                    disabled={procesando}
                  >
                    <ThemedText style={styles.btnGuardarModalTexto}>
                      {procesando
                        ? "Procesando..."
                        : modalActivo == "editar_contrato"
                          ? "Confirmar cambios"
                          : "Formalizar Contrato"}
                    </ThemedText>
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
                    {trabajadorSeleccionado?.nombre}? Ésta acción modificará su
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
                            const identificadorUnico = turno.id;

                            // Comprobamos si este identificador específico ya está en el array de seleccionados
                            const seleccionado: ItemTurno = turnosSeleccionados
                              .filter((t) => t.id !== identificadorUnico)
                              .shift()!!;

                            const handleManejarSeleccion = () => {
                              if (seleccionado) {
                                // Si ya estaba seleccionado, lo removemos del array
                                setTurnosSeleccionados(
                                  turnosSeleccionados.filter(
                                    (t) => t.id !== identificadorUnico,
                                  ),
                                );
                              } else {
                                // Si no estaba, lo agregamos conservando los anteriores
                                setTurnosSeleccionados([
                                  ...turnosSeleccionados,
                                  seleccionado,
                                ]);
                              }
                            };

                            return (
                              <Pressable
                                key={identificadorUnico}
                                accessible={true}
                                accessibilityRole="checkbox"
                                accessibilityState={{
                                  checked: seleccionado !== null,
                                }}
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
                        setModalActivo(null);
                        setTurnosSeleccionados([]);
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
                      onPress={handleAsignarTurnoTrabajador}
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
  chipCentro: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    backgroundColor: "#FFFFFF",
  },
  chipCentroActivo: {
    borderColor: "#EA580C",
    backgroundColor: "#EA580C",
  },
  chipCentroText: {
    fontSize: 13,
    color: "#64748B",
    fontWeight: "600",
  },
  chipCentroTextActivo: {
    color: "#FFFFFF",
    fontWeight: "700",
  },
});
