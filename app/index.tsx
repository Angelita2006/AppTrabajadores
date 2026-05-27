// import { useState } from "react";
// import {
//   Alert,
//   Animated,
//   StyleSheet,
//   TextInput,
//   TouchableOpacity,
// } from "react-native";
// import { ThemedText } from "../components/themed-text";
// import { ThemedView } from "../components/themed-view";
// import { Fonts } from "../constants/theme";
// import { useTrabajador } from "../context/TrabajadorContext";
// import { Estado } from "../src/models/trabajadores";
// import {
//   crearTrabajador,
//   editarEstadoTrabajador,
//   editarTrabajador,
//   getTrabajadorByEmailYContraseña,
// } from "../src/services/trabajadoresService";

// // Componente VerPerfil que muestra la información del perfil del trabajador actual y permite iniciar o cerrar sesión. Utiliza el contexto
// // del trabajador para acceder a la información del trabajador actual y actualizarla al iniciar sesión.
// export default function VerPerfil() {
//   const [pantalla, setPantalla] = useState<
//     "registro" | "inicio" | "perfil" | "editar"
//   >("inicio");

//   const { setTrabajadorActual } = useTrabajador();
//   const [isSignedIn, setIsSignedIn] = useState(false);

//   const [nombre, setNombre] = useState("");
//   const [apellidos, setApellidos] = useState("");
//   const [dni, setDni] = useState("");
//   const [direccion, setDireccion] = useState("");
//   const [codigo_postal, setCodigoPostal] = useState("");
//   const [poblacion, setPoblacion] = useState("");
//   const [provincia, setProvincia] = useState("");
//   const [cuenta_cotizacion, setCuentaCotizacion] = useState("");
//   const [puesto, setPuesto] = useState("");
//   const [estado, setEstado] = useState(Estado.Inactivo);
//   const [email, setEmail] = useState("");
//   const [password, setPassword] = useState("");

//   const handleSignOut = () => {
//     setIsSignedIn(false);
//     setNombre("");
//     setApellidos("");
//     setDni("");
//     setDireccion("");
//     setCodigoPostal("");
//     setPoblacion("");
//     setProvincia("");
//     setCuentaCotizacion("");
//     setPuesto("");
//     setEstado(Estado.Inactivo);
//     setEmail("");
//     setPassword("");
//     Alert.alert("Sesión cerrada", "Has cerrado sesión correctamente");
//   };

//   const handleRegister = () => {
//     const trabajador = crearTrabajador(
//       nombre,
//       apellidos,
//       dni,
//       puesto,
//       direccion,
//       codigo_postal,
//       poblacion,
//       provincia,
//       cuenta_cotizacion,
//       email,
//       password,
//     );
//     setTrabajadorActual(trabajador);
//     Alert.alert("Éxito", "Registro del trabajador completado correctamente");
//     setIsSignedIn(true);
//   };

//   // const handleSignIn = async () => {
//   //   if (!email || !password) {
//   //     Alert.alert("Error", "Por favor, ingresa tu email y contraseña");
//   //     return;
//   //   }
//   //   let trabajador = getTrabajadorByEmailYContraseña(email, password);
//   //   editarEstadoTrabajador((await trabajador).dni, Estado.Activo);
//   //   setNombre((await trabajador).nombre);
//   //   setApellidos((await trabajador).apellidos);
//   //   setDni((await trabajador).dni);
//   //   setDireccion((await trabajador).direccion);
//   //   setCodigoPostal((await trabajador).codigo_postal);
//   //   setPoblacion((await trabajador).poblacion);
//   //   setProvincia((await trabajador).provincia);
//   //   setCuentaCotizacion((await trabajador).cuenta_cotizacion);
//   //   setPuesto((await trabajador).puesto);
//   //   setTrabajadorActual(await trabajador);
//   //   Alert.alert("Éxito", "Sesión del trabajador iniciada correctamente");
//   //   setIsSignedIn(true);
//   // };

//   const handleSignIn = async () => {
//     // 1. Validar campos vacíos
//     if (!email || !password) {
//       Alert.alert("Error", "Por favor, ingresa tu email y contraseña");
//       // ELIMINADO: Se borró 'redirectTo("inicio");' para evitar que la app se rompa
//       return; // Este return detiene la función y mantiene al usuario en la pantalla actual
//     }

//     try {
//       // 2. CORREGIDO: Añadir await aquí para resolver la promesa antes de usar la variable
//       const trabajador = await getTrabajadorByEmailYContraseña(email, password);

//       if (!trabajador) {
//         Alert.alert("Error", "El email o la contraseña son incorrectos");
//         return;
//       }

//       // 3. CORREGIDO: Usar la constante 'trabajador' ya resuelta en lugar de hacer (await trabajador) múltiples veces
//       await editarEstadoTrabajador(trabajador.dni, Estado.Activo);

//       setNombre(trabajador.nombre);
//       setApellidos(trabajador.apellidos);
//       setDni(trabajador.dni);
//       setDireccion(trabajador.direccion);
//       setCodigoPostal(trabajador.codigo_postal);
//       setPoblacion(trabajador.poblacion);
//       setProvincia(trabajador.provincia);
//       setCuentaCotizacion(trabajador.cuenta_cotizacion);
//       setPuesto(trabajador.puesto);

//       setTrabajadorActual(trabajador);

