import { ThemedText } from "@/src/shared/components/ThemedText";
import React from "react";
import { Pressable, TextInput, View } from "react-native";

/**
 * Propiedades requeridas por el componente TabFiscal.
 */
interface TabFiscalProps {
  /** Valor actual del campo de razón social. */
  razonSocialInput: string;
  /** Función para actualizar el estado de la razón social. */
  setRazonSocialInput: (text: string) => void;
  /** Valor actual del campo de convenio colectivo. */
  convenioInput: string;
  /** Función para actualizar el estado del convenio colectivo. */
  setConvenioInput: (text: string) => void;
  /** Valor actual del campo de código CNAE. */
  cnaeInput: string;
  /** Función para actualizar el estado del código CNAE. */
  setCnaeInput: (text: string) => void;
  /** Valor actual del campo de dirección social. */
  direccionInput: string;
  /** Función para actualizar el estado de la dirección social. */
  setDireccionInput: (text: string) => void;
  /** Función manejadora para guardar los cambios en la información fiscal de la empresa. */
  handleGuardarDatosEmpresa: () => void;
  /** Estado booleano que indica si se está ejecutando una operación de guardado/carga. */
  guardando: boolean;
  /** Objeto de estilos personalizados de la aplicación. */
  styles: any;
}

/**
 * Componente que gestiona la pestaña de información fiscal de la empresa,
 * permitiendo visualizar y modificar datos como la razón social, convenio, CNAE y dirección.
 *
 * @component
 * @param {TabFiscalProps} props - Propiedades del componente.
 */
export default function TabFiscal({
  razonSocialInput,
  setRazonSocialInput,
  convenioInput,
  setConvenioInput,
  cnaeInput,
  setCnaeInput,
  direccionInput,
  setDireccionInput,
  handleGuardarDatosEmpresa,
  guardando,
  styles,
}: TabFiscalProps) {
  return (
    <View>
      <ThemedText style={styles.formularioTitulo}>
        Información Fiscal
      </ThemedText>

      <View style={styles.campoFormulario}>
        <ThemedText style={styles.labelInput}>Razón Social</ThemedText>
        <TextInput
          style={styles.inputForm}
          value={razonSocialInput}
          onChangeText={setRazonSocialInput}
          placeholder="Ej. Mi Empresa S.L."
        />
      </View>

      <View style={styles.campoFormulario}>
        <ThemedText style={styles.labelInput}>Convenio Colectivo</ThemedText>
        <TextInput
          style={styles.inputForm}
          value={convenioInput}
          onChangeText={setConvenioInput}
          placeholder="Ej. Convenio Colectivo General..."
        />
      </View>

      <View style={styles.campoFormulario}>
        <ThemedText style={styles.labelInput}>Código CNAE</ThemedText>
        <TextInput
          style={styles.inputForm}
          value={cnaeInput}
          onChangeText={setCnaeInput}
          keyboardType="numeric"
          placeholder="Ej. 6201"
        />
      </View>

      <View style={styles.campoFormulario}>
        <ThemedText style={styles.labelInput}>Dirección Social</ThemedText>
        <TextInput
          style={styles.inputForm}
          value={direccionInput}
          onChangeText={setDireccionInput}
          placeholder="Ej. Calle Principal 123"
        />
      </View>

      <Pressable
        style={styles.botonGuardar}
        onPress={handleGuardarDatosEmpresa}
        disabled={guardando}
      >
        <ThemedText style={styles.textoBotonGuardar}>
          Actualizar Información Fiscal
        </ThemedText>
      </Pressable>
    </View>
  );
}
