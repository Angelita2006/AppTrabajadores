import {
  obtenerAsignacionesTurnoTrabajador,
  obtenerFichajesEmpresaPorFecha,
  obtenerTurno,
} from "@/src/modules/trabajadores/api/services";
import { FontAwesome5, MaterialCommunityIcons } from "@expo/vector-icons";
import DateTimePicker, {
  DateTimePickerEvent,
} from "@react-native-community/datetimepicker";
import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Platform,
  Pressable,
  StyleSheet,
  View,
} from "react-native";
import { useSesion } from "../../src/modules/trabajadores/store/SesionContext";
import { ThemedText } from "../../src/shared/components/themed-text";
import { AppScreen, Card, Row, StatCard } from "../../src/shared/ui/AppSurface";

interface RegistroFichajeEmpresa {
  id: string;
  trabajador_id: string;
  trabajador_nombre: string;
  turno_nombre: string;
  fecha_hora: string;
  tipo_evento: "ENTRADA" | "SALIDA" | "INICIO_PAUSA" | "FIN_PAUSA";
  metodo_fichaje: string;
  observaciones?: string | null;
}

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

const obtenerConfiguracionEvento = (tipo: string) => {
  switch (tipo) {
    case "ENTRADA":
      return { icono: "door-open", color: "#16A34A", texto: "ENTRADA" };
    case "SALIDA":
      return { icono: "exit-run", color: "#DC2626", texto: "SALIDA" };
    case "INICIO_PAUSA":
      return { icono: "coffee-to-go", color: "#EA580C", texto: "INICIO PAUSA" };
    case "FIN_PAUSA":
      return { icono: "briefcase-check", color: "#2563EB", texto: "FIN PAUSA" };
    default:
      return {
        icono: "clock-outline",
        color: "#475569",
        texto: tipo || "OTRO",
      };
  }
};

