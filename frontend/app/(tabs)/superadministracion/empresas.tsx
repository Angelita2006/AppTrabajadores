import { registrarOrganizacionCompleta } from "@/src/modules/another-services/services";
import {
  guardarDatosEmpresa,
  obtenerTodasEmpresasPlataforma,
} from "@/src/modules/empresas/api/services";
import {
  Empresa,
  RegistroOrganizacionFormulario,
} from "@/src/modules/empresas/types/empresa";
import { EstadoCarga } from "@/src/modules/plataforma/components/PlatformUI";
import { ThemedText } from "@/src/shared/components/ThemedText";
import { useAppModal } from "@/src/shared/ui/AppModalNotification";
import { AppScreen, Card } from "@/src/shared/ui/AppSurface";
import { obtenerMensajeAmigableError } from "@/src/utils/errorHandler";
import { useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from "react-native";

export default function EmpresasPlataformaScreen() {
  const router = useRouter();
  const { mostrarError, mostrarMensaje } = useAppModal();
  const [empresas, setEmpresas] = useState<Empresa[]>([]);
  const [filtro, setFiltro] = useState("");
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Estados para el modal de creación de empresa y licencia
  const [modalVisible, setModalVisible] = useState(false);
  const [nombreComercialInput, setNombreComercialInput] = useState("");
  const [razonSocialInput, setRazonSocialInput] = useState("");
  const [cifInput, setCifInput] = useState("");
  const [convenioInput, setConvenioInput] = useState("");
  const [cnaeInput, setCnaeInput] = useState("");
  const [guardando, setGuardando] = useState(false);

  const [codigoLicenciaInput, setCodigoLicenciaInput] = useState("");
  const [nombreAdminInput, setNombreAdminInput] = useState("");
  const [apellidosAdminInput, setApellidosAdminInput] = useState("");
  const [emailAdminInput, setEmailAdminInput] = useState("");
  const [passwordAdminInput, setPasswordAdminInput] = useState("");
  const [esGestoriaInput, setEsGestoriaInput] = useState(false);

  const cargar = useCallback(async () => {
    setCargando(true);
    setError(null);
    try {
      const data = await obtenerTodasEmpresasPlataforma();
      setEmpresas(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al consultar empresas.");
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  const empresasFiltradas = useMemo(() => {
    const texto = filtro.trim().toLocaleLowerCase();
    return empresas.filter(
      (empresa) =>
        !texto ||
        [empresa.nombre_comercial, empresa.razon_social, empresa.cif].some(
          (valor) => valor?.toLocaleLowerCase().includes(texto),
        ),
    );
  }, [empresas, filtro]);

  const handleCrearOrganizacionCompleta = async () => {
    if (
      !nombreComercialInput.trim() ||
      !cifInput.trim() ||
      !emailAdminInput.trim() ||
      !passwordAdminInput.trim()
    ) {
      mostrarError(
        "Por favor, rellena los campos obligatorios (Nombre, CIF, Correo y Contraseña del Admin).",
      );
      return;
    }

    try {
      setGuardando(true);

      const payload: RegistroOrganizacionFormulario = {
        nombre_comercial: nombreComercialInput.trim(),
        razon_social: razonSocialInput.trim() || nombreComercialInput.trim(),
        cif: cifInput.trim().toUpperCase(),
        codigo_licencia: codigoLicenciaInput.trim(),
        nombre_admin: nombreAdminInput.trim(),
        apellidos_admin: apellidosAdminInput.trim(),
        email_admin: emailAdminInput.trim().toLowerCase(),
        password: passwordAdminInput.trim(),
        zona_horaria: "Europe/Madrid",
        es_gestoria: esGestoriaInput,
      };

      await registrarOrganizacionCompleta(payload);

      mostrarMensaje(
        "Éxito",
        "Organización y cuenta administradora registradas correctamente.",
      );
      setModalVisible(false);

      // Limpiar campos y recargar la lista de empresas
      setNombreComercialInput("");
      setRazonSocialInput("");
      setCifInput("");
      setCodigoLicenciaInput("");
      setNombreAdminInput("");
      setApellidosAdminInput("");
      setEmailAdminInput("");
      setPasswordAdminInput("");
      setEsGestoriaInput(false);

      await cargar();
    } catch (error: any) {
      mostrarError(
        "Error en el registro: " + obtenerMensajeAmigableError(error),
      );
    } finally {
      setGuardando(false);
    }
  };

  // Función para dar de baja o reactivar una empresa
  const handleToggleBaja = async (empresa: Empresa) => {
    try {
      setCargando(true);
      await guardarDatosEmpresa(
        empresa.id,
        empresa.razon_social,
        empresa.cif,
        empresa.zona_horaria || "Europe/Madrid",
        !empresa.activa, // Invierte el estado de actividad (dar de baja / activar)
        empresa.nombre_comercial,
        empresa.convenio_colectivo || "",
        empresa.codigo_cnae || "",
        empresa.direccion || "",
      );
      mostrarMensaje(
        "Éxito",
        `Empresa ${!empresa.activa ? "activada" : "dada de baja"} correctamente.`,
      );
      await cargar();
    } catch (e: any) {
      mostrarError(
        "Error al actualizar el estado de la empresa: " +
          obtenerMensajeAmigableError(e),
      );
    } finally {
      setCargando(false);
    }
  };

  return (
    <AppScreen
      title="Empresas"
      subtitle={`${empresas.length} organizaciones disponibles para administración`}
    >
      <View style={styles.headerAcciones}>
        <TextInput
          value={filtro}
          onChangeText={setFiltro}
          placeholder="Buscar por nombre o CIF"
          style={[styles.input, { flex: 1 }]}
        />
        <Pressable
          style={styles.botonCrear}
          onPress={() => setModalVisible(true)}
        >
          <ThemedText style={styles.textoBotonCrear}>
            + Añadir Empresa
          </ThemedText>
        </Pressable>
      </View>

      <EstadoCarga
        cargando={cargando}
        error={error}
        onRetry={() => void cargar()}
      />

      {!cargando && !error && empresasFiltradas.length === 0 ? (
        <Card>
          <ThemedText>
            No hay empresas que coincidan con la búsqueda.
          </ThemedText>
        </Card>
      ) : null}

      {empresasFiltradas.map((empresa) => (
        <Card key={empresa.id}>
          <View style={styles.row}>
            <View style={styles.copy}>
              <ThemedText style={styles.name}>
                {empresa.nombre_comercial || empresa.razon_social}
              </ThemedText>
              <ThemedText>{empresa.razon_social}</ThemedText>
              <ThemedText style={styles.muted}>
                {empresa.cif} · {empresa.es_gestoria ? "Gestoría" : "Empresa"}
              </ThemedText>
            </View>
            <ThemedText
              style={[
                styles.state,
                empresa.activa ? styles.active : styles.inactive,
              ]}
            >
              {empresa.activa ? "Activa" : "Inactiva"}
            </ThemedText>
          </View>

          <View style={styles.accionesCard}>
            {/* Opción para editar mediante los tabs de gestión */}
            <Pressable
              onPress={() =>
                router.push(`/(tabs)/superadministracion/empresas/${empresa.id}`)
              }
              style={styles.linkButton}
            >
              <ThemedText style={styles.link}>
                Gestionar Tabs (Fiscal, Centros...) →
              </ThemedText>
            </Pressable>

            {/* Opción para dar de baja / activar */}
            <Pressable
              onPress={() => void handleToggleBaja(empresa)}
              style={styles.bajaButton}
            >
              <ThemedText
                style={[
                  styles.textoBaja,
                  { color: empresa.activa ? "#B91C1C" : "#15803D" },
                ]}
              >
                {empresa.activa ? "Dar de baja" : "Activar"}
              </ThemedText>
            </Pressable>
          </View>
        </Card>
      ))}

      {cargando ? <ActivityIndicator style={{ marginTop: 20 }} /> : null}

      {/* MODAL PARA AÑADIR NUEVA EMPRESA Y SU ADMINISTRADOR */}
      <Modal visible={modalVisible} animationType="slide" transparent={true}>
        <View style={styles.fondoModal}>
          <View style={styles.contenidoModal}>
            <ThemedText style={styles.modalTitulo}>
              Nueva Organización y Licencia
            </ThemedText>
            <ThemedText style={styles.modalSubtitulo}>
              Introduce los datos de la empresa y del administrador inicial.
            </ThemedText>

            <ScrollView style={{ maxHeight: 450, marginVertical: 12 }}>
              <ThemedText style={styles.subseccionModal}>
                Datos de la Empresa
              </ThemedText>
              <View style={styles.campoForm}>
                <ThemedText style={styles.labelForm}>
                  Nombre Comercial *
                </ThemedText>
                <TextInput
                  style={styles.inputModal}
                  value={nombreComercialInput}
                  onChangeText={setNombreComercialInput}
                  placeholder="Ej. Fichapp Corp"
                />
              </View>
              <View style={styles.campoForm}>
                <ThemedText style={styles.labelForm}>Razón Social</ThemedText>
                <TextInput
                  style={styles.inputModal}
                  value={razonSocialInput}
                  onChangeText={setRazonSocialInput}
                  placeholder="Ej. Fichapp S.L."
                />
              </View>
              <View style={styles.campoForm}>
                <ThemedText style={styles.labelForm}>CIF *</ThemedText>
                <TextInput
                  style={styles.inputModal}
                  value={cifInput}
                  onChangeText={setCifInput}
                  placeholder="Ej. B12345678"
                />
              </View>
              <View style={styles.campoForm}>
                <ThemedText style={styles.labelForm}>
                  Código de Licencia (Opcional)
                </ThemedText>
                <TextInput
                  style={styles.inputModal}
                  value={codigoLicenciaInput}
                  onChangeText={setCodigoLicenciaInput}
                  placeholder="Código de Stripe o licencia"
                />
              </View>
              <View style={styles.campoForm}>
                <ThemedText style={styles.labelForm}>
                  Convenio Colectivo
                </ThemedText>
                <TextInput
                  style={styles.inputModal}
                  value={convenioInput}
                  onChangeText={setConvenioInput}
                  placeholder="Convenio aplicable"
                />
              </View>
              <View style={styles.campoForm}>
                <ThemedText style={styles.labelForm}>Código CNAE</ThemedText>
                <TextInput
                  style={styles.inputModal}
                  value={cnaeInput}
                  onChangeText={setCnaeInput}
                  placeholder="Ej. 6201"
                />
              </View>

              <ThemedText style={[styles.subseccionModal, { marginTop: 15 }]}>
                Datos del Administrador Inicial
              </ThemedText>
              <View style={styles.campoForm}>
                <ThemedText style={styles.labelForm}>Nombre *</ThemedText>
                <TextInput
                  style={styles.inputModal}
                  value={nombreAdminInput}
                  onChangeText={setNombreAdminInput}
                  placeholder="Nombre del admin"
                />
              </View>
              <View style={styles.campoForm}>
                <ThemedText style={styles.labelForm}>Apellidos</ThemedText>
                <TextInput
                  style={styles.inputModal}
                  value={apellidosAdminInput}
                  onChangeText={setApellidosAdminInput}
                  placeholder="Apellidos del admin"
                />
              </View>
              <View style={styles.campoForm}>
                <ThemedText style={styles.labelForm}>
                  Correo Electrónico *
                </ThemedText>
                <TextInput
                  style={styles.inputModal}
                  value={emailAdminInput}
                  onChangeText={setEmailAdminInput}
                  placeholder="correo@empresa.com"
                  autoCapitalize="none"
                  keyboardType="email-address"
                />
              </View>
              <View style={styles.campoForm}>
                <ThemedText style={styles.labelForm}>Contraseña *</ThemedText>
                <TextInput
                  style={styles.inputModal}
                  value={passwordAdminInput}
                  onChangeText={setPasswordAdminInput}
                  placeholder="Mínimo 12 caracteres"
                  secureTextEntry
                />
              </View>
            </ScrollView>

            <View
              style={{
                flexDirection: "row",
                justifyContent: "flex-end",
                gap: 10,
                marginTop: 10,
              }}
            >
              <Pressable
                style={[styles.botonModal, styles.botonCancelar]}
                onPress={() => setModalVisible(false)}
              >
                <ThemedText style={styles.textoBotonModal}>Cancelar</ThemedText>
              </Pressable>
              <Pressable
                style={[styles.botonModal, styles.botonGuardar]}
                onPress={() => void handleCrearOrganizacionCompleta()}
                disabled={guardando}
              >
                <ThemedText style={styles.textoBotonModal}>
                  {guardando ? "Guardando..." : "Crear y Licenciar"}
                </ThemedText>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  headerAcciones: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 12,
    alignItems: "center",
  },
  input: {
    borderWidth: 1,
    borderColor: "#CBD5E1",
    borderRadius: 10,
    padding: 13,
    backgroundColor: "white",
    height: 46,
  },
  botonCrear: {
    backgroundColor: "#2563EB",
    paddingHorizontal: 14,
    height: 46,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
  },
  textoBotonCrear: { color: "white", fontWeight: "700", fontSize: 13 },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 12,
  },
  copy: { flex: 1, gap: 4 },
  name: { fontSize: 17, fontWeight: "700" },
  muted: { opacity: 0.7 },
  state: { fontWeight: "700" },
  active: { color: "#15803D" },
  inactive: { color: "#B91C1C" },
  accionesCard: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#E2E8F0",
    paddingTop: 10,
  },
  linkButton: { flex: 1 },
  link: { color: "#2563EB", fontWeight: "700", fontSize: 13 },
  bajaButton: { paddingVertical: 4, paddingHorizontal: 8 },
  textoBaja: { fontWeight: "700", fontSize: 13 },
  fondoModal: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  contenidoModal: {
    width: "100%",
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 20,
    elevation: 5,
  },
  modalTitulo: { fontSize: 18, fontWeight: "700", color: "#0F172A" },
  modalSubtitulo: {
    fontSize: 13,
    color: "#64748B",
    marginTop: 4,
    marginBottom: 10,
  },
  subseccionModal: {
    fontSize: 14,
    fontWeight: "700",
    color: "#2563EB",
    marginBottom: 6,
    marginTop: 4,
  },
  campoForm: { marginBottom: 10 },
  labelForm: {
    fontSize: 12,
    fontWeight: "600",
    color: "#475569",
    marginBottom: 4,
  },
  inputModal: {
    borderWidth: 1,
    borderColor: "#CBD5E1",
    borderRadius: 8,
    paddingHorizontal: 12,
    height: 40,
    backgroundColor: "#FFF",
    fontSize: 13,
  },
  botonModal: {
    paddingHorizontal: 16,
    height: 40,
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
  },
  botonCancelar: { backgroundColor: "#94A3B8" },
  botonGuardar: { backgroundColor: "#2563EB" },
  textoBotonModal: { color: "#FFFFFF", fontSize: 13, fontWeight: "600" },
});
