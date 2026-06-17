import React, { useState } from "react";
import {
  Alert,
  Platform,
  Pressable,
  StyleSheet,
  TextInput,
  View,
} from "react-native";
// import {
//   getTrabajadorByEmailYPassword,
//   obtenerEmpresasTrabajador,
// } from "../../../modules/trabajadores/api/trabajadoresService";
import {
  getTrabajadorByEmailYPassword,
  obtenerEmpresasTrabajador,
} from "../../../modules/trabajadores/api/services";
import { useTrabajador } from "../../../modules/trabajadores/store/TrabajadorContext";
import { ThemedText } from "../../../shared/components/themed-text";
import { AppScreen, Card, Row, StatCard } from "../../../shared/ui/AppSurface";
import { IconSymbol } from "../../../shared/ui/icon-symbol";

/**
 * Pantalla de gestión de perfil y control de sesión simulada.
 * Permite a los usuarios iniciar sesión con credenciales de prueba,
 * cerrar la sesión activa y visualizar los datos laborales del empleado.
 */
export default function PerfilScreen() {
  // Datos y funciones globales compartidos a través del contexto del trabajador
  const {
    trabajadorActual,
    setTrabajadorActual,
    setEmpresas,
    setEmpresaSeleccionada,
    empresaSeleccionada,
  } = useTrabajador();

  // Estados locales para controlar el formulario de acceso
  const [email, setEmail] = useState(
    trabajadorActual?.email ?? "angelita@example.com", // Email inicial por defecto
  );
  const [password, setPassword] = useState("password123"); // Contraseña inicial por defecto
  const [isObscured, setIsObscured] = useState(true); // Controla si se oculta la contraseña

  /**
   * Procesa la solicitud de acceso a la aplicación.
   * Consulta las credenciales en la base de datos simulada y guarda la sesión global.
   */
  const login = async () => {
    try {
      // 1. Busca el trabajador que coincida con las credenciales introducidas
      const trabajador = await getTrabajadorByEmailYPassword(email, password);
      // 2. Obtiene las empresas vinculadas a ese trabajador
      const empresas = await obtenerEmpresasTrabajador(trabajador.id);

      // 3. Guarda la información en el estado global del contexto
      setTrabajadorActual(trabajador);
      setEmpresas(empresas);
      setEmpresaSeleccionada(empresas[0] ?? null); // Selecciona la primera empresa por defecto
    } catch {
      // Muestra un cuadro de ayuda si el correo o contraseña son incorrectos
      Alert.alert(
        "Login demo",
        "Usa admin@example.com / admin123 o angelita@example.com / password123",
      );
    }
  };

  /**
   * Limpia por completo el estado global para cerrar la sesión del usuario.
   */
  const logout = () => {
    setTrabajadorActual(null);
    setEmpresas([]);
    setEmpresaSeleccionada(null);
  };

  return (
    // Componente base personalizado con el fondo animado integrado detrás
    <AppScreen
      title="Perfil y acceso"
      subtitle="Sesión demo en memoria. No se guarda nada en servidor."
    >
      {/* SECCIÓN: Indicadores rápidos del estado de la sesión */}
      <Row>
        <StatCard
          label="Usuario"
          value={trabajadorActual?.nombre ?? "Sin sesión"}
          tone={trabajadorActual ? "success" : "warning"} // Verde si hay sesión, amarillo si no
        />
        <StatCard label="Rol" value={trabajadorActual?.role ?? "-"} />
        <StatCard
          label="Empresa activa"
          value={empresaSeleccionada?.nombre ?? "-"}
        />
      </Row>

      {/* SECCIÓN: Formulario de acceso con diseño integrado */}
      <Card>
        <ThemedText style={styles.title}>Acceso rápido</ThemedText>
        <View style={styles.formRow}>
          {/* Campo: Correo Electrónico */}
          <View style={styles.field}>
            <ThemedText style={styles.label}>Email</ThemedText>
            <TextInput
              value={email}
              onChangeText={setEmail}
              style={styles.input}
              autoCapitalize="none" // Evita que el celular ponga mayúscula en la primera letra
            />
          </View>

          {Platform.OS === "web" && (
            <style>{`
    input::-ms-reveal, 
    input::-ms-clear { 
      display: none !important; 
    }
  `}</style>
          )}

          {/* Campo: Contraseña con botón de visibilidad integrado */}
          <View style={styles.field}>
            <ThemedText style={styles.label}>Contraseña</ThemedText>
            <View style={styles.inputWrapper}>
              <TextInput
                value={password}
                onChangeText={setPassword}
                secureTextEntry={isObscured}
                style={styles.inputContainer}
                placeholder="Tu contraseña"
                placeholderTextColor="#94a3b8"
              />
              <Pressable
                onPress={() => setIsObscured(!isObscured)}
                style={styles.eyeButton}
              >
                {/* Icono responsivo conectado a las claves del MAPPING */}
                <IconSymbol
                  name={isObscured ? "visibility-off" : "visibility"}
                  size={22}
                  color="#64748B"
                />
              </Pressable>
            </View>
          </View>
        </View>

        {/* Botones de acción del formulario */}
        <View style={styles.actions}>
          <Pressable style={styles.primaryButton} onPress={login}>
            <ThemedText style={styles.buttonText}>Entrar</ThemedText>
          </Pressable>
          <Pressable style={styles.secondaryButton} onPress={logout}>
            <ThemedText style={styles.secondaryButtonText}>
              Cerrar sesión
            </ThemedText>
          </Pressable>
        </View>

        <ThemedText style={styles.help}>
          Credenciales demo: admin@example.com / admin123 · angelita@example.com
          / password123
        </ThemedText>
      </Card>

      {/* SECCIÓN: Muestra la ficha del trabajador solo si ha iniciado sesión*/}
      {trabajadorActual ? (
        <Card>
          <ThemedText style={styles.title}>Datos del trabajador</ThemedText>
          <View style={styles.detailGrid}>
            <Detail
              label="Nombre"
              value={`${trabajadorActual.nombre} ${trabajadorActual.apellidos}`}
            />
            <Detail label="DNI" value={trabajadorActual.dni} />
            <Detail label="Puesto" value={trabajadorActual.puesto} />
            <Detail
              label="Localidad"
              value={`${trabajadorActual.poblacion}, ${trabajadorActual.provincia}`}
            />
            <Detail
              label="Cuenta cotización"
              value={trabajadorActual.cuenta_cotizacion}
            />
            <Detail label="Email" value={trabajadorActual.email} />
          </View>
        </Card>
      ) : null}
    </AppScreen>
  );
}

