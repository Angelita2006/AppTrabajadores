import { AsignacionTurno } from "@/src/modules/asignaciones-turno/types/asignacion-turno";
import {
  RegistroFichaje,
  TipoFichaje,
} from "@/src/modules/fichajes/types/registrofichaje";
import {
  getUsuarioByIdTrabajador,
  obtenerAsignacionesTurnoTrabajador,
  obtenerFichajesEmpresaPorFecha,
  obtenerTurno,
} from "@/src/modules/trabajadores/api/services";
import { UsuarioSesion } from "@/src/modules/trabajadores/types/trabajador";
import { ItemTurno } from "@/src/modules/turnos/types/turno";
import { FontAwesome5, MaterialCommunityIcons } from "@expo/vector-icons";
import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  StyleSheet,
  View,
} from "react-native";
import { useSesion } from "../../src/modules/trabajadores/store/SesionContext";
import { ThemedText } from "../../src/shared/components/themed-text";
import { AppScreen, Card, Row, StatCard } from "../../src/shared/ui/AppSurface";

const DIAS_SEMANA = [
  "Domingo",
  "Lunes",
  "Martes",
  "Miércoles",
  "Jueves",
  "Viernes",
  "Sábado",
];

const extraerHora = (fechaHoraStr: string, incluirSegundos = false): string => {
  if (!fechaHoraStr) return "00:00";
  const parteHora = fechaHoraStr.includes(" ")
    ? fechaHoraStr.split(" ")[1]
    : fechaHoraStr.split("T")[1];

  if (!parteHora) return "00:00";
  return incluirSegundos
    ? parteHora.substring(0, 8)
    : parteHora.substring(0, 5);
};

const horaAMinutos = (horaStr: string): number => {
  if (!horaStr) return 0;
  const partes = horaStr.split(":");
  const hrs = parseInt(partes[0] || "0", 10);
  const min = parseInt(partes[1] || "0", 10);
  return hrs * 60 + min;
};

const obtenerConfiguracionEvento = (tipo: string | number) => {
  const tipoStr = tipo?.toString().toUpperCase();

  if (tipoStr === "ENTRADA" || tipo === 1) {
    return { icono: "door-open", color: "#16A34A", texto: "ENTRADA" };
  } else if (tipoStr === "SALIDA" || tipo === 2) {
    return { icono: "exit-run", color: "#DC2626", texto: "SALIDA" };
  } else if (
    tipoStr === "INICIO_PAUSA" ||
    tipoStr === "INICIO PAUSA" ||
    tipo === 3
  ) {
    return { icono: "coffee-to-go", color: "#EA580C", texto: "INICIO PAUSA" };
  } else if (tipoStr === "FIN_PAUSA" || tipoStr === "FIN PAUSA" || tipo === 4) {
    return { icono: "briefcase-check", color: "#2563EB", texto: "FIN PAUSA" };
  }

  return {
    icono: "clock-outline",
    color: "#475569",
    text: tipoStr || "OTRO",
  };
};

