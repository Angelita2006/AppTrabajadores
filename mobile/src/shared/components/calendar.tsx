import { Festivo } from "@/src/modules/festivos/types/festivo";
import { formatearFecha } from "@/src/utils/formaters";
import React from "react";
import { StyleSheet, TouchableOpacity, View } from "react-native";
import { ThemedText } from "./ThemedText";

/**
 * Propiedades de entrada para el componente CalendarLaboralAnual.
 */
type CalendarLaboralAnualProps = {
  anio: number;
  festivos?: Festivo[];
  onDayPress?: (fechaStr: string, festivoExistente?: Festivo) => void;
};

const MESES_NOMBRES = [
  "Enero",
  "Febrero",
  "Marzo",
  "Abril",
  "Mayo",
  "Junio",
  "Julio",
  "Agosto",
  "Septiembre",
  "Octubre",
  "Noviembre",
  "Diciembre",
];

const COLORES_CALENDARIO = {
  nacional: "#FEE2E2",
  autonomico: "#FEF3C7",
  local: "#DBEAFE",
  textoFestivo: "#991B1B",
  diaNormal: "#F8FAFC",
  hoyBorde: "#2563EB",
};

/**
 * Componente que renderiza un calendario laboral anual estructurado por meses,
 * permitiendo visualizar festividades por tipo y gestionar eventos táctiles por día.
 *
 * @param props - Propiedades del componente (`year`, `festivos`, `onDayPress`).
 * @returns Estructura visual completa del calendario anual en formato de rejilla por meses.
 */
export const CalendarLaboralAnual: React.FC<CalendarLaboralAnualProps> = ({
  anio,
  festivos = [],
  onDayPress,
}) => {
  const hoyStr = formatearFecha(new Date());

  /**
   * Genera la matriz de celdas (días y espacios vacíos) para un mes específico,
   * calculando el desplazamiento inicial y asignando colores según festividades.
   *
   * @param indexMes - Índice numérico del mes (0 para Enero, 11 para Diciembre).
   * @returns Un arreglo de objetos con la metadata de cada celda para pintar la cuadrícula.
   */
  const generarCeldasMes = (indexMes: number) => {
    const lista = [];
    const primerDia = new Date(anio, indexMes, 1);
    const ultimoDia = new Date(anio, indexMes + 1, 0);
    const diasMes = ultimoDia.getDate();

    let comienzoDia = primerDia.getDay();
    // Ajuste de inicio de semana: Lunes (1) en vez de Domingo (0)
    const prefix = comienzoDia === 0 ? 6 : comienzoDia - 1;

    // Rellena los espacios vacíos previos al primer día del mes
    for (let i = 0; i < prefix; i++) {
      lista.push({
        date: null,
        color: "transparent",
        label: "",
        uniqueKey: `empty-${indexMes}-${i}`,
      });
    }

    // Rellena los días reales del mes y mapea sus festividades
    for (let d = 1; d <= diasMes; d++) {
      const hoy = new Date(anio, indexMes, d);
      const fechaStr = formatearFecha(hoy);
      const festivoEncontrado = festivos.find((f) => f.fecha === fechaStr);

      let bgColor = COLORES_CALENDARIO.diaNormal;
      if (festivoEncontrado) {
        if (festivoEncontrado.tipo === "Nacional")
          bgColor = COLORES_CALENDARIO.nacional;
        else if (festivoEncontrado.tipo === "Autonómico")
          bgColor = COLORES_CALENDARIO.autonomico;
        else bgColor = COLORES_CALENDARIO.local;
      }

      lista.push({
        date: hoy,
        dateStr: fechaStr,
        color: bgColor,
        label: String(d),
        festivo: festivoEncontrado,
        uniqueKey: fechaStr,
      });
    }
    return lista;
  };

  return (
    <View style={styles.containerAnual}>
      {MESES_NOMBRES.map((nombreMes, indexMes) => {
        const celdas = generarCeldasMes(indexMes);

        return (
          <View key={nombreMes} style={styles.contenedorMes}>
            <ThemedText style={styles.nombreMesHeader}>{nombreMes}</ThemedText>

            {/* Cabecera de días de la semana */}
            <View style={styles.weekRow}>
              {["L", "M", "X", "J", "V", "S", "D"].map((w, index) => (
                <View key={`${w}-${index}`} style={styles.weekLabelContainer}>
                  <ThemedText style={styles.weekLabel}>{w}</ThemedText>
                </View>
              ))}
            </View>

            {/* Cuadrícula de días con Flex Wrap */}
            <View style={styles.gridDias}>
              {celdas.map((celda) => {
                const isToday = celda.dateStr === hoyStr;
                const esFestivo = !!celda.festivo;

                return (
                  <View key={celda.uniqueKey} style={styles.cellWrapper}>
                    <TouchableOpacity
                      disabled={!celda.date}
                      onPress={() =>
                        celda.dateStr &&
                        onDayPress?.(celda.dateStr, celda.festivo)
                      }
                      style={[
                        styles.cell,
                        { backgroundColor: celda.color },
                        isToday && styles.todayCell,
                        !celda.date && { backgroundColor: "transparent" },
                      ]}
                    >
                      {celda.date && (
                        <ThemedText
                          style={[
                            styles.cellText,
                            esFestivo && styles.cellTextFestivo,
                            isToday && styles.cellTextHoy,
                          ]}
                        >
                          {celda.label}
                        </ThemedText>
                      )}
                    </TouchableOpacity>
                  </View>
                );
              })}
            </View>
          </View>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  containerAnual: {
    width: "100%",
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  contenedorMes: {
    width: "100%",
    minWidth: 280,
    flexGrow: 1,
    flexShrink: 1,
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    boxShadow: "0px 1px 2px rgba(0, 0, 0, 0.05)",
    elevation: 2,
  },
  nombreMesHeader: {
    fontSize: 15,
    fontWeight: "700",
    marginBottom: 12,
    color: "#0F172A",
    textAlign: "center",
  },
  weekRow: {
    flexDirection: "row",
    marginBottom: 6,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
    paddingBottom: 4,
  },
  weekLabelContainer: {
    flexBasis: "14.28%", // División proporcional exacta para 7 días
    alignItems: "center",
  },
  weekLabel: {
    fontSize: 11,
    color: "#94A3B8",
    fontWeight: "700",
  },
  gridDias: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  cellWrapper: {
    flexBasis: "14.28%", // Garantiza 7 columnas exactas por fila
    padding: 2,
    aspectRatio: 1, // Mantiene celdas perfectamente cuadradas
  },
  cell: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 6,
  },
  todayCell: {
    borderColor: COLORES_CALENDARIO.hoyBorde,
    borderWidth: 1.5,
    backgroundColor: "#EFF6FF",
  },
  cellText: {
    fontSize: 12,
    color: "#334155",
    fontWeight: "500",
  },
  cellTextFestivo: {
    color: COLORES_CALENDARIO.textoFestivo,
    fontWeight: "700",
  },
  cellTextHoy: {
    color: COLORES_CALENDARIO.hoyBorde,
    fontWeight: "700",
  },
});