/**
 * Componente secundario para mostrar un par de datos etiquetados.
 * Se utiliza de forma repetida para estructurar la información del trabajador.
 *
 * @param props - Propiedades del componente.
 * @param props.label - El título o descripción del dato (ej: "Nombre").
 * @param props.value - El valor o información correspondiente (ej: "Juan Pérez").
 */
function Detail({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.detail}>
      {/* Etiqueta descriptiva del dato */}
      <ThemedText style={styles.detailLabel}>{label}</ThemedText>

      {/* Valor real de la información */}
      <ThemedText style={styles.detailValue}>{value}</ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  // estilo del título, color azul oscuro, tamaño 18 y negrita
  title: {
    color: "#0F172A",
    fontSize: 18,
    fontWeight: "800",
  },
  // contenedor de la fila del formulario, coloca elementos en horizontal, salta de línea si no caben y deja un hueco de 12 px
  formRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  // contenedor de cada campo, permite que crezca para ocupar espacio y define un ancho mínimo de 220 px
  field: {
    flexGrow: 1,
    minWidth: 220,
  },
  // estilo de la etiqueta del campo, color azul grisáceo, negrita y con separación inferior de 6 px
  label: {
    color: "#475569",
    fontWeight: "700",
    marginBottom: 6,
  },
  // estilo del campo de texto estándar, fondo gris claro, borde definido y espaciado interno equilibrado
  input: {
    backgroundColor: "#F8FAFC",
    borderColor: "#CBD5E1",
    borderRadius: 8,
    borderWidth: 1,
    color: "#0F172A",
    paddingHorizontal: 12,
    paddingVertical: 11,
  },
  // forma visual del input contenedor, alinea el texto y el ojito en horizontal con un fondo translúcido estilo cristal
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.85)",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 8,
    width: "100%",
  },
  // contenedor interno de escritura, absorbe todo el ancho libre izquierdo y define un tamaño de letra legible
  inputContainer: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    fontSize: 16,
    color: "#111827",
  },
  // contenedor de botones, los alinea en fila horizontal, salta de línea si hace falta y deja un hueco de 10 px
  actions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  // botón principal de acción, fondo azul brillante, bordes redondeados y relleno interno espacioso
  primaryButton: {
    backgroundColor: "#2563EB",
    borderRadius: 8,
    paddingHorizontal: 18,
    paddingVertical: 12,
  },
  // botón secundario de acción, fondo blanco limpio, borde gris claro y el mismo tamaño que el botón principal
  secondaryButton: {
    backgroundColor: "#FFFFFF",
    borderColor: "#CBD5E1",
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 18,
    paddingVertical: 12,
  },
  // texto del botón principal, color blanco puro y negrita máxima
  buttonText: {
    color: "#FFFFFF",
    fontWeight: "800",
  },
  // texto del botón secundario, color gris oscuro para marcar menor importancia y negrita máxima
  secondaryButtonText: {
    color: "#334155",
    fontWeight: "800",
  },
  // texto de ayuda o credenciales informativas, color azul grisáceo tenue
  help: {
    color: "#64748B",
  },
  // rejilla contenedora de detalles, ordena los datos en filas flexibles con una separación de 12 px
  detailGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  // tarjeta de información específica, fondo gris muy claro, bordes redondeados y un ancho mínimo de 220 px
  detail: {
    backgroundColor: "#F8FAFC",
    borderRadius: 8,
    minWidth: 220,
    padding: 12,
  },
  // etiqueta del dato, color gris, tamaño de letra compacto, negrita y convertida completamente a mayúsculas
  detailLabel: {
    color: "#64748B",
    fontSize: 12,
    fontWeight: "700",
    textTransform: "uppercase",
  },
  // valor real del dato, color azul oscuro, negrita y con una pequeña separación superior de 4 px
  detailValue: {
    color: "#0F172A",
    fontWeight: "700",
    marginTop: 4,
  },
  // area táctil del botón del ojo, añade margen a los lados y centra el icono de visibilidad verticalmente
  eyeButton: {
    paddingHorizontal: 14,
    justifyContent: "center",
    alignItems: "center",
  },
});
