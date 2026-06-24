import { Redirect } from "expo-router";

/**
 * Redirección técnica estructural obligatoria.
 * Toda la lógica unificada de Mi Perfil se gestiona en la raíz (app/index.tsx).
 * Este archivo se anula para impedir solapamientos en la pila de Expo Router.
 */
export default function PerfilRedirectOculto() {
  return <Redirect href="/" />;
}
