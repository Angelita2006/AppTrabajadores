import { useCallback, useEffect, useMemo, useState } from "react";
import { Alert, Pressable, StyleSheet, View } from "react-native";
import { EmpresaSelector } from "../../../modules/empresas/components/EmpresaSelector";
// import {
//   crearFichaje,
//   obtenerFichajesEmpresaTrabajador,
// } from "../../../modules/fichajes/api/fichajesService";
import {
    crearFichaje,
    obtenerFichajesEmpresaTrabajador,
} from "../../../modules/fichajes/api/services";
import { Fichaje } from "../../../modules/fichajes/types/fichaje";
// import { obtenerHorarioTrabajadorEmpresa } from "../../../modules/horarios/api/horariosService";
import { obtenerHorarioTrabajadorEmpresa } from "../../../modules/horarios/api/services";
import { Horario } from "../../../modules/horarios/types/horario";
import { ThemedText } from "../../../shared/components/themed-text";
import { AppScreen, Card, Row, StatCard } from "../../../shared/ui/AppSurface";
import { useTrabajador } from "../../trabajadores/store/UsuarioContext";
/**
 * Convierte un objeto de fecha o marca de tiempo numérica en formato de texto de horas y minutos.
 * Devuelve un indicador de guiones si el valor recibido no existe.
 */
const formatTime = (date?: Date | number) =>
  date
    ? new Date(date).toLocaleTimeString("es-ES", {
        hour: "2-digit",
        minute: "2-digit",
      })
    : "--:--";

/**
 * Deduce la situación laboral actual en formato de texto analizando la clave del último marcaje realizado.
 */
const estadoFromUltimo = (fichaje?: Fichaje) => {
  if (!fichaje || fichaje.tipo === "salida") return "Fuera de jornada";
  if (fichaje.tipo === "descanso") return "En descanso";
  return "Trabajando";
};

/**
 * Pantalla principal del cuadro de mandos que unifica el control horario diario del empleado.
 * Muestra indicadores de estado, registro de acciones y resumen de actividad del día en curso.
 */
export default function HomeScreen() {
  // Datos compartidos extraídos de la sesión global del contexto de la aplicación
  const { trabajadorActual, empresaSeleccionada } = useTrabajador();

  // Estados locales para rastrear los marcajes y la información de turnos asignados
  const [fichajes, setFichajes] = useState<Fichaje[]>([]);
  const [horario, setHorario] = useState<Horario | null>(null);

  /**
   * Consulta de forma asíncrona y en paralelo los marcajes y turnos vigentes del usuario.
   * Utiliza useCallback para memorizar la referencia y evitar ciclos infinitos en los renders.
   */
  const cargarDatos = useCallback(async () => {
    if (!trabajadorActual?.id || !empresaSeleccionada?.id) return;
    const [fichajesData, horarioData] = await Promise.all([
      obtenerFichajesEmpresaTrabajador(
        trabajadorActual.id,
        empresaSeleccionada.id,
      ),
      obtenerHorarioTrabajadorEmpresa(
        trabajadorActual.id,
        empresaSeleccionada.id,
      ),
    ]);
    setFichajes(fichajesData);
    setHorario(horarioData);
  }, [trabajadorActual?.id, empresaSeleccionada?.id]);

  // Actualiza la información cada vez que cambia el usuario o la empresa seleccionada
  useEffect(() => {
    cargarDatos();
  }, [cargarDatos]);

  // Extrae de forma posicional el marcaje más reciente de la lista ordenada
  const ultimoFichaje = fichajes.at(-1);
  const estado = estadoFromUltimo(ultimoFichaje);

  // Calcula el cómputo de horas transcurridas en el día mediante lógica de marcas de tiempo numéricas
  const horasHoy = useMemo(() => {
    const entrada = fichajes.find((fichaje) => fichaje.tipo === "entrada");
    const salida = [...fichajes]
      .reverse()
      .find((fichaje) => fichaje.tipo === "salida");

    if (!entrada) return "0 h";

    // Si no se ha marcado la salida todavía, utiliza la hora actual del sistema como referencia activa
    const fin = salida?.fecha ?? Date.now();
    // Realiza la conversión matemática: milisegundos divididos entre 3,600,000 para obtener las horas reales
    const hours = Math.max(0, (fin - entrada.fecha) / 36e5);
    return `${hours.toFixed(1)} h`;
  }, [fichajes]);

  /**
   * Inserta un nuevo marcaje en el sistema de almacenamiento.
   * Realiza validaciones obligatorias antes de proceder e inicia una recarga automática de datos.
   */
  const registrar = async (tipo: Fichaje["tipo"]) => {
    if (!trabajadorActual?.id || !empresaSeleccionada?.id) {
      Alert.alert("Faltan datos", "Selecciona trabajador y empresa.");
      return;
    }
    await crearFichaje(trabajadorActual.id, empresaSeleccionada.id, tipo);
    await cargarDatos();
  };

  return (
    // Componente base de pantalla que integra el fondo con el degradado animado por detrás
    <AppScreen
      title="Panel de fichaje"
      subtitle="Control diario de jornada con datos en memoria para demo."
    >
      {/* Componente selector de empresas vinculadas al perfil */}
      <EmpresaSelector />

      {/* SECCIÓN: Fila de indicadores rápidos con el estado actualizado y horas totales */}
      <Row>
        <StatCard
          label="Estado actual"
          value={estado}
          tone={estado === "Trabajando" ? "success" : "neutral"} // Verde si trabaja, gris si está fuera
        />
        <StatCard label="Horas hoy" value={horasHoy} />
        <StatCard
          label="Ultimo fichaje"
          value={formatTime(ultimoFichaje?.fecha)}
        />
      </Row>

      {/* SECCIÓN: Botonera con las acciones de control de jornada */}
      <Card>
        <ThemedText style={styles.sectionTitle}>Acciones rápidas</ThemedText>
        <View style={styles.actions}>
          <ActionButton
            label="Entrada"
            tone="success"
            onPress={() => registrar("entrada")}
          />
          <ActionButton
            label="Descanso"
            tone="warning"
            onPress={() => registrar("descanso")}
          />
          <ActionButton
            label="Fin descanso"
            tone="neutral"
            onPress={() => registrar("fin_descanso")}
          />
          <ActionButton
            label="Salida"
            tone="danger"
            onPress={() => registrar("salida")}
          />
        </View>
      </Card>

      {/* SECCIÓN: Ficha descriptiva con los horarios teóricos del contrato */}
      <Card>
        <ThemedText style={styles.sectionTitle}>Horario asignado</ThemedText>
        <ThemedText style={styles.body}>
          {horario
            ? `${horario.tipoJornada} · ${horario.diasSemana} · ${formatTime(horario.hora_entrada1)} - ${formatTime(horario.hora_salida1)}`
            : "No hay horario asignado para esta empresa."}
        </ThemedText>
      </Card>

      {/* SECCIÓN: Historial cronológico con todos los marcajes del día */}
      <Card>
        <ThemedText style={styles.sectionTitle}>Actividad de hoy</ThemedText>
        {fichajes.length === 0 ? (
          <ThemedText style={styles.body}>
            Todavía no hay fichajes registrados.
          </ThemedText>
        ) : (
          fichajes.map((fichaje) => (
            <View key={fichaje.id} style={styles.listRow}>
              <ThemedText style={styles.listTitle}>
                {fichaje.tipo.replace("_", " ")}{" "}
                {/* Reemplaza guiones bajos por espacios legibles */}
              </ThemedText>
              <ThemedText style={styles.listMeta}>
                {formatTime(fichaje.fecha)}
              </ThemedText>
            </View>
          ))
        )}
      </Card>
    </AppScreen>
  );
}

