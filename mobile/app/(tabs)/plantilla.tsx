import { obtenerAsignacionesTurnoTrabajador } from "@/src/modules/asignaciones-turno/api/services";
import { AsignacionTurno } from "@/src/modules/asignaciones-turno/types/asignacion-turno";
import { obtenerCalendariosFestivosPorEmpresa } from "@/src/modules/calendarios-laborales/api/services";
import { CalendarioFestivo } from "@/src/modules/calendarios-laborales/types/calendario";
import { obtenerCentrosTrabajoPorEmpresa } from "@/src/modules/centros-trabajo/api/services";
import { CentroTrabajo } from "@/src/modules/centros-trabajo/types/centro-trabajo";
import {
  actualizarContrato,
  obtenerContratoActivoTrabajador,
  rescindirContratoActivoTrabajador,
} from "@/src/modules/contratos/api/services";
import { obtenerDepartamentosEmpresa } from "@/src/modules/departamentos/api/services";
import { Departamento } from "@/src/modules/departamentos/types/departamento";
import { ModalAltaEditarTrabajador } from "@/src/modules/empresas/components/modals/ModalAltaEditarTrabajador";
import { ModalAsignarTurnoTrabajador } from "@/src/modules/empresas/components/modals/ModalAsignarTurnoTrabajador";
import { ModalContenedor } from "@/src/modules/empresas/components/modals/ModalContenedor";
import { ModalContratoTrabajador } from "@/src/modules/empresas/components/modals/ModalContratoTrabajador";
import { ModalEliminarTurnoTrabajador } from "@/src/modules/empresas/components/modals/ModalEliminarTurnoTrabajador";
import { ModalRescindirBajaTrabajador } from "@/src/modules/empresas/components/modals/ModalRescindirBajaTrabajador";
import {
  PlantillaProvider,
  usePlantilla,
} from "@/src/modules/empresas/components/PlantillaProvider";
import {
  TipoModal,
  usePlantillaFormularios,
} from "@/src/modules/empresas/hooks/usePlantillaFormularios";
import { obtenerRolPorId } from "@/src/modules/roles/api/services";
import { FichaTrabajador } from "@/src/modules/trabajadores/components/FichaTrabajador";
import { obtenerTurnosEmpresa } from "@/src/modules/turnos/api/services";
import { Turno } from "@/src/modules/turnos/types/turno";
import { useSesion } from "@/src/modules/usuarios/store/SesionContext";
import { mostrarError, mostrarMensaje } from "@/src/utils/errorHandler";
import { FontAwesome5 } from "@expo/vector-icons";
import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  TextStyle,
  View,
  ViewStyle,
} from "react-native";
import {
  actualizarAsignacionTurno,
  actualizarTrabajador,
  asignarTurnosTrabajador,
} from "../../src/modules/trabajadores/api/services";
import { Trabajador } from "../../src/modules/trabajadores/types/trabajador";
import { ThemedText } from "../../src/shared/components/ThemedText";
import { AppScreen } from "../../src/shared/ui/AppSurface";

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

  const [filtroEstado] = useState<"todos" | "altas">("todos");
  const [turnosEmpresa, setTurnosEmpresa] = useState<Turno[]>([]);
  const [cargandoSelectores, setCargandoSelectores] = useState(false);
  const [listaCentros, setListaCentros] = useState<CentroTrabajo[]>([]);
  const [listaDepartamentos, setListaDepartamentos] = useState<Departamento[]>(
    [],
  );
  const [listaCalendariosLaborales, setListaCalendariosLaborales] = useState<
    CalendarioFestivo[]
  >([]);

  const [turnosInicialesVigentes, setTurnosInicialesVigentes] = useState<
    Turno[]
  >([]);

  const esGestoria = usuarioActual?.tipo_usuario === "Admin_gestoría";
  const esAdminEmpresa = usuarioActual?.tipo_usuario === "Admin_empresa";
  const esRRHH = usuarioActual?.tipo_usuario === "Rrhh";
  const puedeAcceder = esGestoria || esAdminEmpresa || esRRHH;

  const {
    procesando,
    setProcesando,
    modalActivo,
    setModalActivo,
    trabajadorActual,
    setTrabajadorActual,
    nombre,
    setNombre,
    apellidos,
    setApellidos,
    nifNie,
    setNifNie,
    email,
    setEmail,
    telefono,
    setTelefono,
    nss,
    setNss,
    fechaNacimiento,
    setFechaNacimiento,
    tipoRol,
    setTipoRol,
    rolesDisponibles,
    fechaInicio,
    setFechaInicio,
    fechaFin,
    setFechaFin,
    departamentoId,
    setDepartamentoId,
    puestoTrabajo,
    setPuestoTrabajo,
    categoriaProfesional,
    setCategoriaProfesional,
    tipoContrato,
    setTipoContrato,
    tipoJornada,
    setTipoJornada,
    horasSemana,
    setHorasSemana,
    centroTrabajoId,
    setCentroTrabajoId,
    calendarioLaboralId,
    setCalendarioLaboralId,
    contratoAEditar,
    setContratoAEditar,
    turnosSeleccionados,
    setTurnosSeleccionados,
    cerrarModales,
    handleAltaTrabajadorCompleta,
    handleEditarTrabajador,
    handleGuardarContrato,
    handleEliminarTurnos,
    inputRefs,
  } = usePlantillaFormularios(usuarioActual!, cargarPlantilla);

  useEffect(() => {
    if (usuarioActual?.empresa_id) {
      Promise.all([
        obtenerCentrosTrabajoPorEmpresa(usuarioActual.empresa_id),
        obtenerDepartamentosEmpresa(usuarioActual.empresa_id),
        obtenerTurnosEmpresa(usuarioActual.empresa_id),
        obtenerCalendariosFestivosPorEmpresa(usuarioActual.empresa_id),
      ]).then(([centros, departamentos, turnos, calendarios]) => {
        setListaCentros(centros);
        setListaDepartamentos(departamentos);
        setTurnosEmpresa(turnos);
        setListaCalendariosLaborales(calendarios);
      });
    }
  }, [usuarioActual?.empresa_id]);

  useEffect(() => {
    if (usuarioActual?.empresa_id && puedeAcceder && !inicializado) {
      cargarPlantilla();
    }
  }, [cargarPlantilla, puedeAcceder, usuarioActual?.empresa_id, inicializado]);

  useEffect(() => {
    if (!modalActivo) return;

    const esEdicion = modalActivo === "editar_contrato";
    const esEdicionTrabajador = modalActivo === "editar_trabajador";
    const esCreacion =
      modalActivo === "nuevo_contrato" || modalActivo === "alta_trabajador";

    if (esEdicion && contratoAEditar) {
      setTipoContrato(contratoAEditar.tipo_contrato);
      setTipoJornada(contratoAEditar.tipo_jornada);
      setHorasSemana(contratoAEditar.horas_semana?.toString());
      setFechaInicio(contratoAEditar.fecha_inicio);
      setFechaFin(contratoAEditar.fecha_fin!);
      setPuestoTrabajo(contratoAEditar.puesto_trabajo!);
      setCategoriaProfesional(contratoAEditar.categoria_profesional!);
      setDepartamentoId(contratoAEditar.departamento_id!);
      setCalendarioLaboralId(contratoAEditar.calendario_laboral_id!);
    } else if (esEdicionTrabajador && trabajadorActual) {
      setNombre(trabajadorActual.nombre);
      setApellidos(trabajadorActual.apellidos);
      setNifNie(trabajadorActual.dni_nif_nie);
      setEmail(trabajadorActual.email!);
      setTelefono(trabajadorActual.telefono!);
      setNss(trabajadorActual.numero_seguridad_social);
      setFechaNacimiento(trabajadorActual.fecha_nacimiento);
      setTipoRol(trabajadorActual.rol_id);
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
      setCalendarioLaboralId("");
    } else if (modalActivo === "asignar_turno") {
      setFechaInicio(new Date().toISOString().split("T")[0]);
      setFechaFin("");
      setTurnosSeleccionados([]);
    }
  }, [modalActivo, contratoAEditar]);

  const [trabajadoresValidosIds, setTrabajadoresValidosIds] = useState<
    string[] | null
  >(null);

  // Solución al waterfall: Extraer todos los IDs únicos de roles y consultarlos en paralelo con Promise.all
  useEffect(() => {
    let isMounted = true;
    async function filtrarAdminsDePlantilla() {
      if (!plantilla || plantilla.length === 0) {
        if (isMounted) setTrabajadoresValidosIds([]);
        return;
      }

      const rolesIdsUnicos = Array.from(
        new Set(
          plantilla
            .map((item: Trabajador) => item.rol_id)
            .filter((id): id is string => Boolean(id)),
        ),
      );

      try {
        const rolesPromesas = rolesIdsUnicos.map(async (rolId) => {
          try {
            const rol = await obtenerRolPorId(rolId);
            return { rolId, rol };
          } catch {
            return { rolId, rol: null };
          }
        });

        const resultadosRoles = await Promise.all(rolesPromesas);
        const mapaRoles = new Map(resultadosRoles.map((r) => [r.rolId, r.rol]));

        const idsValidos: string[] = [];
        for (const item of plantilla) {
          if (!item.rol_id) {
            idsValidos.push(item.id);
            continue;
          }
          const rol = mapaRoles.get(item.rol_id);
          const esAdmin =
            rol?.nombre?.toLowerCase().includes("admin") ||
            rol?.descripcion?.toLowerCase().includes("admin");

          if (!esAdmin) {
            idsValidos.push(item.id);
          }
        }

        if (isMounted) setTrabajadoresValidosIds(idsValidos);
      } catch {
        if (isMounted)
          setTrabajadoresValidosIds(plantilla.map((t: Trabajador) => t.id));
      }
    }

    filtrarAdminsDePlantilla();
    return () => {
      isMounted = false;
    };
  }, [plantilla]);

  const plantillaFiltrada = useMemo(() => {
    if (!trabajadoresValidosIds) return [];
    return plantilla.filter((item: Trabajador) => {
      const esElJefeActual = item.id === usuarioActual?.trabajador_id;
      if (esElJefeActual && esAdminEmpresa) return false;

      const coincideTenant = esGestoria
        ? true
        : item.empresa_id === usuarioActual?.empresa_id;
      const coincideEstado = filtroEstado === "todos" || item.activo;
      const noEsAdmin = trabajadoresValidosIds.includes(item.id);

      return coincideTenant && coincideEstado && noEsAdmin;
    });
  }, [
    plantilla,
    filtroEstado,
    usuarioActual,
    esGestoria,
    esAdminEmpresa,
    trabajadoresValidosIds,
  ]);

  const handleEditarContrato = async () => {
    if (!contratoAEditar?.id) {
      mostrarMensaje("Alerta", "No se pudo identificar el contrato a editar");
      return;
    }
    try {
      setProcesando(true);
      await actualizarContrato(contratoAEditar.id, {
        empresa_id: usuarioActual!.empresa_id!,
        centro_trabajo_id: centroTrabajoId,
        tipo_contrato: tipoContrato,
        tipo_jornada: tipoJornada,
        horas_semana: Number(horasSemana),
        fecha_inicio: fechaInicio,
        fecha_fin: fechaFin || "",
        departamento_id: departamentoId,
        puesto_trabajo: puestoTrabajo,
        categoria_profesional: categoriaProfesional,
        trabajador_id: trabajadorActual!.id,
        calendario_laboral_id: calendarioLaboralId,
      });
      await cargarPlantilla();
      cerrarModales();
    } catch (error: any) {
      mostrarError("Error al actualizar el contrato: " + error);
    } finally {
      setProcesando(false);
    }
  };

  const handleAsignarTurnoTrabajador = async (
    turnosADesactivar: { id: string; fechaFin: string }[] = [],
  ) => {
    if (!trabajadorActual || turnosSeleccionados.length === 0) return;
    try {
      setProcesando(true);
      if (modalActivo === "reasignar_turno") {
        const asignacionesActuales = await obtenerAsignacionesTurnoTrabajador(
          trabajadorActual.id,
        );
        const turnosIdsExistentesPrevios = asignacionesActuales.map(
          (a: AsignacionTurno) => a.turno_id,
        );

        const turnosAEditar = turnosSeleccionados.filter((t: Turno) =>
          turnosIdsExistentesPrevios.includes(t.id),
        );
        const turnosANuevo = turnosSeleccionados.filter(
          (t: Turno) => !turnosIdsExistentesPrevios.includes(t.id),
        );

        for (const turno of turnosAEditar) {
          const asignacionEncontrada = asignacionesActuales.find(
            (a: AsignacionTurno) => a.turno_id === turno.id,
          );
          if (asignacionEncontrada) {
            await actualizarAsignacionTurno(
              asignacionEncontrada.id,
              fechaInicio,
              fechaFin || null,
            );
          }
        }

        if (turnosANuevo.length > 0) {
          await asignarTurnosTrabajador(
            trabajadorActual.id,
            turnosANuevo.map((t: Turno) => t.id),
            fechaInicio,
            fechaFin || null,
          );
        }

        for (const itemDesactivar of turnosADesactivar) {
          const asignacionADesactivar = asignacionesActuales.find(
            (a: AsignacionTurno) => a.turno_id === itemDesactivar.id,
          );
          if (asignacionADesactivar) {
            await actualizarAsignacionTurno(
              asignacionADesactivar.id,
              asignacionADesactivar.fecha_inicio,
              itemDesactivar.fechaFin,
            );
          }
        }
      } else {
        await asignarTurnosTrabajador(
          trabajadorActual.id,
          turnosSeleccionados.map((t: Turno) => t.id),
          fechaInicio,
          fechaFin || null,
        );
      }

      await cargarPlantilla();
      cerrarModales();
      setTurnosSeleccionados([]);
    } catch (error: any) {
      mostrarError("Error al asignar el turno al trabajador: " + error);
    } finally {
      setProcesando(false);
    }
  };

  const prepararAsignarTurno = async (trabajador: Trabajador) => {
    try {
      setCargandoSelectores(true);
      if (!usuarioActual?.empresa_id) return;

      const datosTurnos: Turno[] = await obtenerTurnosEmpresa(
        usuarioActual.empresa_id,
      );
      if (datosTurnos.length === 0) {
        mostrarMensaje(
          "Alerta",
          "La empresa no tiene turnos estructurales creados.",
        );
        return;
      }

      const asignaciones: AsignacionTurno[] =
        await obtenerAsignacionesTurnoTrabajador(trabajador.id);
      const hoy = new Date().toISOString().split("T")[0];
      const vigentes = asignaciones.filter(
        (a: AsignacionTurno) =>
          a.fecha_inicio <= hoy && a.fecha_fin && a.fecha_fin >= hoy,
      );

      const turnosEncontrados: Turno[] = [];
      if (vigentes.length > 0) {
        vigentes.forEach((vigente: AsignacionTurno) => {
          const turnoEncontrado = datosTurnos.find(
            (t: Turno) => t.id === vigente.turno_id,
          );
          if (turnoEncontrado) turnosEncontrados.push(turnoEncontrado);
          setFechaInicio(vigente.fecha_inicio);
          setFechaFin(vigente.fecha_fin ?? "");
        });
      } else {
        setFechaInicio(hoy);
        setFechaFin("");
      }
      setTurnosSeleccionados(turnosEncontrados);
      setTurnosInicialesVigentes(turnosEncontrados);
      setTurnosEmpresa(datosTurnos);
      setTrabajadorActual(trabajador);
      setModalActivo("reasignar_turno");
    } catch (error: any) {
      mostrarError("Error al preparar la asignación de turno: " + error);
    } finally {
      setCargandoSelectores(false);
    }
  };

  const abrirEdicionContrato = async (trabajador: Trabajador) => {
    setTrabajadorActual(trabajador);
    if (!trabajador?.id) return;

    try {
      setCargandoSelectores?.(true);
      const contratoActivoDelTrabajador = await obtenerContratoActivoTrabajador(
        trabajador.id,
        trabajador.empresa_id,
      );

      if (contratoActivoDelTrabajador) {
        setContratoAEditar(contratoActivoDelTrabajador);
        setTipoContrato(contratoActivoDelTrabajador.tipo_contrato || "");
        setTipoJornada(contratoActivoDelTrabajador.tipo_jornada || "");
        setHorasSemana(
          contratoActivoDelTrabajador.horas_semana?.toString() || "",
        );
        setFechaInicio(contratoActivoDelTrabajador.fecha_inicio || "");
        setFechaFin(contratoActivoDelTrabajador.fecha_fin || "");
        setPuestoTrabajo(contratoActivoDelTrabajador.puesto_trabajo || "");
        setCategoriaProfesional(
          contratoActivoDelTrabajador.categoria_profesional || "",
        );
        setCentroTrabajoId(contratoActivoDelTrabajador.centro_trabajo_id || "");
        setDepartamentoId(contratoActivoDelTrabajador.departamento_id || "");
        setCalendarioLaboralId(
          contratoActivoDelTrabajador.calendario_laboral_id || "",
        );
        setModalActivo("editar_contrato");
      } else {
        setContratoAEditar(undefined);
        setTipoContrato("");
        setTipoJornada("");
        setHorasSemana("");
        setFechaInicio(new Date().toISOString().split("T")[0]);
        setFechaFin("");
        setPuestoTrabajo("");
        setCategoriaProfesional("");
        setCentroTrabajoId("");
        setDepartamentoId("");
        setCalendarioLaboralId("");
        setModalActivo("nuevo_contrato");
      }
    } catch {
      setContratoAEditar(undefined);
      setModalActivo("nuevo_contrato");
    } finally {
      setCargandoSelectores?.(false);
    }
  };

  const seleccionarTrabajador = (trabajador: Trabajador) => {
    setTrabajadorActual(trabajador);
  };

  const handleRescindirContrato = async () => {
    if (!trabajadorActual) return;
    try {
      setProcesando(true);
      await rescindirContratoActivoTrabajador(
        trabajadorActual.id,
        trabajadorActual.empresa_id,
      );
      await cargarPlantilla();
      cerrarModales();
    } catch (error: any) {
      mostrarError("Error al rescindir el contrato: " + error);
    } finally {
      setProcesando(false);
    }
  };

  const handleTramitarBajaTotal = async () => {
    if (!trabajadorActual) return;
    try {
      setProcesando(true);
      const fechaBaja = new Date().toISOString().split("T")[0];
      await rescindirContratoActivoTrabajador(
        trabajadorActual.id,
        trabajadorActual.empresa_id,
      );
      await actualizarTrabajador(trabajadorActual.id, {
        empresa_id: trabajadorActual.empresa_id,
        rol_id: tipoRol,
        dni_nif_nie: trabajadorActual.dni_nif_nie,
        nombre: trabajadorActual.nombre,
        apellidos: trabajadorActual.apellidos,
        fecha_nacimiento: trabajadorActual.fecha_nacimiento,
        numero_seguridad_social: trabajadorActual.numero_seguridad_social,
        activo: false,
        fecha_baja_empresa: fechaBaja,
      });
      await cargarPlantilla();
      cerrarModales();
    } catch (error: any) {
      mostrarError("Error al tramitar la baja total del trabajador: " + error);
    } finally {
      setProcesando(false);
    }
  };

  const handleReactivarTrabajador = async () => {
    if (!trabajadorActual) return;
    try {
      setProcesando(true);
      await actualizarTrabajador(trabajadorActual.id, {
        empresa_id: trabajadorActual.empresa_id,
        rol_id: tipoRol,
        dni_nif_nie: trabajadorActual.dni_nif_nie,
        nombre: trabajadorActual.nombre,
        apellidos: trabajadorActual.apellidos,
        fecha_nacimiento: trabajadorActual.fecha_nacimiento,
        numero_seguridad_social: trabajadorActual.numero_seguridad_social,
        activo: true,
        fecha_baja_empresa: null,
      });
      await cargarPlantilla();
      cerrarModales();
    } catch (error: any) {
      mostrarError("Error al reactivar al trabajador: " + error);
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
            {plantillaFiltrada.map((item: Trabajador) => (
              <FichaTrabajador
                key={item.id}
                item={item}
                styles={styles}
                setModalActivo={(modal) => setModalActivo(modal as TipoModal)}
                onSeleccionarTrabajador={() => seleccionarTrabajador(item)}
                abrirEdicionContrato={(t) =>
                  abrirEdicionContrato(t as Trabajador)
                }
                prepararAsignarTurno={(t) =>
                  prepararAsignarTurno(t as Trabajador)
                }
                handleAsignarTurnoTrabajador={() => {
                  handleAsignarTurnoTrabajador();
                }}
              />
            ))}
          </View>
        )}
      </ScrollView>

      <ModalContenedor
        modalActivo={modalActivo}
        onCerrar={cerrarModales}
        styles={styles}
      >
        {(modalActivo === "alta_trabajador" ||
          modalActivo === "editar_trabajador") && (
          <ModalAltaEditarTrabajador
            esEdicion={modalActivo === "editar_trabajador"}
            nombre={nombre}
            setNombre={setNombre}
            apellidos={apellidos}
            setApellidos={setApellidos}
            nifNie={nifNie}
            setNifNie={setNifNie}
            email={email}
            setEmail={setEmail}
            telefono={telefono}
            setTelefono={setTelefono}
            nss={nss}
            setNss={setNss}
            fechaNacimiento={fechaNacimiento}
            setFechaNacimiento={setFechaNacimiento}
            tipoRol={tipoRol}
            setTipoRol={setTipoRol}
            rolesDisponibles={rolesDisponibles}
            onGuardar={
              modalActivo === "editar_trabajador"
                ? handleEditarTrabajador
                : handleAltaTrabajadorCompleta
            }
            procesando={procesando}
            styles={styles}
            inputRefs={{
              apellidosRef: inputRefs.inputApellidosRef,
              nifRef: inputRefs.inputNifRef,
              emailRef: inputRefs.inputEmailRef,
              telefonoRef: inputRefs.inputTelefonoRef,
              nssRef: inputRefs.inputNssRef,
              fechaNacRef: inputRefs.inputFechaNacRef,
              botonGuardarRef: inputRefs.botonGuardarAltaRef,
            }}
          />
        )}

        {(modalActivo === "nuevo_contrato" ||
          modalActivo === "editar_contrato") && (
          <ModalContratoTrabajador
            esEdicion={modalActivo === "editar_contrato"}
            trabajadorActual={trabajadorActual}
            tipoContrato={tipoContrato}
            setTipoContrato={setTipoContrato}
            tipoJornada={tipoJornada}
            setTipoJornada={setTipoJornada}
            horasSemana={horasSemana}
            setHorasSemana={setHorasSemana}
            fechaInicio={fechaInicio}
            setFechaInicio={setFechaInicio}
            fechaFin={fechaFin}
            setFechaFin={setFechaFin}
            puestoTrabajo={puestoTrabajo}
            setPuestoTrabajo={setPuestoTrabajo}
            categoriaProfesional={categoriaProfesional}
            setCategoriaProfesional={setCategoriaProfesional}
            centroTrabajoId={centroTrabajoId}
            setCentroTrabajoId={setCentroTrabajoId}
            departamentoId={departamentoId}
            setDepartamentoId={setDepartamentoId}
            calendarioLaboralId={calendarioLaboralId}
            setCalendarioLaboralId={setCalendarioLaboralId}
            listaCentros={listaCentros}
            listaDepartamentos={listaDepartamentos}
            listaCalendariosLaborales={listaCalendariosLaborales}
            onGuardar={
              modalActivo === "editar_contrato"
                ? handleEditarContrato
                : handleGuardarContrato
            }
            procesando={procesando}
            styles={styles}
            inputRefs={{
              inputHorasSemanaRef: inputRefs.inputHorasSemanaRef,
              inputFechaInicioRef: inputRefs.inputFechaInicioRef,
              inputFechaFinRef: inputRefs.inputFechaFinRef,
              inputPuestoRef: inputRefs.inputPuestoRef,
              inputCategoriaRef: inputRefs.inputCategoriaRef,
              botonGuardarContratoRef: inputRefs.botonGuardarContratoRef,
            }}
          />
        )}

        {(modalActivo === "rescindir_contrato" ||
          modalActivo === "baja_trabajador" ||
          modalActivo === "reactivar_trabajador") && (
          <ModalRescindirBajaTrabajador
            modalActivo={modalActivo}
            trabajadorActual={trabajadorActual}
            onConfirmar={() => {
              if (trabajadorActual?.activo) {
                if (modalActivo === "rescindir_contrato") {
                  handleRescindirContrato?.();
                } else {
                  handleTramitarBajaTotal();
                }
              } else {
                handleReactivarTrabajador();
              }
            }}
            procesando={procesando}
            styles={styles}
            botonRef={
              modalActivo === "rescindir_contrato"
                ? inputRefs.botonRescindirContratoRef
                : inputRefs.botonConfirmarBajaRef
            }
          />
        )}

        {(modalActivo === "asignar_turno" ||
          modalActivo === "reasignar_turno") && (
          <ModalAsignarTurnoTrabajador
            modalActivo={modalActivo}
            fechaInicio={fechaInicio}
            setFechaInicio={setFechaInicio}
            fechaFin={fechaFin}
            setFechaFin={setFechaFin}
            turnosEmpresa={turnosEmpresa}
            turnosSeleccionados={turnosSeleccionados}
            setTurnosSeleccionados={setTurnosSeleccionados}
            turnosInicialesVigentes={turnosInicialesVigentes}
            onGuardar={handleAsignarTurnoTrabajador}
            onCancelar={cerrarModales}
            procesando={procesando}
            styles={styles}
            inputRefs={{
              inputTurnoInicioRef: inputRefs.inputTurnoInicioRef,
              inputTurnoFinRef: inputRefs.inputTurnoFinRef,
              botonActualizarRef: inputRefs.botonActualizarRef,
            }}
          />
        )}

        {modalActivo === "eliminar_turno" && (
          <ModalEliminarTurnoTrabajador
            trabajadorActual={trabajadorActual}
            onConfirmar={handleEliminarTurnos}
            procesando={procesando}
            styles={styles}
            botonRef={inputRefs.botonConfirmarEliminarTurnoRef}
          />
        )}
      </ModalContenedor>
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
  } as ViewStyle,
  textoAltaGlobal: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "700",
  } as TextStyle,
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  } as ViewStyle,
  avatarCirculo: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#EFF6FF",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#BFDBFE",
  } as ViewStyle,
  avatarTexto: {
    fontSize: 14,
    fontWeight: "800",
    color: "#2563EB",
  } as TextStyle,
  nombreEmpleado: {
    fontSize: 15,
    fontWeight: "800",
    color: "#0F172A",
  } as TextStyle,
  badgeEstado: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  } as ViewStyle,
  textoBadge: {
    fontSize: 11,
    fontWeight: "700",
    textTransform: "uppercase",
  } as TextStyle,
  separador: {
    height: 1,
    backgroundColor: "#F1F5F9",
    marginVertical: 10,
  } as ViewStyle,
  separadorDashed: {
    height: 1,
    backgroundColor: "#E2E8F0",
    marginVertical: 10,
    borderStyle: "dashed",
    borderWidth: 1,
    borderRadius: 1,
  } as ViewStyle,
  gridDetalles: { flexDirection: "row", width: "100%", gap: 12 } as ViewStyle,
  bloqueDato: { flex: 1 } as ViewStyle,
  labelDato: { fontSize: 11, color: "#64748B", fontWeight: "600" } as TextStyle,
  valorDato: {
    fontSize: 13,
    color: "#334155",
    fontWeight: "700",
    marginTop: 2,
  } as TextStyle,
  contenedorAuditoria: {
    backgroundColor: "#F8FAFC",
    padding: 8,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  } as ViewStyle,
  filaAuditoriaItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  } as ViewStyle,
  textoAuditoria: { fontSize: 12, fontWeight: "600" } as TextStyle,
  panelAccionesJefe: {
    flexDirection: "row",
    gap: 10,
    marginTop: 12,
    justifyContent: "flex-end",
  } as ViewStyle,
  botonAccionAdmin: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    minWidth: 110,
  } as ViewStyle,
  botonContrato: { backgroundColor: "#16A34A" } as ViewStyle,
  botonTurno: { backgroundColor: "#2563EB" } as ViewStyle,
  textoBotonAdmin: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "700",
  } as TextStyle,
  textoVacio: {
    textAlign: "center",
    color: "#64748B",
    marginTop: 32,
    fontStyle: "italic",
  } as TextStyle,
  overlayModal: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.6)",
    justifyContent: "flex-end",
  } as ViewStyle,
  ventanaModal: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    maxHeight: "85%",
  } as ViewStyle,
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  } as ViewStyle,
  modalTitulo: {
    fontSize: 16,
    fontWeight: "900",
    color: "#0F172A",
  } as TextStyle,
  subtituloModal: {
    fontSize: 13,
    fontWeight: "600",
    color: "#475569",
    marginBottom: 12,
  } as TextStyle,
  campoForm: { marginBottom: 12 } as ViewStyle,
  labelForm: {
    fontSize: 12,
    fontWeight: "700",
    color: "#475569",
    marginBottom: 4,
  } as TextStyle,
  inputForm: {
    borderWidth: 1.5,
    borderColor: "#E2E8F0",
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 44,
    backgroundColor: "#F8FAFC",
    fontSize: 14,
    color: "#0F172A",
  } as ViewStyle,
  contenedorSelectorScroll: {
    borderWidth: 1.5,
    borderColor: "#E2E8F0",
    borderRadius: 10,
    backgroundColor: "#F8FAFC",
    padding: 4,
  } as ViewStyle,
  opcionSelector: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 6,
  } as ViewStyle,
  opcionSelectorSeleccionada: { backgroundColor: "#EFF6FF" } as ViewStyle,
  textoOpcion: { fontSize: 14, color: "#334155" } as TextStyle,
  textoOpcionSeleccionada: { color: "#2563EB", fontWeight: "700" } as TextStyle,
  btnGuardarModal: {
    backgroundColor: "#0F172A",
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
  } as ViewStyle,
  btnGuardarModalTexto: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "700",
  } as TextStyle,
  botonAccionSecundario: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 0.5,
    borderColor: "rgba(0,0,0,0.05)",
  } as ViewStyle,
  botonBajaEmpresa: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FEE2E2",
    paddingVertical: 10,
    borderRadius: 8,
    marginTop: 4,
  } as ViewStyle,
  textoBotonBajaEmpresa: {
    color: "#DC2626",
    fontSize: 13,
    fontWeight: "700",
  } as TextStyle,
});
