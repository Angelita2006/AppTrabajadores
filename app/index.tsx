import { useRouter } from "expo-router";
import { useEffect } from "react";
import { useTrabajador } from "../context/TrabajadorContext";
import { getTrabajadorById } from "../src/services/trabajadoresService";
import { useAuthStore } from "../store/authStore";

export default function IndexRedirect() {
  const router = useRouter();
  const { user, loading } = useAuthStore();

  const { setTrabajadorActual } = useTrabajador();

  useEffect(() => {
    if (loading) return;

    if (user) {
      const trabajador = getTrabajadorById(user.id);
      setTrabajadorActual(trabajador);
      router.replace("/(protected)/home" as unknown as any);
    } else {
      router.replace("/(public)/login" as unknown as any);
    }
  }, [loading, user, router, setTrabajadorActual]);

  return null;
}