//       Alert.alert("Éxito", "Sesión del trabajador iniciada correctamente");
//       setIsSignedIn(true);
//       setPantalla("perfil"); // Cambia el estado de la pantalla al perfil del usuario
//     } catch (error) {
//       console.error(error);
//       Alert.alert("Error", "Hubo un problema al iniciar sesión");
//     }
//   };

//   const handleSubmit = async () => {
//     const trabajador = editarTrabajador(
//       dni,
//       nombre,
//       apellidos,
//       direccion,
//       codigo_postal,
//       poblacion,
//       provincia,
//       cuenta_cotizacion,
//       puesto,
//       estado,
//       email,
//       password,
//     );

//     setTrabajadorActual(await trabajador);

//     Alert.alert("Éxito", "Información del perfil guardada correctamente");
//     setIsSignedIn(true);
//   };

//   if (pantalla === "registro" && !isSignedIn) {
//     return (
//       <>
//         <Animated.ScrollView
//           // style={[{ flex: 1 }, { pointerEvents: "none" }]}
//           style={{ flex: 1 }}
//           contentContainerStyle={{ flexGrow: 1, paddingBottom: 40 }}
//         >
//           <ThemedView style={styles.titleContainer}>
//             <ThemedText
//               type="title"
//               style={{
//                 fontFamily: Fonts.rounded,
//                 color: "#000000",
//               }}
//             >
//               Registro
//             </ThemedText>
//           </ThemedView>
//           <ThemedView style={styles.formContainer}>
//             <ThemedText type="default" style={styles.label}>
//               Nombre
//             </ThemedText>
//             <TextInput
//               value={nombre}
//               onChangeText={setNombre}
//               style={styles.input}
//               placeholder="Ingresa tu nombre"
//             />
//             <ThemedText type="default" style={styles.label}>
//               Apellidos
//             </ThemedText>
//             <TextInput
//               value={apellidos}
//               onChangeText={setApellidos}
//               style={styles.input}
//               placeholder="Ingresa tus apellidos"
//             />
//             <ThemedText type="default" style={styles.label}>
//               DNI
//             </ThemedText>
//             <TextInput
//               value={dni}
//               onChangeText={setDni}
//               style={styles.input}
//               placeholder="Ingresa tu DNI"
//             />
//             <ThemedText type="default" style={styles.label}>
//               Dirección
//             </ThemedText>
//             <TextInput
//               value={direccion}
//               onChangeText={setDireccion}
//               style={styles.input}
//               placeholder="Ingresa tu dirección"
//             />
//             <ThemedText type="default" style={styles.label}>
//               Código Postal
//             </ThemedText>
//             <TextInput
//               value={codigo_postal}
//               onChangeText={setCodigoPostal}
//               style={styles.input}
//               placeholder="Ingresa tu código postal"
//             />
//             <ThemedText type="default" style={styles.label}>
//               Población
//             </ThemedText>
//             <TextInput
//               value={poblacion}
//               onChangeText={setPoblacion}
//               style={styles.input}
//               placeholder="Ingresa tu población"
//             />
//             <ThemedText type="default" style={styles.label}>
//               Provincia
//             </ThemedText>
//             <TextInput
//               value={provincia}
//               onChangeText={setProvincia}
//               style={styles.input}
//               placeholder="Ingresa tu provincia"
//             />
//             <ThemedText type="default" style={styles.label}>
//               Cuenta de cotización
//             </ThemedText>
//             <TextInput
//               value={cuenta_cotizacion}
//               onChangeText={setCuentaCotizacion}
//               style={styles.input}
//               placeholder="Ingresa tu cuenta de cotización"
//             />
//             <ThemedText type="default" style={styles.label}>
//               Puesto
//             </ThemedText>
//             <TextInput
//               value={puesto}
//               onChangeText={setPuesto}
//               style={styles.input}
//               placeholder="Ingresa tu puesto"
//             />
//             <ThemedText type="default" style={styles.label}>
//               Email
//             </ThemedText>
//             <TextInput
//               value={email}
//               onChangeText={setEmail}
//               keyboardType="email-address"
//               style={styles.input}
//               placeholder="Ingresa tu email"
//             />
//             <ThemedText type="default" style={styles.label}>
//               Contraseña
//             </ThemedText>
//             <TextInput
//               value={password}
//               onChangeText={setPassword}
//               secureTextEntry
//               style={styles.input}
//               placeholder="Ingresa tu contraseña"
//             />
//             <ThemedText type="default" style={styles.label}>
//               Confirmar contraseña
//             </ThemedText>
//             <TextInput
//               value={password}
//               onChangeText={setPassword}
//               secureTextEntry
//               style={styles.input}
//               placeholder="Confirma tu contraseña"
//             />
//           </ThemedView>
//           <ThemedView style={styles.buttonContainer}>
//             <TouchableOpacity
//               style={styles.signInButton}
//               onPress={() => {
//                 handleRegister();
//                 setPantalla("perfil");
//               }}
//             >
//               <ThemedText type="subtitle" style={styles.buttonText}>
//                 Registrarse
//               </ThemedText>
//             </TouchableOpacity>

//             <TouchableOpacity
//               style={styles.signInButton}
//               onPress={() => setPantalla("inicio")}
//             >
//               <ThemedText type="subtitle" style={styles.buttonText}>
//                 Ya tengo cuenta
//               </ThemedText>
//             </TouchableOpacity>
//           </ThemedView>
//         </Animated.ScrollView>
//       </>
//     );
//   }

