import { Href, Link } from "expo-router";
import {
  openBrowserAsync,
  WebBrowserPresentationStyle,
} from "expo-web-browser";
import { type ComponentProps } from "react";

type Props = Omit<ComponentProps<typeof Link>, "href"> & {
  href: Href & string;
};

// Componente ExternalLink que extiende el componente Link de expo-router para abrir enlaces externos en un navegador web.
// Recibe las siguientes props:
// - href: la URL del enlace externo a abrir, que debe ser una cadena de texto válida.
// - ...rest: cualquier otra prop que se desee pasar al componente Link, como estilos, clases, etc.
export function ExternalLink({ href, ...rest }: Props) {
  return (
    <Link
      target="_blank"
      {...rest}
      href={href}
      onPress={async (event) => {
        if (process.env.EXPO_OS !== "web") {
          // Prevent the default behavior of linking to the default browser on native.
          event.preventDefault();
          // Open the link in an in-app browser.
          await openBrowserAsync(href, {
            presentationStyle: WebBrowserPresentationStyle.AUTOMATIC,
          });
        }
      }}
    />
  );
}
