import { ThemedText } from "@/src/shared/components/themed-text";
import { Row } from "@/src/shared/ui/AppSurface";
import { obtenerMensajeAmigableError } from "@/src/utils/errorHandler";
import { Picker } from "@react-native-picker/picker";
import React, { useState } from "react";
import { Alert, Platform, Pressable, TextInput, View } from "react-native";
import { CentroTrabajo } from "../../centros-trabajo/types/centro-trabajo";
import {
  crearDepartamento,
  editarDepartamento,
  eliminarDepartamento,
} from "../../departamentos/api/services";
import { Departamento } from "../../departamentos/types/departamento";

export default function TabDepartamentos({
  departamentosEmpresa,
  setDepartamentosEmpresa,
  centrosEmpresa,
  empresaSeleccionada,
  guardando,
  setGuardando,
  styles,
}: any) {
  const [mostrarFormDepartamento, setMostrarFormDepartamento] = useState(false);
  const [nombreDepto, setNombreDepto] = useState("");
  const [departamentoEnEdicion, setDepartamentoEnEdicion] =
    useState<Departamento | null>(null);
  const [centroTrabajoId, setCentroTrabajoId] = useState<string | null>(null);

  // ==========================================
  // CREACIÓN DE DEPARTAMENTOS
  // ==========================================
  const handleCrearDepartamento = async () => {
    if (!nombreDepto.trim() || !empresaSeleccionada?.id) return;

    try {
      const nuevoDepto = await crearDepartamento({
        empresa_id: empresaSeleccionada.id,
        nombre: nombreDepto,
        centro_trabajo_id: centroTrabajoId,
      });

      setDepartamentosEmpresa([...departamentosEmpresa, nuevoDepto]);
      setNombreDepto("");
      setCentroTrabajoId(null);
      setMostrarFormDepartamento(false);
    } catch (error: any) {
      const mensajeAmigable = obtenerMensajeAmigableError(error);
      console.error("Error al crear departamento:", error);
      if (Platform.OS === "web") {
        alert(`Error al crear departamento: ${mensajeAmigable}`);
      } else {
        Alert.alert("Error", mensajeAmigable);
      }
    }
  };

  // ==========================================
  // EDICIÓN DE DEPARTAMENTOS
  // ==========================================
  const handleEditarDepartamento = async () => {
    if (!departamentoEnEdicion) return;

    try {
      setGuardando(true);
      const payload = {
        nombre: nombreDepto,
        centro_trabajo_id: centroTrabajoId || undefined,
      };

      await editarDepartamento(departamentoEnEdicion.id, payload);

      setDepartamentosEmpresa((prev: Departamento[]) =>
        prev.map((d: Departamento) =>
          d.id === departamentoEnEdicion.id ? { ...d, ...payload } : d,
        ),
      );

      Alert.alert("Éxito", "Departamento actualizado.");

      setMostrarFormDepartamento(false);
      setDepartamentoEnEdicion(null);
      setNombreDepto("");
      setCentroTrabajoId(null);
    } catch (error: any) {
      const mensajeAmigable = obtenerMensajeAmigableError(error);
      if (Platform.OS === "web") {
        alert(`Error: ${mensajeAmigable}`);
      } else {
        Alert.alert("Error", mensajeAmigable);
      }
    } finally {
      setGuardando(false);
    }
  };

  // ==========================================
  // ELIMINACIÓN DE DEPARTAMENTOS
  // ==========================================
  const handleEliminarDepartamento = async (
    departamentoId: string,
    nombreDepto: string = "este departamento",
  ) => {
    const ejecutarEliminacion = async () => {
      try {
        setGuardando(true);
        await eliminarDepartamento(departamentoId);
        setDepartamentosEmpresa((prev: Departamento[]) =>
          prev.filter((d: Departamento) => d.id !== departamentoId),
        );
        Alert.alert("Éxito", "Departamento eliminado correctamente.");
      } catch (error: any) {
        const mensajeApi = error?.response?.data?.detail || error?.message;

        const mensajeAmigable =
          mensajeApi || obtenerMensajeAmigableError(error);

        if (Platform.OS === "web") {
          alert(`Acción Bloqueada: ${mensajeAmigable}`);
        } else {
          Alert.alert(
            "Acción Bloqueada",
            mensajeAmigable ||
              `No se puede eliminar el departamento "${nombreDepto}" porque hay empleados con contratos activos asignados a él.`,
          );
        }
      } finally {
        setGuardando(false);
      }
    };

    if (Platform.OS === "web") {
      const confirmado = window.confirm(
        `¿Deseas eliminar el departamento "${nombreDepto}"?`,
      );
      if (confirmado) {
        ejecutarEliminacion();
      }
    } else {
      Alert.alert(
        "Confirmar",
        `¿Deseas eliminar el departamento "${nombreDepto}"?`,
        [
          { text: "Cancelar", style: "cancel" },
          {
            text: "Eliminar",
            style: "destructive",
            onPress: ejecutarEliminacion,
          },
        ],
      );
    }
  };

  return (
    <View>
      <Pressable
        style={[
          styles.botonAccionHeader,
          {
            backgroundColor: mostrarFormDepartamento ? "#64748B" : "#7C3AED",
          },
        ]}
        onPress={() => {
          if (!mostrarFormDepartamento) {
            setNombreDepto("");
            setCentroTrabajoId(null);
          }
          setMostrarFormDepartamento(!mostrarFormDepartamento);
          setDepartamentoEnEdicion(null); // Cierra cualquier edición activa
        }}
      >
        <ThemedText style={styles.textoBotonGuardar}>
          {mostrarFormDepartamento ? "✕ Cancelar" : "＋ Añadir Departamento"}
        </ThemedText>
      </Pressable>

      {mostrarFormDepartamento && (
        <View style={styles.contenedorFormDesplegado}>
          <ThemedText style={styles.formularioTitulo}>
            Nuevo Departamento
          </ThemedText>
          <View style={styles.campoFormulario}>
            <ThemedText style={styles.labelInput}>
              Nombre del Departamento *
            </ThemedText>
            <TextInput
              style={styles.inputForm}
              value={nombreDepto}
              onChangeText={setNombreDepto}
              placeholder="Ej. Recursos Humanos"
            />
          </View>
          <View style={styles.campoFormulario}>
            <ThemedText style={styles.labelInput}>Centro de Trabajo</ThemedText>
            <Picker
              selectedValue={centroTrabajoId}
              onValueChange={setCentroTrabajoId}
            >
              <Picker.Item label="Seleccionar centro..." value={null} />
              {centrosEmpresa.map((ct: CentroTrabajo) => (
                <Picker.Item key={ct.id} label={ct.nombre} value={ct.id} />
              ))}
            </Picker>
          </View>
          <Pressable
            style={[styles.botonGuardar, { backgroundColor: "#7C3AED" }]}
            onPress={handleCrearDepartamento}
          >
            <ThemedText style={styles.textoBotonGuardar}>
              Guardar Departamento
            </ThemedText>
          </Pressable>
        </View>
      )}

      <ThemedText style={styles.subseccionTitulo}>
        Departamentos Activos
      </ThemedText>

      {departamentosEmpresa.map((dept: Departamento) => {
        const centro: CentroTrabajo = centrosEmpresa.find(
          (c: CentroTrabajo) => c.id === dept.centro_trabajo_id,
        );

        return (
          <View key={dept.id}>
            <View
              style={[
                styles.itemListaEstructural,
                {
                  flexDirection: "row",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: 10,
                },
              ]}
            >
              <View>
                <ThemedText style={styles.nombreElementoLista}>
                  {dept.nombre}
                </ThemedText>
                <ThemedText style={{ fontSize: 12, color: "#64748B" }}>
                  {centro ? `📍 ${centro.nombre}` : "Sin centro asignado"}
                </ThemedText>
              </View>

              <Row>
                <Pressable
                  style={{
                    backgroundColor: "#475569",
                    paddingHorizontal: 14,
                    paddingVertical: 8,
                    borderRadius: 16,
                    marginRight: 8,
                  }}
                  onPress={() => {
                    if (departamentoEnEdicion?.id === dept.id) {
                      setDepartamentoEnEdicion(null);
                    } else {
                      setDepartamentoEnEdicion(dept);
                      setNombreDepto(dept.nombre);
                      setCentroTrabajoId(dept.centro_trabajo_id || null);
                      setMostrarFormDepartamento(false);
                    }
                  }}
                >
                  <ThemedText>✏️</ThemedText>
                </Pressable>
                <Pressable
                  style={{
                    backgroundColor: "#fee2e2",
                    paddingHorizontal: 14,
                    paddingVertical: 8,
                    borderRadius: 16,
                  }}
                  onPress={() => handleEliminarDepartamento(dept.id)}
                >
                  <ThemedText style={{ color: "#ef4444" }}>🗑</ThemedText>
                </Pressable>
              </Row>
            </View>

            {/* Formulario de EDICIÓN */}
            {departamentoEnEdicion?.id === dept.id && (
              <View style={styles.contenedorFormDesplegado}>
                <ThemedText style={styles.formularioTitulo}>
                  Editar: {dept.nombre}
                </ThemedText>
                <TextInput
                  style={styles.inputForm}
                  value={nombreDepto}
                  onChangeText={setNombreDepto}
                />
                <Picker
                  selectedValue={centroTrabajoId}
                  onValueChange={setCentroTrabajoId}
                >
                  <Picker.Item label="Seleccionar centro..." value={null} />
                  {centrosEmpresa.map((ct: CentroTrabajo) => (
                    <Picker.Item key={ct.id} label={ct.nombre} value={ct.id} />
                  ))}
                </Picker>
                <Pressable
                  style={[
                    styles.botonGuardar,
                    { backgroundColor: "#7C3AED", marginTop: 10 },
                  ]}
                  onPress={() => {
                    handleEditarDepartamento();
                    setDepartamentoEnEdicion(null);
                  }}
                >
                  <ThemedText style={styles.textoBotonGuardar}>
                    Actualizar Cambios
                  </ThemedText>
                </Pressable>
                <Pressable
                  onPress={() => setDepartamentoEnEdicion(null)}
                  style={{ marginTop: 10 }}
                >
                  <ThemedText
                    style={{
                      textAlign: "center",
                      color: "#525153",
                    }}
                  >
                    Cancelar
                  </ThemedText>
                </Pressable>
              </View>
            )}
          </View>
        );
      })}
    </View>
  );
}