//   if (pantalla === "inicio" && !isSignedIn) {
//     return (
//       <>
//         <Animated.ScrollView
//           // style={[{ flex: 1 }, { pointerEvents: "none" }]}
//           style={{ flex: 1 }}
//           contentContainerStyle={{ flexGrow: 1, paddingBottom: 40 }}
//         >
//           <ThemedView style={styles.titleContainer}>
//             <ThemedText
//               type="title"
//               style={{
//                 fontFamily: Fonts.rounded,
//                 color: "#000000",
//               }}
//             >
//               Iniciar sesión
//             </ThemedText>
//           </ThemedView>

//           <ThemedView style={styles.formContainer}>
//             <ThemedText type="default" style={styles.label}>
//               Email
//             </ThemedText>

//             <TextInput
//               value={email}
//               onChangeText={setEmail}
//               keyboardType="email-address"
//               style={styles.input}
//               placeholder="Ingresa tu email"
//             />

//             <ThemedText type="default" style={styles.label}>
//               Contraseña
//             </ThemedText>

//             <TextInput
//               value={password}
//               onChangeText={setPassword}
//               secureTextEntry
//               style={styles.input}
//               placeholder="Ingresa tu contraseña"
//             />
//           </ThemedView>

//           <ThemedView style={styles.buttonContainer}>
//             <TouchableOpacity
//               style={styles.signInButton}
//               onPress={() => {
//                 handleSignIn();
//                 setPantalla("perfil");
//               }}
//             >
//               <ThemedText type="subtitle" style={styles.buttonText}>
//                 Iniciar sesión
//               </ThemedText>
//             </TouchableOpacity>

//             <TouchableOpacity
//               style={styles.signInButton}
//               onPress={() => setPantalla("registro")}
//             >
//               <ThemedText type="subtitle" style={styles.buttonText}>
//                 No tengo cuenta
//               </ThemedText>
//             </TouchableOpacity>
//           </ThemedView>
//         </Animated.ScrollView>
//       </>
//     );
//   }

//   if (pantalla === "perfil" && isSignedIn) {
//     return (
//       <>
//         <Animated.ScrollView
//           style={{ flex: 1 }}
//           contentContainerStyle={{ flexGrow: 1, paddingBottom: 40 }}
//         >
//           <ThemedView style={[styles.profileContainer]}>
//             <ThemedText type="subtitle" style={styles.profileTitle}>
//               Información del Perfil
//             </ThemedText>
//             <ThemedText type="default" style={styles.profileText}>
//               Nombre: {nombre}
//             </ThemedText>
//             <ThemedText type="default" style={styles.profileText}>
//               Apellidos: {apellidos}
//             </ThemedText>
//             <ThemedText type="default" style={styles.profileText}>
//               DNI: {dni}
//             </ThemedText>
//             <ThemedText type="default" style={styles.profileText}>
//               Dirección: {direccion}
//             </ThemedText>
//             <ThemedText type="default" style={styles.profileText}>
//               Código postal: {codigo_postal}
//             </ThemedText>
//             <ThemedText type="default" style={styles.profileText}>
//               Poblacion: {poblacion}
//             </ThemedText>
//             <ThemedText type="default" style={styles.profileText}>
//               Provincia: {provincia}
//             </ThemedText>
//             <ThemedText type="default" style={styles.profileText}>
//               Cuenta de cotización: {cuenta_cotizacion}
//             </ThemedText>
//             <ThemedText type="default" style={styles.profileText}>
//               Puesto: {puesto}
//             </ThemedText>
//             <ThemedText type="default" style={styles.profileText}>
//               Email: {email}
//             </ThemedText>
//           </ThemedView>

//           <ThemedView style={styles.buttonContainer}>
//             <TouchableOpacity
//               style={styles.signOutButton}
//               onPress={() => setPantalla("editar")}
//             >
//               <ThemedText type="subtitle" style={styles.buttonText}>
//                 Editar perfil
//               </ThemedText>
//             </TouchableOpacity>

//             <TouchableOpacity
//               style={styles.signOutButton}
//               onPress={() => {
//                 handleSignOut();
//                 setPantalla("registro");
//               }}
//             >
//               <ThemedText type="subtitle" style={styles.buttonText}>
//                 Cerrar sesión
//               </ThemedText>
//             </TouchableOpacity>
//           </ThemedView>
//         </Animated.ScrollView>
//       </>
//     );
//   }

//   if (pantalla === "editar" && isSignedIn) {
//     return (
//       <>
//         <Animated.ScrollView
//           style={{ flex: 1 }}
//           contentContainerStyle={{ flexGrow: 1, paddingBottom: 40 }}
//         >
//           <ThemedView style={styles.titleContainer}>
//             <ThemedText
//               type="title"
//               style={{
//                 fontFamily: Fonts.rounded,
//                 color: "#000000",
//               }}
//             >
//               Editar
//             </ThemedText>
//           </ThemedView>

