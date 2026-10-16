import {
  emitirLicencia,
  modificarLicencia,
  obtenerLicencias,
  revocarLicencia,
} from "@/src/modules/licencias/api/services";
import {
  CICLOS_FACTURACION,
  EmitirLicencia,
  ESTADOS_LICENCIA,
  Licencia,
  LicenciaResponse,
  PLANES_LICENCIA,
} from "@/src/modules/licencias/types/licencia";
import {
  EstadoCarga,
  PlataformaSection,
} from "@/src/modules/plataforma/components/PlatformUI";
import { ThemedText } from "@/src/shared/components/ThemedText";
import { AppScreen, Card } from "@/src/shared/ui/AppSurface";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  StyleSheet,
  TextInput,
  View,
} from "react-native";

function fechaEnDias(dias: number) {
  const fecha = new Date();
  fecha.setDate(fecha.getDate() + dias);
  return fecha.toISOString().slice(0, 10);
}

export default function LicenciasPlataformaScreen() {
  const [licencias, setLicencias] = useState<LicenciaResponse[]>([]);
  const [plan, setPlan] = useState<EmitirLicencia["plan"]>(
    PLANES_LICENCIA.BASICO,
  );
  const [ciclo, setCiclo] = useState<EmitirLicencia["ciclo"]>(
    CICLOS_FACTURACION.MENSUAL,
  );
  const [fechaExpiracion, setFechaExpiracion] = useState(fechaEnDias(30));

  // Estados para modo edición
  const [licenciaEditandoId, setLicenciaEditandoId] = useState<string | null>(
    null,
  );
  const [planEdit, setPlanEdit] = useState<EmitirLicencia["plan"]>(
    PLANES_LICENCIA.BASICO,
  );
  const [cicloEdit, setCicloEdit] = useState<EmitirLicencia["ciclo"]>(
    CICLOS_FACTURACION.MENSUAL,
  );
  const [fechaExpiracionEdit, setFechaExpiracionEdit] = useState("");

  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const cargar = useCallback(async () => {
    setCargando(true);
    setError(null);
    try {
      setLicencias(await obtenerLicencias());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al cargar licencias.");
    } finally {
      setCargando(false);
    }
  }, []);
  useEffect(() => {
    void cargar();
  }, [cargar]);

  const emitir = async () => {
    setGuardando(true);
    try {
      await emitirLicencia({
        plan,
        ciclo,
        fecha_inicio: new Date().toISOString().slice(0, 10),
        fecha_expiracion: fechaExpiracion,
      });
      Alert.alert(
        "Licencia emitida",
        "La licencia ya está disponible en la plataforma.",
      );
      await cargar();
    } catch (e) {
      Alert.alert(
        "No se pudo emitir",
        e instanceof Error ? e.message : "Error al emitir la licencia.",
      );
    } finally {
      setGuardando(false);
    }
  };

  const iniciarEdicion = (licencia: Licencia) => {
    setLicenciaEditandoId(licencia.id);
    setPlanEdit(licencia.plan);
    setCicloEdit(licencia.ciclo);
    setFechaExpiracionEdit(licencia.fecha_expiracion);
  };

  const guardarEdicion = async (id: string) => {
    setGuardando(true);
    try {
      if (typeof modificarLicencia === "function") {
        await modificarLicencia(id, {
          plan: planEdit,
          ciclo: cicloEdit,
          fecha_expiracion: fechaExpiracionEdit,
        });
      } else {
        // Fallback si el servicio de actualización requiere otra estructura
        throw new Error(
          "La función de actualización no está disponible en los servicios.",
        );
      }
      Alert.alert(
        "Licencia actualizada",
        "Los cambios se han guardado correctamente.",
      );
      setLicenciaEditandoId(null);
      await cargar();
    } catch (e) {
      Alert.alert(
        "No se pudo actualizar",
        e instanceof Error ? e.message : "Error al actualizar la licencia.",
      );
    } finally {
      setGuardando(false);
    }
  };

  const revocar = (licencia: Licencia) => {
    const ejecutar = async () => {
      try {
        await revocarLicencia(licencia.id);
        await cargar();
      } catch (e) {
        Alert.alert(
          "No se pudo revocar",
          e instanceof Error ? e.message : "Error al revocar la licencia.",
        );
      }
    };
    Alert.alert(
      "Revocar licencia",
      `¿Quieres revocar la licencia ${licencia.codigo}?`,
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Revocar",
          style: "destructive",
          onPress: () => void ejecutar(),
        },
      ],
    );
  };

  return (
    <AppScreen
      title="Licencias"
      subtitle="Emisión, edición y estado de las licencias de la plataforma"
    >
      <PlataformaSection title="Emitir licencia">
        <Card>
          <ThemedText style={styles.label}>Plan</ThemedText>
          <View style={styles.chips}>
            {Object.values(PLANES_LICENCIA).map((item) => (
              <Chip
                key={item}
                selected={plan === item}
                label={item}
                onPress={() => setPlan(item)}
              />
            ))}
          </View>
          <ThemedText style={styles.label}>Ciclo</ThemedText>
          <View style={styles.chips}>
            {[
              CICLOS_FACTURACION.MENSUAL,
              CICLOS_FACTURACION.ANUAL,
              CICLOS_FACTURACION.TRIAL,
            ].map((item) => (
              <Chip
                key={item}
                selected={ciclo === item}
                label={item}
                onPress={() => setCiclo(item)}
              />
            ))}
          </View>
          <ThemedText style={styles.label}>
            Fecha de expiración (AAAA-MM-DD)
          </ThemedText>
          <TextInput
            value={fechaExpiracion}
            onChangeText={setFechaExpiracion}
            placeholder="AAAA-MM-DD"
            style={styles.input}
          />
          <Pressable
            disabled={guardando || !fechaExpiracion}
            onPress={() => void emitir()}
            style={[styles.primary, guardando && styles.disabled]}
          >
            {guardando ? (
              <ActivityIndicator color="white" />
            ) : (
              <ThemedText style={styles.primaryText}>
                Emitir licencia
              </ThemedText>
            )}
          </Pressable>
          <ThemedText style={styles.note}>
            La emisión crea una licencia sin asociarla a una empresa. La
            asignación se realiza durante el registro o activación de la
            organización.
          </ThemedText>
        </Card>
      </PlataformaSection>

      <PlataformaSection title={`Licencias registradas (${licencias.length})`}>
        <EstadoCarga
          cargando={cargando}
          error={error}
          onRetry={() => void cargar()}
        />
        {!cargando && !error && licencias.length === 0 ? (
          <Card>
            <ThemedText>No hay licencias registradas.</ThemedText>
          </Card>
        ) : null}
        {licencias.map((licencia: LicenciaResponse) => {
          const editando = licenciaEditandoId === licencia.id;
          // Se asume que el backend expone la relación de empresa como objeto 'empresa' con 'nombre_comercial' y 'razon_social'
          const nombreComercial = licencia.empresa?.nombre_comercial;
          const razonSocial = licencia.empresa?.razon_social;
          const infoEmpresa =
            `${nombreComercial ?? ""} (${razonSocial ?? ""})` ||
            licencia.empresa;

          return (
            <Card key={licencia.id}>
              <View style={styles.spaceBetween}>
                <ThemedText style={styles.licenseTitle}>
                  {licencia.plan} · {licencia.ciclo}
                </ThemedText>
                <ThemedText style={styles.status}>{licencia.estado}</ThemedText>
              </View>
              <ThemedText>Código: {licencia.codigo}</ThemedText>

              {/* Visualización de Nombre Comercial y Razón Social de la empresa */}
              <ThemedText style={styles.companyText}>
                Empresa:{" "}
                <ThemedText style={{ fontWeight: "700" }}>
                  {infoEmpresa}
                </ThemedText>
              </ThemedText>

              {editando ? (
                <View style={styles.editContainer}>
                  <ThemedText style={styles.label}>Editar Plan</ThemedText>
                  <View style={styles.chips}>
                    {Object.values(PLANES_LICENCIA).map((item) => (
                      <Chip
                        key={item}
                        selected={planEdit === item}
                        label={item}
                        onPress={() => setPlanEdit(item)}
                      />
                    ))}
                  </View>

                  <ThemedText style={styles.label}>Editar Ciclo</ThemedText>
                  <View style={styles.chips}>
                    {[
                      CICLOS_FACTURACION.MENSUAL,
                      CICLOS_FACTURACION.ANUAL,
                      CICLOS_FACTURACION.TRIAL,
                    ].map((item) => (
                      <Chip
                        key={item}
                        selected={cicloEdit === item}
                        label={item}
                        onPress={() => setCicloEdit(item)}
                      />
                    ))}
                  </View>

                  <ThemedText style={styles.label}>Nueva Expiración</ThemedText>
                  <TextInput
                    value={fechaExpiracionEdit}
                    onChangeText={setFechaExpiracionEdit}
                    style={styles.input}
                  />

                  <View style={styles.editActions}>
                    <Pressable
                      onPress={() => guardarEdicion(licencia.id)}
                      style={[styles.primary, { flex: 1 }]}
                    >
                      <ThemedText style={styles.primaryText}>
                        Guardar
                      </ThemedText>
                    </Pressable>
                    <Pressable
                      onPress={() => setLicenciaEditandoId(null)}
                      style={[styles.cancelBtn, { flex: 1 }]}
                    >
                      <ThemedText style={styles.cancelText}>
                        Cancelar
                      </ThemedText>
                    </Pressable>
                  </View>
                </View>
              ) : (
                <>
                  <ThemedText>
                    Vigencia: {licencia.fecha_inicio} –{" "}
                    {licencia.fecha_expiracion}
                  </ThemedText>
                  <View style={styles.actionRow}>
                    <Pressable
                      onPress={() => iniciarEdicion(licencia)}
                      style={styles.editBtn}
                    >
                      <ThemedText style={styles.editText}>
                        Editar licencia
                      </ThemedText>
                    </Pressable>
                    {licencia.estado !== ESTADOS_LICENCIA.CANCELADA &&
                    licencia.estado !== ESTADOS_LICENCIA.VENCIDA ? (
                      <Pressable
                        onPress={() => revocar(licencia)}
                        style={styles.danger}
                      >
                        <ThemedText style={styles.dangerText}>
                          Revocar licencia
                        </ThemedText>
                      </Pressable>
                    ) : null}
                  </View>
                </>
              )}
            </Card>
          );
        })}
      </PlataformaSection>
    </AppScreen>
  );
}

