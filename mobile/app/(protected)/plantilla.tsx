import {
  eliminarTodasAsignacionesTrabajador,
  obtenerAsignacionesTurnoTrabajador,
} from "@/src/modules/asignaciones-turno/api/services";
import { AsignacionTurno } from "@/src/modules/asignaciones-turno/types/asignacion-turno";
import { obtenerCentrosPorEmpresa } from "@/src/modules/centros-trabajo/api/services";
import {
  actualizarContratoActivoTrabajador,
  crearContrato,
  obtenerContratoActivoTrabajador,
  rescindirContratoActivoTrabajador,
} from "@/src/modules/contratos/api/services";
import { Contrato } from "@/src/modules/contratos/types/contrato";
import { obtenerDepartamentosEmpresa } from "@/src/modules/departamentos/api/services";
import { Departamento } from "@/src/modules/departamentos/types/departamento";
import {
  PlantillaProvider,
  usePlantilla,
} from "@/src/modules/empresas/components/PlantillaProvider";
import { FichaTrabajador } from "@/src/modules/trabajadores/components/FichaTrabajador";
import { obtenerTurnosEmpresa } from "@/src/modules/turnos/api/services";
import { Turno } from "@/src/modules/turnos/types/turno";
import { useSesion } from "@/src/modules/usuarios/store/SesionContext";
import { TipoUsuarioEnum } from "@/src/modules/usuarios/types/usuario";
import { obtenerMensajeAmigableError } from "@/src/utils/errorHandler";
import { FontAwesome5 } from "@expo/vector-icons";
import React, { useEffect, useMemo, useRef, useState } from "react";
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
  actualizarTrabajador,
  asignarTurnosTrabajador,
  crearTrabajador,
} from "../../src/modules/trabajadores/api/services";
import {
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
  | "reactivar_trabajador"
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

  const [turnosEmpresa, setTurnosEmpresa] = useState<Turno[]>([]);
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
  const [fechaInicio, setFechaInicio] = useState("");
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
  const [turnosSeleccionados, setTurnosSeleccionados] = useState<Turno[]>([]);
  const esGestoria =
    usuarioActual?.tipo_usuario === TipoUsuarioEnum.ADMIN_GESTORIA;
  const esAdminEmpresa =
    usuarioActual?.tipo_usuario === TipoUsuarioEnum.ADMIN_EMPRESA;
  const esAdministrador = esGestoria || esAdminEmpresa;

  // Formulario: Alta de Trabajador
  const inputNombreRef = useRef<any>(null);
  const inputApellidosRef = useRef<any>(null);
  const inputNifRef = useRef<any>(null);
  const inputEmailRef = useRef<any>(null);
  const inputTelefonoRef = useRef<any>(null);
  const inputNssRef = useRef<any>(null);
  const inputFechaNacRef = useRef<any>(null);
  const botonGuardarAltaRef = useRef<any>(null);

  // Formulario: Alta / Edición de Contrato
  const inputTipoContratoRef = useRef<any>(null);
  const inputTipoJornadaRef = useRef<any>(null);
  const inputHorasSemanaRef = useRef<any>(null);
  const inputFechaInicioRef = useRef<any>(null);
  const inputFechaFinRef = useRef<any>(null);
  const inputPuestoRef = useRef<any>(null);
  const inputCategoriaRef = useRef<any>(null);
  const botonGuardarContratoRef = useRef<any>(null);

  // Formulario: Asignación de Turnos
  const inputTurnoInicioRef = useRef<any>(null);
  const inputTurnoFinRef = useRef<any>(null);
  const botonActualizarRef = useRef<any>(null);

  const botonConfirmarBajaRef = useRef<any>(null);
  const botonConfirmarEliminarTurnoRef = useRef<any>(null);
  const botonRescindirContratoRef = useRef<any>(null);

  useEffect(() => {
    if (usuarioActual?.empresa_id) {
      obtenerCentrosPorEmpresa(usuarioActual.empresa_id).then(setListaCentros);
      obtenerDepartamentosEmpresa(usuarioActual.empresa_id).then(
        setListaDepartamentos,
      );
      obtenerTurnosEmpresa(usuarioActual.empresa_id).then(setTurnosEmpresa);
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
    setTipoJornada("");
    setHorasSemana("");
    setFechaInicio("");
    setFechaFin("");
    setPuestoTrabajo("");
    setCategoriaProfesional("");
    setCentroTrabajoId("");
    setDepartamentoId("");
  };

  const handleAltaTrabajadorCompleta = async () => {
    if (!nombre || !apellidos || !nifNie || !usuarioActual?.empresa_id) {
      alert(
        "Por favor, rellena los campos obligatorios para dar de alta al trabajador.",
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
      cerrarModales();
      await cargarPlantilla();
    } catch (err: any) {
      alert(obtenerMensajeAmigableError(err));
    } finally {
      setProcesando(false);
    }
  };

  const handleGuardarContrato = async () => {
    try {
      setProcesando(true);
      const datosContrato = {
        empresa_id: usuarioActual!.empresa_id || "",
        centro_trabajo_id: centroTrabajoId,
        tipo_contrato: tipoContrato,
        tipo_jornada: tipoJornada,
        horas_semana: Number(horasSemana),
        fecha_inicio: fechaInicio,
        fecha_fin: fechaFin || "",
        departamento_id: departamentoId,
        puesto_trabajo: puestoTrabajo,
        categoria_profesional: categoriaProfesional,
        trabajador_id: trabajadorSeleccionado!.id,
      };

      await crearContrato(datosContrato);

      await cargarPlantilla();
      cerrarModales();
    } catch (err: any) {
      alert("Error al guardar contrato: " + obtenerMensajeAmigableError(err));
    } finally {
      setProcesando(false);
    }
  };

  const handleEditarContrato = async () => {
    if (!contratoAEditar?.id) {
      alert("No se pudo identificar el contrato a editar");
      return;
    }

    try {
      setProcesando(true);

      const cambios = {
        empresa_id: usuarioActual!.empresa_id || "",
        centro_trabajo_id: centroTrabajoId,
        tipo_contrato: tipoContrato,
        tipo_jornada: tipoJornada,
        horas_semana: Number(horasSemana),
        fecha_inicio: fechaInicio,
        fecha_fin: fechaFin || "",
        departamento_id: departamentoId,
        puesto_trabajo: puestoTrabajo,
        categoria_profesional: categoriaProfesional,
        trabajador_id: trabajadorSeleccionado!.id,
      };

      await actualizarContratoActivoTrabajador(contratoAEditar.id, cambios);

      await cargarPlantilla();
      cerrarModales();
    } catch (err: any) {
      alert(
        "Error al actualizar contrato: " + obtenerMensajeAmigableError(err),
      );
    } finally {
      setProcesando(false);
    }
  };

  const handleAsignarTurnoTrabajador = async () => {
    if (!trabajadorSeleccionado || turnosSeleccionados.length === 0) return;

    const idsTurnos = turnosSeleccionados.map((t) => t.id);

    try {
      setProcesando(true);

      await asignarTurnosTrabajador(
        trabajadorSeleccionado.id,
        idsTurnos,
        fechaInicio,
        fechaFin || null,
      );

      await cargarPlantilla();
      cerrarModales();
      setTurnosSeleccionados([]);
    } catch (err: any) {
      alert("Error al asignar turnos: " + obtenerMensajeAmigableError(err));
    } finally {
      setProcesando(false);
    }
  };

  const handleEliminarTurnos = async () => {
    if (!trabajadorSeleccionado) return;
    try {
      setProcesando(true);
      await eliminarTodasAsignacionesTrabajador(trabajadorSeleccionado.id);
      cerrarModales();
      await cargarPlantilla();
    } catch (err: any) {
      alert("Error al eliminar turnos: " + obtenerMensajeAmigableError(err));
    } finally {
      setProcesando(false);
    }
  };

  const prepararReasignarTurno = async (trabajador: Trabajador) => {
    try {
      setCargandoSelectores(true);
      if (!usuarioActual?.empresa_id) {
        alert("No se pudo obtener el ID de la empresa.");
        return;
      }

      // 1. Obtener los turnos de la empresa
      const datosTurnos: Turno[] = await obtenerTurnosEmpresa(
        usuarioActual.empresa_id,
      );

      if (datosTurnos.length === 0) {
        alert("La empresa no tiene turnos estructurales creados.");
        return;
      }

      // 2. Obtener las asignaciones del trabajador para encontrar las vigentes
      const asignaciones: AsignacionTurno[] =
        await obtenerAsignacionesTurnoTrabajador(trabajador.id);
      const hoy = new Date().toISOString().split("T")[0];

      const vigentes: AsignacionTurno[] = asignaciones.filter(
        (a: AsignacionTurno) =>
          a.fecha_inicio <= hoy && (!a.fecha_fin || a.fecha_fin >= hoy),
      );

      if (vigentes.length > 0) {
        vigentes.forEach((vigente: AsignacionTurno) => {
          // 3. Rellenar los estados del formulario con los datos actuales
          const turnoEncontrado = datosTurnos.find(
            (t) => t.id === vigente.turno_id,
          );

          if (turnoEncontrado) {
            turnosSeleccionados.push(turnoEncontrado);
          }
          setFechaInicio(vigente.fecha_inicio);
          setFechaFin(vigente.fecha_fin ?? "");
        });
      }

      setTurnosEmpresa(datosTurnos);
      setTrabajadorSeleccionado(trabajador);
      setModalActivo("reasignar_turno"); // ¡Aquí estaba el error principal!
    } catch (error: any) {
      alert(obtenerMensajeAmigableError(error));
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

      if (contratoActivoDelTrabajador) {
        setContratoAEditar(contratoActivoDelTrabajador);
      }

      const esContratoValido =
        contratoActivoDelTrabajador &&
        contratoActivoDelTrabajador.activo === true;

      if (
        esContratoValido &&
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
    } catch (error: any) {
      alert(obtenerMensajeAmigableError(error));
    } finally {
      setModalActivo("editar_contrato");
    }
  };

  const seleccionarYAbrirModal = (trabajador: Trabajador, tipo: TipoModal) => {
    setTrabajadorSeleccionado(trabajador);
    setModalActivo(tipo);
  };

  const manejarClicReasignar = async (trabajador: Trabajador) => {
    setProcesando(true);
    try {
      const asignaciones = await obtenerAsignacionesTurnoTrabajador(
        trabajador.id,
      );
      const hoy = new Date().toISOString().split("T")[0];

      const vigente = asignaciones.find(
        (a: AsignacionTurno) =>
          a.fecha_inicio <= hoy && (!a.fecha_fin || a.fecha_fin >= hoy),
      );

      if (vigente) {
        setFechaInicio(vigente.fecha_inicio);
        setFechaFin(vigente.fecha_fin || hoy);

        const turnosVigentes = turnosEmpresa.filter((t: Turno) =>
          vigente.turnos_ids.includes(t.id),
        );
        setTurnosSeleccionados(turnosVigentes);
      } else {
        setFechaInicio("");
        setFechaFin("");
        setTurnosSeleccionados([]);
      }

      setTrabajadorSeleccionado(trabajador);
      setModalActivo("reasignar_turno");
    } catch (error: any) {
      alert(obtenerMensajeAmigableError(error));
    } finally {
      setProcesando(false);
    }
  };

  const handleRescindirContrato = async () => {
    if (!trabajadorSeleccionado) return;

    try {
      setProcesando(true);

      await rescindirContratoActivoTrabajador(
        trabajadorSeleccionado.id,
        trabajadorSeleccionado.empresa_id,
      );
      await cargarPlantilla();
      cerrarModales();
    } catch (err: any) {
      alert(obtenerMensajeAmigableError(err));
    } finally {
      setProcesando(false);
    }
  };

  const handleTramitarBajaTotal = async () => {
    if (!trabajadorSeleccionado) return;

    try {
      setProcesando(true);
      const fechaBaja = new Date().toISOString().split("T")[0];

      await rescindirContratoActivoTrabajador(
        trabajadorSeleccionado.id,
        trabajadorSeleccionado.empresa_id,
      );

      await actualizarTrabajador(trabajadorSeleccionado.id, {
        activo: false,
        fecha_baja_empresa: fechaBaja,
      });

      await cargarPlantilla();
      cerrarModales();
    } catch (err: any) {
      alert(obtenerMensajeAmigableError(err));
    } finally {
      setProcesando(false);
    }
  };

  const handleReactivarTrabajador = async () => {
    if (!trabajadorSeleccionado) return;

    try {
      setProcesando(true);

      await actualizarTrabajador(trabajadorSeleccionado.id, {
        activo: true,
        fecha_baja_empresa: null,
      });

      await cargarPlantilla();
      cerrarModales();
    } catch (err: any) {
      alert(obtenerMensajeAmigableError(err));
    } finally {
      setProcesando(false);
    }
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
                  handleAsignarTurnoTrabajador={() => {
                    manejarClicReasignar(item);
                  }}
                  prepararAsignarTurno={prepararReasignarTurno}
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
                {modalActivo === "eliminar_turno" && "Quitar Turno Asignedo"}
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
                      ref={inputNombreRef}
                      style={styles.inputForm}
                      value={nombre}
                      onChangeText={setNombre}
                      placeholder="Nombre de pila"
                      returnKeyType="next"
                      onSubmitEditing={() => inputApellidosRef.current?.focus()}
                    />
                  </View>
                  <View style={styles.campoForm}>
                    <ThemedText style={styles.labelForm}>
                      Apellidos *
                    </ThemedText>
                    <TextInput
                      ref={inputApellidosRef}
                      style={styles.inputForm}
                      value={apellidos}
                      onChangeText={setApellidos}
                      placeholder="Apellidos completos"
                      returnKeyType="next"
                      onSubmitEditing={() => inputNifRef.current?.focus()}
                    />
                  </View>
                  <View style={styles.campoForm}>
                    <ThemedText style={styles.labelForm}>
                      NIF / NIE *
                    </ThemedText>
                    <TextInput
                      ref={inputNifRef}
                      style={styles.inputForm}
                      value={nifNie}
                      onChangeText={setNifNie}
                      autoCapitalize="characters"
                      placeholder="Ej: 12345678Z"
                      returnKeyType="next"
                      onSubmitEditing={() => inputEmailRef.current?.focus()}
                    />
                  </View>
                  <View style={styles.campoForm}>
                    <ThemedText style={styles.labelForm}>
                      Email Opcional
                    </ThemedText>
                    <TextInput
                      ref={inputEmailRef}
                      style={styles.inputForm}
                      value={email}
                      onChangeText={setEmail}
                      keyboardType="email-address"
                      autoCapitalize="none"
                      placeholder="correo@empresa.com"
                      returnKeyType="next"
                      onSubmitEditing={() => inputTelefonoRef.current?.focus()}
                    />
                  </View>
                  <View style={styles.campoForm}>
                    <ThemedText style={styles.labelForm}>
                      Teléfono Móvil
                    </ThemedText>
                    <TextInput
                      ref={inputTelefonoRef}
                      style={styles.inputForm}
                      value={telefono}
                      onChangeText={setTelefono}
                      keyboardType="phone-pad"
                      placeholder="Ej: +34600111222"
                      returnKeyType="next"
                      onSubmitEditing={() => inputNssRef.current?.focus()}
                    />
                  </View>
                  <View style={styles.campoForm}>
                    <ThemedText style={styles.labelForm}>
                      Número Seguridad Social
                    </ThemedText>
                    <TextInput
                      ref={inputNssRef}
                      style={styles.inputForm}
                      value={nss}
                      onChangeText={setNss}
                      keyboardType="numeric"
                      placeholder="Ej: 281234567890"
                      returnKeyType="next"
                      onSubmitEditing={() => inputFechaNacRef.current?.focus()}
                    />
                  </View>
                  <View style={styles.campoForm}>
                    <ThemedText style={styles.labelForm}>
                      Fecha Nacimiento (AAAA-MM-DD)
                    </ThemedText>
                    <TextInput
                      ref={inputFechaNacRef}
                      style={styles.inputForm}
                      value={fechaNacimiento}
                      onChangeText={setFechaNacimiento}
                      placeholder="Ej: 1995-04-25"
                      returnKeyType="next"
                      onSubmitEditing={() =>
                        botonGuardarAltaRef.current?.focus()
                      }
                    />
                  </View>
                  <Pressable
                    ref={botonGuardarAltaRef}
                    style={styles.btnGuardarModal}
                    onPress={handleAltaTrabajadorCompleta}
                    disabled={procesando}
                    accessible={true}
                    accessibilityRole="button"
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
                      ref={inputTipoContratoRef}
                      style={styles.inputForm}
                      value={tipoContrato}
                      onChangeText={setTipoContrato}
                      placeholder="Ej: Indefinido, Temporal, ... "
                      returnKeyType="next"
                      onSubmitEditing={() =>
                        inputTipoJornadaRef.current?.focus()
                      }
                    />
                  </View>

                  <View style={styles.campoForm}>
                    <ThemedText style={styles.labelForm}>
                      Tipo Jornada
                    </ThemedText>
                    <TextInput
                      ref={inputTipoJornadaRef}
                      style={styles.inputForm}
                      value={tipoJornada}
                      onChangeText={setTipoJornada}
                      placeholder="Completa / Parcial"
                      returnKeyType="next"
                      onSubmitEditing={() =>
                        inputHorasSemanaRef.current?.focus()
                      }
                    />
                  </View>

                  <View style={styles.campoForm}>
                    <ThemedText style={styles.labelForm}>
                      Horas por Semana
                    </ThemedText>
                    <TextInput
                      ref={inputHorasSemanaRef}
                      style={styles.inputForm}
                      value={horasSemana}
                      onChangeText={setHorasSemana}
                      keyboardType="numeric"
                      returnKeyType="next"
                      onSubmitEditing={() =>
                        inputFechaInicioRef.current?.focus()
                      }
                    />
                  </View>

                  {/* NUEVOS CAMPOS */}
                  <View style={styles.campoForm}>
                    <ThemedText style={styles.labelForm}>
                      Fecha Inicio (AAAA-MM-DD)
                    </ThemedText>
                    <TextInput
                      ref={inputFechaInicioRef}
                      style={styles.inputForm}
                      value={fechaInicio}
                      onChangeText={setFechaInicio}
                      returnKeyType="next"
                      onSubmitEditing={() => inputFechaFinRef.current?.focus()}
                    />
                  </View>

                  <View style={styles.campoForm}>
                    <ThemedText style={styles.labelForm}>
                      Fecha Fin (Opcional)
                    </ThemedText>
                    <TextInput
                      ref={inputFechaFinRef}
                      style={styles.inputForm}
                      value={fechaFin}
                      onChangeText={setFechaFin}
                      placeholder="AAAA-MM-DD"
                      returnKeyType="next"
                      onSubmitEditing={() => inputPuestoRef.current?.focus()}
                    />
                  </View>

                  <View style={styles.campoForm}>
                    <ThemedText style={styles.labelForm}>
                      Puesto de Trabajo
                    </ThemedText>
                    <TextInput
                      ref={inputPuestoRef}
                      style={styles.inputForm}
                      value={puestoTrabajo}
                      onChangeText={setPuestoTrabajo}
                      returnKeyType="next"
                      onSubmitEditing={() => inputCategoriaRef.current?.focus()}
                    />
                  </View>

                  <View style={styles.campoForm}>
                    <ThemedText style={styles.labelForm}>
                      Categoría Profesional
                    </ThemedText>
                    <TextInput
                      ref={inputCategoriaRef}
                      style={styles.inputForm}
                      value={categoriaProfesional ?? ""}
                      onChangeText={setCategoriaProfesional}
                      returnKeyType="next"
                      onSubmitEditing={() =>
                        botonGuardarContratoRef.current?.focus()
                      }
                    />
                  </View>

                  {/* Selector de Centro de Trabajo (Sin ScrollView anidado conflictivo) */}
                  <View style={styles.campoForm}>
                    <ThemedText style={styles.labelForm}>
                      Centro de Trabajo *
                    </ThemedText>
                    <View
                      style={{
                        flexDirection: "row",
                        flexWrap: "wrap",
                        gap: 8,
                        marginTop: 5,
                      }}
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
                    </View>
                  </View>

                  {/* Selector de Departamento (Sin ScrollView anidado conflictivo) */}
                  <View style={styles.campoForm}>
                    <ThemedText style={styles.labelForm}>
                      Departamento
                    </ThemedText>
                    <View
                      style={{
                        flexDirection: "row",
                        flexWrap: "wrap",
                        gap: 8,
                        marginTop: 5,
                      }}
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
                    </View>
                  </View>

                  <Pressable
                    ref={botonGuardarContratoRef}
                    style={styles.btnGuardarModal}
                    onPress={
                      modalActivo === "editar_contrato"
                        ? handleEditarContrato
                        : handleGuardarContrato
                    }
                    disabled={procesando}
                    accessible={true}
                    accessibilityRole="button"
                  >
                    <ThemedText style={styles.btnGuardarModalTexto}>
                      {procesando
                        ? "Procesando..."
                        : modalActivo === "editar_contrato"
                          ? "Confirmar cambios"
                          : "Formalizar Contrato"}
                    </ThemedText>
                  </Pressable>
                </View>
              )}

              {/* FORMULARIO: RESCINDIR CONTRATO O BAJA TRABAJADOR */}
              {(modalActivo === "rescindir_contrato" ||
                modalActivo === "baja_trabajador" ||
                modalActivo === "reactivar_trabajador") && (
                <View>
                  <ThemedText
                    style={[
                      styles.subtituloModal,
                      {
                        color: trabajadorSeleccionado?.activo
                          ? "#DC2626"
                          : "#059669",
                        marginBottom: 16,
                      },
                    ]}
                  >
                    {trabajadorSeleccionado?.activo
                      ? `¿Está seguro de que desea proceder con esta operación para ${trabajadorSeleccionado?.nombre}? Ésta acción modificará su estado laboral inmediato.`
                      : "¿Desea reactivar a este trabajador en la empresa?"}
                  </ThemedText>

                  <Pressable
                    ref={
                      modalActivo === "rescindir_contrato"
                        ? botonRescindirContratoRef
                        : botonConfirmarBajaRef
                    }
                    style={[
                      styles.btnGuardarModal,
                      {
                        backgroundColor: trabajadorSeleccionado?.activo
                          ? "#DC2626"
                          : "#059669",
                      },
                    ]}
                    onPress={() => {
                      if (trabajadorSeleccionado?.activo) {
                        if (modalActivo === "rescindir_contrato") {
                          handleRescindirContrato?.();
                        } else {
                          handleTramitarBajaTotal();
                        }
                      } else {
                        handleReactivarTrabajador();
                      }
                    }}
                    disabled={procesando}
                    accessible={true}
                    accessibilityRole="button"
                  >
                    {procesando ? (
                      <ActivityIndicator size="small" color="#FFFFFF" />
                    ) : (
                      <ThemedText style={styles.btnGuardarModalTexto}>
                        {modalActivo === "rescindir_contrato"
                          ? "Confirmar Rescisión"
                          : trabajadorSeleccionado?.activo
                            ? "Confirmar Baja"
                            : "Confirmar Reactivación"}
                      </ThemedText>
                    )}
                  </Pressable>
                </View>
              )}

              {/* FORMULARIO: ASIGNAR / REASIGNAR TURNO */}
              {(modalActivo === "asignar_turno" ||
                modalActivo === "reasignar_turno") && (
                <View style={styles.contenedorModal}>
                  <View
                    style={{ flexDirection: "row", gap: 10, marginBottom: 15 }}
                  >
                    <View style={{ flex: 1 }}>
                      <ThemedText style={styles.labelForm}>Inicio *</ThemedText>
                      <TextInput
                        ref={inputTurnoInicioRef}
                        style={styles.inputForm}
                        placeholder="AAAA-MM-DD"
                        value={fechaInicio}
                        onChangeText={setFechaInicio}
                        returnKeyType="next"
                        onSubmitEditing={() =>
                          inputTurnoFinRef.current?.focus()
                        }
                      />
                    </View>
                    <View style={{ flex: 1 }}>
                      <ThemedText style={styles.labelForm}>
                        Fin (Opcional)
                      </ThemedText>
                      <TextInput
                        ref={inputTurnoFinRef}
                        style={styles.inputForm}
                        placeholder="AAAA-MM-DD"
                        value={fechaFin || ""}
                        onChangeText={setFechaFin}
                        returnKeyType="next"
                        onSubmitEditing={() =>
                          botonActualizarRef.current?.focus()
                        }
                      />
                    </View>
                  </View>

                  {/* --- SECCIÓN SELECCIÓN DE TURNOS --- */}
                  <View style={styles.campoForm}>
                    <ThemedText style={styles.labelForm}>
                      {modalActivo === "reasignar_turno"
                        ? "Seleccione los Turnos *"
                        : "Turnos de la Empresa *"}
                    </ThemedText>

                    <View style={styles.contenedorSelectorScroll}>
                      <ScrollView
                        style={{ maxHeight: 160 }}
                        nestedScrollEnabled={true}
                      >
                        {turnosEmpresa.map((turno: Turno) => {
                          const estaSeleccionado = turnosSeleccionados.some(
                            (t) => t.id === turno.id,
                          );
                          return (
                            <Pressable
                              key={turno.id}
                              style={[
                                styles.opcionSelector,
                                estaSeleccionado &&
                                  styles.opcionSelectorSeleccionada,
                              ]}
                              onPress={() => {
                                setTurnosSeleccionados(
                                  estaSeleccionado
                                    ? turnosSeleccionados.filter(
                                        (t) => t.id !== turno.id,
                                      )
                                    : [...turnosSeleccionados, turno],
                                );
                              }}
                            >
                              <ThemedText style={{ color: "#222222" }}>
                                {turno.nombre}
                              </ThemedText>
                              {estaSeleccionado && (
                                <FontAwesome5
                                  name="check-square"
                                  size={16}
                                  color="#2563EB"
                                />
                              )}
                            </Pressable>
                          );
                        })}
                      </ScrollView>
                    </View>
                  </View>

                  {/* --- BOTONES DE ACCIÓN --- */}
                  <View style={styles.contenedorAccionesModal}>
                    <Pressable
                      style={styles.btnCancelarModal}
                      onPress={cerrarModales}
                    >
                      <ThemedText style={styles.btnCancelarModalTexto}>
                        Cancelar
                      </ThemedText>
                    </Pressable>

                    <Pressable
                      ref={botonActualizarRef}
                      style={[
                        styles.btnGuardarModal,
                        {
                          backgroundColor:
                            modalActivo === "reasignar_turno"
                              ? "#D946EF"
                              : "#2563EB",
                        },
                        (procesando ||
                          turnosSeleccionados.length === 0 ||
                          !fechaInicio) && { opacity: 0.5 },
                      ]}
                      onPress={handleAsignarTurnoTrabajador}
                      disabled={
                        procesando ||
                        turnosSeleccionados.length === 0 ||
                        !fechaInicio
                      }
                      accessible={true}
                      accessibilityRole="button"
                    >
                      {procesando ? (
                        <ActivityIndicator color="#FFFFFF" />
                      ) : (
                        <ThemedText style={styles.btnGuardarModalTexto}>
                          {modalActivo === "reasignar_turno"
                            ? "Actualizar"
                            : "Asignar"}
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
                    ref={botonConfirmarEliminarTurnoRef}
                    style={[
                      styles.btnGuardarModal,
                      { backgroundColor: "#EA580C" },
                    ]}
                    onPress={handleEliminarTurnos}
                    disabled={procesando}
                    accessible={true}
                    accessibilityRole="button"
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
  botonReactivarEmpresa: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#e4fee2",
    paddingVertical: 10,
    borderRadius: 8,
    marginTop: 4,
  },
  textoBotonReactivarEmpresa: {
    color: "#117937",
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
