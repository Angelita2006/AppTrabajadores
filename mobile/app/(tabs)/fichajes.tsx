import { obtenerAsignacionesTurnoTrabajador } from "@/src/modules/asignaciones-turno/api/services";
import { AsignacionTurno } from "@/src/modules/asignaciones-turno/types/asignacion-turno";
import { obtenerCalendarioLaboral } from "@/src/modules/calendarios-laborales/api/services";
import { CalendarioFestivo } from "@/src/modules/calendarios-laborales/types/calendario";
import { obtenerContratoActivoTrabajador } from "@/src/modules/contratos/api/services";
import { obtenerUrlLogo } from "@/src/modules/empresas/api/services";
import { ImagenConToken } from "@/src/modules/empresas/components/Archivos";
import { obtenerFichajesEmpresaPorFecha } from "@/src/modules/fichajes/api/services";
import {
  DIAS_SEMANA,
  RegistroFichaje,
} from "@/src/modules/fichajes/types/registrofichaje";
import {
  obtenerTipoEventoPorId,
  obtenerTiposEventosEmpresa,
} from "@/src/modules/tipos_eventos_fichaje/api/services";
import { TipoEventoFichaje } from "@/src/modules/tipos_eventos_fichaje/types/tipos_evento_fichaje";
import { obtenerTrabajador } from "@/src/modules/trabajadores/api/services";
import { Trabajador } from "@/src/modules/trabajadores/types/trabajador";
import { obtenerTurnoPorId } from "@/src/modules/turnos/api/services";
import { Turno } from "@/src/modules/turnos/types/turno";
import { useSesion } from "@/src/modules/usuarios/store/SesionContextZustand";
import { useAppModal } from "@/src/shared/ui/AppModalNotification";
import {
  capitalizar,
  extraerHora,
  horaAMinutos,
  obtenerConfiguracionEvento,
} from "@/src/utils/formaters";
import {
  FontAwesome5,
  Ionicons,
  MaterialCommunityIcons,
} from "@expo/vector-icons";
import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, View } from "react-native";
import { ThemedText } from "../../src/shared/components/ThemedText";
import { AppScreen, Card, Row, StatCard } from "../../src/shared/ui/AppSurface";

export interface TurnoConAsignacion extends Turno {
  turno_id: string;
  fecha_real: string;
  fecha_asignacion_inicio: string;
  fecha_asignacion_fin: string;
}

export interface DetalleDiaTrabajador {
  nombreDia: string;
  turnos: Record<string, RegistroFichaje[]>;
}

export interface TrabajadorConFichajesSemanales extends Partial<Trabajador> {
  id: string;
  nombre: string;
  apellidos?: string;
  tipoJornada?: string;
  tipoContrato?: string;
  diasAsignados?: string | string[] | number[];
  horasContrato?: string;
  turnoResumen?: string;
  calendario_id?: string | null;
  dias: Record<string, DetalleDiaTrabajador>;
}