/**
 * Componente secundario reutilizable para los botones de acción rápida.
 * Recibe un tono visual que mapea de forma dinámica los estilos de color correspondientes.
 */
function ActionButton({
  label,
  tone,
  onPress,
}: {
  label: string;
  tone: "success" | "warning" | "danger" | "neutral";
  onPress: () => void;
}) {
  return (
    // Combina el estilo base del botón con el color de fondo específico del tono recibido
    <Pressable style={[styles.button, styles[tone]]} onPress={onPress}>
      <ThemedText style={styles.buttonText}>{label}</ThemedText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  // Contenedor de las acciones, coloca los botones en fila horizontal, salta de línea si no caben y deja un hueco de 10 px
  actions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  // Título de la sección de la tarjeta, color azul oscuro casi negro, tamaño 18 y negrita máxima
  sectionTitle: {
    color: "#111827",
    fontSize: 18,
    fontWeight: "800",
  },
  // Texto descriptivo general, color azul grisáceo y una separación entre líneas de 22 px para mejorar la lectura
  body: {
    color: "#475569",
    lineHeight: 22,
  },
  // Molde base para los botones de fichaje, esquinas redondeadas, un ancho mínimo de 132 px y relleno interno holgado
  button: {
    borderRadius: 8,
    minWidth: 132,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  // Variación del botón para la acción de entrada, fondo verde corporativo
  success: {
    backgroundColor: "#16A34A",
  },
  // Variación del botón para la acción de descanso, fondo amarillo ocre de advertencia
  warning: {
    backgroundColor: "#D97706",
  },
  // Variación del botón para la acción de salida, fondo rojo de peligro o apagado
  danger: {
    backgroundColor: "#DC2626",
  },
  // Variación del botón para la acción de fin de descanso, fondo azul clásico informativo
  neutral: {
    backgroundColor: "#2563EB",
  },
  // Texto dentro de los botones de fichaje, color blanco puro, negrita máxima y centrado perfecto
  buttonText: {
    color: "#FFFFFF",
    fontWeight: "800",
    textAlign: "center",
  },
  // Fila del listado de fichajes, alinea horizontalmente, los separa a los extremos con un borde superior gris claro
  listRow: {
    alignItems: "center",
    borderTopColor: "#E2E8F0",
    borderTopWidth: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 10,
  },
  // Título del tipo de fichaje en el historial, color azul oscuro, negrita y primera letra en mayúscula
  listTitle: {
    color: "#0F172A",
    fontWeight: "700",
    textTransform: "capitalize",
  },
  // Texto con la hora del fichaje en el historial, color gris claro
  listMeta: {
    color: "#64748B",
  },
});
