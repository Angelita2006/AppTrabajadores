import React, { useEffect, useState } from "react";
import {
    Linking,
    Platform,
    Pressable,
    Text,
    TextInput,
    View,
} from "react-native";

interface MapaCentroSelectorProps {
  latitudCentro: number;
  longitudCentro: number;
  setLatitudCentro: (val: number) => void;
  setLongitudCentro: (val: number) => void;
  styles: any;
}

export default function MapaCentroSelector({
  latitudCentro,
  longitudCentro,
  setLatitudCentro,
  setLongitudCentro,
  styles,
}: MapaCentroSelectorProps) {
  const [LeafletComponents, setLeafletComponents] = useState<any>(null);
  const [isMounted, setIsMounted] = useState(false);

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
      import("react-leaflet").then((mod) => {
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
      });
    }
  }, []);

  const defaultLat = latitudCentro || 38.039878;
  const defaultLng = longitudCentro || -1.673394;

  if (!isMounted) return <View style={{ height: 220 }} />;

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
            center={[defaultLat, defaultLng]}
            zoom={15}
            style={{ width: "100%", height: "100%" }}
            key={`${defaultLat}-${defaultLng}`}
          >
            <MapResizer />
            <LeafletComponents.TileLayer
              attribution="&copy; OpenStreetMap contributors"
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            <ClickableMarkerInternal
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

            {/* Inputs editables para latitud y longitud en móvil */}
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
                  onChangeText={(val) => setLatitudCentro(parseFloat(val) || 0)}
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
                  onChangeText={(val) =>
                    setLongitudCentro(parseFloat(val) || 0)
                  }
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
              onPress={() =>
                Linking.openURL(
                  `https://www.google.com/maps/search/?api=1&query=${defaultLat},${defaultLng}`,
                )
              }
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

function MapResizer() {
  const { useMap } = require("react-leaflet");
  const map = useMap();
  useEffect(() => {
    const timer = setTimeout(() => {
      map.invalidateSize();
    }, 200);
    return () => clearTimeout(timer);
  }, [map]);
  return null;
}

function ClickableMarkerInternal({
  LeafletComponents,
  setLatitudCentro,
  setLongitudCentro,
}: any) {
  LeafletComponents.useMapEvents({
    click(e: any) {
      setLatitudCentro(Number(e.latlng.lat.toFixed(6)));
      setLongitudCentro(Number(e.latlng.lng.toFixed(6)));
    },
  });
  return null;
}
