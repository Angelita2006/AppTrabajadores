import { AppColorScheme } from "../constants/theme";
import { useTemaStore } from "../modules/tema/store/temaStore";

/** Devuelve el tema elegido por la persona, no el tema del sistema operativo. */
export function useColorScheme(): AppColorScheme {
  return useTemaStore((state) => state.tema);
}