export default function FichajesHistorialScreen() {
  const { empresaSeleccionada } = useSesion();
  const [fichajesSemanales, setFichajesSemanales] = useState<RegistroFichaje[]>(
    [],
  );
  const [cargando, setCargando] = useState<boolean>(true);
  const [fechaReferencia, setFechaReferencia] = useState<Date>(new Date());
  const [mapaTurnosObjetos, setMapaTurnosObjetos] = useState<{
    [key: string]: ItemTurno[];
  }>({});

  const lunesSemanaActual = useMemo(() => {
    const d = new Date(fechaReferencia);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    return new Date(d.setDate(diff));
  }, [fechaReferencia]);

  // CAMBIO 1: El rango de texto ahora muestra de Lunes a Sábado (+5 días en vez de +6)
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
      setCargando(true);
      const promesasFichajes = [];

      // CAMBIO 2: Solo pedir a la API los 6 días de la semana laboral (i < 6 -> Lunes a Sábado)
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
          obtenerFichajesEmpresaPorFecha(
            empresaSeleccionada?.id || "",
            fechaLocalStr,
          ),
        );
      }

      const resultadosDias = await Promise.all(promesasFichajes);
      const todosLosFichajes: RegistroFichaje[] = resultadosDias.flat();

      const fichajesValidos = todosLosFichajes.filter(
        (f) => f.estado?.toLowerCase() === "valido",
      );
      setFichajesSemanales(fichajesValidos);

      const idTrabajadoresUnicos = Array.from(
        new Set(fichajesValidos.map((f) => f.trabajador_id)),
      );
      const nuevoMapaObjetosTurnos: { [key: string]: ItemTurno[] } = {};

      for (const idTrabajador of idTrabajadoresUnicos) {
        try {
          const usuario: UsuarioSesion =
            await getUsuarioByIdTrabajador(idTrabajador);
          if (usuario.tipo_usuario !== "trabajador") continue;

          const asignaciones: AsignacionTurno[] =
            await obtenerAsignacionesTurnoTrabajador(idTrabajador);
          if (
            asignaciones &&
            Array.isArray(asignaciones) &&
            asignaciones.length > 0
          ) {
            const turnosTrabajador: ItemTurno[] = [];
            for (const asig of asignaciones) {
              const idBuscar = asig.turno_id;
              if (idBuscar) {
                const tInfo: ItemTurno = await obtenerTurno(asig.turno_id);
                if (tInfo) {
                  turnosTrabajador.push({
                    id: asig.id,
                    turno_id: idBuscar,
                    empresa_id:
                      tInfo.empresa_id || empresaSeleccionada?.id || "",
                    nombre: tInfo.nombre || "Sin Nombre",
                    hora_inicio: tInfo.hora_inicio || "00:00:00",
                    hora_fin: tInfo.hora_fin || "00:00:00",
                    minutos_pausa_obligatoria:
                      tInfo.minutos_pausa_obligatoria || 0,
                    color_hex: tInfo.color_hex || null,
                    fecha_real:
                      asig.fecha_inicio ||
                      new Date().toISOString().split("T")[0],
                  });
                }
              }
            }
            nuevoMapaObjetosTurnos[idTrabajador] = turnosTrabajador;
          }
        } catch (err) {
          console.error(
            `Error procesando turnos del trabajador ${idTrabajador}:`,
            err,
          );
        }
      }
      setMapaTurnosObjetos(nuevoMapaObjetosTurnos);
    } catch (error) {
      console.error("Error al auditar el cuadrante semanal:", error);
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    cargarFichajesYTurnosSemanales();
  }, [lunesSemanaActual, empresaSeleccionada?.id]);

  const mapearTurnoUIString = (trabajadorId: string) => {
    const lista = mapaTurnosObjetos[trabajadorId];
    if (!lista || lista.length === 0) return "Sin turno asignado";
    return lista
      .map((t) => {
        const inicio = t.hora_inicio ? t.hora_inicio.substring(0, 5) : "00:00";
        const fin = t.hora_fin ? t.hora_fin.substring(0, 5) : "00:00";
        const pausa =
          t.minutos_pausa_obligatoria > 0
            ? ` [Pausa: ${t.minutos_pausa_obligatoria} min]`
            : "";
        return `${t.nombre} (${inicio}-${fin})${pausa}`;
      })
      .join(", ");
  };

  const trabajadoresAgrupadosSemanales = useMemo(() => {
    const mapa: { [trabajadorId: string]: any } = {};

    fichajesSemanales.forEach((f) => {
      if (!mapa[f.trabajador_id]) {
        mapa[f.trabajador_id] = {
          id: f.trabajador_id,
          nombre: f.trabajador_nombre,
          turnoResumen: mapearTurnoUIString(f.trabajador_id),
          dias: {},
        };
      }
    });

    Object.keys(mapa).forEach((trabajadorId) => {
      const fichajesDelTrabajador = fichajesSemanales.filter(
        (f) => f.trabajador_id === trabajadorId,
      );
      const turnosDelTrabajador = mapaTurnosObjetos[trabajadorId] || [];

      fichajesDelTrabajador.forEach((f) => {
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

        // Medida de seguridad adicional: Si por alguna razón llega un fichaje del domingo, no procesarlo
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
          const inicioMinutos = horaAMinutos(turno.hora_inicio) - 60;
          const finMinutos = horaAMinutos(turno.hora_fin) + 60;

          if (
            horaFichajeMinutos >= inicioMinutos &&
            horaFichajeMinutos <= finMinutos
          ) {
            turnoAsignadoKey = turno.nombre;
            break;
          }
        }

        if (
          !mapa[trabajadorId].dias[fechaFichajeLimpia].turnos[turnoAsignadoKey]
        ) {
          mapa[trabajadorId].dias[fechaFichajeLimpia].turnos[turnoAsignadoKey] =
            [];
        }

        mapa[trabajadorId].dias[fechaFichajeLimpia].turnos[
          turnoAsignadoKey
        ].push(f);
      });
    });

    Object.values(mapa).forEach((t: any) => {
      Object.values(t.dias).forEach((d: any) => {
        Object.values(d.turnos).forEach((arr: any) => {
          arr.sort((a: any, b: any) =>
            a.fecha_hora.localeCompare(b.fecha_hora),
          );
        });
      });
    });

    return Object.values(mapa);
  }, [fichajesSemanales, mapaTurnosObjetos]);

  const handleExportarPDF = useCallback(async () => {
    if (fichajesSemanales.length === 0) {
      Alert.alert(
        "Aviso",
        "No constan registros horarios en esta semana para compilar el documento legal.",
      );
      return;
    }

    const bloquesTrabajadoresHtml = trabajadoresAgrupadosSemanales
      .map((t) => {
        let filasCalendarioHtml = "";

        // CAMBIO 3: Compilar la tabla del documento PDF únicamente de Lunes a Sábado (i < 6)
        for (let i = 0; i < 6; i++) {
          const diaActual = new Date(lunesSemanaActual);
          diaActual.setDate(lunesSemanaActual.getDate() + i);
          const isoFechaStr = diaActual.toISOString().split("T")[0];
          const nombreDiaUI = DIAS_SEMANA[diaActual.getDay()];
          const datosDia = t.dias[isoFechaStr];

          if (datosDia) {
            Object.entries(datosDia.turnos).forEach(
              ([nombreTurno, marcas]: [string, any]) => {
                let entrada = "-";
                let salida = "-";
                let aPausaInicio: Date | null = null;
                let tiempoPausasMinutos = 0;

                marcas.forEach((m: any) => {
                  const hora = extraerHora(m.fecha_hora, false);
                  if (
                    m.tipo_evento === TipoFichaje.ENTRADA ||
                    m.tipo_evento_id === 1
                  )
                    entrada = hora;
                  if (
                    m.tipo_evento === TipoFichaje.SALIDA ||
                    m.tipo_evento_id === 2
                  )
                    salida = hora;
                  if (
                    m.tipo_evento === TipoFichaje.INICIO_PAUSA ||
                    m.tipo_evento_id === 3
                  )
                    aPausaInicio = new Date(m.fecha_hora.replace(/ /g, "T"));
                  if (
                    (m.tipo_evento === TipoFichaje.FIN_PAUSA ||
                      m.tipo_evento_id === 4) &&
                    aPausaInicio
                  ) {
                    const fin = new Date(m.fecha_hora.replace(/ /g, "T"));
                    tiempoPausasMinutos += Math.round(
                      (fin.getTime() - aPausaInicio.getTime()) / 60000,
                    );
                    aPausaInicio = null;
                  }
                });

                const pausasTexto =
                  tiempoPausasMinutos > 0 ? `${tiempoPausasMinutos} min` : "-";

                filasCalendarioHtml += `
            <tr>
              <td><strong>${nombreDiaUI}</strong><br/><small style="color:#555;">${nombreTurno}</small></td>
              <td>${entrada}</td>
              <td>${salida}</td>
              <td>${pausasTexto}</td>
              <td style="font-weight: bold; font-size:10px; color:#16A34A;">Efectuado</td>
              <td class="celda-firma"></td>
            </tr>
          `;
              },
            );
          } else {
            filasCalendarioHtml += `
          <tr>
            <td><strong>${nombreDiaUI}</strong></td>
            <td>-</td>
            <td>-</td>
            <td>-</td>
            <td style="color:#94A3B8;">Sin marcas</td>
            <td class="celda-firma"></td>
          </tr>
        `;
          }
        }

        const rSocial =
          empresaSeleccionada?.razon_social ||
          empresaSeleccionada?.nombre_comercial ||
          "Sin Identificar";
        const cifEmpresa = empresaSeleccionada?.cif || "-";
        const cnaeEmpresa = empresaSeleccionada?.codigo_cnae
          ? ` / CNAE: ${empresaSeleccionada.codigo_cnae}`
          : "";

        return `
      <div class="hoja-trabajador">
        <div class="caja-legal">
          <strong>DOCUMENTO DE REGISTRO DE JORNADA SEMANAL</strong><br/>
          <span>De conformidad con el Art. 34.9 del Estatuto de los Trabajadores (RDL 8/2019)</span>
        </div>
        <table class="tabla-datos">
          <tr>
            <td><strong>Empresa / Razón Social:</strong> ${rSocial}</td>
            <td><strong>CIF/NIF:</strong> ${cifEmpresa}${cnaeEmpresa}</td>
          </tr>
          <tr>
            <td><strong>Trabajador:</strong> ${t.nombre}</td>
            <td><strong>Turnos Asignados:</strong> ${t.turnoResumen}</td>
          </tr>
          <tr>
            <td colspan="2"><strong>Período de Liquidación / Registro:</strong> ${rangoSemanaStr}</td>
          </tr>
        </table>
        <table class="tabla-registro">
          <thead>
            <tr>
              <th>Día / Turno Evaluado</th>
              <th>Hora Entrada</th>
              <th>Hora Salida</th>
              <th>Interrupciones / Pausas</th>
              <th>Estado</th>
              <th>Firma Trabajador</th>
            </tr>
          </thead>
          <tbody>
            ${filasCalendarioHtml}
          </tbody>
        </table>
        <div class="firmas-bloque">
          <div class="firma-caja">Firma de la Empresa / Sello</div>
          <div class="firma-caja">Firma del Trabajador</div>
        </div>
        <div class="page-break"></div>
      </div>
    `;
      })
      .join("");

    const plantillaHtml = `
    <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: 'Arial', sans-serif; padding: 10px; color: #000; font-size: 11px; }
          .caja-legal { border: 2px solid #000; padding: 10px; text-align: center; margin-bottom: 15px; font-size: 12px; }
          .tabla-datos { width: 100%; margin-bottom: 15px; border-collapse: collapse; }
          .tabla-datos td { padding: 6px; border: 1px solid #000; background-color: #F9F9F9; }
          .tabla-registro { width: 100%; border-collapse: collapse; margin-top: 10px; }
          .tabla-registro th, .tabla-registro td { border: 1px solid #000; padding: 6px; text-align: center; }
          .tabla-registro th { background-color: #EAEAEA; font-size: 10px; text-transform: uppercase; }
          .celda-firma { width: 110px; height: 30px; }
          .firmas-bloque { margin-top: 30px; display: flex; justify-content: space-between; }
          .firma-caja { width: 40%; border-top: 1px solid #000; text-align: center; padding-top: 5px; margin-top: 40px; font-weight: bold; }
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
        window.navigator.product !== "ReactNative"
      ) {
        const iframe = document.createElement("iframe");
        iframe.style.position = "fixed";
        iframe.style.right = "0";
        iframe.style.bottom = "0";
        iframe.style.width = "0";
        iframe.style.height = "0";
        iframe.style.border = "0";
        document.body.appendChild(iframe);

        const doc = iframe.contentWindow?.document || iframe.contentDocument;
        if (doc) {
          doc.open();
          doc.close();
          const estilo = doc.createElement("style");
          estilo.textContent = `
            body { font-family: 'Arial', sans-serif; padding: 10px; color: #000; font-size: 11px; }
            .caja-legal { border: 2px solid #000; padding: 10px; text-align: center; margin-bottom: 15px; font-size: 12px; }
            .tabla-datos { width: 100%; margin-bottom: 15px; border-collapse: collapse; }
            .tabla-datos td { padding: 6px; border: 1px solid #000; background-color: #F9F9F9; }
            .tabla-registro { width: 100%; border-collapse: collapse; margin-top: 10px; }
            .tabla-registro th, .tabla-registro td { border: 1px solid #000; padding: 6px; text-align: center; }
            .tabla-registro th { background-color: #EAEAEA; font-size: 10px; text-transform: uppercase; }
            .celda-firma { width: 110px; height: 30px; }
            .firmas-bloque { margin-top: 30px; display: flex; justify-content: space-between; }
            .firma-caja { width: 40%; border-top: 1px solid #000; text-align: center; padding-top: 5px; margin-top: 40px; font-weight: bold; }
            .page-break { page-break-after: always; }
          `;
          doc.head.appendChild(estilo);
          doc.body.innerHTML = bloquesTrabajadoresHtml;

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
    } catch (error) {
      console.error("Error al exportar PDF:", error);
      Alert.alert(
        "Error Técnico",
        "No se pudo procesar la solicitud de impresión.",
      );
    }
  }, [
    trabajadoresAgrupadosSemanales,
    empresaSeleccionada,
    rangoSemanaStr,
    lunesSemanaActual,
    fichajesSemanales,
  ]);

  return (
    <AppScreen
      title="Auditoría de Fichajes"
      subtitle={`Panel corporativo: ${empresaSeleccionada?.nombre_comercial ?? "Administrador Global"}`}
    >
      {empresaSeleccionada && (
        <View style={styles.cajaInfoEmpresa}>
          <View style={styles.filaInfoEmpresa}>
            <FontAwesome5 name="building" size={13} color="#475569" />
            <ThemedText style={styles.textoInfoEmpresa}>
              <ThemedText style={styles.negrita}>Razón Social:</ThemedText>{" "}
              {empresaSeleccionada.razon_social}
            </ThemedText>
          </View>
          <View style={[styles.filaInfoEmpresa, { marginTop: 4 }]}>
            <FontAwesome5 name="id-card" size={12} color="#475569" />
            <ThemedText style={styles.textoInfoEmpresa}>
              <ThemedText style={styles.negrita}>CIF:</ThemedText>{" "}
              {empresaSeleccionada.cif}
              {empresaSeleccionada.codigo_cnae &&
                `  |  CNAE: ${empresaSeleccionada.codigo_cnae}`}
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
          Exportar Registro Semanal en PDF
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
        Panel de Control Semanal
      </ThemedText>

      {cargando ? (
        <ActivityIndicator
          size="large"
          color="#2563EB"
          style={{ marginTop: 40 }}
        />
      ) : (
        <View style={styles.contenedorEstructura}>
          {trabajadoresAgrupadosSemanales.map((trabajador: any) => (
            <Card key={trabajador.id}>
              <View style={styles.headerTrabajador}>
                <View style={styles.avatarCirculo}>
                  <ThemedText style={styles.avatarTexto}>
                    {trabajador.nombre.charAt(0)}
                  </ThemedText>
                </View>
                <View style={{ flex: 1 }}>
                  <ThemedText style={styles.nombreTrabajador}>
                    {trabajador.nombre}
                  </ThemedText>
                  <ThemedText style={styles.turnoTrabajador} numberOfLines={2}>
                    Horario: {trabajador.turnoResumen}
                  </ThemedText>
                </View>
              </View>

              <View style={styles.gridDias}>
                {Object.entries(trabajador.dias).map(
                  ([fechaKey, datosDia]: [string, any]) => (
                    <View key={fechaKey} style={styles.contenedorDia}>
                      <ThemedText style={styles.tituloDia}>
                        {datosDia.nombreDia}
                      </ThemedText>

                      {Object.entries(datosDia.turnos).map(
                        ([nombreTurno, eventos]: [string, any]) => (
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
                              {eventos.map((item: any) => {
                                const config = obtenerConfiguracionEvento(
                                  item.tipo_evento_id || item.tipo_evento,
                                );
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
                  ),
                )}
              </View>
            </Card>
          ))}

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
  filaInfoEmpresa: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  textoInfoEmpresa: {
    fontSize: 12,
    color: "#334155",
  },
  negrita: {
    fontWeight: "700",
    color: "#1E293B",
  },
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
  bloqueTurnoEspecial: {
    marginVertical: 2,
  },
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
    gap: 4,
    alignItems: "center",
    marginVertical: 1,
  },
  textoEvento: { fontSize: 10, fontWeight: "700" },
  empty: {
    textAlign: "center",
    color: "#64748B",
    marginTop: 24,
    fontStyle: "italic",
  },
});