//           <ThemedView style={styles.formContainer}>
//             <ThemedText type="default" style={styles.label}>
//               Nombre
//             </ThemedText>
//             <TextInput
//               value={nombre}
//               onChangeText={setNombre}
//               style={styles.input}
//             />
//             <ThemedText type="default" style={styles.label}>
//               Apellidos
//             </ThemedText>
//             <TextInput
//               value={apellidos}
//               onChangeText={setApellidos}
//               style={styles.input}
//             />
//             <ThemedText type="default" style={styles.label}>
//               DNI
//             </ThemedText>
//             <TextInput value={dni} onChangeText={setDni} style={styles.input} />
//             <ThemedText type="default" style={styles.label}>
//               Dirección
//             </ThemedText>
//             <TextInput
//               value={direccion}
//               onChangeText={setDireccion}
//               style={styles.input}
//             />
//             <ThemedText type="default" style={styles.label}>
//               Código postal
//             </ThemedText>
//             <TextInput
//               value={codigo_postal}
//               onChangeText={setCodigoPostal}
//               style={styles.input}
//             />
//             <ThemedText type="default" style={styles.label}>
//               Población
//             </ThemedText>
//             <TextInput
//               value={poblacion}
//               onChangeText={setPoblacion}
//               style={styles.input}
//             />
//             <ThemedText type="default" style={styles.label}>
//               Provincia
//             </ThemedText>
//             <TextInput
//               value={provincia}
//               onChangeText={setProvincia}
//               style={styles.input}
//             />
//             <ThemedText type="default" style={styles.label}>
//               Cuenta de cotización
//             </ThemedText>
//             <TextInput
//               value={cuenta_cotizacion}
//               onChangeText={setCuentaCotizacion}
//               style={styles.input}
//             />
//             <ThemedText type="default" style={styles.label}>
//               Puesto
//             </ThemedText>
//             <TextInput
//               value={puesto}
//               onChangeText={setPuesto}
//               style={styles.input}
//             />
//           </ThemedView>

//           <TouchableOpacity
//             style={styles.signInButton}
//             onPress={() => {
//               handleSubmit();
//               setPantalla("perfil");
//             }}
//           >
//             <ThemedText type="subtitle" style={styles.buttonText}>
//               Guardar cambios
//             </ThemedText>
//           </TouchableOpacity>
//         </Animated.ScrollView>
//       </>
//     );
//   }
// }

// const HEADER_HEIGHT = 250;

// const styles = StyleSheet.create({
//   // Estilo para el contenedor del título de cada sección, que organiza el título en una fila con un icono y un fondo claro para
//   // destacar el título.
//   titleContainer: {
//     backgroundColor: "#e0e0e000",
//     color: "#000000",
//     fontSize: 24,
//     fontWeight: "bold",
//     flexDirection: "row",
//     gap: 8,
//     padding: 16,
//     justifyContent: "center",
//   },
//   // Estilo para el contenedor del formulario de registro e inicio de sesión, que tiene un fondo claro, bordes redondeados y
//   // un borde de color para resaltar la sección del formulario.
//   formContainer: {
//     padding: 20,
//     backgroundColor: "#F3E5F5",
//     borderRadius: 10,
//     margin: 10,
//     borderWidth: 1,
//     borderColor: "#CE93D8",
//   },
//   // Estilo para las etiquetas de los campos del formulario, que tienen un tamaño de fuente más grande, negrita y
//   // un margen para separarlas de los campos de entrada.
//   label: {
//     fontSize: 16,
//     fontWeight: "bold",
//     marginBottom: 5,
//     marginTop: 10,
//     color: "#333",
//   },
//   // Estilo para los campos de entrada de texto, que tienen un borde, fondo blanco, padding y un tamaño de fuente legible.
//   input: {
//     borderWidth: 1,
//     borderColor: "#CCC",
//     borderRadius: 5,
//     padding: 10,
//     backgroundColor: "#FFF",
//     fontSize: 16,
//   },
//   // Estilo para el botón de iniciar sesión, que tiene un fondo azul para indicar una acción de inicio de sesión, y
//   // un estilo similar al botón de cerrar sesión para mantener la coherencia visual.
//   signInButton: {
//     backgroundColor: "#007AFF",
//     padding: 15,
//     borderRadius: 10,
//     alignItems: "center",
//     margin: 10,
//   },
//   // Estilo para el botón de cerrar sesión, que tiene un fondo rojo para indicar una acción de cierre de sesión, y
//   // un estilo similar al botón de iniciar sesión para mantener la coherencia visual.
//   signOutButton: {
//     backgroundColor: "#FF3B30",
//     padding: 15,
//     borderRadius: 10,
//     alignItems: "center",
//     margin: 10,
//   },
//   // Estilo para el contenedor de los botones de cada empresa, que organiza los botones en una fila con espacio entre ellos.
//   buttonContainer: {
//     backgroundColor: "#f3e5f500",
//     flexDirection: "row",
//     justifyContent: "center",
//     gap: 10,
//   },
//   // Estilo para el texto de los botones, que define el color y el tamaño de fuente.
//   buttonText: {
//     color: "white",
//     fontSize: 18,
//   },
//   // Estilo para el contenedor del perfil, que tiene un fondo claro, bordes redondeados y un borde de color para resaltar
//   // la sección de información del perfil.
//   profileContainer: {
//     padding: 20,
//     backgroundColor: "#e8f5e800",
//     borderRadius: 10,
//     margin: 10,
//     borderWidth: 1,
//     borderColor: "#A5D6A7",
//   },
//   // Estilo para el título de la sección de perfil, que es más grande y en negrita para destacar la información del perfil.
//   profileTitle: {
//     fontSize: 20,
//     fontWeight: "bold",
//     marginBottom: 15,
//     textAlign: "center",
//     color: "#333",
//   },
//   // Estilo para el texto de la información del perfil, que tiene un tamaño de fuente legible y un color oscuro para facilitar la lectura.
//   profileText: {
//     fontSize: 16,
//     marginBottom: 10,
//     color: "#333",
//   },

//   container: {
//     flex: 1,
//   },
//   header: {
//     height: HEADER_HEIGHT,
//     overflow: "hidden",
//   },
//   content: {
//     flex: 1,
//     padding: 32,
//     gap: 16,
//     overflow: "hidden",
//   },
// });
// function redirectTo(arg0: string) {
//   throw new Error("Function not implemented.");
// }

