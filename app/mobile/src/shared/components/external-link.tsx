import { Href, Link } from "expo-router";
import {
  openBrowserAsync,
  WebBrowserPresentationStyle,
} from "expo-web-browser";
import { type ComponentProps } from "react";

/**
 * Propiedades para el componente ExternalLink.
 * Modifica la propiedad 'href' original de Expo Router para asegurar que use rutas válidas.
 */
type Props = Omit<ComponentProps<typeof Link>, "href"> & {
  /** La URL o enlace externo que se desea abrir (ej: 'https://google.com'). */
  href: Href & string;
};

/**
 * Componente interactivo para abrir enlaces de forma segura fuera de la aplicación.
 * Abre una pestaña nueva en la web, o un navegador interno integrado en celulares (iOS/Android).
 */
export function ExternalLink({ href, ...rest }: Props) {
  return (
    <Link
      target="_blank" // Abre en pestaña nueva si se ejecuta en una computadora (Navegador Web)
      {...rest}
      href={href}
      onPress={async (event) => {
        // Verifica si la aplicación se está ejecutando en un celular
        if (process.env.EXPO_OS !== "web") {
          // 1. Cancela la acción por defecto para que el teléfono no abra Google Chrome o Safari fuera de tu app
          event.preventDefault();

          // 2. Abre el enlace en una ventana interna sin sacar al usuario de tu aplicación
          await openBrowserAsync(href, {
            presentationStyle: WebBrowserPresentationStyle.AUTOMATIC, // Estilo visual automático según el sistema del celular
          });
        }
      }}
    />
  );
}
