import { mostrarError, mostrarMensaje } from "@/src/utils/errorHandler";
import React, { useEffect, useState } from "react";
import {
  Linking,
  Platform,
  Pressable,
  Text,
  TextInput,
  View,
} from "react-native";

/**
 * Propiedades requeridas por el componente de selección geográfica.
 */
interface SelectorUbicacionMapaProps {
  /** Coordenada de latitud actual del centro. */
  latitudCentro: number;
  /** Coordenada de longitud actual del centro. */
  longitudCentro: number;
  /** Función para actualizar el estado de la latitud. */
  setLatitudCentro: (val: number) => void;
  /** Función para actualizar el estado de la longitud. */
  setLongitudCentro: (val: number) => void;
  /** Objeto de estilos personalizados de la aplicación. */
  styles: any;
}

/**
 * Componente multiplataforma para la selección y visualización de coordenadas geográficas.
 * Utiliza Leaflet de forma dinámica en entorno web y campos de texto con enlace externo en móvil.
 *
 * @component
 * @param {SelectorUbicacionMapaProps} props - Propiedades del componente.
 */
export default function SelectorUbicacionMapa({
  latitudCentro,
  longitudCentro,
  setLatitudCentro,
  setLongitudCentro,
  styles,
}: SelectorUbicacionMapaProps) {
  const [LeafletComponents, setLeafletComponents] = useState<any>(null);
  const [isMounted, setIsMounted] = useState(false);

  /**
   * Efecto de inicialización que carga dinámicamente los estilos y componentes
   * de Leaflet exclusivamente si se ejecuta en una plataforma web.
   */
  useEffect(() => {
    setIsMounted(true);
    if (Platform.OS === "web") {
      if (!document.getElementById("leaflet-css")) {
        const link = document.createElement("link");
        link.id = "leaflet-css";
        link.rel = "stylesheet";
        link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
        document.head.appendChild(link);
      }
      import("react-leaflet")
        .then((mod) => {
          const L = require("leaflet");
          delete L.Icon.Default.prototype._getIconUrl;
          L.Icon.Default.mergeOptions({
            iconRetinaUrl:
              "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png",
            iconUrl:
              "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
            shadowUrl:
              "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
          });
          setLeafletComponents({
            MapContainer: mod.MapContainer,
            TileLayer: mod.TileLayer,
            Marker: mod.Marker,
            useMapEvents: mod.useMapEvents,
            useMap: mod.useMap,
          });
        })
        .catch((error: any) => {
          mostrarError(
            "Error al cargar los componentes del mapa interactivo: " + error,
          );
        });
    }
  }, []);

  const latitudPredeterminada = latitudCentro || 38.039878;
  const longitudPredeterminada = longitudCentro || -1.673394;

  if (!isMounted) return <View style={{ height: 220 }} />;

  const handleAbrirGoogleMaps = async () => {
    try {
      const url = `https://www.google.com/maps/search/?api=1&query=${latitudPredeterminada},${longitudPredeterminada}`;
      const soportado = await Linking.canOpenURL(url);
      if (soportado) {
        await Linking.openURL(url);
      } else {
        mostrarMensaje(
          "Alerta",
          "No es posible abrir la aplicación de mapas en este dispositivo.",
        );
      }
    } catch (error: any) {
      mostrarError("Error al intentar abrir Google Maps: " + error);
    }
  };

  return (
    <View style={{ marginBottom: 16 }}>
      <Text style={styles.labelInput}>Ubicación Geográfica del Centro</Text>
      <View
        style={{
          height: 220,
          borderRadius: 12,
          borderWidth: 1,
          borderColor: "#CBD5E1",
          overflow: "hidden",
          backgroundColor: "#F1F5F9",
          marginBottom: 8,
          position: "relative",
        }}
      >
        {Platform.OS === "web" && LeafletComponents ? (
          <LeafletComponents.MapContainer
            center={[latitudPredeterminada, longitudPredeterminada]}
            zoom={15}
            style={{ width: "100%", height: "100%" }}
            key={`${latitudPredeterminada}-${longitudPredeterminada}`}
          >
            <RedimensionadorMapa />
            <LeafletComponents.TileLayer
              attribution="&copy; OpenStreetMap contributors"
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            <MarcadorInteractivoMapa
              LeafletComponents={LeafletComponents}
              setLatitudCentro={setLatitudCentro}
              setLongitudCentro={setLongitudCentro}
            />
            {latitudCentro !== 0 && longitudCentro !== 0 && (
              <LeafletComponents.Marker
                position={[latitudCentro, longitudCentro]}
              />
            )}
          </LeafletComponents.MapContainer>
        ) : (
          <View
            style={{
              flex: 1,
              justifyContent: "center",
              alignItems: "center",
              padding: 16,
            }}
          >
            <Text style={{ fontSize: 24, marginBottom: 4 }}>📍</Text>
            <Text
              style={{
                fontSize: 12,
                fontWeight: "bold",
                textAlign: "center",
                color: "#1E293B",
              }}
            >
              {latitudCentro && longitudCentro
                ? `Lat: ${latitudCentro}, Lon: ${longitudCentro}`
                : "Sin coordenadas seleccionadas"}
            </Text>

            {/* Inputs editables para latitud y longitud en dispositivos móviles */}
            <View
              style={{
                flexDirection: "row",
                width: "100%",
                gap: 8,
                marginBottom: 8,
              }}
            >
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 10, color: "#64748B" }}>Latitud</Text>
                <TextInput
                  style={[
                    styles.inputForm,
                    { fontSize: 12, paddingVertical: 4, height: 32 },
                  ]}
                  value={latitudCentro ? latitudCentro.toString() : ""}
                  onChangeText={(val) => {
                    if (val === "" || val === "-") {
                      setLatitudCentro(0);
                      return;
                    }
                    const parsed = parseFloat(val);
                    if (!isNaN(parsed)) setLatitudCentro(parsed);
                  }}
                  keyboardType="numeric"
                  placeholder="Ej. 38.0398"
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 10, color: "#64748B" }}>Longitud</Text>
                <TextInput
                  style={[
                    styles.inputForm,
                    { fontSize: 12, paddingVertical: 4, height: 32 },
                  ]}
                  value={longitudCentro ? longitudCentro.toString() : ""}
                  onChangeText={(val) => {
                    if (val === "" || val === "-") {
                      setLongitudCentro(0);
                      return;
                    }
                    const parsed = parseFloat(val);
                    if (!isNaN(parsed)) setLongitudCentro(parsed);
                  }}
                  keyboardType="numeric"
                  placeholder="Ej. -1.6733"
                />
              </View>
            </View>

            <Pressable
              style={{
                backgroundColor: "#2563EB",
                paddingHorizontal: 12,
                paddingVertical: 6,
                borderRadius: 6,
                marginTop: 8,
              }}
              onPress={handleAbrirGoogleMaps}
            >
              <Text style={{ color: "#FFF", fontSize: 11, fontWeight: "600" }}>
                Abrir en Google Maps
              </Text>
            </Pressable>
          </View>
        )}
      </View>
      <Text style={{ fontSize: 11, color: "#64748B", fontStyle: "italic" }}>
        {Platform.OS === "web"
          ? "💡 Haz clic en el mapa para fijar la ubicación exacta."
          : "💡 Usa el botón para verificar en Google Maps."}
      </Text>
    </View>
  );
}