import { useState } from "react";
import {
  Alert,
  Animated,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
} from "react-native";
import { ThemedText } from "../components/themed-text";
import { ThemedView } from "../components/themed-view";
import { useTrabajador } from "../context/TrabajadorContext";
import { Estado } from "../src/models/trabajadores";
import {
  crearTrabajador,
  editarEstadoTrabajador,
  editarTrabajador,
  getTrabajadorByEmailYContraseña,
} from "../src/services/trabajadoresService";

export default function VerPerfil() {
  const [pantalla, setPantalla] = useState<
    "registro" | "inicio" | "perfil" | "editar"
  >("inicio");
  const { setTrabajadorActual } = useTrabajador();
  const [isSignedIn, setIsSignedIn] = useState(false);

  // Estados del formulario
  const [nombre, setNombre] = useState("");
  const [apellidos, setApellidos] = useState("");
  const [dni, setDni] = useState("");
  const [direccion, setDireccion] = useState("");
  const [codigo_postal, setCodigoPostal] = useState("");
  const [poblacion, setPoblacion] = useState("");
  const [provincia, setProvincia] = useState("");
  const [cuenta_cotizacion, setCuentaCotizacion] = useState("");
  const [puesto, setPuesto] = useState("");
  const [estado, setEstado] = useState(Estado.Inactivo);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState(""); // CORREGIDO: Nuevo estado

  const handleSignOut = () => {
    setIsSignedIn(false);
    setNombre("");
    setApellidos("");
    setDni("");
    setDireccion("");
    setCodigoPostal("");
    setPoblacion("");
    setProvincia("");
    setCuentaCotizacion("");
    setPuesto("");
    setEstado(Estado.Inactivo);
    setEmail("");
    setPassword("");
    Alert.alert("Sesión cerrada", "Has cerrado sesión correctamente");
  };

  const handleRegister = () => {
    if (!email || !password) {
      Alert.alert("Error", "Por favor, ingresa tu email y contraseña");
      return;
    }

    const trabajador = crearTrabajador(
      nombre,
      apellidos,
      dni,
      puesto,
      direccion,
      codigo_postal,
      poblacion,
      provincia,
      cuenta_cotizacion,
      email,
      password,
    );
    setTrabajadorActual(trabajador);
    Alert.alert("Éxito", "Registro del trabajador completado correctamente");
    setIsSignedIn(true);
  };

  const handleSignIn = async () => {
    if (!email || !password) {
      Alert.alert("Error", "Por favor, ingresa tu email y contraseña");
      return;
    }

    try {
      const trabajador = await getTrabajadorByEmailYContraseña(email, password);

      if (!trabajador) {
        Alert.alert("Error", "El email o la contraseña son incorrectos");
        return;
      }

      await editarEstadoTrabajador(trabajador.dni, Estado.Activo);

      setNombre(trabajador.nombre);
      setApellidos(trabajador.apellidos);
      setDni(trabajador.dni);
      setDireccion(trabajador.direccion);
      setCodigoPostal(trabajador.codigo_postal);
      setPoblacion(trabajador.poblacion);
      setProvincia(trabajador.provincia);
      setCuentaCotizacion(trabajador.cuenta_cotizacion);
      setPuesto(trabajador.puesto);
      setEstado(Estado.Activo);
      setTrabajadorActual(trabajador);

      Alert.alert("Éxito", "Sesión del trabajador iniciada correctamente");
      setIsSignedIn(true);
      setPantalla("perfil"); // Cambiamos a la vista de perfil tras un login exitoso
    } catch (error) {
      console.error(error);
      Alert.alert("Error", "Hubo un problema en el servidor");
    }
  };

  const handleSubmit = async () => {
    const trabajador = editarTrabajador(
      dni,
      nombre,
      apellidos,
      direccion,
      codigo_postal,
      poblacion,
      provincia,
      cuenta_cotizacion,
      puesto,
      estado,
      email,
      password,
    );

    setTrabajadorActual(await trabajador);

    Alert.alert("Éxito", "Información del perfil guardada correctamente");
    setIsSignedIn(true);
  };

  // VISTA 1: Perfil del usuario (Cuando ya ha iniciado sesión)
  if (pantalla === "perfil" && isSignedIn) {
    return (
      <Animated.ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={[
          styles.scrollContent,
          {
            justifyContent: "center",
            alignItems: "center",
            padding: 20,
            backgroundColor: "rgb(21, 23, 24)", // Mismo fondo oscuro
          },
        ]}
      >
        <ThemedView style={styles.containerCenter}>
          <ThemedText type="title" style={styles.mainTitle}>
            Perfil de {nombre}
          </ThemedText>

          <ThemedView style={[styles.formContainer, { maxWidth: 500 }]}>
            {/* FILA 1: Nombre y Apellidos */}
            <ThemedView style={styles.row}>
              <ThemedView style={styles.column}>
                <ThemedText style={styles.label}>Nombre</ThemedText>
                <TextInput
                  value={nombre}
                  editable={false} // Bloqueado, solo visualización
                  style={[styles.input, { opacity: 0.8, color: "#555" }]}
                />
              </ThemedView>
              <ThemedView style={styles.column}>
                <ThemedText style={styles.label}>Apellidos</ThemedText>
                <TextInput
                  value={apellidos}
                  editable={false}
                  style={[styles.input, { opacity: 0.8, color: "#555" }]}
                />
              </ThemedView>
            </ThemedView>

            {/* FILA 2: DNI y Dirección */}
            <ThemedView style={styles.row}>
              <ThemedView style={styles.column}>
                <ThemedText style={styles.label}>DNI</ThemedText>
                <TextInput
                  value={dni}
                  editable={false}
                  style={[styles.input, { opacity: 0.8, color: "#555" }]}
                />
              </ThemedView>
              <ThemedView style={styles.column}>
                <ThemedText style={styles.label}>Dirección</ThemedText>
                <TextInput
                  value={direccion}
                  editable={false}
                  style={[styles.input, { opacity: 0.8, color: "#555" }]}
                />
              </ThemedView>
            </ThemedView>

            {/* FILA 3: Código Postal y Población */}
            <ThemedView style={styles.row}>
              <ThemedView style={styles.column}>
                <ThemedText style={styles.label}>Código Postal</ThemedText>
                <TextInput
                  value={codigo_postal}
                  editable={false}
                  style={[styles.input, { opacity: 0.8, color: "#555" }]}
                />
              </ThemedView>
              <ThemedView style={styles.column}>
                <ThemedText style={styles.label}>Población</ThemedText>
                <TextInput
                  value={poblacion}
                  editable={false}
                  style={[styles.input, { opacity: 0.8, color: "#555" }]}
                />
              </ThemedView>
            </ThemedView>

            {/* FILA 4: Provincia y Cuenta de cotización */}
            <ThemedView style={styles.row}>
              <ThemedView style={styles.column}>
                <ThemedText style={styles.label}>Provincia</ThemedText>
                <TextInput
                  value={provincia}
                  editable={false}
                  style={[styles.input, { opacity: 0.8, color: "#555" }]}
                />
              </ThemedView>
              <ThemedView style={styles.column}>
                <ThemedText style={styles.label}>
                  Cuenta de cotización
                </ThemedText>
                <TextInput
                  value={cuenta_cotizacion}
                  editable={false}
                  style={[styles.input, { opacity: 0.8, color: "#555" }]}
                />
              </ThemedView>
            </ThemedView>

            {/* FILA 5: Puesto y Email */}
            <ThemedView style={styles.row}>
              <ThemedView style={styles.column}>
                <ThemedText style={styles.label}>Puesto</ThemedText>
                <TextInput
                  value={puesto}
                  editable={false}
                  style={[styles.input, { opacity: 0.8, color: "#555" }]}
                />
              </ThemedView>
              <ThemedView style={styles.column}>
                <ThemedText style={styles.label}>Email</ThemedText>
                <TextInput
                  value={email}
                  editable={false}
                  style={[styles.input, { opacity: 0.8, color: "#555" }]}
                />
              </ThemedView>
            </ThemedView>

            <ThemedView style={[styles.row, { marginTop: 15 }]}>
              <TouchableOpacity
                style={[styles.button, { flex: 1, marginTop: 0 }]}
                onPress={() => setPantalla("editar")}
              >
                <Text style={styles.buttonText}>Editar perfil</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.button,
                  { flex: 1, marginTop: 0, backgroundColor: "#b93a3a" },
                ]}
                onPress={() => {
                  handleSignOut();
                  setPantalla("inicio");
                }}
              >
                <Text style={styles.buttonText}>Cerrar sesión</Text>
              </TouchableOpacity>
            </ThemedView>
          </ThemedView>
        </ThemedView>
      </Animated.ScrollView>
    );
  }

  if (pantalla === "editar" && isSignedIn) {
    return (
      <Animated.ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={[
          styles.scrollContent,
          {
            justifyContent: "center",
            alignItems: "center",
            padding: 20,
            backgroundColor: "rgb(21, 23, 24)",
          },
        ]}
      >
        <ThemedView style={styles.containerCenter}>
          <ThemedText type="title" style={styles.mainTitle}>
            Editar perfil de {nombre}
          </ThemedText>

          <ThemedView style={[styles.formContainer, { maxWidth: 500 }]}>
            {/* FILA 1: Nombre y Apellidos */}
            <ThemedView style={styles.row}>
              <ThemedView style={styles.column}>
                <ThemedText style={styles.label}>Nombre</ThemedText>
                <TextInput
                  value={nombre}
                  onChangeText={setNombre}
                  style={styles.input}
                />
              </ThemedView>
              <ThemedView style={styles.column}>
                <ThemedText style={styles.label}>Apellidos</ThemedText>
                <TextInput
                  value={apellidos}
                  onChangeText={setApellidos}
                  style={styles.input}
                />
              </ThemedView>
            </ThemedView>

            {/* FILA 2: DNI y Dirección */}
            <ThemedView style={styles.row}>
              <ThemedView style={styles.column}>
                <ThemedText style={styles.label}>DNI</ThemedText>
                <TextInput
                  value={dni}
                  onChangeText={setDni}
                  style={styles.input}
                />
              </ThemedView>
              <ThemedView style={styles.column}>
                <ThemedText style={styles.label}>Dirección</ThemedText>
                <TextInput
                  value={direccion}
                  onChangeText={setDireccion}
                  style={styles.input}
                />
              </ThemedView>
            </ThemedView>

            {/* FILA 3: Código Postal y Población */}
            <ThemedView style={styles.row}>
              <ThemedView style={styles.column}>
                <ThemedText style={styles.label}>Código postal</ThemedText>
                <TextInput
                  value={codigo_postal}
                  onChangeText={setCodigoPostal}
                  style={styles.input}
                  keyboardType="number-pad"
                />
              </ThemedView>
              <ThemedView style={styles.column}>
                <ThemedText style={styles.label}>Población</ThemedText>
                <TextInput
                  value={poblacion}
                  onChangeText={setPoblacion}
                  style={styles.input}
                />
              </ThemedView>
            </ThemedView>

            {/* FILA 4: Provincia y Cuenta de cotización */}
            <ThemedView style={styles.row}>
              <ThemedView style={styles.column}>
                <ThemedText style={styles.label}>Provincia</ThemedText>
                <TextInput
                  value={provincia}
                  onChangeText={setProvincia}
                  style={styles.input}
                />
              </ThemedView>
              <ThemedView style={styles.column}>
                <ThemedText style={styles.label}>
                  Cuenta de cotización
                </ThemedText>
                <TextInput
                  value={cuenta_cotizacion}
                  onChangeText={setCuentaCotizacion}
                  style={styles.input}
                />
              </ThemedView>
            </ThemedView>

            {/* FILA 5: Puesto y Email */}
            <ThemedView style={styles.row}>
              <ThemedView style={styles.column}>
                <ThemedText style={styles.label}>Puesto</ThemedText>
                <TextInput
                  value={puesto}
                  onChangeText={setPuesto}
                  style={styles.input}
                />
              </ThemedView>
              <ThemedView style={styles.column}>
                <ThemedText style={styles.label}>Email</ThemedText>
                <TextInput
                  value={email}
                  onChangeText={setEmail}
                  style={styles.input}
                />
              </ThemedView>
            </ThemedView>

            <ThemedView style={[styles.row, { marginTop: 15 }]}>
              <TouchableOpacity
                style={[styles.button, { flex: 1, marginTop: 0 }]}
                onPress={() => {
                  handleSubmit();
                  setPantalla("perfil");
                }}
              >
                <Text style={styles.buttonText}>Guardar cambios</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.button,
                  { flex: 1, marginTop: 0, backgroundColor: "#6c757d" },
                ]}
                onPress={() => setPantalla("perfil")}
              >
                <Text style={styles.buttonText}>Cancelar</Text>
              </TouchableOpacity>
            </ThemedView>
          </ThemedView>
        </ThemedView>
      </Animated.ScrollView>
    );
  }

  // VISTA 2: Formulario de Registro
  if (pantalla === "registro") {
    return (
      <Animated.ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={[
          styles.scrollContent,
          {
            justifyContent: "center",
            alignItems: "center",
            padding: 20,
            backgroundColor: "rgb(21, 23, 24)",
          },
        ]}
      >
        <ThemedView style={styles.containerCenter}>
          <ThemedText type="title" style={styles.mainTitle}>
            Registro
          </ThemedText>

          <ThemedView style={[styles.formContainer, { maxWidth: 500 }]}>
            {/* FILA 1: Nombre y Apellidos */}
            <ThemedView style={styles.row}>
              <ThemedView style={styles.column}>
                <ThemedText style={styles.label}>Nombre</ThemedText>
                <TextInput
                  value={nombre}
                  onChangeText={setNombre}
                  style={styles.input}
                  placeholder="Nombre"
                />
              </ThemedView>
              <ThemedView style={styles.column}>
                <ThemedText style={styles.label}>Apellidos</ThemedText>
                <TextInput
                  value={apellidos}
                  onChangeText={setApellidos}
                  style={styles.input}
                  placeholder="Apellidos"
                />
              </ThemedView>
            </ThemedView>

            {/* FILA 2: DNI y Dirección */}
            <ThemedView style={styles.row}>
              <ThemedView style={styles.column}>
                <ThemedText style={styles.label}>DNI</ThemedText>
                <TextInput
                  value={dni}
                  onChangeText={setDni}
                  style={styles.input}
                  placeholder="DNI"
                />
              </ThemedView>
              <ThemedView style={styles.column}>
                <ThemedText style={styles.label}>Dirección</ThemedText>
                <TextInput
                  value={direccion}
                  onChangeText={setDireccion}
                  style={styles.input}
                  placeholder="Dirección"
                />
              </ThemedView>
            </ThemedView>

            {/* FILA 3: Código Postal y Población */}
            <ThemedView style={styles.row}>
              <ThemedView style={styles.column}>
                <ThemedText style={styles.label}>Código Postal</ThemedText>
                <TextInput
                  value={codigo_postal}
                  onChangeText={setCodigoPostal}
                  style={styles.input}
                  placeholder="C.P."
                  keyboardType="number-pad"
                />
              </ThemedView>
              <ThemedView style={styles.column}>
                <ThemedText style={styles.label}>Población</ThemedText>
                <TextInput
                  value={poblacion}
                  onChangeText={setPoblacion}
                  style={styles.input}
                  placeholder="Población"
                />
              </ThemedView>
            </ThemedView>

            {/* FILA 4: Provincia y Cuenta de cotización */}
            <ThemedView style={styles.row}>
              <ThemedView style={styles.column}>
                <ThemedText style={styles.label}>Provincia</ThemedText>
                <TextInput
                  value={provincia}
                  onChangeText={setProvincia}
                  style={styles.input}
                  placeholder="Provincia"
                />
              </ThemedView>
              <ThemedView style={styles.column}>
                <ThemedText style={styles.label}>
                  Cuenta de cotización
                </ThemedText>
                <TextInput
                  value={cuenta_cotizacion}
                  onChangeText={setCuentaCotizacion}
                  style={styles.input}
                  placeholder="Nº Cotización"
                />
              </ThemedView>
            </ThemedView>

            {/* FILA 5: Puesto y Email */}
            <ThemedView style={styles.row}>
              <ThemedView style={styles.column}>
                <ThemedText style={styles.label}>Puesto</ThemedText>
                <TextInput
                  value={puesto}
                  onChangeText={setPuesto}
                  style={styles.input}
                  placeholder="Puesto"
                />
              </ThemedView>
              <ThemedView style={styles.column}>
                <ThemedText style={styles.label}>Email</ThemedText>
                <TextInput
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  style={styles.input}
                  placeholder="ejemplo@correo.com"
                  autoCapitalize="none"
                />
              </ThemedView>
            </ThemedView>

            {/* FILA 6: Contraseña y Confirmar Contraseña */}
            <ThemedView style={styles.row}>
              <ThemedView style={styles.column}>
                <ThemedText style={styles.label}>Contraseña</ThemedText>
                <TextInput
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry
                  style={styles.input}
                  placeholder="Contraseña"
                />
              </ThemedView>
              <ThemedView style={styles.column}>
                <ThemedText style={styles.label}>
                  Confirmar contraseña
                </ThemedText>
                <TextInput
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  secureTextEntry
                  style={styles.input}
                  placeholder="Confirma"
                />
              </ThemedView>
            </ThemedView>

            <TouchableOpacity style={styles.button} onPress={handleRegister}>
              <Text style={styles.buttonText}>Registrarse</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.linkButton}
              onPress={() => setPantalla("inicio")}
            >
              <Text style={styles.linkText}>
                ¿Ya tienes cuenta? Inicia sesión aquí
              </Text>
            </TouchableOpacity>
          </ThemedView>
        </ThemedView>
      </Animated.ScrollView>
    );
  }

  // VISTA 3: Formulario de Inicio de Sesión
  return (
    <ThemedView style={styles.containerCenter}>
      <ThemedText type="title" style={styles.mainTitle}>
        Iniciar Sesión
      </ThemedText>

      <ThemedView style={styles.formContainer}>
        <ThemedText style={styles.label}>Email</ThemedText>
        <TextInput
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          style={styles.input}
          placeholder="ejemplo@correo.com"
          autoCapitalize="none"
        />

        <ThemedText style={styles.label}>Contraseña</ThemedText>
        <TextInput
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          style={styles.input}
          placeholder="Tu contraseña"
        />

        <TouchableOpacity style={styles.button} onPress={handleSignIn}>
          <Text style={styles.buttonText}>Entrar</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.linkButton}
          onPress={() => setPantalla("registro")}
        >
          <Text style={styles.linkText}>
            ¿No tienes cuenta? Regístrate aquí
          </Text>
        </TouchableOpacity>
      </ThemedView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  containerCenter: {
    backgroundColor: "rgb(21, 23, 24)",
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 40,
  },
  titleContainer: {
    padding: 20,
    alignItems: "center",
  },
  mainTitle: {
    marginBottom: 20,
  },
  formContainer: {
    width: "100%",
    maxWidth: 350,
  },
  label: {
    fontSize: 14,
    marginBottom: 5,
    fontWeight: "600",
  },
  input: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 6,
    padding: 10,
    marginBottom: 15,
    backgroundColor: "#fff",
  },
  button: {
    backgroundColor: "#38565a",
    padding: 15,
    borderRadius: 6,
    alignItems: "center",
    marginTop: 10,
  },
  buttonText: {
    color: "#fff",
    fontWeight: "bold",
  },
  linkButton: {
    marginTop: 15,
    alignItems: "center",
  },
  linkText: {
    color: "#38565a",
    textDecorationLine: "underline",
  },
  profileContainer: {
    padding: 20,
    backgroundColor: "#e8f5e800",
    borderRadius: 10,
    margin: 10,
    borderWidth: 1,
    borderColor: "#A5D6A7",
  },
  // Estilo para el título de la sección de perfil, que es más grande y en negrita para destacar la información del perfil.
  profileTitle: {
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 15,
    textAlign: "center",
    color: "#333",
  },
  // Estilo para el texto de la información del perfil, que tiene un tamaño de fuente legible y un color oscuro para facilitar la lectura.
  profileText: {
    fontSize: 16,
    marginBottom: 10,
    color: "#333",
  },
  signInButton: {
    backgroundColor: "#007AFF",
    padding: 15,
    borderRadius: 10,
    alignItems: "center",
    margin: 10,
  },
  // Estilo para el botón de cerrar sesión, que tiene un fondo rojo para indicar una acción de cierre de sesión, y
  // un estilo similar al botón de iniciar sesión para mantener la coherencia visual.
  signOutButton: {
    backgroundColor: "#FF3B30",
    padding: 15,
    borderRadius: 10,
    alignItems: "center",
    margin: 10,
  },
  buttonContainer: {
    backgroundColor: "#f3e5f500",
    flexDirection: "row",
    justifyContent: "center",
    gap: 10,
  },
  row: {
    flexDirection: "row", // Alinea los hijos de forma horizontal
    justifyContent: "space-between", // Distribuye el espacio de manera uniforme
    gap: 12, // Añade separación física entre el input izquierdo y el derecho
    width: "100%",
    backgroundColor: "transparent", // Evita cajas blancas de fondo
  },
  column: {
    flex: 1, // Obliga a ambas columnas a medir exactamente lo mismo (50% cada una)
    backgroundColor: "transparent",
  },
});
