import React, { useMemo } from "react";
import { StyleSheet, TouchableOpacity, View } from "react-native";
import { useTrabajador } from "../context/TrabajadorContext";
import { obtenerFichajesEmpresaTrabajador } from "../src/services/fichajesService";
import { obtenerHorarioTrabajadorEmpresa } from "../src/services/horariosService";
import { ThemedText } from "./themed-text";

type Props = {
  trabajadorId?: number;
  empresaId?: number;
  year?: number;
  month?: number; // 0-based (Jan=0)
  holidays?: Date[]; // explicit holiday dates
  sickDays?: Date[]; // explicit sick dates
  onDayPress?: (date: Date) => void;
};

const COLORS = {
  worked: "#4CAF50", // green
  notWorked: "#F44336", // red
  mustWork: "#2196F3", // blue
  dontHaveToWork: "#a08a5c", // beige
  holiday: "#F5DEB3", // beige
  sick: "#9E9E9E", // grey
  todayBorder: "#000",
};

function sameDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

export const CalendarTrabajador: React.FC<Props> = ({
  trabajadorId: propTrabajadorId,
  empresaId: propEmpresaId,
  year,
  month,
  holidays = [],
  sickDays = [],
  onDayPress,
}) => {
  const { trabajadorActual, empresaSeleccionada } = useTrabajador();
  const trabajadorId = propTrabajadorId ?? trabajadorActual?.id;
  const empresaId = propEmpresaId ?? empresaSeleccionada?.id;

  const today = new Date();
  const displayYear = year ?? today.getFullYear();
  const displayMonth = month ?? today.getMonth();

  const horario = obtenerHorarioTrabajadorEmpresa(
    trabajadorId || 0,
    empresaId || 0,
  );
  const fichajes = obtenerFichajesEmpresaTrabajador(
    trabajadorId || 0,
    empresaId || 0,
  );

  const holidaysNorm = useMemo(
    () =>
      holidays.map((d) => new Date(d.getFullYear(), d.getMonth(), d.getDate())),
    [holidays],
  );
  const sickDaysNorm = useMemo(
    () =>
      sickDays.map((d) => new Date(d.getFullYear(), d.getMonth(), d.getDate())),
    [sickDays],
  );

  // build month days
  const firstDay = new Date(displayYear, displayMonth, 1);
  const lastDay = new Date(displayYear, displayMonth + 1, 0);
  const daysInMonth = lastDay.getDate();

  // map weekday letters used in horarioMock: L M X J V S D
  const weekdayMap: Record<number, string> = {
    1: "L",
    2: "M",
    3: "X",
    4: "J",
    5: "V",
    6: "S",
    0: "D",
  };

  function isScheduledToWork(d: Date) {
    if (!horario || !horario.diasSemana) return false;
    const letter = weekdayMap[d.getDay()];
    return horario.diasSemana.includes(letter);
  }

  function hasWorked(d: Date) {
    return fichajes.some((f) => {
      const fd = new Date(f.fecha);
      return sameDay(fd, d);
    });
  }

  function isHoliday(d: Date) {
    return holidaysNorm.some((h) => sameDay(h, d));
  }

  function isSick(d: Date) {
    return sickDaysNorm.some((s) => sameDay(s, d));
  }

  const cells: { date: Date; color: string; label: string }[] = [];

  // prefix empty cells for week alignment
  const prefix = firstDay.getDay();
  for (let i = 0; i < prefix; i++) {
    cells.push({ date: new Date(NaN), color: "transparent", label: "" });
  }

  for (let d = 1; d <= daysInMonth; d++) {
    const cur = new Date(displayYear, displayMonth, d);

    let color = COLORS.dontHaveToWork;
    let label = String(d);

    if (isHoliday(cur)) {
      color = COLORS.holiday;
    } else if (isSick(cur)) {
      color = COLORS.sick;
    } else if (hasWorked(cur)) {
      color = COLORS.worked;
    } else if (isScheduledToWork(cur)) {
      // scheduled but not worked yet
      if (
        cur < new Date(today.getFullYear(), today.getMonth(), today.getDate())
      ) {
        color = COLORS.notWorked; // past scheduled and not worked
      } else {
        color = COLORS.mustWork; // scheduled upcoming or today
      }
    } else {
      color = COLORS.dontHaveToWork;
    }

    cells.push({ date: cur, color, label });
  }

  // render grid 7 columns
  const rows: (typeof cells)[] = [];
  for (let i = 0; i < cells.length; i += 7) rows.push(cells.slice(i, i + 7));

  return (
    <View style={{ marginVertical: 8 }}>
      <View style={styles.weekRow}>
        {["D", "L", "M", "X", "J", "V", "S"].map((w) => (
          <ThemedText key={w} style={styles.weekLabel}>
            {w}
          </ThemedText>
        ))}
      </View>
      {rows.map((row, ri) => (
        <View key={ri} style={styles.row}>
          {row.map((cell, ci) => {
            const isToday =
              cell.date instanceof Date &&
              !isNaN(cell.date.getTime()) &&
              sameDay(cell.date, today);
            return (
              <TouchableOpacity
                key={ci}
                onPress={() =>
                  cell.date instanceof Date &&
                  !isNaN(cell.date.getTime()) &&
                  onDayPress?.(cell.date)
                }
                style={[
                  styles.cell,
                  {
                    backgroundColor: cell.color,
                    borderColor: isToday ? COLORS.todayBorder : "transparent",
                  },
                ]}
              >
                <ThemedText style={styles.cellText}>{cell.label}</ThemedText>
              </TouchableOpacity>
            );
          })}
        </View>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  weekRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 4,
  },
  weekLabel: { width: 32, textAlign: "center", fontSize: 12 },
  row: {
    flexDirection: "row",
    justifyContent: "flex-start",
    paddingHorizontal: 4,
  },
  cell: {
    width: 32,
    height: 32,
    margin: 2,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderRadius: 4,
  },
  cellText: { fontSize: 12 },
});