function Chip({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={[styles.chip, selected && styles.chipSelected]}
    >
      <ThemedText style={selected ? styles.chipTextSelected : undefined}>
        {label}
      </ThemedText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  label: { fontWeight: "700", marginTop: 5 },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginVertical: 4 },
  chip: {
    borderWidth: 1,
    borderColor: "#CBD5E1",
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 20,
  },
  chipSelected: { backgroundColor: "#1D4ED8", borderColor: "#1D4ED8" },
  chipTextSelected: { color: "white", fontWeight: "700" },
  input: {
    borderWidth: 1,
    borderColor: "#CBD5E1",
    borderRadius: 8,
    padding: 10,
    marginVertical: 6,
  },
  primary: {
    backgroundColor: "#1D4ED8",
    padding: 12,
    borderRadius: 8,
    alignItems: "center",
    marginTop: 8,
  },
  primaryText: { color: "white", fontWeight: "700" },
  disabled: { opacity: 0.55 },
  note: { lineHeight: 20, opacity: 0.75, marginTop: 8 },
  spaceBetween: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
  },
  licenseTitle: { fontWeight: "800", fontSize: 16 },
  status: { fontWeight: "700", color: "#1D4ED8" },
  companyText: { marginVertical: 4, color: "#334155" },
  actionRow: {
    flexDirection: "row",
    gap: 16,
    marginTop: 8,
    alignItems: "center",
  },
  editBtn: { paddingVertical: 6 },
  editText: { color: "#2563EB", fontWeight: "700" },
  danger: { paddingVertical: 6 },
  dangerText: { color: "#B91C1C", fontWeight: "700" },
  editContainer: {
    marginTop: 10,
    borderTopWidth: 1,
    borderTopColor: "#E2E8F0",
  },
  editActions: { flexDirection: "row", gap: 10, marginTop: 8 },
  cancelBtn: {
    backgroundColor: "#64748B",
    padding: 12,
    borderRadius: 8,
    alignItems: "center",
    marginTop: 8,
  },
  cancelText: { color: "white", fontWeight: "700" },
});
