import { useEffect, useState } from "react";
import { StyleSheet, View } from "react-native";
// import { obtenerHorarios } from "../../../modules/horarios/api/horariosService";
import { obtenerHorarios } from "../../../modules/horarios/api/services";
import { Horario } from "../../../modules/horarios/types/horario";
// import { obtenerTrabajadores } from "../../../modules/trabajadores/api/trabajadoresService";
import { obtenerTrabajadores } from "../../../modules/trabajadores/api/services";
import { Trabajador } from "../../../modules/trabajadores/types/trabajador";
import { ThemedText } from "../../../shared/components/themed-text";
import { AppScreen, Card, Row, StatCard } from "../../../shared/ui/AppSurface";

/**
 * Convierte un objeto de fecha en una cadena de texto formateada en horas y minutos.
 * Utiliza la configuración regional de España para garantizar el formato de dos dígitos (ej: "08:30").
 *
 * @param date - Objeto de fecha de JavaScript que se desea transformar.
 * @returns Cadena de texto con la hora y minutos formateados.
 */
const time = (date: Date) =>
  new Date(date).toLocaleTimeString("es-ES", {
    hour: "2-digit",
    minute: "2-digit",
  });

/**
 * Pantalla principal encargada de renderizar los cuadrantes y turnos de los empleados.
 * Realiza una carga múltiple combinando los turnos y el directorio para enlazar los datos.
 */
export default function HorariosScreen() {
  // Estados locales para almacenar la información de los cuadrantes y la plantilla
  const [horarios, setHorarios] = useState<Horario[]>([]);
  const [trabajadores, setTrabajadores] = useState<Trabajador[]>([]);

  // Consulta de datos en paralelo al inicializar el componente para evitar retrasos en cascada
  useEffect(() => {
    Promise.all([obtenerHorarios(), obtenerTrabajadores()]).then(
      ([horariosData, trabajadoresData]) => {
        setHorarios(horariosData);
        setTrabajadores(trabajadoresData);
      },
    );
  }, []);

  /**
   * Resuelve el nombre completo de un empleado cruzando su ID único con la lista cargada.
   * Devuelve un texto genérico de respaldo si el trabajador no existe en el sistema.
   *
   * @param id - Identificador único del trabajador a buscar.
   * @returns Cadena de texto con el nombre y apellidos, o el ID de respaldo.
   */
  const trabajadorNombre = (id: number) => {
    const trabajador = trabajadores.find((item) => item.id === id);
    return trabajador
      ? `${trabajador.nombre} ${trabajador.apellidos}`
      : `Trabajador ${id}`;
  };

  return (
    // Contenedor general que hereda el fondo con el degradado animado
    <AppScreen
      title="Horarios"
      subtitle="Planificación semanal por trabajador y empresa."
    >
      {/* SECCIÓN: Fila superior con métricas fijas de planificación */}
      <Row>
        <StatCard label="Horarios" value={String(horarios.length)} />
        <StatCard label="Media días" value="5" />
      </Row>

      {/* SECCIÓN: Recorrido dinámico y renderizado de tarjetas de horarios */}
      {horarios.map((horario) => (
        <Card key={horario.id}>
          {/* Bloque superior de la tarjeta: Nombre y primer tramo de jornada */}
          <View style={styles.header}>
            <View>
              <ThemedText style={styles.title}>
                {trabajadorNombre(horario.idTrabajador)}
              </ThemedText>
              <ThemedText style={styles.meta}>
                {horario.tipoJornada} · {horario.diasSemana}
              </ThemedText>
            </View>
            <View style={styles.hours}>
              <ThemedText style={styles.hoursText}>
                {time(horario.hora_entrada1)} - {time(horario.hora_salida1)}
              </ThemedText>
            </View>
          </View>

          {/* Bloque opcional condicional: Solo se dibuja si el empleado tiene jornada partida */}
          {horario.hora_entrada2 && horario.hora_salida2 ? (
            <ThemedText style={styles.body}>
              Segundo tramo: {time(horario.hora_entrada2)} -{" "}
              {time(horario.hora_salida2)}
            </ThemedText>
          ) : null}
        </Card>
      ))}
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  // Encabezado de la tarjeta de turnos, alinea en horizontal, los separa a los extremos y mete salto de línea si no caben
  header: {
    alignItems: "center",
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    justifyContent: "space-between",
  },
  // Nombre del empleado titular del horario, color azul oscuro, tamaño 17 y grosor de letra marcado
  title: {
    color: "#0F172A",
    fontSize: 17,
    fontWeight: "800",
  },
  // Información secundaria del tipo de contrato o días laborales, color gris intermedio
  meta: {
    color: "#64748B",
  },
  // Recuadro indicador de las horas principales, fondo verde claro y esquinas redondeadas
  hours: {
    backgroundColor: "#F0FDF4",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  // Texto con las horas exactas de entrada y salida, color verde oscuro y peso de fuente máximo
  hoursText: {
    color: "#166534",
    fontWeight: "900",
  },
  // Texto informativo para tramos adicionales de jornada, color azul grisáceo suave
  body: {
    color: "#475569",
  },
});
