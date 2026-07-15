import { Festivo } from "@/src/modules/festivos/types/festivo";
import React from "react";
import { StyleSheet, TouchableOpacity, View } from "react-native";
import { ThemedText } from "./themed-text";

type Props = {
  year: number;
  festivos?: Festivo[];
  onDayPress?: (fechaStr: string, festivoExistente?: Festivo) => void;
};

const MESES = [
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

const COLORS = {
  nacional: "#FEE2E2",
  autonomico: "#FEF3C7",
  local: "#DBEAFE",
  textoFestivo: "#991B1B",
  diaNormal: "#F8FAFC",
  hoyBorde: "#2563EB",
};

const formatDateQuery = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

export const CalendarLaboralAnual: React.FC<Props> = ({
  year,
  festivos = [],
  onDayPress,
}) => {
  const todayStr = formatDateQuery(new Date());

  const generarMesCells = (monthIndex: number) => {
    const list = [];
    const firstDay = new Date(year, monthIndex, 1);
    const lastDay = new Date(year, monthIndex + 1, 0);
    const daysInMonth = lastDay.getDate();

    let startDay = firstDay.getDay();
    // Ajuste para semanas que empiezan en Lunes (1) en vez de Domingo (0)
    const prefix = startDay === 0 ? 6 : startDay - 1;

    for (let i = 0; i < prefix; i++) {
      list.push({
        date: null,
        color: "transparent",
        label: "",
        uniqueKey: `empty-${monthIndex}-${i}`,
      });
    }

    for (let d = 1; d <= daysInMonth; d++) {
      const current = new Date(year, monthIndex, d);
      const dateStr = formatDateQuery(current);
      const festivoEncontrado = festivos.find((f) => f.fecha === dateStr);

      let bgColor = COLORS.diaNormal;
      if (festivoEncontrado) {
        if (festivoEncontrado.tipo === "Nacional") bgColor = COLORS.nacional;
        else if (festivoEncontrado.tipo === "Autonómico")
          bgColor = COLORS.autonomico;
        else bgColor = COLORS.local;
      }

      list.push({
        date: current,
        dateStr: dateStr,
        color: bgColor,
        label: String(d),
        festivo: festivoEncontrado,
        uniqueKey: dateStr,
      });
    }
    return list;
  };

  return (
    <View style={styles.containerAnual}>
      {MESES.map((nombreMes, indiceMes) => {
        const cells = generarMesCells(indiceMes);

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

            {/* Cuadrícula de días en una sola fila con Flex Wrap */}
            <View style={styles.gridDias}>
              {cells.map((cell) => {
                const isToday = cell.dateStr === todayStr;
                const esFestivo = !!cell.festivo;

                return (
                  <View key={cell.uniqueKey} style={styles.cellWrapper}>
                    <TouchableOpacity
                      disabled={!cell.date}
                      onPress={() =>
                        cell.dateStr && onDayPress?.(cell.dateStr, cell.festivo)
                      }
                      style={[
                        styles.cell,
                        { backgroundColor: cell.color },
                        isToday && styles.todayCell,
                        !cell.date && { backgroundColor: "transparent" },
                      ]}
                    >
                      {cell.date && (
                        <ThemedText
                          style={[
                            styles.cellText,
                            esFestivo && styles.cellTextFestivo,
                            isToday && styles.cellTextHoy,
                          ]}
                        >
                          {cell.label}
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
    flexBasis: "14.28%", // División matemática perfecta entre 7 días
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
    flexBasis: "14.28%", // Asegura que entren exactamente 7 días por fila del contenedor
    padding: 2, // Margen equilibrado interno
    aspectRatio: 1, // Hace que cada celda sea perfectamente cuadrada de forma dinámica
  },
  cell: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 6,
  },
  todayCell: {
    borderColor: COLORS.hoyBorde,
    borderWidth: 1.5,
    backgroundColor: "#EFF6FF",
  },
  cellText: {
    fontSize: 12,
    color: "#334155",
    fontWeight: "500",
  },
  cellTextFestivo: {
    color: COLORS.textoFestivo,
    fontWeight: "700",
  },
  cellTextHoy: {
    color: COLORS.hoyBorde,
    fontWeight: "700",
  },
});
