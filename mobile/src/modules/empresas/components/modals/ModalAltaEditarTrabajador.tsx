import { Rol } from "@/src/modules/roles/types/rol";
import { ThemedText } from "@/src/shared/components/ThemedText";
import { mostrarError, mostrarMensaje } from "@/src/utils/errorHandler";
import {
  validarDniEspanol,
  validarEmail,
  validarTextoObligatorio,
} from "@/src/utils/validators";
import React from "react";
import { ActivityIndicator, Pressable, TextInput, View } from "react-native";

/**
 * Propiedades requeridas para el funcionamiento del componente ModalAltaEditarTrabajador.
 * Define los estados de los datos del trabajador, catálogos de roles, funciones de actualización
 * y referencias de inputs para formularios de alta y edición.
 */
interface ModalAltaEditarTrabajadorProps {
  /** Bandera booleana que indica si el modal se encuentra en modo de edición de un trabajador existente. */
  esEdicion: boolean;
  /** Valor actual del nombre del trabajador. */
  nombre: string;
  /** Función para actualizar el nombre del trabajador. */
  setNombre: (val: string) => void;
  /** Valor actual de los apellidos del trabajador. */
  apellidos: string;
  /** Función para actualizar los apellidos del trabajador. */
  setApellidos: (val: string) => void;
  /** Valor actual del documento de identidad (NIF o NIE). */
  nifNie: string;
  /** Función para actualizar el NIF o NIE. */
  setNifNie: (val: string) => void;
  /** Valor actual del correo electrónico. */
  email: string;
  /** Función para actualizar el correo electrónico. */
  setEmail: (val: string) => void;
  /** Valor actual del teléfono móvil. */
  telefono: string;
  /** Función para actualizar el teléfono móvil. */
  setTelefono: (val: string) => void;
  /** Valor actual del número de la seguridad social. */
  nss: string;
  /** Función para actualizar el número de la seguridad social. */
  setNss: (val: string) => void;
  /** Valor actual de la fecha de nacimiento (Formato YYYY-MM-DD). */
  fechaNacimiento: string;
  /** Función para actualizar la fecha de nacimiento. */
  setFechaNacimiento: (val: string) => void;

  /** Identificador o tipo de rol asignado actualmente al trabajador. */
  tipoRol: string;
  /** Función para actualizar el rol asignado. */
  setTipoRol: (val: string) => void;
  /** Listado completo de roles disponibles en el sistema. */
  rolesDisponibles: Rol[];

  /** Función callback ejecutada al superar satisfactoriamente todas las validaciones. */
  onGuardar: () => void;
  /** Estado booleano que indica si se está ejecutando una operación asíncrona de guardado. */
  procesando: boolean;
  /** Objeto de estilos personalizados aplicados al formulario y componentes visuales. */
  styles: any;
  /** Referencias opcionales para el control de enfoque secuencial entre inputs. */
  inputRefs?: {
    apellidosRef?: any;
    nifRef?: any;
    emailRef?: any;
    telefonoRef?: any;
    nssRef?: any;
    fechaNacRef?: any;
    botonGuardarRef?: any;
  };
}

/**
 * Componente modal interactivo para el alta y edición de expedientes de trabajadores.
 * Implementa validaciones robustas y centralizadas para cada campo obligatorio (nombre,
 * apellidos, NIF/NIE, email, teléfono, NSS, fecha de nacimiento real y rol), emitiendo
 * mensajes de error específicos y feedback visual.
 *
 * @param props - Propiedades de configuración, estados y manejadores del modal.
 * @returns Estructura visual en React Native con el formulario completo de trabajadores.
 */
export const ModalAltaEditarTrabajador: React.FC<
  ModalAltaEditarTrabajadorProps
