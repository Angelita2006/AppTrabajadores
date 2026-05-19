import { Link } from "expo-router";
import { useEffect, useState } from "react";
import { Animated, Pressable, StyleSheet } from "react-native";
import { ThemedText } from "../../components/themed-text";
import { ThemedView } from "../../components/themed-view";
import { IconSymbol } from "../../components/ui/icon-symbol";
import { useTrabajador } from "../../context/TrabajadorContext";
import { Empresa } from "../../src/models/empresas";
import {
  agregarEmpresaATrabajador,
  obtenerEmpresas,
} from "../../src/services/empresasService";
import { obtenerEmpresasTrabajador } from "../../src/services/trabajadoresService";

// Componente para mostrar y gestionar las empresas disponibles en la aplicación. Permite al usuario seleccionar una empresa para trabajar con ella.
export default function VerEmpresas() {
  // Obtenemos el trabajador actual del contexto para poder mostrar las empresas asociadas a él y permitir agregar nuevas empresas.
  // Si no hay un trabajador actual, se asume un ID de 0 para evitar errores al obtener las empresas.
  // El estado empresas se inicializa con las empresas asociadas al trabajador actual, utilizando la función obtenerEmpresasTrabajador.
  const trabajador = useTrabajador().trabajadorActual;
  const trabajadorId = trabajador?.id || 0;
  const [empresas, setEmpresas] = useState<Empresa[]>([]);

  useEffect(() => {
    const cargarMisEmpresas = async () => {
      const data = await obtenerEmpresasTrabajador(trabajador?.id || 0);
      setEmpresas(data);
    };
    cargarMisEmpresas();
  }, [trabajador?.id]);

  const { empresaSeleccionada, setEmpresaSeleccionada } = useTrabajador();

  const handleSeleccionarEmpresa = (empresa: Empresa) => {
    setEmpresaSeleccionada(empresa);
  };

  const [empresasDisponibles, setEmpresasDisponibles] = useState<Empresa[]>([]);

  // Carga de empresas disponibles
  useEffect(() => {
    const cargarDatos = async () => {
      const disponibles = await obtenerEmpresas();
      setEmpresasDisponibles(disponibles);
    };
    cargarDatos();
  }, []);

  useEffect(() => {
    const cargarEmpresasTrabajador = async () => {
      if (trabajadorId === 0) {
        setEmpresas([]);
        return;
      }
      try {
        const empresasUsuario = await obtenerEmpresasTrabajador(trabajadorId);
        setEmpresas(empresasUsuario);
      } catch (error) {
        console.error("Error cargando empresas del trabajador:", error);
      }
    };

    cargarEmpresasTrabajador();
  }, [trabajadorId]);

  const handleSeleccionarDisponible = async (empresa: Empresa) => {
    if (trabajadorId === 0) return alert("Inicia sesión primero");

    try {
      await agregarEmpresaATrabajador(trabajadorId, empresa.id);

      // Actualizamos el estado local agregando la nueva empresa al array
      setEmpresas((prev) => [...prev, empresa]);

      alert(`Empresa ${empresa.nombre} añadida.`);
    } catch (error) {
      if (error instanceof Error)
        alert("No se pudo añadir la empresa: " + error.message);
      else alert("Error desconocido");
    }
  };

  return (
    // El componente principal se envuelve en un ParallaxScrollView que muestra un encabezado con un icono y un fondo de color que cambia
    // según el tema (claro u oscuro).
    <>
      <Animated.ScrollView style={{ flex: 1 }}>
        <ThemedView style={styles.listContainer}>
          <ThemedText style={styles.titleContainer}>
            Empresas disponibles
          </ThemedText>

          {empresasDisponibles.map((empresa) => (
            <ThemedView key={empresa.id} style={styles.empresaCard}>
              <ThemedText type="default" style={styles.empresaText}>
                {empresa.nombre} - {empresa.cif}
              </ThemedText>

              <Pressable
                onPress={() => handleSeleccionarDisponible(empresa)}
                style={styles.addbutton}
              >
                <IconSymbol name="chevron.right" size={24} color="#007AFF" />
              </Pressable>
            </ThemedView>
          ))}
        </ThemedView>

        <ThemedView style={styles.listContainer}>
          <ThemedText style={styles.titleContainer}>Mis empresas</ThemedText>

          {empresas.map((empresa) => (
            <ThemedView key={empresa.id} style={styles.empresaCard}>
              <ThemedText type="default" style={styles.empresaText}>
                {empresa.nombre} - {empresa.cif}
              </ThemedText>

              <ThemedView style={styles.buttonContainer}>
                <Pressable
                  onPress={() => {
                    setEmpresas(empresas.filter((e) => e.id !== empresa.id));
                  }}
                  style={styles.deleteButton}
                >
                  <ThemedText style={styles.buttonText}>Eliminar</ThemedText>
                </Pressable>
                {(empresa.id !== empresaSeleccionada?.id && (
                  <Pressable
                    onPress={() => {
                      handleSeleccionarEmpresa(empresa);
                    }}
                    style={styles.selectButton}
                  >
                    <ThemedText style={styles.buttonText}>
                      Seleccionar
                    </ThemedText>
                  </Pressable>
                )) || (
                  <ThemedView
                    style={[
                      styles.selectButton,
                      { backgroundColor: "#34C759" },
                    ]}
                  >
                    <ThemedText style={styles.buttonText}>
                      Seleccionada
                    </ThemedText>
                  </ThemedView>
                )}
              </ThemedView>
            </ThemedView>
          ))}
        </ThemedView>

        <Link href="../" asChild>
          <Pressable style={styles.button}>
            <ThemedText type="subtitle">Volver</ThemedText>
          </Pressable>
        </Link>
      </Animated.ScrollView>
    </>
  );
}

