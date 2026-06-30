import { obtenerFichajesEmpresaPorFecha } from "@/src/modules/trabajadores/api/services";
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

// Interfaces adaptadas al control global de la organización
interface RegistroFichajeEmpresa {
  id: string;
  trabajador_id: string;
  trabajador_nombre: string;
  turno_nombre: string;
  fecha_hora: string; // Formato "YYYY-MM-DD HH:MM:SS" o ISOString
  tipo_evento: "ENTRADA" | "SALIDA" | "INICIO_PAUSA" | "FIN_PAUSA";
  metodo_fichaje: string;
  observaciones?: string | null;
}

// Función helper pura para parsear la hora de forma segura y evitar duplicar código
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

export default function FichajesHistorialScreen() {
  const { empresaSeleccionada } = useSesion();
  const [fichajesGlobales, setFichajesGlobales] = useState<
    RegistroFichajeEmpresa[]
  >([]);
  const [cargando, setCargando] = useState<boolean>(true);
  const [fechaSeleccionada, setFechaSeleccionada] = useState<Date>(new Date());
  const [mostrarDatePicker, setMostrarDatePicker] = useState<boolean>(false);

  // Extrae la fecha limpia en formato YYYY-MM-DD
  const fechaFormateadaStr = useMemo(() => {
    const offset = fechaSeleccionada.getTimezoneOffset();
    const fechaLocal = new Date(
      fechaSeleccionada.getTime() - offset * 60 * 1000,
    );
    return fechaLocal.toISOString().split("T")[0];
  }, [fechaSeleccionada]);

  // Petición a la API encapsulada con useCallback para evitar recreaciones innecesarias
  const cargarFichajesEmpresaPorFecha = async () => {
    if (!empresaSeleccionada?.id) return;
    try {
      setCargando(true);
      // Pasamos la fechaFormateadaStr limpia que calculamos con el useMemo
      const datosReales = await obtenerFichajesEmpresaPorFecha(
        empresaSeleccionada.id,
        fechaFormateadaStr,
      );
      setFichajesGlobales(datosReales);
    } catch (error) {
      console.error(error);
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    cargarFichajesEmpresaPorFecha();
  }, [fechaFormateadaStr, empresaSeleccionada?.id]);

  // AGRUPADOR INTELIGENTE POR OPERARIO
  const trabajadoresAgrupados = useMemo(() => {
    const mapa: {
      [key: string]: {
        nombre: string;
        turno: string;
        entradasSalidas: RegistroFichajeEmpresa[];
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
          turno: f.turno_nombre,
          entradasSalidas: [],
        };
      }

      if (f.tipo_evento === "ENTRADA" || f.tipo_evento === "SALIDA") {
        mapa[f.trabajador_id].entradasSalidas.push(f);
      }
    });

    return Object.values(mapa);
  }, [fichajesGlobales, fechaFormateadaStr]);

  // GENERADOR DE INFORMES PDF COMPATIBLE CON INSPECCIONES LEGALES (Optimizado con useCallback)
  const handleExportarPDF = useCallback(async () => {
    if (fichajesGlobales.length === 0) {
      Alert.alert(
        "Aviso",
        "No constan registros horarios en esta fecha para compilar el PDF.",
      );
      return;
    }

    const filasHtml = fichajesGlobales
      .map((f) => {
        const hora = extraerHora(f.fecha_hora, true);
        return `
        <tr>
          <td>${f.trabajador_nombre}</td>
          <td>${f.turno_nombre}</td>
          <td style="font-weight: bold; color: ${f.tipo_evento === "ENTRADA" ? "#16A34A" : "#DC2626"}">${f.tipo_evento}</td>
          <td>${hora} hs</td>
          <td>${f.metodo_fichaje.replace("_", " ")}</td>
        </tr>
      `;
      })
      .join("");

    const plantillaHtml = `
      <html>
        <head>
          <style>
            body { font-family: 'Helvetica', sans-serif; padding: 20px; color: #1E293B; }
            h1 { font-size: 20px; color: #0F172A; margin-bottom: 2px; }
            p { font-size: 12px; color: #64748B; margin-top: 0; margin-bottom: 20px; }
            table { width: 100%; border-collapse: collapse; margin-top: 10px; }
            th, td { border: 1px solid #CBD5E1; padding: 10px; text-align: left; font-size: 12px; }
            th { background-color: #F8FAFC; font-weight: bold; color: #334155; }
          </style>
        </head>
        <body>
          <h1>REGISTRO OFICIAL DE CONTROL HORARIO</h1>
          <p>Empresa: ${empresaSeleccionada?.nombre_comercial ?? "Organización SaaS"} | Fecha de Auditoría: ${fechaFormateadaStr}</p>
          <table>
            <thead>
              <tr>
                <th>Trabajador</th>
                <th>Turno Asignado</th>
                <th>Evento</th>
                <th>Hora Dispositivo</th>
                <th>Método</th>
              </tr>
            </thead>
            <tbody>
              ${filasHtml}
            </tbody>
          </table>
        </body>
      </html>
    `;

    try {
      const { uri } = await Print.printToFileAsync({ html: plantillaHtml });
      await Sharing.shareAsync(uri, {
        mimeType: "application/pdf",
        dialogTitle: "Exportar Registro Mensual",
      });
    } catch {
      Alert.alert(
        "Error Técnico",
        "No se pudo compilar o compartir el fichero PDF.",
      );
    }
  }, [
    fichajesGlobales,
    empresaSeleccionada?.nombre_comercial,
    fechaFormateadaStr,
  ]);

  const onDateChange = (event: DateTimePickerEvent, selectedDate?: Date) => {
    setMostrarDatePicker(Platform.OS === "ios");
    if (selectedDate) setFechaSeleccionada(selectedDate);
  };

  return (
    <AppScreen
      title="Auditoría de Fichajes"
      subtitle={`Panel corporativo: ${empresaSeleccionada?.nombre_comercial ?? "Mi Empresa"}`}
    >
      {/* PANEL DE ACCIONES FLOTANTES */}
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
          <ThemedText style={styles.textoBotonPDF}>Sacar PDF</ThemedText>
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

      {/* METRICAS ANALÍTICAS EN PARALELO */}
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
                    {trabajador.turno}
                  </ThemedText>
                </View>
              </View>

              <View style={styles.separador} />

              <View style={{ gap: 10 }}>
                {trabajador.entradasSalidas.map((item) => {
                  const esEntrada = item.tipo_evento === "ENTRADA";
                  const horaLimpia = extraerHora(item.fecha_hora, false);

                  return (
                    <View key={item.id} style={styles.filaFichaje}>
                      <View style={styles.contenedorIcono}>
                        <MaterialCommunityIcons
                          name={esEntrada ? "door-open" : "exit-run"}
                          size={18}
                          color={esEntrada ? "#16A34A" : "#DC2626"}
                        />
                      </View>
                      <View style={{ flex: 1 }}>
                        <ThemedText
                          style={[
                            styles.textoEvento,
                            { color: esEntrada ? "#16A34A" : "#DC2626" },
                          ]}
                        >
                          MARCAJE DE {item.tipo_evento}
                        </ThemedText>
                        <ThemedText style={styles.subtextoHora}>
                          Registrado a las {horaLimpia} hs vía{" "}
                          {item.metodo_fichaje.replace("_", " ")}
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
    color: "#64748B",
    fontWeight: "600",
    marginTop: 1,
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
    borderColor: "#E2E8F0",
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
