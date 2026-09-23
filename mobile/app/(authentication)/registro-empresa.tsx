import { router } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";

import { registrarOrganizacionCompleta } from "@/src/modules/another-services/services";
import { ThemedText } from "@/src/shared/components/ThemedText";
import { useAppModal } from "@/src/shared/ui/AppModalNotification";
import LottieBackground from "@/src/shared/ui/Background.native";
import VideoBackground from "@/src/shared/ui/Background.web";
import { IconSymbol } from "@/src/shared/ui/IconSymbol";
import { obtenerMensajeAmigableError } from "@/src/utils/errorHandler";
import {
  validarCifNifOrganizacion,
  validarDniEspanol,
  validarEmail,
  validarPassword,
  validarTextoObligatorio,
} from "@/src/utils/validators";

/**
 * Componente principal que renderiza el formulario de alta de organización, trabajador admin y usuario.
 */
export default function RegistroOrganizacionScreen() {
  // Campo de Licencia
  const [codigoLicencia, setCodigoLicencia] = useState("");

  // Campos de Empresa
  const [razonSocial, setRazonSocial] = useState("");
  const [nombreComercial, setNombreComercial] = useState("");
  const [cif, setCif] = useState("");
  const [direccionFiscal, setDireccionFiscal] = useState("");
  const [codigoCnae, setCodigoCnae] = useState("");
  const [convenioColectivo, setConvenioColectivo] = useState("");

  // Campos de Administrador (Trabajador + Usuario)
  const [nombreAdmin, setNombreAdmin] = useState("");
  const [apellidosAdmin, setApellidosAdmin] = useState("");
  const [dniAdmin, setDniAdmin] = useState("");
  const [emailAdmin, setEmailAdmin] = useState("");
  const [password, setPassword] = useState("");
  const [telefonoAdmin, setTelefonoAdmin] = useState("");
  const [nssAdmin, setNssAdmin] = useState("");
  const [fechaNacimientoAdmin, setFechaNacimientoAdmin] = useState("");

  const [cargando, setCargando] = useState(false);
  const [isObscured, setIsObscured] = useState(true);
  const [mostrarFondo, setMostrarVideo] = useState(false);

  // Referencias para navegación entre inputs
  const licenciaRef = useRef<TextInput>(null);
  const razonSocialRef = useRef<TextInput>(null);
  const nombreComercialRef = useRef<TextInput>(null);
  const cifRef = useRef<TextInput>(null);
  const direccionFiscalRef = useRef<TextInput>(null);
  const codigoCnaeRef = useRef<TextInput>(null);
  const convenioColectivoRef = useRef<TextInput>(null);
  const nombreAdminRef = useRef<TextInput>(null);
  const apellidosAdminRef = useRef<TextInput>(null);
  const dniAdminRef = useRef<TextInput>(null);
  const telefonoAdminRef = useRef<TextInput>(null);
  const nssAdminRef = useRef<TextInput>(null);
  const fechaNacimientoAdminRef = useRef<TextInput>(null);
  const emailAdminRef = useRef<TextInput>(null);
  const passwordRef = useRef<TextInput>(null);

  // Estados de errores
  const [errorLicencia, setErrorLicencia] = useState(false);
  const [errorRazonSocial, setErrorRazonSocial] = useState(false);
  const [errorCif, setErrorCif] = useState(false);
  const [errorDniAdmin, setErrorDniAdmin] = useState(false);
  const [errorNombreAdmin, setErrorNombreAdmin] = useState(false);
  const [errorApellidosAdmin, setErrorApellidosAdmin] = useState(false);
  const [errorEmail, setErrorEmail] = useState(false);
  const [errorPassword, setErrorPassword] = useState(false);

  const opacidadTarjeta = useSharedValue(0);

  const { mostrarError, mostrarMensaje } = useAppModal();

  useEffect(() => {
    opacidadTarjeta.value = withTiming(1, { duration: 500 });

    const timer = setTimeout(() => {
      setMostrarVideo(true);
    }, 150);

    return () => clearTimeout(timer);
  }, [opacidadTarjeta]);

  const validarFormulario = () => {
    const esLicenciaValida = validarTextoObligatorio(codigoLicencia, 3);
    const esRazonValida = validarTextoObligatorio(razonSocial, 3);
    const esCifValido = validarCifNifOrganizacion(cif);
    const esNombreAdminValido = validarTextoObligatorio(nombreAdmin, 2);
    const esApellidosAdminValido = validarTextoObligatorio(apellidosAdmin, 2);
    const esDniValido = validarDniEspanol(dniAdmin);
    const esEmailValido = validarEmail(emailAdmin);
    const esPasswordValido = validarPassword(password, 6);

    setErrorLicencia(!esLicenciaValida);
    setErrorRazonSocial(!esRazonValida);
    setErrorCif(!esCifValido);
    setErrorNombreAdmin(!esNombreAdminValido);
    setErrorApellidosAdmin(!esApellidosAdminValido);
    setErrorDniAdmin(!esDniValido);
    setErrorEmail(!esEmailValido);
    setErrorPassword(!esPasswordValido);

    return (
      esLicenciaValida &&
      esRazonValida &&
      esCifValido &&
      esNombreAdminValido &&
      esApellidosAdminValido &&
      esDniValido &&
      esEmailValido &&
      esPasswordValido
    );
  };

  const handleRegistroOrganizacion = async () => {
    // 1. Validar Licencia obligatoria
    if (!validarTextoObligatorio(codigoLicencia, 3)) {
      mostrarError(
        "Por favor, introduce un código de licencia válido (mínimo 3 caracteres).",
      );
      return;
    }

    // 2. Validar Razón Social
    if (!validarTextoObligatorio(razonSocial, 3)) {
      mostrarError(
        "Por favor, introduce la razón social de la empresa (mínimo 3 caracteres).",
      );
      return;
    }

    // 3. Validar CIF de la organización
    if (!cif || cif.trim() === "") {
      mostrarError("Por favor, introduce el CIF de la empresa.");
      return;
    }
    if (!validarCifNifOrganizacion(cif)) {
      mostrarError("El formato del CIF introducido no es válido.");
      return;
    }

    // 4. Validar Administrador - Nombre y Apellidos
    if (!validarTextoObligatorio(nombreAdmin, 2)) {
      mostrarError(
        "Por favor, introduce el nombre del administrador (mínimo 2 caracteres).",
      );
      return;
    }
    if (!validarTextoObligatorio(apellidosAdmin, 2)) {
      mostrarError(
        "Por favor, introduce los apellidos del administrador (mínimo 2 caracteres).",
      );
      return;
    }

    // 5. Validar DNI / NIF del Administrador
    if (!dniAdmin || dniAdmin.trim() === "") {
      mostrarError("Por favor, introduce el DNI/NIE del administrador.");
      return;
    }
    if (!validarDniEspanol(dniAdmin)) {
      mostrarError(
        "El DNI del administrador debe tener 8 dígitos seguidos de una letra válida (ej: 12345678Z).",
      );
      return;
    }

    // 6. Validar Fecha de Nacimiento (si se introduce, verificar formato YYYY-MM-DD)
    if (fechaNacimientoAdmin && fechaNacimientoAdmin.trim() !== "") {
      const fechaRegex = /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/;
      if (!fechaRegex.test(fechaNacimientoAdmin.trim())) {
        mostrarError(
          "La fecha de nacimiento debe tener el formato YYYY-MM-DD (ej: 1990-01-01).",
        );
        return;
      }
    }

    // 7. Validar Email del Administrador
    if (!emailAdmin || emailAdmin.trim() === "") {
      mostrarError(
        "Por favor, introduce el correo electrónico del administrador.",
      );
      return;
    }
    if (!validarEmail(emailAdmin)) {
      mostrarError(
        "El formato del correo electrónico introducido no es válido.",
      );
      return;
    }

    // 8. Validar Contraseña
    if (!validarPassword(password, 6)) {
      mostrarError("La contraseña debe tener al menos 6 caracteres.");
      return;
    }

    // Si todo es correcto, procedemos con el registro en el backend
    try {
      setCargando(true);

      await registrarOrganizacionCompleta({
        codigo_licencia: codigoLicencia.trim().toUpperCase(),
        razon_social: razonSocial.trim(),
        nombre_comercial: nombreComercial.trim(),
        cif: cif.trim().toUpperCase(),
        direccion_fiscal: direccionFiscal.trim(),
        codigo_cnae: codigoCnae.trim(),
        convenio_colectivo: convenioColectivo.trim(),
        logo_url: null,

        nombre_admin: nombreAdmin.trim(),
        apellidos_admin: apellidosAdmin.trim(),
        dni_nif_nie_admin: dniAdmin.trim().toUpperCase(),
        email_admin: emailAdmin.trim(),
        password_raw: password,
        telefono_admin: telefonoAdmin.trim(),
        nss_admin: nssAdmin.trim(),
        fecha_nacimiento_admin: fechaNacimientoAdmin.trim(),
      });

      mostrarMensaje(
        "¡Alta Exitosa!",
        "Organización, expediente laboral y cuenta administradora configurados con éxito.",
      );
      router.replace("/");
    } catch (error: any) {
      mostrarError(
        "No se pudo completar el registro de la organización y su administrador debido a un error en el servidor: " +
          obtenerMensajeAmigableError(error.message),
      );
    } finally {
      setCargando(false);
    }
  };

  const estiloTarjetaAnimada = useAnimatedStyle(() => {
    return {
      opacity: opacidadTarjeta.value,
      transform: [
        {
          translateY: withTiming(
            opacidadTarjeta.value * 0 + (1 - opacidadTarjeta.value) * 40,
          ),
        },
      ],
    };
  });

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={styles.container}
    >
      {mostrarFondo &&
        (Platform.OS === "web" ? <VideoBackground /> : <LottieBackground />)}

      <ScrollView
        contentContainerStyle={styles.scrollContainer}
        bounces={false}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View style={[styles.registerCard, estiloTarjetaAnimada]}>
          <View style={styles.headerContenedor}>
            <View style={styles.logoBranding}>
              <IconSymbol name="business" size={28} color="#FFFFFF" />
            </View>
            <ThemedText style={styles.mainTitle}>
              Registro de Empresa
            </ThemedText>
          </View>

          {/* SECCIÓN: DATOS DE LICENCIA */}
          <ThemedText style={styles.seccionSubtitulo}>
            Licencia de Activación
          </ThemedText>

          <View style={styles.field}>
            <ThemedText style={styles.label}>Código de Licencia *</ThemedText>
            <View
              style={[
                styles.inputWrapper,
                errorLicencia && styles.inputWrapperError,
              ]}
            >
              <IconSymbol
                name="vpn-key"
                size={20}
                color="#94A3B8"
                style={styles.inputIcon}
              />
              <TextInput
                ref={licenciaRef}
                value={codigoLicencia}
                textContentType="none"
                autoCapitalize="characters"
                onChangeText={(text) => {
                  setCodigoLicencia(text.toUpperCase());
                  if (errorLicencia) setErrorLicencia(false);
                }}
                style={styles.inputContainer}
                placeholder="Introduce tu código de licencia"
                placeholderTextColor="#94A3B8"
                editable={!cargando}
                returnKeyType="next"
                onSubmitEditing={() => razonSocialRef.current?.focus()}
                blurOnSubmit={false}
              />
            </View>
            {errorLicencia && (
              <ThemedText style={styles.errorText}>
                El código de licencia es obligatorio.
              </ThemedText>
            )}
          </View>

          <View style={styles.divisor} />

          {/* SECCIÓN: DATOS DE LA EMPRESA */}
          <ThemedText style={styles.seccionSubtitulo}>
            Datos de la Empresa
          </ThemedText>

          {/* Campo: Razón Social */}
          <View style={styles.field}>
            <ThemedText style={styles.label}>Razón Social *</ThemedText>
            <View
              style={[
                styles.inputWrapper,
                errorRazonSocial && styles.inputWrapperError,
              ]}
            >
              <IconSymbol
                name="corporate-fare"
                size={20}
                color="#94A3B8"
                style={styles.inputIcon}
              />
              <TextInput
                ref={razonSocialRef}
                value={razonSocial}
                onChangeText={(text) => {
                  setRazonSocial(text);
                  if (errorRazonSocial) setErrorRazonSocial(false);
                }}
                style={styles.inputContainer}
                placeholder="Ej. Mi Empresa S.L."
                placeholderTextColor="#94A3B8"
                editable={!cargando}
                returnKeyType="next"
                onSubmitEditing={() => nombreComercialRef.current?.focus()}
                blurOnSubmit={false}
              />
            </View>
            {errorRazonSocial && (
              <ThemedText style={styles.errorText}>
                La razón social es obligatoria (mínimo 3 caracteres).
              </ThemedText>
            )}
          </View>

          {/* Campo: Nombre Comercial */}
          <View style={styles.field}>
            <ThemedText style={styles.label}>Nombre Comercial *</ThemedText>
            <View style={styles.inputWrapper}>
              <IconSymbol
                name="store"
                size={20}
                color="#94A3B8"
                style={styles.inputIcon}
              />
              <TextInput
                ref={nombreComercialRef}
                value={nombreComercial}
                onChangeText={setNombreComercial}
                style={styles.inputContainer}
                placeholder="Ej. Mi Marca"
                placeholderTextColor="#94A3B8"
                editable={!cargando}
                returnKeyType="next"
                onSubmitEditing={() => cifRef.current?.focus()}
                blurOnSubmit={false}
              />
            </View>
          </View>

          {/* Campo: CIF */}
          <View style={styles.field}>
            <ThemedText style={styles.label}>CIF *</ThemedText>
            <View
              style={[
                styles.inputWrapper,
                errorCif && styles.inputWrapperError,
              ]}
            >
              <IconSymbol
                name="badge"
                size={20}
                color="#94A3B8"
                style={styles.inputIcon}
              />
              <TextInput
                ref={cifRef}
                value={cif}
                onChangeText={(text) => {
                  setCif(text.toUpperCase());
                  if (errorCif) setErrorCif(false);
                }}
                style={styles.inputContainer}
                autoCapitalize="characters"
                maxLength={9}
                placeholder="Ej. B12345678"
                placeholderTextColor="#94A3B8"
                editable={!cargando}
                returnKeyType="next"
                onSubmitEditing={() => direccionFiscalRef.current?.focus()}
                blurOnSubmit={false}
              />
            </View>
            {errorCif && (
              <ThemedText style={styles.errorText}>
                Introduce un CIF válido (9 caracteres).
              </ThemedText>
            )}
          </View>

          {/* Campo: Dirección Fiscal */}
          <View style={styles.field}>
            <ThemedText style={styles.label}>
              Dirección Fiscal (Opcional)
            </ThemedText>
            <View style={styles.inputWrapper}>
              <IconSymbol
                name="location-on"
                size={20}
                color="#94A3B8"
                style={styles.inputIcon}
              />
              <TextInput
                ref={direccionFiscalRef}
                value={direccionFiscal}
                onChangeText={setDireccionFiscal}
                style={styles.inputContainer}
                placeholder="Calle Principal, 123"
                placeholderTextColor="#94A3B8"
                editable={!cargando}
                returnKeyType="next"
                onSubmitEditing={() => codigoCnaeRef.current?.focus()}
                blurOnSubmit={false}
              />
            </View>
          </View>

          {/* Campo: Código CNAE */}
          <View style={styles.field}>
            <ThemedText style={styles.label}>Código CNAE (Opcional)</ThemedText>
            <View style={styles.inputWrapper}>
              <IconSymbol
                name="work"
                size={20}
                color="#94A3B8"
                style={styles.inputIcon}
              />
              <TextInput
                ref={codigoCnaeRef}
                value={codigoCnae}
                onChangeText={setCodigoCnae}
                style={styles.inputContainer}
                placeholder="Ej. 6201"
                placeholderTextColor="#94A3B8"
                editable={!cargando}
                returnKeyType="next"
                onSubmitEditing={() => convenioColectivoRef.current?.focus()}
                blurOnSubmit={false}
              />
            </View>
          </View>

          {/* Campo: Convenio Colectivo */}
          <View style={styles.field}>
            <ThemedText style={styles.label}>
              Convenio Colectivo (Opcional)
            </ThemedText>
            <View style={styles.inputWrapper}>
              <IconSymbol
                name="gavel"
                size={20}
                color="#94A3B8"
                style={styles.inputIcon}
              />
              <TextInput
                ref={convenioColectivoRef}
                value={convenioColectivo}
                onChangeText={setConvenioColectivo}
                style={styles.inputContainer}
                placeholder="Ej. Consultoría"
                placeholderTextColor="#94A3B8"
                editable={!cargando}
                returnKeyType="next"
                onSubmitEditing={() => nombreAdminRef.current?.focus()}
                blurOnSubmit={false}
              />
            </View>
          </View>

          <View style={styles.divisor} />

          {/* SECCIÓN: DATOS DEL ADMINISTRADOR */}
          <ThemedText style={styles.seccionSubtitulo}>
            Datos del Administrador
          </ThemedText>

          {/* Campo: Nombre Admin */}
          <View style={styles.field}>
            <ThemedText style={styles.label}>Nombre *</ThemedText>
            <View
              style={[
                styles.inputWrapper,
                errorNombreAdmin && styles.inputWrapperError,
              ]}
            >
              <IconSymbol
                name="person"
                size={20}
                color="#94A3B8"
                style={styles.inputIcon}
              />
              <TextInput
                ref={nombreAdminRef}
                value={nombreAdmin}
                onChangeText={(text) => {
                  setNombreAdmin(text);
                  if (errorNombreAdmin) setErrorNombreAdmin(false);
                }}
                style={styles.inputContainer}
                placeholder="Nombre del administrador"
                placeholderTextColor="#94A3B8"
                editable={!cargando}
                returnKeyType="next"
                onSubmitEditing={() => apellidosAdminRef.current?.focus()}
                blurOnSubmit={false}
              />
            </View>
            {errorNombreAdmin && (
              <ThemedText style={styles.errorText}>
                El nombre es obligatorio.
              </ThemedText>
            )}
          </View>

          {/* Campo: Apellidos Admin */}
          <View style={styles.field}>
            <ThemedText style={styles.label}>Apellidos *</ThemedText>
            <View
              style={[
                styles.inputWrapper,
                errorApellidosAdmin && styles.inputWrapperError,
              ]}
            >
              <IconSymbol
                name="person"
                size={20}
                color="#94A3B8"
                style={styles.inputIcon}
              />
              <TextInput
                ref={apellidosAdminRef}
                value={apellidosAdmin}
                onChangeText={(text) => {
                  setApellidosAdmin(text);
                  if (errorApellidosAdmin) setErrorApellidosAdmin(false);
                }}
                style={styles.inputContainer}
                placeholder="Apellidos del administrador"
                placeholderTextColor="#94A3B8"
                editable={!cargando}
                returnKeyType="next"
                onSubmitEditing={() => dniAdminRef.current?.focus()}
                blurOnSubmit={false}
              />
            </View>
            {errorApellidosAdmin && (
              <ThemedText style={styles.errorText}>
                Los apellidos son obligatorios.
              </ThemedText>
            )}
          </View>

          {/* Campo: DNI Admin */}
          <View style={styles.field}>
            <ThemedText style={styles.label}>DNI / NIF / NIE *</ThemedText>
            <View
              style={[
                styles.inputWrapper,
                errorDniAdmin && styles.inputWrapperError,
              ]}
            >
              <IconSymbol
                name="badge"
                size={20}
                color="#94A3B8"
                style={styles.inputIcon}
              />
              <TextInput
                ref={dniAdminRef}
                value={dniAdmin}
                onChangeText={(text) => {
                  setDniAdmin(text.toUpperCase());
                  if (errorDniAdmin) setErrorDniAdmin(false);
                }}
                style={styles.inputContainer}
                autoCapitalize="characters"
                maxLength={9}
                placeholder="Ej. 12345678A"
                placeholderTextColor="#94A3B8"
                editable={!cargando}
                returnKeyType="next"
                onSubmitEditing={() => telefonoAdminRef.current?.focus()}
                blurOnSubmit={false}
              />
            </View>
            {errorDniAdmin && (
              <ThemedText style={styles.errorText}>
                Introduce un DNI/NIE válido (9 caracteres).
              </ThemedText>
            )}
          </View>

          {/* Campo: Teléfono Admin */}
          <View style={styles.field}>
            <ThemedText style={styles.label}>Teléfono (Opcional)</ThemedText>
            <View style={styles.inputWrapper}>
              <IconSymbol
                name="phone"
                size={20}
                color="#94A3B8"
                style={styles.inputIcon}
              />
              <TextInput
                ref={telefonoAdminRef}
                value={telefonoAdmin}
                onChangeText={setTelefonoAdmin}
                style={styles.inputContainer}
                keyboardType="phone-pad"
                placeholder="Ej. 600000000"
                placeholderTextColor="#94A3B8"
                editable={!cargando}
                returnKeyType="next"
                onSubmitEditing={() => nssAdminRef.current?.focus()}
                blurOnSubmit={false}
              />
            </View>
          </View>

          {/* Campo: NSS Admin */}
          <View style={styles.field}>
            <ThemedText style={styles.label}>
              Nº Seguridad Social (Opcional)
            </ThemedText>
            <View style={styles.inputWrapper}>
              <IconSymbol
                name="folder"
                size={20}
                color="#94A3B8"
                style={styles.inputIcon}
              />
              <TextInput
                ref={nssAdminRef}
                value={nssAdmin}
                onChangeText={setNssAdmin}
                style={styles.inputContainer}
                placeholder="Ej. 281234567890"
                placeholderTextColor="#94A3B8"
                editable={!cargando}
                returnKeyType="next"
                onSubmitEditing={() => fechaNacimientoAdminRef.current?.focus()}
                blurOnSubmit={false}
              />
            </View>
          </View>

          {/* Campo: Fecha Nacimiento Admin */}
          <View style={styles.field}>
            <ThemedText style={styles.label}>
              Fecha de Nacimiento (Opcional - YYYY-MM-DD)
            </ThemedText>
            <View style={styles.inputWrapper}>
              <IconSymbol
                name="event"
                size={20}
                color="#94A3B8"
                style={styles.inputIcon}
              />
              <TextInput
                ref={fechaNacimientoAdminRef}
                value={fechaNacimientoAdmin}
                onChangeText={setFechaNacimientoAdmin}
                style={styles.inputContainer}
                placeholder="1990-01-01"
                placeholderTextColor="#94A3B8"
                editable={!cargando}
                returnKeyType="next"
                onSubmitEditing={() => emailAdminRef.current?.focus()}
                blurOnSubmit={false}
              />
            </View>
          </View>

          {/* Campo: Correo Electrónico */}
          <View style={styles.field}>
            <ThemedText style={styles.label}>Correo Electrónico *</ThemedText>
            <View
              style={[
                styles.inputWrapper,
                errorEmail && styles.inputWrapperError,
              ]}
            >
              <IconSymbol
                name="mail"
                size={20}
                color="#94A3B8"
                style={styles.inputIcon}
              />
              <TextInput
                ref={emailAdminRef}
                value={emailAdmin}
                onChangeText={(text) => {
                  setEmailAdmin(text);
                  if (errorEmail) setErrorEmail(false);
                }}
                style={styles.inputContainer}
                autoCapitalize="none"
                keyboardType="email-address"
                placeholder="admin@empresa.com"
                placeholderTextColor="#94A3B8"
                editable={!cargando}
                returnKeyType="next"
                onSubmitEditing={() => passwordRef.current?.focus()}
                blurOnSubmit={false}
              />
            </View>
            {errorEmail && (
              <ThemedText style={styles.errorText}>
                Introduce un correo electrónico válido.
              </ThemedText>
            )}
          </View>

          {/* Campo: Contraseña */}
          <View style={styles.field}>
            <ThemedText style={styles.label}>Contraseña *</ThemedText>
            <View
              style={[
                styles.inputWrapper,
                errorPassword && styles.inputWrapperError,
              ]}
            >
              <IconSymbol
                name="lock"
                size={20}
                color="#94A3B8"
                style={styles.inputIcon}
              />
              <TextInput
                ref={passwordRef}
                value={password}
                onChangeText={(text) => {
                  setPassword(text);
                  if (errorPassword) setErrorPassword(false);
                }}
                secureTextEntry={isObscured}
                style={styles.inputContainer}
                placeholder="Mínimo 6 caracteres"
                placeholderTextColor="#94A3B8"
                editable={!cargando}
                returnKeyType="done"
                onSubmitEditing={handleRegistroOrganizacion}
              />
              <Pressable
                onPress={() => setIsObscured(!isObscured)}
                style={styles.eyeButton}
                disabled={cargando}
              >
                <IconSymbol
                  name={isObscured ? "visibility-off" : "visibility"}
                  size={22}
                  color="#64748B"
                />
              </Pressable>
            </View>
            {errorPassword && (
              <ThemedText style={styles.errorText}>
                La contraseña requiere al menos 6 caracteres.
              </ThemedText>
            )}
          </View>

          {/* Botón Principal de Envío */}
          <Pressable
            style={[
              styles.primaryButton,
              cargando && styles.primaryButtonDisabled,
            ]}
            onPress={handleRegistroOrganizacion}
            disabled={cargando}
          >
            {cargando ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <ThemedText style={styles.buttonText}>
                Registrar Empresa
              </ThemedText>
            )}
          </Pressable>

          {/* Enlace para volver a Iniciar Sesión */}
          <Pressable
            onPress={() => router.replace("/")}
            style={styles.loginRedirectContainer}
          >
            <ThemedText style={styles.loginRedirectText}>
              ¿Ya tienes cuenta?{" "}
              <ThemedText style={styles.loginRedirectHighlight}>
                Inicia Sesión
              </ThemedText>
            </ThemedText>
          </Pressable>

          <Pressable
            onPress={() => router.push("/politica-privacidad")}
            style={{ alignSelf: "center", marginTop: 20 }}
          >
            <ThemedText
              style={{ fontSize: 12, color: "#64748B", textAlign: "center" }}
            >
              Al registrar tu empresa, aceptas nuestra{" "}
              <ThemedText style={{ color: "#2563EB", fontWeight: "700" }}>
                Política de Privacidad
              </ThemedText>
            </ThemedText>
          </Pressable>
        </Animated.View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0F172A" },
  scrollContainer: {
    flexGrow: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 72,
    paddingBottom: 80,
  },
  registerCard: {
    width: "90%",
    maxWidth: 420,
    alignSelf: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 28,
    padding: 28,
    ...Platform.select({
      web: {
        maxWidth: 620,
        boxShadow: "0px 10px 25px rgba(0, 0, 0, 0.1)",
      } as any,
      default: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 12,
        elevation: 8,
      },
    }),
  },
  headerContenedor: { alignItems: "center", marginBottom: 24 },
  logoBranding: {
    width: 56,
    height: 56,
    backgroundColor: "#EA580C",
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
  },
  mainTitle: {
    fontSize: 24,
    fontWeight: "900",
    color: "#0F172A",
    textAlign: "center",
  },
  field: { marginBottom: 16, width: "100%" },
  label: { fontSize: 13, fontWeight: "700", color: "#1E293B", marginBottom: 6 },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: "#E2E8F0",
    borderRadius: 14,
    backgroundColor: "#F8FAFC",
    paddingHorizontal: 14,
    height: 52,
  },
  inputWrapperError: { borderColor: "#EF4444", backgroundColor: "#FEF2F2" },
  inputIcon: { marginRight: 10 },
  inputContainer: {
    flex: 1,
    height: "100%",
    color: "#0F172A",
    fontSize: 15,
    fontWeight: "500",
  },
  eyeButton: { padding: 8 },
  primaryButton: {
    width: "100%",
    height: 52,
    backgroundColor: "#EA580C",
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 14,
  },
  primaryButtonDisabled: { backgroundColor: "#FDBA74" },
  buttonText: { color: "#FFFFFF", fontSize: 16, fontWeight: "700" },
  errorText: {
    color: "#EF4444",
    fontSize: 12,
    fontWeight: "600",
    marginTop: 4,
    paddingHorizontal: 4,
  },
  divisor: {
    height: 1,
    backgroundColor: "#E2E8F0",
    width: "100%",
    marginVertical: 16,
  },
  seccionSubtitulo: {
    fontSize: 14,
    fontWeight: "800",
    color: "#475569",
    marginBottom: 12,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  loginRedirectContainer: { alignSelf: "center", marginTop: 20 },
  loginRedirectText: { fontSize: 13, color: "#64748B", fontWeight: "700" },
  loginRedirectHighlight: { color: "#2563EB" },
});
