import React, { useEffect, useMemo, useState } from "react";
import { StyleSheet, TouchableOpacity, View } from "react-native";
// import { obtenerFichajesEmpresaTrabajador } from "../../../modules/fichajes/api/fichajesService";
import { obtenerFichajesEmpresaTrabajador } from "../../../modules/fichajes/api/services";
import { Fichaje } from "../../../modules/fichajes/types/fichaje";
// import { obtenerHorarioTrabajadorEmpresa } from "../../../modules/horarios/api/horariosService";
import { obtenerHorarioTrabajadorEmpresa } from "../../../modules/horarios/api/services";
import { Horario } from "../../../modules/horarios/types/horario";
import { ThemedText } from "../../../shared/components/themed-text";
import { useTrabajador } from "../../trabajadores/store/UsuarioContext";

/**
 * Propiedades para el componente CalendarTrabajador.
 * Permite filtrar por empleado, empresa, periodo de tiempo y días especiales.
 */
type Props = {
  // Identificador único del trabajador. Opcional si se toma del contexto global.
  trabajadorId?: number;
  // Identificador único de la empresa. Opcional si se toma del contexto global.
  empresaId?: number;
  // Año que se desea visualizar en el calendario.
  year?: number;
  // Mes que se desea visualizar (basado en índice 0, donde Enero es 0 y Diciembre es 11).
  month?: number;
  // Arreglo explícito con los días de vacaciones aprobados para el trabajador.
  holidays?: Date[];
  // Arreglo explícito con los días de baja médica registrados para el trabajador.
  sickDays?: Date[];
  // Función callback que se dispara cuando el usuario toca un día del calendario.
  onDayPress?: (date: Date) => void;
};

/**
 * Paleta de colores fija para identificar el estado laboral de cada día en el calendario.
 */
const COLORS = {
  worked: "#4CAF50", // Verde: Jornada completada o fichada.
  notWorked: "#F44336", // Rojo: Día laboral donde no consta ningún fichaje.
  mustWork: "#2196F3", // Azul: Día programado según horario en el que se debe asistir.
  dontHaveToWork: "#a08a5c", // Beige oscuro: Día libre asignado por contrato.
  holiday: "#F5DEB3", // Beige claro: Periodo vacacional o festivo.
  sick: "#9E9E9E", // Gris: Día de ausencia justificada por baja médica.
  todayBorder: "#000", // Negro: Borde destacado para resaltar el día actual.
};

/**
 * Compara dos objetos de fecha y determina si corresponden exactamente al mismo día.
 * Ignora los parámetros de hora, minutos, segundos y milisegundos.
 */
function sameDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

/**
 * Componente de calendario interactivo para el control y seguimiento laboral de los empleados.
 * Cruza los cuadrantes de horarios con los fichajes reales para colorear el estado de cada día.
 */