// Estilos
const styles = StyleSheet.create({
  // Estilo para el contenedor del título, que organiza el título en una fila con un espacio entre los elementos.
  titleContainer: {
    color: "#000000",
    fontSize: 24,
    fontWeight: "bold",
    flexDirection: "row",
    gap: 8,
    padding: 16,
  },
  // Estilo para el link de navegación, que agrega un margen superior para separarlo del contenido.
  link: {
    marginTop: 16,
  },
  // Estilo para el contenedor de la lista de empresas, que agrega un margen superior para separarlo del título.
  listContainer: {
    backgroundColor: "#e0e0e000",
    marginTop: 16,
  },
  // Estilo para la tarjeta de cada empresa, que agrega padding, un fondo claro, bordes redondeados, un margen inferior y un borde.
  empresaCard: {
    padding: 15,
    borderRadius: 10,
    backgroundColor: "#aeadac",
    marginBottom: 10,
    justifyContent: "space-between",
    flexDirection: "row",
    alignItems: "center",
  },
  // Estilo para el texto de cada empresa, que define el tamaño de fuente, el margen inferior y el color.
  empresaText: {
    fontSize: 16,
    marginBottom: 10,
    color: "#333",
  },
  // Estilo para el contenedor de los botones de cada empresa, que organiza los botones en una fila con espacio entre ellos.
  buttonContainer: {
    backgroundColor: "#e0e0e000",
    flexDirection: "row",
    justifyContent: "flex-start",
    gap: 10,
  },
  // Estilo para el botón de eliminar empresa, que define un fondo rojo, padding, bordes redondeados y alineación centrada.
  deleteButton: {
    backgroundColor: "#FF3B30",
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 5,
    alignItems: "center",
  },
  // Estilo para el botón de seleccionar empresa, que define un fondo azul, padding, bordes redondeados y alineación centrada.
  selectButton: {
    backgroundColor: "#007AFF",
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 5,
    alignItems: "center",
  },
  // Estilo para el texto de los botones, que define el color blanco y un tamaño de fuente.
  buttonText: {
    color: "white",
    fontSize: 14,
  },
  // Estilo para el botón de agregar empresa, que define un fondo azul, padding, bordes redondeados, alineación centrada y un margen superior.
  button: {
    backgroundColor: "#007AFF",
    padding: 10,
    borderRadius: 5,
    alignItems: "center",
    marginTop: 16,
  },
  addbutton: {
    padding: 10,
  },
  // Estilo para el contenedor de agregar empresa, que agrega un margen superior y un espacio entre los elementos.
  addContainer: {
    marginTop: 16,
    gap: 8,
  },
  // Estilo para los campos de entrada, que agrega padding, bordes, bordes redondeados y un fondo blanco.
  input: {
    padding: 8,
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 4,
    backgroundColor: "#fff",
  },
});