const escaparHtml = (valor: unknown): string =>
  String(valor ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");

const firmaComoHtml = async (
  firma?: string | null,
  mostrarError?: (error: any) => void,
): Promise<string | undefined> => {
  if (!firma) return '<span class="sin-firma">Sin firma</span>';
  try {
    const urlFirma = await obtenerUrlLogo(firma);

    if (!urlFirma) return '<span class="sin-firma">Sin firma</span>';

    return `<img class="firma-fichaje" src="${escaparHtml(urlFirma)}" alt="Firma del trabajador" />`;
  } catch (error: any) {
    if (mostrarError) mostrarError(error.message);
  }
};

export default function FichajesHistorialScreen() {
  const { empresaActual, usuarioActual } = useSesion();
  const [fichajesSemanales, setFichajesSemanales] = useState<RegistroFichaje[]>(
    [],
  );
  const [mapaDatosFiscales, setMapaDatosFiscales] = useState<{
    [key: string]: any;
  }>({});
  const [tiposEventosEmpresa, setTiposEventosEmpresa] =
    useState<TipoEventoFichaje[]>();
  const [, setCalendariosFestivos] = useState<CalendarioFestivo[]>([]);
  const [cargando, setCargando] = useState<boolean>(true);
  const [fechaReferencia, setFechaReferencia] = useState<Date>(new Date());
  const [mapaTurnosObjetos, setMapaTurnosObjetos] = useState<{
    [key: string]: TurnoConAsignacion[];
  }>({});
  const { mostrarError, mostrarMensaje } = useAppModal();
  const [
    trabajadoresSeleccionadosParaPdf,
    setTrabajadoresSeleccionadosParaPdf,
  ] = useState<string[]>([]);
  const [cargandoPdf] = useState(false);

  const lunesSemanaActual = useMemo(() => {
    const d = new Date(fechaReferencia);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    return new Date(d.setDate(diff));
  }, [fechaReferencia]);

  const rangoSemanaStr = useMemo(() => {
    const lunes = new Date(lunesSemanaActual);
    const sabado = new Date(lunes);
    sabado.setDate(lunes.getDate() + 5);
    return `Del ${lunes.toLocaleDateString("es-ES")} al ${sabado.toLocaleDateString("es-ES")}`;
  }, [lunesSemanaActual]);

  const cambiarSemana = (direccion: "anterior" | "siguiente") => {
    setFechaReferencia((prev) => {
      const nuevaFecha = new Date(prev);
      nuevaFecha.setDate(prev.getDate() + (direccion === "siguiente" ? 7 : -7));
      return nuevaFecha;
    });
  };

  const cargarFichajesYTurnosSemanales = async () => {
    try {
      if (
        usuarioActual?.tipo_usuario !== "Admin_empresa" &&
        usuarioActual?.tipo_usuario !== "Admin_gestoría" &&
        usuarioActual?.tipo_usuario !== "Auditor_itss" &&
        usuarioActual?.tipo_usuario !== "Rrhh"
      )
        return;
      setCargando(true);
      const promesasFichajes = [];
      for (let i = 0; i < 6; i++) {
        const diaConsultar = new Date(lunesSemanaActual);
        diaConsultar.setDate(lunesSemanaActual.getDate() + i);
        const offset = diaConsultar.getTimezoneOffset();
        const fechaLocalStr = new Date(
          diaConsultar.getTime() - offset * 60 * 1000,
        )
          .toISOString()
          .split("T")[0];
        promesasFichajes.push(
          await obtenerFichajesEmpresaPorFecha(
            empresaActual?.id || "",
            fechaLocalStr,
          ).catch((error: any) => {
            mostrarError(
              `No se pudieron obtener fichajes para la fecha ${fechaLocalStr}: ` +
                error.message,
            );
            return [];
          }),
        );
      }
      const todosLosFichajes: RegistroFichaje[] = promesasFichajes.flat();
      const idsFichajesSustituidos = new Set(
        todosLosFichajes
          .map((fichaje) => fichaje.fichaje_sustituido_id)
          .filter((id): id is string => Boolean(id)),
      );
      const fichajesValidos = todosLosFichajes.filter((f: RegistroFichaje) => {
        const estadoLimpio = f.estado?.trim().toLowerCase() || "";
        return (
          (estadoLimpio === "válido" || estadoLimpio === "valido") &&
          !idsFichajesSustituidos.has(f.id)
        );
      });
      setFichajesSemanales(fichajesValidos);
      const tiposEventosEmpresaData = await obtenerTiposEventosEmpresa(
        empresaActual!.id,
      );
      setTiposEventosEmpresa(tiposEventosEmpresaData);
      const idTrabajadoresUnicos = Array.from(
        new Set(fichajesValidos.map((f: RegistroFichaje) => f.trabajador_id)),
      );
      const nuevoMapaObjetosTurnos: { [key: string]: TurnoConAsignacion[] } =
        {};
      const nuevoMapaDatosFiscales: { [key: string]: any } = {};
      const todosLosCalendariosRecogidos: CalendarioFestivo[] = [];
      const lunesStr = new Date(
        lunesSemanaActual.getTime() -
          lunesSemanaActual.getTimezoneOffset() * 60000,
      )
        .toISOString()
        .split("T")[0];
      const sabadoObj = new Date(lunesSemanaActual);
      sabadoObj.setDate(lunesSemanaActual.getDate() + 5);
      const sabadoStr = new Date(
        sabadoObj.getTime() - sabadoObj.getTimezoneOffset() * 60000,
      )
        .toISOString()
        .split("T")[0];

      const esAsignacionVigenteEnSemana = (
        asignacion: AsignacionTurno,
      ): boolean => {
        if (!asignacion) return false;
        const fechaInicio = asignacion.fecha_inicio
          ? asignacion.fecha_inicio.split("T")[0]
          : null;
        const fechaFin = asignacion.fecha_fin
          ? asignacion.fecha_fin.split("T")[0]
          : null;
        if (fechaInicio && fechaInicio > sabadoStr) return false;
        if (fechaFin && fechaFin < lunesStr) return false;
        return true;
      };

      for (const idTrabajador of idTrabajadoresUnicos) {
        try {
          const trabajador = await obtenerTrabajador(idTrabajador);
          const contratoActivo = await obtenerContratoActivoTrabajador(
            idTrabajador,
            empresaActual!.id,
          );
          let calendarioIdAsociado = null;
          if (contratoActivo?.calendario_laboral_id) {
            try {
              calendarioIdAsociado = contratoActivo.calendario_laboral_id;
              const calendarioConFestivos: CalendarioFestivo =
                await obtenerCalendarioLaboral(calendarioIdAsociado);
              todosLosCalendariosRecogidos.push(calendarioConFestivos);
            } catch (error: any) {
              mostrarError(
                `No se pudo obtener el calendario para el trabajador ${idTrabajador}: ` +
                  error.message,
              );
            }
          }
          const asignacionesTurno: AsignacionTurno[] =
            await obtenerAsignacionesTurnoTrabajador(idTrabajador);
          const asignacionesVigentes = Array.isArray(asignacionesTurno)
            ? asignacionesTurno.filter(esAsignacionVigenteEnSemana)
            : [];
          const conjuntoDias = new Set<string>();
          if (asignacionesVigentes.length > 0) {
            for (const asig of asignacionesVigentes) {
              const tInfo: Turno = await obtenerTurnoPorId(asig.turno_id);
              if (tInfo && tInfo.dias_semana) {
                tInfo.dias_semana.forEach((diaNum: number) => {
                  const nombreDia = DIAS_SEMANA[diaNum];
                  if (nombreDia) {
                    conjuntoDias.add(nombreDia);
                  }
                });
              }
            }
          }
          const diasOrdenados = DIAS_SEMANA.filter((dia) =>
            conjuntoDias.has(dia),
          );
          const diasPlanificadosTexto =
            diasOrdenados.length > 0
              ? diasOrdenados.join(", ")
              : "Sin días asignados";
          nuevoMapaDatosFiscales[idTrabajador] = {
            jornada: capitalizar(contratoActivo?.tipo_jornada || ""),
            tipo_contrato: capitalizar(contratoActivo?.tipo_contrato || ""),
            dias_planificados: diasPlanificadosTexto,
            horas_semana: capitalizar(
              contratoActivo?.horas_semana?.toString().substring(0, 2) || "40",
            ),
            dni_nif_nie: trabajador?.dni_nif_nie || "",
            numero_seguridad_social: trabajador?.numero_seguridad_social || "",
            nombre: trabajador?.nombre || "",
            apellidos: trabajador?.apellidos || "",
            foto_url: trabajador?.foto_url || "",
            calendario_id: calendarioIdAsociado || null,
          };
          if (asignacionesVigentes.length > 0) {
            const turnosTrabajador: TurnoConAsignacion[] = [];
            for (const asig of asignacionesVigentes) {
              const tInfo: Turno = await obtenerTurnoPorId(asig.turno_id);
              if (tInfo) {
                turnosTrabajador.push({
                  ...tInfo,
                  id: asig.id,
                  turno_id: asig.turno_id,
                  empresa_id: tInfo.empresa_id || empresaActual?.id || "",
                  nombre: capitalizar(tInfo.nombre || "Sin Nombre"),
                  hora_inicio: tInfo.hora_inicio || "00:00:00",
                  hora_fin: tInfo.hora_fin || "00:00:00",
                  duracion_pausa_minutos: tInfo.duracion_pausa_minutos || 0,
                  fecha_real:
                    asig.fecha_inicio || new Date().toISOString().split("T")[0],
                  dias_semana: tInfo.dias_semana || [],
                  fecha_asignacion_inicio: asig.fecha_inicio,
                  fecha_asignacion_fin: asig.fecha_fin || "",
                });
              }
            }
            nuevoMapaObjetosTurnos[idTrabajador] = turnosTrabajador;
          }
        } catch (error: any) {
          mostrarError(
            `Error procesando datos del trabajador ${idTrabajador}: ` +
              error.message,
          );
        }
      }
      setCalendariosFestivos(todosLosCalendariosRecogidos);
      setMapaDatosFiscales(nuevoMapaDatosFiscales);
      setMapaTurnosObjetos(nuevoMapaObjetosTurnos);
    } catch (error: any) {
      mostrarError(
        "Error general al cargar fichajes y turnos: " + error.message,
      );
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    cargarFichajesYTurnosSemanales();
  }, [lunesSemanaActual, empresaActual?.id]);

  const mapearTurnoUIString = (trabajadorId: string) => {
    const lista = mapaTurnosObjetos[trabajadorId] || [];
    const inicioSemana = new Date(
      lunesSemanaActual.getFullYear(),
      lunesSemanaActual.getMonth(),
      lunesSemanaActual.getDate(),
    );
    const finSemana = new Date(
      lunesSemanaActual.getFullYear(),
      lunesSemanaActual.getMonth(),
      lunesSemanaActual.getDate() + 6,
    );
    const listaFiltrada = lista.filter((t: TurnoConAsignacion) => {
      if (!t.fecha_asignacion_inicio) return false;
      const partesInicio = t.fecha_asignacion_inicio.split("T")[0].split("-");
      const inicioTurno = new Date(
        parseInt(partesInicio[0], 10),
        parseInt(partesInicio[1], 10) - 1,
        parseInt(partesInicio[2], 10),
      );
      let finTurno = finSemana.getTime();
      if (t.fecha_asignacion_fin) {
        const partesFin = t.fecha_asignacion_fin.split("T")[0].split("-");
        finTurno = new Date(
          parseInt(partesFin[0], 10),
          parseInt(partesFin[1], 10) - 1,
          parseInt(partesFin[2], 10),
        ).getTime();
      }
      return (
        inicioTurno.getTime() <= finSemana.getTime() &&
        finTurno >= inicioSemana.getTime()
      );
    });
    if (!listaFiltrada || listaFiltrada.length === 0)
      return "Sin turno asignado esta semana";
    return listaFiltrada
      .map((t) => {
        const inicio = t.hora_inicio ? t.hora_inicio.substring(0, 5) : "00:00";
        const fin = t.hora_fin ? t.hora_fin.substring(0, 5) : "00:00";
        const pausa =
          (t.duracion_pausa_minutos || 0) > 0
            ? ` [Pausa: ${t.duracion_pausa_minutos} min]`
            : "";
        return `${t.nombre} (${inicio}-${fin})${pausa}`;
      })
      .join(", ");
  };

  const trabajadoresAgrupadosSemanales: TrabajadorConFichajesSemanales[] =
    useMemo(() => {
      const mapa: { [trabajadorId: string]: TrabajadorConFichajesSemanales } =
        {};
      fichajesSemanales.forEach((f: RegistroFichaje) => {
        if (!mapa[f.trabajador_id]) {
          const fiscal = mapaDatosFiscales[f.trabajador_id] || {};
          const turnosTrabajador = mapaTurnosObjetos[f.trabajador_id] || [];
          const turnoActivo = turnosTrabajador[0];
          const nombreTrabajador = f.trabajador?.nombre || fiscal?.nombre || "";
          const apellidosTrabajador =
            f.trabajador?.apellidos || fiscal?.apellidos || "";
          mapa[f.trabajador_id] = {
            id: f.trabajador_id,
            nombre: nombreTrabajador,
            apellidos: apellidosTrabajador,
            tipoJornada: fiscal?.jornada,
            tipoContrato: fiscal?.tipo_contrato,
            diasAsignados: turnoActivo?.dias_semana,
            horasContrato: fiscal?.horas_semana,
            dni_nif_nie: fiscal?.dni_nif_nie || "N/A",
            numero_seguridad_social: fiscal?.numero_seguridad_social || "-",
            calendario_id: fiscal?.calendario_id,
            turnoResumen: mapearTurnoUIString(f.trabajador_id),
            dias: {},
            foto_url: fiscal?.foto_url || "",
          };
        }
      });
      Object.keys(mapa).forEach((trabajadorId) => {
        const fichajesDelTrabajador = fichajesSemanales.filter(
          (f) => f.trabajador_id === trabajadorId,
        );
        const turnosDelTrabajador = mapaTurnosObjetos[trabajadorId] || [];
        fichajesDelTrabajador.forEach((f: RegistroFichaje) => {
          const fechaFichajeLimpia = f.fecha_hora.includes("T")
            ? f.fecha_hora.split("T")[0]
            : f.fecha_hora.split(" ")[0];
          const objetoFecha = new Date(fechaFichajeLimpia.replace(/-/g, "/"));
          const nombreDia =
            DIAS_SEMANA[
              isNaN(objetoFecha.getDay())
                ? new Date().getDay()
                : objetoFecha.getDay()
            ];
          if (nombreDia === "Domingo") return;
          if (!mapa[trabajadorId].dias[fechaFichajeLimpia]) {
            mapa[trabajadorId].dias[fechaFichajeLimpia] = {
              nombreDia: `${nombreDia} (${fechaFichajeLimpia.split("-").reverse().slice(0, 2).join("/")})`,
              turnos: {},
            };
          }
          const horaFichajeMinutos = horaAMinutos(
            extraerHora(f.fecha_hora, false),
          );
          let turnoAsignadoKey = "Turno General";
          for (const turno of turnosDelTrabajador) {
            const inicioMinutos =
              horaAMinutos(turno.hora_inicio || "00:00") - 60;
            const finMinutos = horaAMinutos(turno.hora_fin || "00:00") + 60;
            if (
              horaFichajeMinutos >= inicioMinutos &&
              horaFichajeMinutos <= finMinutos
            ) {
              turnoAsignadoKey = turno.nombre || "Turno General";
              break;
            }
          }
          if (
            !mapa[trabajadorId].dias[fechaFichajeLimpia].turnos[
              turnoAsignadoKey
            ]
          ) {
            mapa[trabajadorId].dias[fechaFichajeLimpia].turnos[
              turnoAsignadoKey
            ] = [];
          }
          mapa[trabajadorId].dias[fechaFichajeLimpia].turnos[
            turnoAsignadoKey
          ].push(f);
        });
      });
      Object.values(mapa).forEach((t: TrabajadorConFichajesSemanales) => {
        Object.values(t.dias).forEach((d: DetalleDiaTrabajador) => {
          Object.values(d.turnos).forEach((arr: RegistroFichaje[]) => {
            arr.sort((a: RegistroFichaje, b: RegistroFichaje) =>
              a.fecha_hora.localeCompare(b.fecha_hora),
            );
          });
        });
      });
      return Object.values(mapa);
    }, [fichajesSemanales, mapaTurnosObjetos, mapaDatosFiscales]);

  const handleExportarPDF = useCallback(async () => {
    if (fichajesSemanales.length === 0) {
      mostrarMensaje(
        "Alerta",
        "No constan registros horarios en esta semana para compilar el documento legal.",
      );
      return;
    }
    const trabajadoresAIncluir = trabajadoresAgrupadosSemanales.filter(
      (t: TrabajadorConFichajesSemanales) =>
        trabajadoresSeleccionadosParaPdf.some(
          (idSeleccionado) => String(idSeleccionado) === String(t.id),
        ),
    );
    if (trabajadoresAIncluir.length === 0) {
      mostrarMensaje(
        "Alerta",
        "Por favor, selecciona al menos un trabajador para generar el informe.",
      );
      return;
    }
    const promesasBloques = trabajadoresAIncluir.map(
      async (t: TrabajadorConFichajesSemanales) => {
        let filasCalendarioHtml = "";
        let totalMinutosSemanales = 0;
        const entradasDias = Object.entries(t.dias || {});
        for (const [fechaKey, datosDia] of entradasDias) {
          const [anio, mes, dia] = fechaKey.split("-").map(Number);
          const fechaObjeto = new Date(anio, mes - 1, dia);
          const nombresDiasSemana = [
            "Domingo",
            "Lunes",
            "Martes",
            "Miércoles",
            "Jueves",
            "Viernes",
            "Sábado",
          ];
          const nombreDiaReal = nombresDiasSemana[fechaObjeto.getDay()];
          const fechaFormateada = `${dia}/${mes}`;
          if (
            datosDia &&
            datosDia.turnos &&
            Object.keys(datosDia.turnos).length > 0
          ) {
            for (const [nombreTurno, eventos] of Object.entries(
              datosDia.turnos,
            )) {
              let entrada = "-";
              let salida = "-";
              let entradaMinutos = 0;
              let salidaMinutos = 0;
              let aPausaInicio: Date | null = null;
              let tiempoPausasMinutos = 0;
              const firmasHtml: string[] = [];
              const eventosFirma: string[] = [];
              const listaEventos = Array.isArray(eventos) ? eventos : [];
              const correccionesAprobadas = listaEventos
                .map((evento) => evento.correccion_aprobada)
                .filter(Boolean);
              for (const m of listaEventos) {
                const hora = extraerHora(m.fecha_hora, false);
                let tipoCodigo = "";
                if (m.tipo_evento_id) {
                  try {
                    const tipoObj = await obtenerTipoEventoPorId(
                      m.tipo_evento_id,
                    );
                    tipoCodigo = tipoObj?.codigo || "";
                  } catch (error: any) {
                    mostrarError(
                      `Error al obtener el tipo de evento (${m.tipo_evento_id}): ` +
                        error.message,
                    );
                  }
                }
                const tipoUpper = String(tipoCodigo).toUpperCase();
                const esEntrada = tipoUpper.includes("ENTRADA");
                const esSalida = tipoUpper.includes("SALIDA");
                const esInicioPausa =
                  tipoUpper.includes("INICIO_PAUSA") ||
                  (tipoUpper.includes("PAUSA") && !tipoUpper.includes("FIN"));
                const esFinPausa = tipoUpper.includes("FIN_PAUSA");
                if (esEntrada) {
                  entrada = hora;
                  entradaMinutos = horaAMinutos(hora);
                }
                if (esSalida) {
                  salida = hora;
                  salidaMinutos = horaAMinutos(hora);
                }
                if (esInicioPausa && !esFinPausa && m.fecha_hora) {
                  aPausaInicio = new Date(m.fecha_hora.replace(/ /g, "T"));
                }
                if (esFinPausa && aPausaInicio && m.fecha_hora) {
                  const fin = new Date(m.fecha_hora.replace(/ /g, "T"));
                  tiempoPausasMinutos += Math.round(
                    (fin.getTime() - aPausaInicio.getTime()) / 60000,
                  );
                  aPausaInicio = null;
                }
                const firmaRes = await firmaComoHtml(
                  m.firma_digital,
                  mostrarError,
                );
                firmasHtml.push(firmaRes || "");
                eventosFirma.push(
                  `${tipoCodigo || "Evento"} · ${new Date(m.fecha_hora).toLocaleString("es-ES")}`,
                );
              }
              let minutesTrabajadosHoy = 0;
              let estadoLinea = "Incompleto";
              let colorEstado = "#EA580C";
              if (entradaMinutos > 0 && salidaMinutos > entradaMinutos) {
                minutesTrabajadosHoy =
                  salidaMinutos - entradaMinutos - tiempoPausasMinutos;
                if (minutesTrabajadosHoy < 0) minutesTrabajadosHoy = 0;
                totalMinutosSemanales += minutesTrabajadosHoy;
                estadoLinea =
                  nombreDiaReal === "Sábado" ? "Horas extra" : "Efectuado";
                colorEstado = "#16A34A";
              } else if (entrada === "-" && salida === "-") {
                estadoLinea =
                  nombreDiaReal === "Sábado" ? "Sin horas extra" : "Sin marcas";
                colorEstado = "#94A3B8";
              }
              const horasHoyTexto =
                minutesTrabajadosHoy > 0
                  ? `${Math.floor(minutesTrabajadosHoy / 60)}h ${minutesTrabajadosHoy % 60}m`
                  : "-";
              const pausasTexto =
                tiempoPausasMinutos > 0 ? `${tiempoPausasMinutos} min` : "-";
              let correccionFichaje = null;
              for (const correccion of correccionesAprobadas) {
                if (!correccion) continue;
                correccionFichaje = correccion;
              }
              if (correccionFichaje) {
                const valorNuevo = correccionFichaje.valor_nuevo || {};
                const fechaNueva =
                  valorNuevo.fecha_descuadre || fechaFormateada;
                const horaNueva = valorNuevo.hora_propuesta || "-";
                if (horaNueva && horaNueva !== "") entrada = horaNueva;
                const firmaSolicitanteHtml = await firmaComoHtml(
                  correccionFichaje.firma_solicitante,
                  mostrarError,
                );
                const firmaResolutorHtml = await firmaComoHtml(
                  correccionFichaje.firma_resolutor,
                  mostrarError,
                );

                filasCalendarioHtml += ` 
                  <tr> 
                    <td><small style="font-size:13px;"><strong>${escaparHtml(nombreDiaReal)} (${escaparHtml(fechaFormateada)})</strong></small><br/><small style="color:#555;">${escaparHtml(nombreTurno)}</small></td> 
                    <td>${entrada}</td> 
                    <td>${salida}</td> 
                    <td style="width:10px">${pausasTexto}</td> 
                    <td style="font-weight: bold;">${horasHoyTexto}</td> 
                    <td style="font-weight: bold; font-size:10px; color:${colorEstado};">${estadoLinea}</td> 
                    <td class="celda-firma">${firmasHtml.map((firma, index) => `<div class="registro-firma"><small>${escaparHtml(eventosFirma[index])}</small>${firma}</div>`).join("") || '<span class="sin-firma">Sin firma</span>'}</td> 
                  </tr> 
                  <tr class="fila-correccion"> 
                    <td colspan="2"><strong>CORRECCIÓN APROBADA</strong><br/><small>${escaparHtml(correccionFichaje.tipo_correccion)}<br/>${escaparHtml(fechaNueva)} ${escaparHtml(horaNueva)}</small></td> 
                    <td colspan="2"><small>Solicita: ${escaparHtml(correccionFichaje.solicitante || "Usuario identificado")} (${escaparHtml(correccionFichaje.solicitante_tipo || "Usuario")})</small><br/>${firmaSolicitanteHtml}</td> 
                    <td colspan="2"><small>Aprueba: ${escaparHtml(correccionFichaje.resolutor || "Usuario identificado")} (${escaparHtml(correccionFichaje.resolutor_tipo || "Usuario")})</small><br/>${firmaResolutorHtml}</td> 
                    <td class="celda-firma"><small>${escaparHtml("Fecha y hora de corrección")}<br>${escaparHtml(correccionFichaje.fecha_resolucion?.substring(0, 10).concat(" ", correccionFichaje.fecha_resolucion.substring(11, 16)) || "")}</small></td> 
                  </tr> 
                `;
              } else {
                filasCalendarioHtml += ` 
                  <tr> 
                    <td><small style="font-size:13px;"><strong>${escaparHtml(nombreDiaReal)} (${escaparHtml(fechaFormateada)})</strong></small><br/><small style="color:#555;">${escaparHtml(nombreTurno)}</small></td> 
                    <td>${entrada}</td> 
                    <td>${salida}</td> 
                    <td style="width:10px">${pausasTexto}</td> 
                    <td style="font-weight: bold;">${horasHoyTexto}</td> 
                    <td style="font-weight: bold; font-size:10px; color:${colorEstado};">${estadoLinea}</td> 
                    <td class="celda-firma">${firmasHtml.map((firma, index) => `<div class="registro-firma"><small>${escaparHtml(eventosFirma[index])}</small>${firma}</div>`).join("") || '<span class="sin-firma">Sin firma</span>'}</td> 
                  </tr> 
                `;
              }
            }
          } else {
            const esSabado = nombreDiaReal === "Sábado";
            const textoEstado = esSabado ? "Sin horas extra" : "Sin marcas";
            filasCalendarioHtml += ` 
              <tr> 
                <td><strong>${nombreDiaReal} (${fechaFormateada})</strong></td> 
                <td>-</td> 
                <td>-</td> 
                <td>-</td> 
                <td>-</td> 
                <td style="color:#94A3B8; font-weight: bold; font-size:10px;">${textoEstado}</td> 
                <td class="celda-firma"></td> 
              </tr> 
            `;
          }
        }
        const nombreEmpresa =
          empresaActual?.nombre_comercial || "Sin identificar";
        const razonSocial = empresaActual?.razon_social || "Sin identificar";
        const cifEmpresa = empresaActual?.cif || "-";
        const direccionEmpresa = empresaActual?.direccion_fiscal || "No consta";
        const cnaeEmpresa = empresaActual?.codigo_cnae || "No consta";
        const convenioEmpresa =
          empresaActual?.convenio_colectivo || "No consta";
        let logoEmpresa = "";
        try {
          logoEmpresa = (await obtenerUrlLogo(empresaActual?.logo_url)) || "";
        } catch (error: any) {
          mostrarError(error.message);
        }
        const fiscal = mapaDatosFiscales[t.id];
        const dniTrabajador = fiscal?.dni_nif_nie || "N/A";
        const nssTrabajador = fiscal?.numero_seguridad_social || "-";
        const relacionLaboralTexto = `${t.tipoContrato || "N/A"} (${t.tipoJornada || "N/A"} - ${t.horasContrato || "40"}/sem)`;
        const diasAsignadosTexto = `${fiscal?.dias_planificados || "Sin especificar"}`;
        const horarioVigenteTexto =
          t.turnoResumen && t.turnoResumen !== "Sin turno asignado"
            ? t.turnoResumen
            : "Sin cuadrante de turnos activo en estas fechas";
        const totalHorasCalculadas = `${Math.floor(totalMinutosSemanales / 60)} horas y ${totalMinutosSemanales % 60} minutos`;
        return ` 
          <div class="hoja-trabajador"> 
            <header class="cabecera-documento"> 
              <div class="marca-empresa">${logoEmpresa ? `<img src="${escaparHtml(logoEmpresa)}" alt="Logo de ${escaparHtml(nombreEmpresa)}" />` : ""}<div><h1>${escaparHtml(nombreEmpresa)}</h1><p>${escaparHtml(razonSocial)}</p></div></div> 
              <div class="titulo-documento"><strong>REGISTRO DIARIO DE JORNADA</strong><span>Resumen semanal de control horario</span></div> 
            </header> 
            <div class="caja-legal"> 
              Registro conforme al artículo 34.9 del Estatuto de los Trabajadores y al Real Decreto-ley 8/2019, de 8 de marzo. Conservar durante cuatro años a disposición de las personas trabajadoras, sus representantes y la Inspección de Trabajo. 
            </div> 
            <table class="tabla-datos"> 
              <tr> 
                <td><strong>Razón social:</strong> ${escaparHtml(razonSocial)}</td> 
                <td><strong>CIF/NIF:</strong> ${escaparHtml(cifEmpresa)}</td> 
              </tr> 
              <tr> 
                <td><strong>Nombre comercial:</strong> ${escaparHtml(nombreEmpresa)}</td> 
                <td><strong>Domicilio fiscal:</strong> ${escaparHtml(direccionEmpresa)}</td> 
              </tr> 
              <tr> 
                <td><strong>CNAE:</strong> ${escaparHtml(cnaeEmpresa)}</td> 
                <td><strong>Convenio colectivo:</strong> ${escaparHtml(convenioEmpresa)}</td> 
              </tr> 
              <tr> 
                <td><strong>Trabajador:</strong> ${escaparHtml(`${t.nombre || ""} ${t.apellidos || ""}`.trim())}</td> 
                <td><strong>DNI/NIE/NIF:</strong> ${escaparHtml(dniTrabajador)}</td> 
              </tr> 
              <tr> 
                <td><strong>Nº Seguridad Social:</strong> ${escaparHtml(nssTrabajador)}</td> 
                <td><strong>Contrato/Jornada:</strong> ${escaparHtml(relacionLaboralTexto)}</td> 
              </tr> 
              <tr> 
                <td><strong>Horario planificado:</strong> ${escaparHtml(horarioVigenteTexto)}</td> 
                <td><strong>Periodo:</strong> ${escaparHtml(rangoSemanaStr)}</td> 
              </tr> 
              <tr> 
                <td colspan="2"><strong>Días planificados:</strong> ${escaparHtml(diasAsignadosTexto)}</td> 
              </tr> 
            </table> 
            <table class="tabla-registro"> 
              <thead> 
                <tr> 
                  <th>Día / Turno Evaluado</th> 
                  <th>Hora Entrada</th> 
                  <th>Hora Salida</th> 
                  <th>Interrupciones / Pausas</th> 
                  <th>Horas Computadas</th> 
                  <th>Estado</th> 
                  <th>Firma y trazabilidad del fichaje</th> 
                </tr> 
              </thead> 
              <tbody> ${filasCalendarioHtml} </tbody> 
              <tfoot> 
                <tr style="background-color: #F1F5F9; font-weight: bold;"> 
                  <td colspan="4" style="text-align: right; padding: 8px;">TOTAL HORAS COMPUTADAS EN LA SEMANA:</td> 
                  <td colspan="3" style="text-align: left; padding: 8px; font-size: 12px; color: #1E3A8A;">${totalHorasCalculadas}</td> 
                </tr> 
              </tfoot> 
            </table> 
            <p style="font-size: 9px; color: #555; margin-top: 15px; font-style: italic;"> * El trabajador firma este documento en señal de conformidad con los horarios reflejados en el presente cuadrante de control de presencia. </p> 
            <div class="firmas-bloque"> 
              <div class="firma-caja" style="float: left;">Firma de la Empresa / Sello Autorizado</div> 
              <div class="firma-caja" style="float: right;">Firma de Conformidad del Trabajador</div> 
              <div style="clear: both;"></div> </div> <div class="page-break"></div> 
          </div> 
        `;
      },
    );
    const bloquesTrabajadoresHtml = (await Promise.all(promesasBloques)).join(
      "",
    );
    const plantillaHtml = ` 
      <html> 
        <head> 
          <meta charset="utf-8"> 
          <style> 
            body { font-family: 'Arial', sans-serif; padding: 10px; color: #172033; font-size: 10px; } 
            .cabecera-documento { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #1E3A8A; padding-bottom: 10px; margin-bottom: 10px; } 
            .marca-empresa { display: flex; align-items: center; gap: 10px; max-width: 55%; } 
            .marca-empresa img { max-width: 105px; max-height: 48px; object-fit: contain; } 
            .marca-empresa h1 { font-size: 16px; margin: 0; color: #1E3A8A; } 
            .marca-empresa p { margin: 2px 0 0; font-size: 9px; color: #475569; } 
            .titulo-documento { text-align: right; color: #1E3A8A; } 
            .titulo-documento strong, .titulo-documento span { display: block; } 
            .titulo-documento strong { font-size: 13px; } 
            .titulo-documento span { font-size: 9px; color: #475569; margin-top: 3px; } 
            .caja-legal { border: 1px solid #64748B; padding: 7px; text-align: center; margin-bottom: 12px; font-size: 9px; } 
            .tabla-datos { width: 100%; margin-bottom: 15px; border-collapse: collapse; } 
            .tabla-datos td { padding: 6px; border: 1px solid #000; background-color: #F9F9F9; } 
            .tabla-registro { width: 100%; border-collapse: collapse; margin-top: 10px; } 
            .tabla-registro th, .tabla-registro td { border: 1px solid #94A3B8; padding: 4px; text-align: center; vertical-align: middle; } 
            .tabla-registro th { background-color: #E2E8F0; font-size: 9px; text-transform: uppercase; } 
            .fila-correccion { background-color: #EFF6FF; } 
            .fila-correccion td { border-top: 0; color: #1E3A8A; } 
            .celda-firma { width: 145px; padding: 4px !important; vertical-align: middle; text-align: center; } 
            .registro-firma { border-bottom: 1px dotted #94A3B8; padding: 4px 0; display: flex; flex-direction: column; align-items: center; justify-content: center; } 
            .registro-firma:last-child { border-bottom: 0; } 
            .registro-firma small { display: block; font-size: 7px; color: #475569; margin-bottom: 2px; text-align: center; } 
            .firma-fichaje { display: block; width: 100%; max-height: 35px; object-fit: contain; image-rendering: -webkit-optimize-contrast; } 
            .sin-firma { color: #64748B; font-size: 8px; } 
            .texto-secundario { color: #475569; } 
            .firmas-bloque { margin-top: 20px; width: 100%; } 
            .firma-caja { width: 45%; border-top: 1px solid #000; text-align: center; padding-top: 5px; margin-top: 50px; font-weight: bold; } 
            .page-break { page-break-after: always; } 
          </style> 
        </head> 
        <body>${bloquesTrabajadoresHtml}</body> 
      </html> 
    `;
    try {
      if (
        typeof window !== "undefined" &&
        window.document &&
        (window.navigator as any).product !== "ReactNative"
      ) {
        const iframe = document.createElement("iframe");
        iframe.style.position = "fixed";
        iframe.style.right = "0";
        iframe.style.bottom = "0";
        iframe.style.width = "0";
        iframe.style.height = "0";
        iframe.style.border = "0";
        document.body.appendChild(iframe);
        const doc =
          iframe.contentWindow?.document || (iframe as any).contentDocument;
        if (doc) {
          doc.open();
          doc.write(plantillaHtml);
          doc.close();
          setTimeout(() => {
            if (iframe.contentWindow) {
              iframe.contentWindow.focus();
              iframe.contentWindow.print();
            }
            document.body.removeChild(iframe);
          }, 250);
        }
      } else {
        const { uri } = await Print.printToFileAsync({ html: plantillaHtml });
        await Sharing.shareAsync(uri, {
          mimeType: "application/pdf",
          dialogTitle: `Libro_Registro_Semanal_${rangoSemanaStr.replace(/ /g, "_")}`,
        });
      }
    } catch (error: any) {
      mostrarError(
        "Error al generar o exportar el documento PDF: " + error.message,
      );
    }
  }, [
    fichajesSemanales,
    trabajadoresAgrupadosSemanales,
    trabajadoresSeleccionadosParaPdf,
    mapaDatosFiscales,
    empresaActual,
    rangoSemanaStr,
  ]);

  return (
    <AppScreen
      title="Auditoría de Fichajes"
      subtitle={`Panel corporativo: ${empresaActual?.nombre_comercial ?? "Administrador Global"}`}
    >
      {empresaActual && (
        <View style={styles.cajaInfoEmpresa}>
          <View style={styles.filaInfoEmpresa}>
            <FontAwesome5 name="building" size={13} color="#475569" />
            <ThemedText style={styles.textoInfoEmpresa}>
              <ThemedText style={styles.negrita}>CIF:</ThemedText>{" "}
              {empresaActual.cif}
            </ThemedText>
          </View>
        </View>
      )}
      <View style={styles.consolaAcciones}>
        <Pressable
          style={styles.botonAccionFiltro}
          onPress={() => cambiarSemana("anterior")}
        >
          <FontAwesome5 name="chevron-left" size={12} color="#2563EB" />
          <ThemedText style={styles.textoBotonFiltro}>Anterior</ThemedText>
        </Pressable>
        <View style={styles.contenedorRangoSemana}>
          <ThemedText style={styles.textoRango}>{rangoSemanaStr}</ThemedText>
        </View>
        <Pressable
          style={styles.botonAccionFiltro}
          onPress={() => cambiarSemana("siguiente")}
        >
          <ThemedText style={styles.textoBotonFiltro}>Siguiente</ThemedText>
          <FontAwesome5 name="chevron-right" size={12} color="#2563EB" />
        </Pressable>
      </View>
      <Pressable
        style={[styles.botonPDF, { marginBottom: 14 }]}
        onPress={handleExportarPDF}
      >
        <FontAwesome5 name="file-pdf" size={14} color="#FFFFFF" />
        <ThemedText style={styles.textoBotonPDF}>
          {cargandoPdf
            ? "Generando documento..."
            : "Exportar Registro Semanal en PDF"}
        </ThemedText>
      </Pressable>
      <Row>
        <StatCard
          label="Marcajes Semanales"
          value={fichajesSemanales.length.toString()}
        />
        <StatCard
          label="Personal Evaluado"
          value={trabajadoresAgrupadosSemanales.length.toString()}
          tone="success"
        />
      </Row>
      <ThemedText style={styles.sectionTitle}>
        {" "}
        Panel de Control Semanal{" "}
      </ThemedText>
      {cargando ? (
        <ActivityIndicator
          size="large"
          color="#2563EB"
          style={{ marginTop: 40 }}
        />
      ) : (
        <View style={styles.contenedorEstructura}>
          {trabajadoresAgrupadosSemanales.map(
            (trabajador: TrabajadorConFichajesSemanales) => {
              const estaSeleccionado =
                trabajadoresSeleccionadosParaPdf.includes(trabajador.id);
              return (
                <Card key={trabajador.id}>
                  <View style={styles.headerTrabajador}>
                    <View style={styles.avatarCirculo}>
                      {trabajador.foto_url ? (
                        <ImagenConToken
                          rutaRelativa={trabajador.foto_url}
                          style={[
                            styles.avatarCirculo,
                            { width: 40, height: 40, borderRadius: 20 },
                          ]}
                        />
                      ) : (
                        <View style={styles.avatarCirculo}>
                          <ThemedText style={styles.avatarTexto}>
                            {trabajador.nombre?.charAt(0)}
                          </ThemedText>
                        </View>
                      )}
                    </View>
                    <View style={{ flex: 1 }}>
                      <ThemedText style={styles.nombreTrabajador}>
                        {`${trabajador.nombre || ""} ${trabajador.apellidos || ""} ${trabajador.dni_nif_nie || ""}`.trim() ||
                          "N/A"}
                      </ThemedText>
                      <ThemedText
                        style={styles.turnoTrabajador}
                        numberOfLines={2}
                      >
                        Horario: {trabajador.turnoResumen}
                      </ThemedText>
                    </View>
                    <Pressable
                      onPress={() => {
                        if (estaSeleccionado) {
                          setTrabajadoresSeleccionadosParaPdf((prev) =>
                            prev.filter((id) => id !== trabajador.id),
                          );
                        } else {
                          setTrabajadoresSeleccionadosParaPdf((prev) => [
                            ...prev,
                            trabajador.id,
                          ]);
                        }
                      }}
                      style={{ padding: 6 }}
                    >
                      <Ionicons
                        name={estaSeleccionado ? "checkbox" : "square-outline"}
                        size={24}
                        color="#2563EB"
                      />
                    </Pressable>
                  </View>
                  <View style={styles.gridDias}>
                    {Object.entries(trabajador.dias).map(
                      ([fechaKey, datosDia]: [
                        string,
                        DetalleDiaTrabajador,
                      ]) => {
                        const [anio, mes, dia] = fechaKey
                          .split("-")
                          .map(Number);
                        const fechaObjeto = new Date(anio, mes - 1, dia);
                        const nombresDiasSemana = [
                          "Domingo",
                          "Lunes",
                          "Martes",
                          "Miércoles",
                          "Jueves",
                          "Viernes",
                          "Sábado",
                        ];
                        const nombreDiaReal =
                          nombresDiasSemana[fechaObjeto.getDay()];
                        const fechaFormateada = `${dia}/${mes}`;
                        return (
                          <View key={fechaKey} style={styles.contenedorDia}>
                            <ThemedText style={styles.tituloDia}>
                              {nombreDiaReal} ({fechaFormateada})
                            </ThemedText>
                            {Object.entries(datosDia.turnos).map(
                              ([nombreTurno, eventos]) => (
                                <View
                                  key={nombreTurno}
                                  style={styles.bloqueTurnoEspecial}
                                >
                                  <View style={styles.badgeTurno}>
                                    <FontAwesome5
                                      name="clock"
                                      size={9}
                                      color="#475569"
                                      style={{ marginRight: 3 }}
                                    />
                                    <ThemedText style={styles.textoBadgeTurno}>
                                      {nombreTurno}
                                    </ThemedText>
                                  </View>
                                  <View style={{ gap: 4, marginTop: 2 }}>
                                    {eventos.map((item: RegistroFichaje) => {
                                      const tipoEvento =
                                        tiposEventosEmpresa?.find(
                                          (t: TipoEventoFichaje) =>
                                            t.id == item.tipo_evento_id,
                                        );
                                      const config =
                                        obtenerConfiguracionEvento(tipoEvento);
                                      const horaLimpia = extraerHora(
                                        item.fecha_hora,
                                        false,
                                      );
                                      return (
                                        <View
                                          key={item.id}
                                          style={styles.filaFichaje}
                                        >
                                          <MaterialCommunityIcons
                                            name={config.icono as any}
                                            size={13}
                                            color={config.color}
                                          />
                                          <View style={{ flex: 1 }}>
                                            <ThemedText
                                              style={[
                                                styles.textoEvento,
                                                { color: config.color },
                                              ]}
                                            >
                                              {config.texto} {horaLimpia} hs
                                            </ThemedText>
                                          </View>
                                        </View>
                                      );
                                    })}
                                  </View>
                                </View>
                              ),
                            )}
                          </View>
                        );
                      },
                    )}
                  </View>
                </Card>
              );
            },
          )}
          {trabajadoresAgrupadosSemanales.length === 0 && (
            <ThemedText style={styles.empty}>
              No constan registros de asistencia en la semana laboral
              seleccionada.
            </ThemedText>
          )}
        </View>
      )}
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  cajaInfoEmpresa: {
    backgroundColor: "#F1F5F9",
    borderWidth: 1,
    borderColor: "#CBD5E1",
    borderRadius: 8,
    padding: 10,
    marginBottom: 14,
  },
  filaInfoEmpresa: { flexDirection: "row", alignItems: "center", gap: 8 },
  textoInfoEmpresa: { fontSize: 12, color: "#334155" },
  negrita: { fontWeight: "700", color: "#1E293B" },
  consolaAcciones: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
    gap: 10,
  },
  botonAccionFiltro: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#EFF6FF",
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#BFDBFE",
  },
  textoBotonFiltro: { fontSize: 13, color: "#2563EB", fontWeight: "700" },
  contenedorRangoSemana: { flex: 1, alignItems: "center" },
  textoRango: {
    fontSize: 13,
    color: "#1E293B",
    fontWeight: "800",
    textAlign: "center",
  },
  botonPDF: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#DC2626",
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 8,
  },
  textoBotonPDF: { fontSize: 13, color: "#FFFFFF", fontWeight: "700" },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#1E293B",
    marginVertical: 14,
  },
  contenedorEstructura: { gap: 14, paddingBottom: 24 },
  headerTrabajador: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 8,
  },
  avatarCirculo: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#F1F5F9",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  avatarTexto: { fontSize: 14, fontWeight: "800", color: "#475569" },
  nombreTrabajador: { fontSize: 15, fontWeight: "800", color: "#0F172A" },
  turnoTrabajador: {
    fontSize: 12,
    color: "#64748B",
    fontWeight: "600",
    marginTop: 2,
  },
  gridDias: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    gap: 8,
    marginTop: 8,
  },
  contenedorDia: {
    width: "31.5%",
    minWidth: 100,
    backgroundColor: "#F8FAFC",
    borderRadius: 6,
    padding: 6,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  tituloDia: {
    fontSize: 11,
    fontWeight: "800",
    color: "#2563EB",
    marginBottom: 4,
    backgroundColor: "#EFF6FF",
    paddingHorizontal: 4,
    paddingVertical: 2,
    borderRadius: 4,
    textAlign: "center",
  },
  bloqueTurnoEspecial: { marginVertical: 2 },
  badgeTurno: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#E2E8F0",
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 3,
    alignSelf: "stretch",
    marginBottom: 4,
  },
  textoBadgeTurno: {
    fontSize: 9,
    fontWeight: "700",
    color: "#475569",
    textTransform: "uppercase",
  },
  filaFichaje: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginVertical: 1,
  },
  textoEvento: { fontSize: 9, fontWeight: "700" },
  empty: { textAlign: "center", color: "#64748B", marginTop: 20 },
});