export const CalendarTrabajador: React.FC<Props> = ({
  trabajadorId: propTrabajadorId,
  empresaId: propEmpresaId,
  year,
  month,
  holidays = [],
  sickDays = [],
  onDayPress,
}) => {
  // Recupera la información de sesión global de la aplicación
  const { trabajadorActual, empresaSeleccionada } = useTrabajador();

  // Prioriza los identificadores recibidos por props, si no existen usa los del contexto global
  const trabajadorId = propTrabajadorId ?? trabajadorActual?.id;
  const empresaId = propEmpresaId ?? empresaSeleccionada?.id;

  // Inicializa las variables temporales basándose en la fecha del sistema actual
  const today = new Date();
  const displayYear = year ?? today.getFullYear();
  const displayMonth = month ?? today.getMonth();

  // Estados locales para almacenar el horario normativo y los fichajes reales del mes
  const [horario, setHorario] = useState<Horario | null>(null);
  const [fichajes, setFichajes] = useState<Fichaje[]>([]);

  // Efecto encargado de recargar los datos de turnos y fichajes si cambia el trabajador o la empresa
  useEffect(() => {
    const loadData = async () => {
      // Si faltan las credenciales mínimas de búsqueda, limpia el estado y cancela el proceso
      if (!trabajadorId || !empresaId) {
        setHorario(null);
        setFichajes([]);
        return;
      }

      try {
        // Ejecuta en paralelo la consulta del cuadrante teórico y el historial de marcajes reales
        const [horarioData, fichajesData] = await Promise.all([
          obtenerHorarioTrabajadorEmpresa(trabajadorId, empresaId),
          obtenerFichajesEmpresaTrabajador(trabajadorId, empresaId),
        ]);
        setHorario(horarioData);
        setFichajes(fichajesData);
      } catch (error) {
        console.error("Error cargando calendario:", error);
        setHorario(null);
        setFichajes([]);
      }
    };

    loadData();
  }, [trabajadorId, empresaId]);

  // Normaliza las fechas de vacaciones eliminando las horas para permitir comparaciones exactas
  const holidaysNorm = useMemo(
    () =>
      holidays.map((d) => new Date(d.getFullYear(), d.getMonth(), d.getDate())),
    [holidays],
  );

  // Normaliza las fechas de bajas médicas eliminando las horas para permitir comparaciones exactas
  const sickDaysNorm = useMemo(
    () =>
      sickDays.map((d) => new Date(d.getFullYear(), d.getMonth(), d.getDate())),
    [sickDays],
  );

  // Cálculos matemáticos para estructurar los límites del mes actual en la cuadrícula
  const firstDay = new Date(displayYear, displayMonth, 1);
  const lastDay = new Date(displayYear, displayMonth + 1, 0); // El día 0 del mes siguiente es el último día del mes actual
  const daysInMonth = lastDay.getDate();

  /**
   * Diccionario de conversión para equiparar los índices numéricos de JavaScript con las letras del cuadrante.
   * Mapea de forma inequívoca el formato dominical (donde el Domingo es 0) a la estructura clásica.
   */
  const weekdayMap: Record<number, string> = {
    1: "L", // Lunes
    2: "M", // Martes
    3: "X", // Miércoles
    4: "J", // Jueves
    5: "V", // Viernes
    6: "S", // Sábado
    0: "D", // Domingo
  };
  /**
   * Comprueba si el trabajador tiene programado asistir según su horario asignado.
   * Convierte el día de la semana a una letra y revisa si está incluida en el cuadrante.
   */
  function isScheduledToWork(d: Date) {
    if (!horario || !horario.diasSemana) return false;
    const letter = weekdayMap[d.getDay()]; // Obtiene la letra correspondiente (L, M, X, etc.)
    return horario.diasSemana.includes(letter);
  }

  /**
   * Verifica si consta algún registro de fichaje real del empleado para un día concreto.
   */
  function hasWorked(d: Date) {
    return fichajes.some((f) => {
      const fd = new Date(f.fecha);
      return sameDay(fd, d);
    });
  }

  /**
   * Determina si el día evaluado coincide con el listado de vacaciones o festivos.
   */
  function isHoliday(d: Date) {
    return holidaysNorm.some((h) => sameDay(h, d));
  }

  /**
   * Determina si el día evaluado coincide con el listado de ausencias por baja médica.
   */
  function isSick(d: Date) {
    return sickDaysNorm.some((s) => sameDay(s, d));
  }

  // Arreglo plano que contendrá los objetos de configuración visual de cada celda del mes
  const cells: { date: Date; color: string; label: string }[] = [];

  // Rellena con celdas invisibles iniciales para alinear el primer día del mes con su día de la semana
  const prefix = firstDay.getDay();
  for (let i = 0; i < prefix; i++) {
    cells.push({ date: new Date(NaN), color: "transparent", label: "" });
  }

  // Recorre todos los días naturales del mes para calcular de qué color pintar cada celda
  for (let d = 1; d <= daysInMonth; d++) {
    const cur = new Date(displayYear, displayMonth, d);

    let color = COLORS.dontHaveToWork; // Color base por defecto: Día libre
    let label = String(d);

    if (isHoliday(cur)) {
      color = COLORS.holiday; // Prioridad 1: Festivo o vacaciones
    } else if (isSick(cur)) {
      color = COLORS.sick; // Prioridad 2: Baja médica o indisposición
    } else if (hasWorked(cur)) {
      color = COLORS.worked; // Prioridad 3: Jornada laboral fichada con éxito
    } else if (isScheduledToWork(cur)) {
      // Si tenía que trabajar pero no hay registros de marcaje:
      if (
        cur < new Date(today.getFullYear(), today.getMonth(), today.getDate())
      ) {
        color = COLORS.notWorked; // El día ya pasó y no se fichó (Ausencia o fallo)
      } else {
        color = COLORS.mustWork; // Turno programado para hoy o para los días siguientes
      }
    } else {
      color = COLORS.dontHaveToWork; // No constan obligaciones laborales
    }

    cells.push({ date: cur, color, label });
  }

  // Fragmenta el arreglo plano de celdas en bloques de 7 elementos para estructurar las filas semanales
  const rows: (typeof cells)[] = [];
  for (let i = 0; i < cells.length; i += 7) rows.push(cells.slice(i, i + 7));

  return (
    <View style={{ marginVertical: 8 }}>
      {/* Cabecera del calendario: Fila estática con las letras iniciales de los días de la semana */}
      <View style={styles.weekRow}>
        {["D", "L", "M", "X", "J", "V", "S"].map((w) => (
          <ThemedText key={w} style={styles.weekLabel}>
            {w}
          </ThemedText>
        ))}
      </View>

      {/* Construcción de la rejilla dinámica mediante el mapeo de las filas semanales */}
      {rows.map((row, ri) => (
        <View key={ri} style={styles.row}>
          {row.map((cell, ci) => {
            // Comprobación de seguridad para marcar visualmente si la celda es el día de hoy
            const isToday =
              cell.date instanceof Date &&
              !isNaN(cell.date.getTime()) &&
              sameDay(cell.date, today);

            return (
              <TouchableOpacity
                key={ci}
                onPress={
                  () =>
                    cell.date instanceof Date &&
                    !isNaN(cell.date.getTime()) &&
                    onDayPress?.(cell.date) // Ejecuta la acción personalizada solo si la fecha es válida
                }
                style={[
                  styles.cell,
                  {
                    backgroundColor: cell.color,
                    // Aplica un borde de color destacado únicamente si la celda coincide con el día de hoy
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
  // Fila de la cabecera de la semana, alinea las letras en horizontal, las separa al extremo y añade margen a los lados
  weekRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 4,
  },
  // Etiqueta del día de la semana, define un ancho fijo de 32 px, texto centrado y tamaño de letra compacto
  weekLabel: {
    width: 32,
    textAlign: "center",
    fontSize: 12,
  },
  // Fila contenedora de los días, coloca las celdas en horizontal alineadas al inicio y añade margen a los lados
  row: {
    flexDirection: "row",
    justifyContent: "flex-start",
    paddingHorizontal: 4,
  },
  // Celda individual del día, dimensiones fijas de 32 px, margen de separación, centrado absoluto y bordes suavizados
  cell: {
    width: 32,
    height: 32,
    margin: 2,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderRadius: 4,
  },
  // Texto numérico dentro de cada día, define un tamaño de letra pequeño y legible para encajar en el recuadro
  cellText: {
    fontSize: 12,
  },
});
