import { useEffect, useState } from "react";
import { Alert, Pressable, StyleSheet, TextInput, View } from "react-native";
import { useTrabajador } from "../../../modules/trabajadores/store/TrabajadorContext";
import { ThemedText } from "../../../shared/components/themed-text";
import { AppScreen, Card, Row, StatCard } from "../../../shared/ui/AppSurface";
// import { mockDb, Vacacion } from "../../../services/api/mockDb";
import { crearVacacion, obtenerVacaciones } from "../api/services";
import { Vacacion } from "../types/vacacion";

/**
 * Pantalla principal para la gestión y solicitud de vacaciones de los empleados.
 * Permite visualizar métricas rápidas, rellenar formularios y listar solicitudes.
 */
export default function VacacionesScreen() {
  // Datos globales del usuario e instrucciones de la empresa seleccionada
  const { trabajadorActual, empresaSeleccionada } = useTrabajador();

  // Estados locales de la pantalla
  const [vacaciones, setVacaciones] = useState<Vacacion[]>([]); // Historial de solicitudes en pantalla
  const [fechaInicio, setFechaInicio] = useState("2026-07-15"); // Fecha base de inicio de vacaciones
  const [fechaFin, setFechaFin] = useState("2026-07-19"); // Fecha base de fin de vacaciones
  const [motivo, setMotivo] = useState("Solicitud de vacaciones"); // Nota descriptiva del periodo

  /**
   * Consulta el listado actualizado en la base de datos simulada
   * y refresca la información visible en la pantalla.
   */
  // const cargar = () => mockDb.getVacaciones().then(setVacaciones);
  const cargar = () => obtenerVacaciones().then(setVacaciones);

  // Carga las solicitudes existentes de forma automática la primera vez que se abre la pantalla
  useEffect(() => {
    cargar();
  }, []);

  /**
   * Procesa y valida el envío del formulario para crear un nuevo periodo vacacional.
   */
  const solicitar = async () => {
    // Validación de seguridad: Verifica que existan sesiones activas en la app
    if (!trabajadorActual || !empresaSeleccionada) {
      Alert.alert("Faltan datos", "Inicia sesión y selecciona una empresa.");
      return;
    }

    // Almacena el registro asociándolo con el trabajador y la empresa correspondiente
    // await mockDb.createVacacion({
    //   idTrabajador: trabajadorActual.id,
    //   idEmpresa: empresaSeleccionada.id,
    //   fechaInicio,
    //   fechaFin,
    //   motivo,
    // });
    await crearVacacion({
      idTrabajador: trabajadorActual.id,
      idEmpresa: empresaSeleccionada.id,
      fechaInicio,
      fechaFin,
      motivo,
    });

    // Actualiza la lista para mostrar de inmediato la nueva solicitud en la interfaz
    await cargar();
  };

  return (
    // Componente base personalizado con el fondo animado integrado detrás
    <AppScreen
      title="Vacaciones"
      subtitle="Solicitudes en memoria con estados de aprobación."
    >
      {/* Bloque superior: Indicadores rápidos y estadísticas de los días */}
      <Row>
        <StatCard label="Solicitudes" value={String(vacaciones.length)} />
        <StatCard
          label="Pendientes"
          value={String(
            vacaciones.filter((item) => item.estado === "pendiente").length,
          )}
          tone="warning" // Cambia la tarjeta a color amarillo (advertencia)
        />
      </Row>

      {/* Bloque central: Formulario interactivo de registro */}
      <Card>
        <ThemedText style={styles.title}>Nueva solicitud</ThemedText>
        <View style={styles.formRow}>
          <TextInput
            value={fechaInicio}
            onChangeText={setFechaInicio}
            style={styles.input}
          />
          <TextInput
            value={fechaFin}
            onChangeText={setFechaFin}
            style={styles.input}
          />
          <TextInput
            value={motivo}
            onChangeText={setMotivo}
            style={styles.inputWide}
          />
        </View>
        <Pressable style={styles.button} onPress={solicitar}>
          <ThemedText style={styles.buttonText}>Enviar solicitud</ThemedText>
        </Pressable>
      </Card>

      {/* Bloque inferior: Mapeo y renderizado dinámico de la lista de vacaciones */}
      {vacaciones.map((vacacion) => (
        <Card key={vacacion.id}>
          <ThemedText style={styles.title}>
            {vacacion.fechaInicio} - {vacacion.fechaFin}
          </ThemedText>
          <ThemedText style={styles.body}>{vacacion.motivo}</ThemedText>
          <ThemedText style={styles.status}>
            Estado: {vacacion.estado}
          </ThemedText>
        </Card>
      ))}
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  // estilo del título, color azul oscuro, tamaño 18 y negrita
  title: { color: "#0F172A", fontSize: 18, fontWeight: "800" },
  // color del texto del motivo azul grisáceo
  body: { color: "#475569" },
  // color del texto del estado azul, negrita y formateado
  status: { color: "#2563EB", fontWeight: "800", textTransform: "capitalize" },
  // estilo de la fila del formulario, donde si no caben los elementos horizontalmente hacen salto de línea y con hueco de 10 px entre elementos
  formRow: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  // estilo de los inputs
  input: {
    backgroundColor: "#F8FAFC",
    borderColor: "#CBD5E1",
    borderRadius: 8,
    borderWidth: 1,
    color: "#0F172A",
    minWidth: 150,
    padding: 12,
  },
  // estilo de input más grande
  inputWide: {
    backgroundColor: "#F8FAFC",
    borderColor: "#CBD5E1",
    borderRadius: 8,
    borderWidth: 1,
    color: "#0F172A",
    flexGrow: 1,
    minWidth: 220,
    padding: 12,
  },
  // estilo del botón azul con bordes redondeados y margen en bordes de 12 px
  button: { backgroundColor: "#2563EB", borderRadius: 8, padding: 12 },
  // texto del botón blanco, negrita y centrado
  buttonText: { color: "#FFFFFF", fontWeight: "800", textAlign: "center" },
});
