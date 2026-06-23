import { useEffect, useState } from "react";
import { Alert, Pressable, StyleSheet, TextInput, View } from "react-native";
import { useTrabajador } from "../../trabajadores/store/UsuarioContext";
// import { Incidencia, mockDb } from "../../../services/api/mockDb";
import {
    crearIncidencia,
    obtenerIncidencias,
} from "../../../modules/incidencias/api/services";
import { Incidencia } from "../../../modules/incidencias/types/incidencia";
import { ThemedText } from "../../../shared/components/themed-text";
import { AppScreen, Card, Row, StatCard } from "../../../shared/ui/AppSurface";

/**
 * Pantalla principal para la gestión y reporte de incidencias laborales.
 * Permite a los empleados registrar problemas comunes, como olvidos en el marcaje.
 */
export default function IncidenciasScreen() {
  // Datos compartidos del contexto para identificar al usuario y su empresa activa
  const { trabajadorActual, empresaSeleccionada } = useTrabajador();

  // Estados locales para manejar el listado de reportes y la caja de texto
  const [incidencias, setIncidencias] = useState<Incidencia[]>([]);
  const [descripcion, setDescripcion] = useState("Olvidé fichar la salida.");

  /**
   * Consulta los reportes registrados en el sistema de simulación
   * y los vuelca en el estado local para actualizar la interfaz.
   */
  // const cargar = () => mockDb.getIncidencias().then(setIncidencias);
  const cargar = () => obtenerIncidencias().then(setIncidencias);

  // Consulta el historial automáticamente al abrir la sección por primera vez
  useEffect(() => {
    cargar();
  }, []);

  /**
   * Procesa la inserción de un nuevo reporte de incidencia en el sistema.
   * Realiza validaciones previas de seguridad antes de guardar los datos.
   */
  const crear = async () => {
    // Validación obligatoria: Requiere que exista un usuario autenticado
    if (!trabajadorActual || !empresaSeleccionada) {
      Alert.alert("Faltan datos", "Inicia sesión y selecciona una empresa.");
      return;
    }

    // Inserta la información y añade de forma automática la fecha actual en formato texto
    // await mockDb.createIncidencia({
    //   idTrabajador: trabajadorActual.id,
    //   idEmpresa: empresaSeleccionada.id,
    //   tipo: "olvido_fichaje",
    //   fecha: new Date().toISOString().slice(0, 10), // Obtiene la fecha actual con formato AAAA-MM-DD
    //   descripcion,
    // });
    await crearIncidencia({
      idTrabajador: trabajadorActual.id,
      idEmpresa: empresaSeleccionada.id,
      tipo: "olvido_fichaje",
      fecha: new Date().toISOString().slice(0, 10), // Obtiene la fecha actual con formato AAAA-MM-DD
      descripcion,
    });

    // Sincroniza la lista en pantalla para reflejar la incidencia de forma inmediata
    await cargar();
  };

  return (
    // Contenedor principal que hereda el fondo con el degradado animado
    <AppScreen
      title="Incidencias"
      subtitle="Registro de correcciones y ausencias pendiente de revisión."
    >
      {/* SECCIÓN: Fila de tarjetas informativas con las métricas del sistema */}
      <Row>
        <StatCard label="Incidencias" value={String(incidencias.length)} />
        <StatCard
          label="Abiertas"
          value={String(
            incidencias.filter((item) => item.estado !== "resuelta").length,
          )}
          tone="warning" // Resalta las incidencias sin resolver en color amarillo
        />
      </Row>

      {/* SECCIÓN: Tarjeta que engloba el formulario de inserción */}
      <Card>
        <ThemedText style={styles.title}>Nueva incidencia</ThemedText>
        <View style={styles.formRow}>
          <TextInput
            value={descripcion}
            onChangeText={setDescripcion}
            style={styles.input}
          />
          <Pressable style={styles.button} onPress={crear}>
            <ThemedText style={styles.buttonText}>Crear incidencia</ThemedText>
          </Pressable>
        </View>
      </Card>

      {/* SECCIÓN: Mapeo y renderizado dinámico de la lista de incidencias guardadas */}
      {incidencias.map((incidencia) => (
        <Card key={incidencia.id}>
          <ThemedText style={styles.title}>
            {incidencia.tipo.replace("_", " ")}{" "}
            {/* Reemplaza los guiones bajos por espacios en pantalla*/}
          </ThemedText>
          <ThemedText style={styles.body}>{incidencia.descripcion}</ThemedText>
          <ThemedText style={styles.status}>
            {incidencia.fecha} · {incidencia.estado}
          </ThemedText>
        </Card>
      ))}
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  // Estilo del título, color azul oscuro, tamaño de letra 18, negrita y primera letra en mayúscula
  title: {
    color: "#0F172A",
    fontSize: 18,
    fontWeight: "800",
    textTransform: "capitalize",
  },
  // Texto descriptivo del cuerpo de la incidencia, color gris oscuro
  body: {
    color: "#475569",
  },
  // Texto indicativo del estado y fecha, color azul brillante, negrita máxima y capitalizado
  status: {
    color: "#2563EB",
    fontWeight: "800",
    textTransform: "capitalize",
  },
  // Contenedor de la fila del formulario, alinea horizontalmente, centra de forma vertical y deja un hueco de 10 px
  formRow: {
    alignItems: "center",
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  // Cuadro de texto, fondo gris muy claro, bordes redondeados, se expande y establece una anchura mínima de 240 px
  input: {
    backgroundColor: "#F8FAFC",
    borderColor: "#CBD5E1",
    borderRadius: 8,
    borderWidth: 1,
    color: "#0F172A",
    flexGrow: 1,
    minWidth: 240,
    padding: 12,
  },
  // Estilo del botón interactivo, fondo azul corporativo, bordes redondeados y relleno de 12 px
  button: {
    backgroundColor: "#2563EB",
    borderRadius: 8,
    padding: 12,
  },
  // Texto dentro de los botones de acción, color blanco, negrita y alineación centrada
  buttonText: {
    color: "#FFFFFF",
    fontWeight: "800",
    textAlign: "center",
  },
});
