import { BottomTabBarButtonProps } from "@react-navigation/bottom-tabs";
import { PlatformPressable } from "@react-navigation/elements";
import * as Haptics from "expo-haptics";

// Componente HapticTab que envuelve el componente PlatformPressable de react-navigation para agregar retroalimentación
// háptica al presionar las pestañas de navegación inferior.
// Recibe las siguientes props:
// - onPressIn: una función que se ejecuta cuando se presiona la pestaña, y que se encarga de generar una retroalimentación
// háptica suave en dispositivos iOS utilizando el módulo Haptics de Expo.
// En la aplicación se utiliza este componente como el botón de pestaña personalizado en la configuración del navegador de pestañas,
// lo que permite que cada vez que el usuario presione una pestaña, se sienta una pequeña vibración gracias al método Haptics.impactAsync
// que hace que el dispositivo vibre y mejora la experiencia de usuario.
export function HapticTab(props: BottomTabBarButtonProps) {
  return (
    <PlatformPressable
      {...props}
      onPressIn={(ev) => {
        if (process.env.EXPO_OS === "ios") {
          // Add a soft haptic feedback when pressing down on the tabs.
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        }
        props.onPressIn?.(ev);
      }}
    />
  );
}
