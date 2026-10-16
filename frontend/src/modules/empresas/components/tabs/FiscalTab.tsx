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
  /** Si el usuario tiene autorización para modificar los datos fiscales */
  puedeModificar?: boolean;
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
  puedeModificar = true,
}: TabFiscalProps) {
  return (
    <View>
      <ThemedText style={styles.formularioTitulo}>
        Información Fiscal
      </ThemedText>

      <View style={styles.campoFormulario}>
        <ThemedText style={styles.labelInput}>Razón Social</ThemedText>
        <TextInput
          style={[styles.inputForm, !puedeModificar && { opacity: 0.7 }]}
          value={razonSocialInput}
          onChangeText={setRazonSocialInput}
          editable={puedeModificar}
          placeholder="Ej. Mi Empresa S.L."
        />
      </View>

      <View style={styles.campoFormulario}>
        <ThemedText style={styles.labelInput}>Convenio Colectivo</ThemedText>
        <TextInput
          style={[styles.inputForm, !puedeModificar && { opacity: 0.7 }]}
          value={convenioInput}
          onChangeText={setConvenioInput}
          editable={puedeModificar}
          placeholder="Ej. Convenio Colectivo General..."
        />
      </View>

      <View style={styles.campoFormulario}>
        <ThemedText style={styles.labelInput}>Código CNAE</ThemedText>
        <TextInput
          style={[styles.inputForm, !puedeModificar && { opacity: 0.7 }]}
          value={cnaeInput}
          onChangeText={setCnaeInput}
          editable={puedeModificar}
          keyboardType="numeric"
          placeholder="Ej. 6201"
        />
      </View>

      <View style={styles.campoFormulario}>
        <ThemedText style={styles.labelInput}>Dirección Social</ThemedText>
        <TextInput
          style={[styles.inputForm, !puedeModificar && { opacity: 0.7 }]}
          value={direccionInput}
          onChangeText={setDireccionInput}
          editable={puedeModificar}
          placeholder="Ej. Calle Principal 123"
        />
      </View>

      {puedeModificar && (
        <Pressable
          style={styles.botonGuardar}
          onPress={handleGuardarDatosEmpresa}
          disabled={guardando}
        >
          <ThemedText style={styles.textoBotonGuardar}>
            {guardando ? "Guardando..." : "Actualizar Información Fiscal"}
          </ThemedText>
        </Pressable>
      )}
    </View>
  );
}