export default function FichajesHistorialScreen() {
  const { empresaSeleccionada } = useSesion();
  const [fichajesGlobales, setFichajesGlobales] = useState<
    RegistroFichajeEmpresa[]
  >([]);
  const [cargando, setCargando] = useState<boolean>(true);
  const [fechaSeleccionada, setFechaSeleccionada] = useState<Date>(new Date());
  const [mostrarDatePicker, setMostrarDatePicker] = useState<boolean>(false);
  const [resumenesTurnos, setResumenesTurnos] = useState<{
    [key: string]: string;
  }>({});

  const onDateChange = (event: DateTimePickerEvent, selectedDate?: Date) => {
    setMostrarDatePicker(Platform.OS === "ios");
    if (selectedDate) setFechaSeleccionada(selectedDate);
  };

  const fechaFormateadaStr = useMemo(() => {
    const offset = fechaSeleccionada.getTimezoneOffset();
    const fechaLocal = new Date(
      fechaSeleccionada.getTime() - offset * 60 * 1000,
    );
    return fechaLocal.toISOString().split("T")[0];
  }, [fechaSeleccionada]);

  const rangoSemanaStr = useMemo(() => {
    const d = new Date(fechaSeleccionada);
    const day = d.getDay(),
      diff = d.getDate() - day + (day === 0 ? -6 : 1);
    const lunes = new Date(d.setDate(diff));
    const domingo = new Date(lunes);
    domingo.setDate(lunes.getDate() + 6);

    return `Del ${lunes.toLocaleDateString("es-ES")} al ${domingo.toLocaleDateString("es-ES")}`;
  }, [fechaSeleccionada]);

  const cargarFichajesEmpresaPorFecha = async () => {
    try {
      setCargando(true);

      // Enviamos el ID si existe (modo Manager) o undefined si es Admin para traer todo global
      const datosReales = await obtenerFichajesEmpresaPorFecha(
        empresaSeleccionada?.id || "",
        fechaFormateadaStr,
      );
      setFichajesGlobales(datosReales);

      const idTrabajadoresUnicos = Array.from(
        new Set(datosReales.map((f) => f.trabajador_id)),
      );
      const mapaTurnosTemporales: { [key: string]: string } = {};

      await Promise.all(
        idTrabajadoresUnicos.map(async (idTrabajador) => {
          try {
            // 1. Obtenemos todas las asignaciones del trabajador globales
            const asignaciones =
              await obtenerAsignacionesTurnoTrabajador(idTrabajador);

            if (asignaciones && asignaciones.length > 0) {
              const stringsTurnosValidos: string[] = [];

              // 2. Mapeamos y resolvemos cada asignación en paralelo (Sin filtrar por empresa)
              await Promise.all(
                asignaciones.map(async (asig: { turno_id: string }) => {
                  try {
                    const turno = await obtenerTurno(asig.turno_id);
                    // 3. Si el turno existe en el sistema, lo añadimos directamente
                    if (turno) {
                      const inicioLimpio = turno.hora_inicio.substring(0, 5);
                      const finLimpio = turno.hora_fin.substring(0, 5);
                      const diasTexto =
                        turno.minutos_pausa_obligatoria > 0
                          ? ` [Pausa: ${turno.minutos_pausa_obligatoria} min]`
                          : "";

                      stringsTurnosValidos.push(
                        `${turno.nombre} (${inicioLimpio}-${finLimpio})${diasTexto}`,
                      );
                    }
                  } catch (err) {
                    console.error(
                      `Error al recuperar turno individual ${asig.turno_id}:`,
                      err,
                    );
                  }
                }),
              );

              // 4. Agrupamos todos los turnos encontrados
              if (stringsTurnosValidos.length > 0) {
                mapaTurnosTemporales[idTrabajador] =
                  stringsTurnosValidos.join(", ");
              } else {
                mapaTurnosTemporales[idTrabajador] = "Sin turno asignado";
              }
            } else {
              mapaTurnosTemporales[idTrabajador] = "Sin asignación de turno";
            }
          } catch (error) {
            console.error(
              `Fallo dinámico en el ID Trabajador ${idTrabajador}:`,
              error,
            );
            mapaTurnosTemporales[idTrabajador] = "Error al cargar turno";
          }
        }),
      );

      setResumenesTurnos(mapaTurnosTemporales);
    } catch (error) {
      console.error("Error al auditar fichajes y turnos:", error);
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    cargarFichajesEmpresaPorFecha();
  }, [fechaFormateadaStr, empresaSeleccionada?.id]);

  const trabajadoresAgrupados = useMemo(() => {
    const mapa: {
      [key: string]: {
        nombre: string;
        turno: string;
        eventos: RegistroFichajeEmpresa[];
      };
    } = {};

    fichajesGlobales.forEach((f) => {
      const fechaFichajeLimpia = f.fecha_hora.includes("T")
        ? f.fecha_hora.split("T")[0]
        : f.fecha_hora.split(" ")[0];
      if (fechaFichajeLimpia !== fechaFormateadaStr) return;

      if (!mapa[f.trabajador_id]) {
        mapa[f.trabajador_id] = {
          nombre: f.trabajador_nombre,
          turno: resumenesTurnos[f.trabajador_id] || "Consultando cuadrante...",
          eventos: [],
        };
      }
      mapa[f.trabajador_id].eventos.push(f);
    });

    Object.values(mapa).forEach((t) => {
      t.eventos.sort((a, b) => a.fecha_hora.localeCompare(b.fecha_hora));
    });

    return Object.values(mapa);
  }, [fichajesGlobales, fechaFormateadaStr, resumenesTurnos]);

  const handleExportarPDF = useCallback(async () => {
    if (fichajesGlobales.length === 0) {
      Alert.alert(
        "Aviso",
        "No constan registros horarios en esta fecha para compilar el documento legal.",
      );
      return;
    }

    const bloquesTrabajadoresHtml = trabajadoresAgrupados
      .map((t) => {
        const marcas = t.eventos;
        let entrada = "-";
        let salida = "-";
        let pausaInicio: Date | null = null;
        let tiempoPausasMinutos = 0;

        marcas.forEach((m) => {
          const hora = extraerHora(m.fecha_hora, false);
          if (m.tipo_evento === "ENTRADA") entrada = hora;
          if (m.tipo_evento === "SALIDA") salida = hora;
          if (m.tipo_evento === "INICIO_PAUSA")
            pausaInicio = new Date(m.fecha_hora);
          if (m.tipo_evento === "FIN_PAUSA" && pausaInicio) {
            const fin = new Date(m.fecha_hora);
            tiempoPausasMinutos += Math.round(
              (fin.getTime() - pausaInicio.getTime()) / 60000,
            );
            pausaInicio = null;
          }
        });

        const pausasTexto =
          tiempoPausasMinutos > 0 ? `${tiempoPausasMinutos} min` : "-";

        return `
        <div class="hoja-trabajador">
          <div class="caja-legal">
            <strong>DOCUMENTO DE REGISTRO DE JORNADA SEMANAL</strong><br/>
            <span>De conformidad con el Art. 34.9 del Estatuto de los Trabajadores (RDL 8/2019)</span>
          </div>

          <table class="tabla-datos">
            <tr>
              <td><strong>Empresa:</strong> ${empresaSeleccionada?.nombre_comercial || "Vista Admin (Todas)"}</td>
              <td><strong>CIF/NIF:</strong> ${empresaSeleccionada?.cif || "Múltiple"}</td>
            </tr>
            <tr>
              <td><strong>Trabajador:</strong> ${t.nombre}</td>
              <td><strong>Turno Detallado:</strong> ${t.turno}</td>
            </tr>
            <tr>
              <td colspan="2"><strong>Período de Liquidación / Registro:</strong> ${rangoSemanaStr}</td>
            </tr>
          </table>

          <table class="tabla-registro">
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Hora Entrada</th>
                <th>Hora Salida</th>
                <th>Interrupciones / Pausas</th>
                <th>Horas Ordinarias</th>
                <th>Firma Trabajador</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>${fechaFormateadaStr}</td>
                <td>${entrada}</td>
                <td>${salida}</td>
                <td>${pausasTexto}</td>
                <td style="font-weight: bold;">Computado</td>
                <td class="celda-firma"></td>
              </tr>
              <tr><td>Lunes (Resto)</td><td>:</td><td>:</td><td>-</td><td></td><td class="celda-firma"></td></tr>
              <tr><td>Martes (Resto)</td><td>:</td><td>:</td><td>-</td><td></td><td class="celda-firma"></td></tr>
              <tr><td>Miércoles (Resto)</td><td>:</td><td>:</td><td>-</td><td></td><td class="celda-firma"></td></tr>
              <tr><td>Jueves (Resto)</td><td>:</td><td>:</td><td>-</td><td></td><td class="celda-firma"></td></tr>
              <tr><td>Viernes (Resto)</td><td>:</td><td>:</td><td>-</td><td></td><td class="celda-firma"></td></tr>
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
          <style>
            body { font-family: 'Arial', sans-serif; padding: 10px; color: #000; font-size: 12px; }
            .caja-legal { border: 2px solid #000; padding: 10px; text-align: center; margin-bottom: 15px; font-size: 13px; }
            .tabla-datos { width: 100%; margin-bottom: 15px; border-collapse: collapse; }
            .tabla-datos td { padding: 6px; border: 1px solid #000; background-color: #F9F9F9; }
            .tabla-registro { width: 100%; border-collapse: collapse; margin-top: 10px; }
            .tabla-registro th, .tabla-registro td { border: 1px solid #000; padding: 8px; text-align: center; }
            .tabla-registro th { background-color: #EAEAEA; font-size: 11px; text-transform: uppercase; }
            .celda-firma { width: 120px; height: 35px; }
            .firmas-bloque { margin-top: 40px; display: flex; justify-content: space-between; }
            .firma-caja { width: 45%; border-top: 1px solid #000; text-align: center; padding-top: 5px; margin-top: 60px; font-weight: bold; }
            .page-break { page-break-after: always; }
          </style>
        </head>
        <body>
          ${bloquesTrabajadoresHtml}
        </body>
      </html>
    `;

    try {
      const { uri } = await Print.printToFileAsync({ html: plantillaHtml });
      await Sharing.shareAsync(uri, {
        mimeType: "application/pdf",
        dialogTitle: `Registro_Legal_Jornada_${fechaFormateadaStr}`,
      });
    } catch {
      Alert.alert(
        "Error Técnico",
        "No se pudo generar el libro de registro semanal.",
      );
    }
  }, [
    trabajadoresAgrupados,
    empresaSeleccionada,
    fechaFormateadaStr,
    rangoSemanaStr,
    fichajesGlobales,
  ]);

  return (
    <AppScreen
      title="Auditoría de Fichajes"
      subtitle={`Panel corporativo: ${empresaSeleccionada?.nombre_comercial ?? "Administrador Global"}`}
    >
      <View style={styles.consolaAcciones}>
        <Pressable
          style={styles.botonAccionFiltro}
          onPress={() => setMostrarDatePicker(true)}
        >
          <FontAwesome5 name="calendar-alt" size={14} color="#2563EB" />
          <ThemedText style={styles.textoBotonFiltro}>
            Fecha: {fechaFormateadaStr}
          </ThemedText>
        </Pressable>

        <Pressable style={styles.botonPDF} onPress={handleExportarPDF}>
          <FontAwesome5 name="file-pdf" size={14} color="#FFFFFF" />
          <ThemedText style={styles.textoBotonPDF}>
            Generar Registro Legal
          </ThemedText>
        </Pressable>
      </View>

      {mostrarDatePicker && (
        <DateTimePicker
          value={fechaSeleccionada}
          mode="date"
          display={Platform.OS === "ios" ? "inline" : "default"}
          onChange={onDateChange}
          maximumDate={new Date()}
        />
      )}

      <Row>
        <StatCard
          label="Total Marcajes"
          value={fichajesGlobales.length.toString()}
        />
        <StatCard
          label="Personal Activo"
          value={trabajadoresAgrupados.length.toString()}
          tone="success"
        />
      </Row>

      <ThemedText style={styles.sectionTitle}>
        Panel de Control Diario
      </ThemedText>

      {cargando ? (
        <ActivityIndicator
          size="large"
          color="#2563EB"
          style={{ marginTop: 40 }}
        />
      ) : (
        <View style={styles.contenedorEstructura}>
          {trabajadoresAgrupados.map((trabajador) => (
            <Card key={trabajador.nombre}>
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
                  <ThemedText style={styles.turnoTrabajador}>
                    Turno Actual: {trabajador.turno}
                  </ThemedText>
                </View>
              </View>

              <View style={styles.separador} />

              <View style={{ gap: 10 }}>
                {trabajador.eventos.map((item) => {
                  const config = obtenerConfiguracionEvento(item.tipo_evento);
                  const horaLimpia = extraerHora(item.fecha_hora, false);

                  return (
                    <View key={item.id} style={styles.filaFichaje}>
                      <View
                        style={[
                          styles.contenedorIcono,
                          { borderColor: config.color + "40" },
                        ]}
                      >
                        <MaterialCommunityIcons
                          name={config.icono as any}
                          size={18}
                          color={config.color}
                        />
                      </View>
                      <View style={{ flex: 1 }}>
                        <ThemedText
                          style={[styles.textoEvento, { color: config.color }]}
                        >
                          {config.texto}
                        </ThemedText>
                        <ThemedText style={styles.subtextoHora}>
                          Registrado a las {horaLimpia} hs vía{" "}
                          {item.metodo_fichaje.replace(/_/g, " ")}
                        </ThemedText>
                        {item.observaciones && (
                          <ThemedText style={styles.observacionTexto}>
                            Nota: "{item.observaciones}"
                          </ThemedText>
                        )}
                      </View>
                    </View>
                  );
                })}
              </View>
            </Card>
          ))}

          {trabajadoresAgrupados.length === 0 && (
            <ThemedText style={styles.empty}>
              No constan registros de asistencia en la fecha seleccionada.
            </ThemedText>
          )}
        </View>
      )}
    </AppScreen>
  );
}

const styles = StyleSheet.create({
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
  botonPDF: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#DC2626",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 8,
  },
  textoBotonPDF: { fontSize: 13, color: "#FFFFFF", fontWeight: "700" },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#1E293B",
    marginVertical: 14,
  },
  contenedorEstructura: { gap: 12, paddingBottom: 24 },
  headerTrabajador: { flexDirection: "row", alignItems: "center", gap: 10 },
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
    color: "#475569",
    fontWeight: "700",
    marginTop: 2,
  },
  separador: { height: 1, backgroundColor: "#F1F5F9", marginVertical: 10 },
  filaFichaje: { flexDirection: "row", gap: 10, alignItems: "center" },
  contenedorIcono: {
    width: 28,
    height: 28,
    borderRadius: 6,
    backgroundColor: "#F8FAFC",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
  },
  textoEvento: { fontSize: 12, fontWeight: "800", letterSpacing: 0.3 },
  subtextoHora: {
    fontSize: 12,
    color: "#475569",
    fontWeight: "500",
    marginTop: 1,
  },
  observacionTexto: {
    fontSize: 11,
    color: "#64748B",
    fontStyle: "italic",
    marginTop: 3,
    backgroundColor: "#F8FAFC",
    paddingHorizontal: 6,
    paddingVertical: 4,
    borderRadius: 4,
    alignSelf: "flex-start",
  },
  empty: {
    textAlign: "center",
    color: "#64748B",
    marginTop: 24,
    fontStyle: "italic",
  },
});
