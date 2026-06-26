import { BottomTabBarButtonProps } from "@react-navigation/bottom-tabs";
import { PlatformPressable } from "@react-navigation/elements";
import * as Haptics from "expo-haptics";

/**
 * Botón de pestaña personalizado con respuesta háptica.
 *
 * Envuelve el componente `PlatformPressable` de React Navigation para añadir
 * una vibración suave (háptica) al presionar las opciones de la barra inferior.
 * Actualmente la vibración ligera se activa exclusivamente en dispositivos iOS.
 * Utiliza la optimización moderna de Expo para reducir el peso de la app en producción.
 *
 * @param props - Propiedades nativas del botón de la barra de pestañas de React Navigation.
 * @param {Function} [props.onPressIn] - Evento disparado al presionar el botón, usado aquí para activar el efecto háptico.
 */
export function HapticTab(props: BottomTabBarButtonProps) {
  return (
    <PlatformPressable
      {...props}
      onPressIn={(ev) => {
        if (
          process.env.EXPO_OS === "ios" ||
          process.env.EXPO_OS === "android"
        ) {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        }
        props.onPressIn?.(ev);
      }}
    />
  );
}
