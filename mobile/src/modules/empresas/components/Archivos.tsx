import api from "@/src/service/api/api";
import { useAppModal } from "@/src/shared/ui/AppModalNotification";
import React, { useEffect, useState } from "react";
import { ActivityIndicator, Image } from "react-native";

export const ImagenConToken = ({
  rutaRelativa,
  style,
}: {
  rutaRelativa: string;
  style: any;
}) => {
  const [imgUri, setImgUri] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const { mostrarError } = useAppModal();

  useEffect(() => {
    let isMounted = true;
    const fetchProtectedImage = async () => {
      try {
        if (!rutaRelativa) return;

        // Limpiamos y formateamos la ruta para Axios
        let endpoint = rutaRelativa;
        if (endpoint.startsWith("/static/")) {
          endpoint = endpoint.replace("/static/", "/api/archivos/");
        } else if (!endpoint.startsWith("/api/archivos/")) {
          endpoint = `/api/archivos${endpoint.startsWith("/") ? "" : "/"}${endpoint}`;
        }

        // AQUÍ SÍ USAMOS AXIOS -> Se envía el token automáticamente en los headers
        const response = await api.get(endpoint, { responseType: "blob" });

        // Convertimos el blob a una URI local utilizable por React Native / Web
        // Nota: En React Native puro a veces se requiere un FileReader o librería de blob,
        // pero en entorno Web / Expo funciona con URL.createObjectURL.
        const reader = new FileReader();
        reader.readAsDataURL(response.data);
        reader.onloadend = () => {
          if (isMounted) {
            setImgUri(reader.result as string);
            setLoading(false);
          }
        };
      } catch (error: any) {
        mostrarError("Error al cargar imagen protegida con token: " + error);
        if (isMounted) setLoading(false);
      }
    };

    fetchProtectedImage();
    return () => {
      isMounted = false;
    };
  }, [rutaRelativa]);

  if (loading) return <ActivityIndicator style={style} />;
  if (!imgUri) return null;

  return <Image source={{ uri: imgUri }} style={style} resizeMode="cover" />;
};
