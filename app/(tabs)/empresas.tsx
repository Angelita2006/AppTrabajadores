import { Link } from "expo-router";
import { useEffect, useState } from "react";
import { Pressable, StyleSheet } from "react-native";
import ParallaxScrollView from "../../components/parallax-scroll-view";
import { ThemedText } from "../../components/themed-text";
import { ThemedView } from "../../components/themed-view";
import { IconSymbol } from "../../components/ui/icon-symbol";
import { Fonts } from "../../constants/theme";
import { useTrabajador } from "../../context/TrabajadorContext";
import { Empresa } from "../../models/empresas";
import { getEmpresas } from "../../services/empresasService";
import {
  agregarEmpresaATrabajador,
  obtenerEmpresasTrabajador,
} from "../../services/trabajadoresService";
// Componente para mostrar y gestionar las empresas disponibles en la aplicación. Permite al usuario agregar nuevas empresas,
// eliminar empresas existentes y seleccionar una empresa para trabajar con ella.
// Utiliza el componente ParallaxScrollView para mostrar un encabezado con efecto parallax, y muestra una lista de empresas
// disponibles con opciones para eliminar o seleccionar cada empresa. También incluye un formulario para agregar nuevas empresas.
// Recibe las siguientes props:
// - No recibe props directamente, pero utiliza el contexto de Trabajador para obtener información sobre el trabajador actual y
// las empresas asociadas a él.
export default function VerEmpresas() {
  // Obtenemos el trabajador actual del contexto para poder mostrar las empresas asociadas a él y permitir agregar nuevas empresas.
  // Si no hay un trabajador actual, se asume un ID de 0 para evitar errores al obtener las empresas.
  // El estado empresas se inicializa con las empresas asociadas al trabajador actual, utilizando la función obtenerEmpresasTrabajador.
  // También se definen estados para el nuevo nombre y CIF de la empresa que se desea agregar, y se obtiene la función
  // setEmpresaSeleccionada del contexto para permitir seleccionar una empresa. Además, se obtiene la lista de empresas disponibles
  // utilizando la función obtenerEmpresas.
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
  // const [nuevoNombre, setNuevoNombre] = useState("");
  // const [nuevoCif, setNuevoCif] = useState("");
  const { setEmpresaSeleccionada } = useTrabajador();
  // const empresasDisponibles = obtenerEmpresas();
  const [empresasDisponibles, setEmpresasDisponibles] = useState<Empresa[]>([]);

  // Carga de empresas disponibles
  useEffect(() => {
    const cargarDatos = async () => {
      const disponibles = await getEmpresas();
      setEmpresasDisponibles(disponibles);
    };
    cargarDatos();
  }, []);

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
    <ParallaxScrollView
      headerBackgroundColor={{ light: "#D0D0D0", dark: "#353636" }}
      headerImage={
        <IconSymbol
          size={310}
          color="#808080"
          name="chevron.left.forwardslash.chevron.right"
          style={styles.headerImage}
        />
      }
    >
      <ThemedView style={styles.titleContainer}>
        <ThemedText
          type="title"
          style={{
            fontFamily: Fonts.rounded,
          }}
        >
          Empresas
        </ThemedText>
      </ThemedView>
      {
        // Sección de empresas disponibles que se pueden añadir a las empresas del trabajador.
      }
      <ThemedView style={styles.listContainer}>
        <ThemedText>Empresas disponibles</ThemedText>

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

      {/* <ThemedView style={styles.addContainer}>
        <ThemedText>Agregar nueva empresa:</ThemedText>
        <TextInput
          placeholder="Nombre de la empresa"
          value={nuevoNombre}
          onChangeText={setNuevoNombre}
          style={styles.input}
        />
        <TextInput
          placeholder="CIF"
          value={nuevoCif}
          onChangeText={setNuevoCif}
          style={styles.input}
        />
        <Pressable
          style={styles.button}
          onPress={async () => {
            if (trabajadorId === 0) {
              alert("No se ha iniciado sesión.");
              return;
            }
            try {
              agregarEmpresa(trabajadorId, nuevoNombre, nuevoCif);
              setNuevoNombre("");
              setNuevoCif("");
              alert("Empresa añadida correctamente.");
            } catch (error) {
              if (error instanceof Error)
                alert("Error al guardar " + error.message);
              else alert("Error desconocido");
            }
          }}
        >
          <ThemedText type="subtitle">Agregar Empresa</ThemedText>
        </Pressable>
      </ThemedView> */}
      {
        // Sección para mostrar las empresas asociadas al trabajador actual,
        // que se obtiene utilizando la función obtenerEmpresasTrabajador.
      }
      <ThemedView style={styles.listContainer}>
        <ThemedText>Mis empresas</ThemedText>

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

              <Pressable
                onPress={() => {
                  setEmpresaSeleccionada(empresa);
                }}
                style={styles.selectButton}
              >
                <ThemedText style={styles.buttonText}>Seleccionar</ThemedText>
              </Pressable>
            </ThemedView>
          </ThemedView>
        ))}
      </ThemedView>

      <Link href="/" asChild>
        <Pressable style={styles.button}>
          <ThemedText type="subtitle">Volver</ThemedText>
        </Pressable>
      </Link>
    </ParallaxScrollView>
  );
}

// Estilos para el componente VerEmpresas, que incluyen estilos para la imagen de encabezado, el contenedor del título,
// las tarjetas de empresa, los botones y los campos de entrada.

const styles = StyleSheet.create({
  // Estilo para la imagen de encabezado, que se posiciona de manera absoluta para crear un efecto de parallax.
  headerImage: {
    color: "#808080",
    bottom: -90,
    left: -35,
    position: "absolute",
  },
  // Estilo para el contenedor del título, que organiza el título en una fila con un espacio entre los elementos.
  titleContainer: {
    flexDirection: "row",
    gap: 8,
  },
  // Estilo para el link de navegación, que agrega un margen superior para separarlo del contenido.
  link: {
    marginTop: 16,
  },
  // Estilo para el contenedor de cada empresa, que agrega padding, un fondo claro, bordes redondeados y un margen inferior.
  empresa: {
    padding: 12,
    borderRadius: 8,
    backgroundColor: "#E0E0E0",
    marginBottom: 8,
    color: "#333",
  },
  // Estilo para el contenedor de la lista de empresas, que agrega un margen superior para separarlo del título.
  listContainer: {
    marginTop: 16,
  },
  // Estilo para la tarjeta de cada empresa, que agrega padding, un fondo claro, bordes redondeados, un margen inferior y un borde.
  empresaCard: {
    padding: 15,
    borderRadius: 10,
    backgroundColor: "#FFF3E0",
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#FFCC80",
  },
  // Estilo para el texto de cada empresa, que define el tamaño de fuente, el margen inferior y el color.
  empresaText: {
    fontSize: 16,
    marginBottom: 10,
    color: "#333",
  },
  // Estilo para el contenedor de los botones de cada empresa, que organiza los botones en una fila con espacio entre ellos.
  buttonContainer: {
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
    // color: "#333",
  },
});