> = ({
  esEdicion,
  nombre,
  setNombre,
  apellidos,
  setApellidos,
  nifNie,
  setNifNie,
  email,
  setEmail,
  telefono,
  setTelefono,
  nss,
  setNss,
  fechaNacimiento,
  setFechaNacimiento,
  tipoRol,
  setTipoRol,
  rolesDisponibles,
  onGuardar,
  procesando,
  styles,
  inputRefs = {},
}) => {
  /**
   * Valida exhaustivamente cada campo del formulario de alta o edición de trabajadores
   * utilizando utilidades centralizadas y comprobaciones lógicas. Emite avisos detallados
   * en caso de detectar anomalías y procede con el guardado si todo es correcto.
   */
  const validarYGuardar = () => {
    // 1. Validar Nombre obligatorio (mínimo 2 caracteres)
    if (!validarTextoObligatorio(nombre, 2)) {
      mostrarError(
        "Por favor, introduce el nombre del trabajador (mínimo 2 caracteres).",
      );
      return;
    }

    // 2. Validar Apellidos obligatorios (mínimo 2 caracteres)
    if (!validarTextoObligatorio(apellidos, 2)) {
      mostrarError(
        "Por favor, introduce los apellidos del trabajador (mínimo 2 caracteres).",
      );
      return;
    }

    // 3. Validar NIF / NIE obligatorio y formato correcto de DNI español
    if (!nifNie || nifNie.trim() === "") {
      mostrarError("Por favor, introduce el NIF o NIE del trabajador.");
      return;
    }
    if (!validarDniEspanol(nifNie)) {
      mostrarError(
        "El DNI debe tener obligatoriamente 8 dígitos seguidos de una letra de control válida (ej: 12345678Z).",
      );
      return;
    }

    // 4. Validar Email obligatorio y formato válido
    if (!email || email.trim() === "") {
      mostrarError(
        "Por favor, introduce el correo electrónico del trabajador.",
      );
      return;
    }
    if (!validarEmail(email)) {
      mostrarError(
        "El formato del correo electrónico introducido no es válido.",
      );
      return;
    }

    // 5. Validar Teléfono móvil obligatorio
    if (!telefono || telefono.trim() === "") {
      mostrarError("Por favor, introduce el número de teléfono móvil.");
      return;
    }

    // 6. Validar Número de Seguridad Social (NSS) obligatorio
    if (!nss || nss.trim() === "") {
      mostrarError("Por favor, introduce el número de la seguridad social.");
      return;
    }

    // 7. Validar Fecha de Nacimiento obligatoria, formato YYYY-MM-DD y existencia real
    if (!fechaNacimiento || fechaNacimiento.trim() === "") {
      mostrarError("Por favor, introduce la fecha de nacimiento.");
      return;
    }
    const fechaRegex = /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/;
    if (!fechaRegex.test(fechaNacimiento.trim())) {
      mostrarError(
        "La fecha de nacimiento debe tener el formato YYYY-MM-DD (ej: 1995-04-25).",
      );
      return;
    }

    const partes = fechaNacimiento.trim().split("-");
    const anio = parseInt(partes[0], 10);
    const mes = parseInt(partes[1], 10) - 1;
    const dia = parseInt(partes[2], 10);
    const fechaObj = new Date(anio, mes, dia);

    if (
      fechaObj.getFullYear() !== anio ||
      fechaObj.getMonth() !== mes ||
      fechaObj.getDate() !== dia
    ) {
      mostrarError(
        "La fecha introducida no corresponde a una fecha real del calendario.",
      );
      return;
    }

    // 8. Validar Rol obligatorio en el sistema
    if (!tipoRol || tipoRol.trim() === "") {
      mostrarError(
        "Por favor, selecciona un rol en el sistema para el trabajador.",
      );
      return;
    }

    // Mensaje de éxito previo a la ejecución del guardado
    mostrarMensaje(
      "Verificación Exitosa",
      esEdicion
        ? "Actualizando el expediente del trabajador..."
        : "Registrando nuevo expediente...",
    );

    // Si todas las validaciones son correctas, se ejecuta la función de guardado
    onGuardar();
  };

  return (
    <View>
      <View style={styles.campoForm}>
        <ThemedText style={styles.labelForm}>Nombre *</ThemedText>
        <TextInput
          style={styles.inputForm}
          value={nombre}
          onChangeText={setNombre}
          placeholder="Nombre"
          returnKeyType="next"
          onSubmitEditing={() => inputRefs.apellidosRef?.current?.focus()}
        />
      </View>

      <View style={styles.campoForm}>
        <ThemedText style={styles.labelForm}>Apellidos *</ThemedText>
        <TextInput
          ref={inputRefs.apellidosRef}
          style={styles.inputForm}
          value={apellidos}
          onChangeText={setApellidos}
          placeholder="Apellidos"
          returnKeyType="next"
          onSubmitEditing={() => inputRefs.nifRef?.current?.focus()}
        />
      </View>

      <View style={styles.campoForm}>
        <ThemedText style={styles.labelForm}>NIF / NIE *</ThemedText>
        <TextInput
          ref={inputRefs.nifRef}
          style={styles.inputForm}
          value={nifNie}
          onChangeText={setNifNie}
          autoCapitalize="characters"
          placeholder="Ej: 12345678Z"
          returnKeyType="next"
          onSubmitEditing={() => inputRefs.emailRef?.current?.focus()}
        />
      </View>

      <View style={styles.campoForm}>
        <ThemedText style={styles.labelForm}>Email *</ThemedText>
        <TextInput
          ref={inputRefs.emailRef}
          style={styles.inputForm}
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
          placeholder="correo@empresa.com"
          returnKeyType="next"
          onSubmitEditing={() => inputRefs.telefonoRef?.current?.focus()}
        />
      </View>

      <View style={styles.campoForm}>
        <ThemedText style={styles.labelForm}>Teléfono Móvil *</ThemedText>
        <TextInput
          ref={inputRefs.telefonoRef}
          style={styles.inputForm}
          value={telefono}
          onChangeText={setTelefono}
          keyboardType="phone-pad"
          placeholder="Ej: +34600111222"
          returnKeyType="next"
          onSubmitEditing={() => inputRefs.nssRef?.current?.focus()}
        />
      </View>

      <View style={styles.campoForm}>
        <ThemedText style={styles.labelForm}>
          Número Seguridad Social *
        </ThemedText>
        <TextInput
          ref={inputRefs.nssRef}
          style={styles.inputForm}
          value={nss}
          onChangeText={setNss}
          keyboardType="numeric"
          placeholder="Ej: 281234567890"
          returnKeyType="next"
          onSubmitEditing={() => inputRefs.fechaNacRef?.current?.focus()}
        />
      </View>

      <View style={styles.campoForm}>
        <ThemedText style={styles.labelForm}>
          Fecha Nacimiento (AAAA-MM-DD) *
        </ThemedText>
        <TextInput
          ref={inputRefs.fechaNacRef}
          style={styles.inputForm}
          value={fechaNacimiento}
          onChangeText={setFechaNacimiento}
          placeholder="Ej: 1995-04-25"
          returnKeyType="next"
          onSubmitEditing={() => inputRefs.botonGuardarRef?.current?.focus()}
        />
      </View>

      {/* Selector Dinámico de Roles del Sistema */}
      <View style={styles.campoForm}>
        <ThemedText style={styles.labelForm}>Rol en el Sistema *</ThemedText>
        <View
          style={{
            flexDirection: "row",
            flexWrap: "wrap",
            gap: 8,
            marginTop: 6,
          }}
        >
          {rolesDisponibles
            .filter(
              (r) =>
                r.nombre !== "Admin_empresa" &&
                r.nombre !== "Admin_gestoría" &&
                r.nombre !== "Auditor_itss",
            )
            .map((rol: Rol) => {
              const seleccionado = tipoRol === rol.id;
              return (
                <Pressable
                  key={rol.id}
                  onPress={() => setTipoRol(rol.id)}
                  style={[
                    {
                      paddingVertical: 8,
                      paddingHorizontal: 12,
                      borderRadius: 8,
                      borderWidth: 1,
                      borderColor: seleccionado ? "#2563EB" : "#D1D5DB",
                      backgroundColor: seleccionado ? "#EFF6FF" : "#FFFFFF",
                    },
                  ]}
                >
                  <ThemedText
                    style={{
                      color: seleccionado ? "#1D4ED8" : "#374151",
                      fontWeight: seleccionado ? "bold" : "normal",
                      fontSize: 14,
                    }}
                  >
                    {rol.nombre.replace("_", " ").toUpperCase()}
                  </ThemedText>
                </Pressable>
              );
            })}
        </View>
      </View>

      <Pressable
        ref={inputRefs.botonGuardarRef}
        style={styles.btnGuardarModal}
        onPress={validarYGuardar}
        disabled={procesando}
        accessible={true}
        accessibilityRole="button"
      >
        {procesando ? (
          <ActivityIndicator size="small" color="#FFFFFF" />
        ) : (
          <ThemedText style={styles.btnGuardarModalTexto}>
            {esEdicion ? "Guardar Cambios" : "Guardar Expediente"}
          </ThemedText>
        )}
      </Pressable>
    </View>
  );
};