/**
 * Componente auxiliar interno para forzar la actualización del tamaño del mapa web.
 */
function RedimensionadorMapa() {
  const { useMap } = require("react-leaflet");
  const mapa = useMap();
  useEffect(() => {
    const temporizador = setTimeout(() => {
      mapa.invalidateSize();
    }, 200);
    return () => clearTimeout(temporizador);
  }, [mapa]);
  return null;
}

/**
 * Componente auxiliar interno para gestionar los eventos de clic sobre el mapa web y fijar coordenadas.
 * Utiliza el hook `useMapEvents` de react-leaflet para escuchar clics del usuario.
 *
 * @component
 * @param {Object} props - Propiedades del componente.
 * @param {any} props.LeafletComponents - Objeto que contiene los componentes de react-leaflet cargados dinámicamente.
 * @param {(val: number) => void} props.setLatitudCentro - Función para actualizar la latitud en el componente principal.
 * @param {(val: number) => void} props.setLongitudCentro - Función para actualizar la longitud en el componente principal.
 * @returns {null} Este componente no renderiza elementos visuales en pantalla.
 */
function MarcadorInteractivoMapa({
  LeafletComponents,
  setLatitudCentro,
  setLongitudCentro,
}: any) {
  // Suscripción a los eventos del mapa provistos por Leaflet
  LeafletComponents.useMapEvents({
    /**
     * Manejador que se ejecuta al hacer clic en cualquier punto del mapa.
     * Extrae las coordenadas geográficas, las redondea a 6 decimales para mayor precisión y actualiza el estado.
     *
     * @param {Object} e - Evento de clic de Leaflet que contiene latlng.
     */
    click(e: any) {
      // Actualiza la latitud formateada a 6 decimales
      setLatitudCentro(Number(e.latlng.lat.toFixed(6)));
      // Actualiza la longitud formateada a 6 decimales
      setLongitudCentro(Number(e.latlng.lng.toFixed(6)));
    },
  });
  return null;
}
