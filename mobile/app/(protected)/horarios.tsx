import { AsignacionTurno } from "@/src/modules/asignaciones-turno/types/asignacion-turno";
import { obtenerAsignacionesTurnoTrabajador } from "@/src/modules/trabajadores/api/services";
import { useSesion } from "@/src/modules/trabajadores/store/SesionContext";
import { obtenerTurno } from "@/src/modules/turnos/services/services";
import { ItemTurno, Turno } from "@/src/modules/turnos/types/turno";
import { ThemedText } from "@/src/shared/components/themed-text";
import { AppScreen, Card, Row, StatCard } from "@/src/shared/ui/AppSurface";
import { IconSymbol } from "@/src/shared/ui/icon-symbol";
import * as Crypto from "expo-crypto";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  StyleSheet,
  View,
} from "react-native";

export default function HorariosScreen() {
  const { usuarioActual, empresaSeleccionada } = useSesion();
  const [cuadrante, setCuadrante] = useState<ItemTurno[]>([]);
  // const [turnos, setTurnos] = useState<Turno[]>([]);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    // Declaramos la función de red aquí adentro.
    // Al ser local, encapsula sus dependencias y elimina advertencias de ESLint.
    const cargarPlanificacionHoraria = async () => {
      try {
        setCargando(true);

        const asignaciones: AsignacionTurno[] =
          await obtenerAsignacionesTurnoTrabajador(
            usuarioActual!.trabajador_id,
          );

        let turnos: ItemTurno[] = [];

        // REPARACIÓN ASÍNCRONA: Usamos for...of para que JavaScript respete estrictamente los 'await'
        for (const asignacion_turno of asignaciones) {
          if (
            asignacion_turno.fecha_fin !== null &&
            asignacion_turno.fecha_fin !== undefined
          ) {
            const fecha_inicio = new Date(asignacion_turno.fecha_inicio);
            const fecha_fin = new Date(asignacion_turno.fecha_fin);

            // CÁLCULO CRONOLÓGICO SEGURO: Restamos milisegundos puros y convertimos a días reales.
            // Esto funciona a la perfección incluso si el turno cambia de mes o de año.
            const diferenciaMilisegundos =
              fecha_fin.getTime() - fecha_inicio.getTime();
            const dias_asignados = Math.floor(
              diferenciaMilisegundos / (1000 * 60 * 60 * 24),
            );

            // Descargamos el objeto base del turno desde FastAPI una sola vez antes de entrar al for
            const turno: Turno = await obtenerTurno(asignacion_turno.turno_id);

            // Clonamos la fecha de inicio para ir incrementándola de forma limpia sin romper el cursor original
            let fechaCursor = new Date(fecha_inicio);

            for (let i = 0; i <= dias_asignados; i++) {
              // CONGELAMOS EL INSTANTE: Creamos una copia inmutable para esta iteración específica
              const fechaInstanteActual = new Date(fechaCursor);

              const itemTurno: ItemTurno = {
                id: Crypto.randomUUID(),
                turno_id: turno.id,
                empresa_id: turno.empresa_id,
                // Guardamos el texto legible: "lunes", "martes", "miércoles"...
                nombre: fechaInstanteActual.toLocaleDateString("es-ES", {
                  weekday: "long",
                }),
                hora_inicio: turno.hora_inicio,
                hora_fin: turno.hora_fin,
                minutos_pausa_obligatoria: turno.minutos_pausa_obligatoria,
                color_hex: turno.color_hex,
                // STRING PURO: Guardamos el texto "2026-06-24" limpio para que el sort() no falle
                fecha_real: fechaInstanteActual.toISOString().split("T")[0],
              };

              turnos.push(itemTurno);

              // Incrementamos de forma segura el cursor hacia el siguiente día
              fechaCursor.setDate(fechaCursor.getDate() + 1);
            }
          }
        }

        // ALGORITMO DE ORDENACIÓN DE DOBLE CRITERIO SIN DESFASES
        turnos.sort((a, b) => {
          // Criterio 1: Si las fechas del calendario son distintas, ordenamos de forma cronológica real
          if (a.fecha_real !== b.fecha_real) {
            return a.fecha_real.localeCompare(b.fecha_real);
          }
          // Criterio 2: ¡EL DESEMPATE CRÍTICO! Si caen el mismo día, comparamos por hora de inicio.
          // De este modo, las 10:00:00 siempre subirá arriba y las 16:30:00 bajará de forma inquebrantable.
          return a.hora_inicio.localeCompare(b.hora_inicio);
        });

        // Subimos el listado perfectamente ordenado al estado de la pantalla
        setCuadrante(turnos);
      } catch (error) {
        Alert.alert(
          "Error de Sincronización",
          "No se ha podido descargar tu calendario de turnos oficiales.",
        );
      } finally {
        setCargando(false);
      }
    };

    if (usuarioActual?.trabajador_id) {
      cargarPlanificacionHoraria();
    }
  }, [usuarioActual]); // El array vigila únicamente la cuenta de usuario de PostgreSQL

  return (
    <AppScreen
      title="Mi Planificación"
      subtitle={`Calendario oficial asignado por: ${empresaSeleccionada?.nombre_comercial ?? "Tu Organización"}`}
    >
      {/* Resúmenes analíticos rápidos del cuadrante superior */}
      <Row>
        <StatCard label="Turnos Vigentes" value={cuadrante.length.toString()} />
        <StatCard
          label="Vigencia"
          value={cuadrante[0] ? "Planificado" : "Sin asignar"}
          tone={cuadrante[0] ? "success" : "warning"}
        />
      </Row>

      <ThemedText style={styles.sectionTitle}>
        Historial de Cuadrantes Asignados
      </ThemedText>

      {cargando ? (
        <ActivityIndicator
          size="large"
          color="#2563EB"
          style={{ marginTop: 40 }}
        />
      ) : (
        <FlatList
          data={cuadrante}
          keyExtractor={(item) => item.id}
          scrollEnabled={false}
          renderItem={({ item }) => {
            return (
              <Card>
                <View style={styles.filaAsignacion}>
                  {/* Barra de color dinámica inyectada desde los ajustes del turno */}
                  <View
                    style={[styles.barraColor, { backgroundColor: "#2563EB" }]}
                  />

                  <View style={styles.cuerpoTarjeta}>
                    <View style={styles.headerTarjeta}>
                      <ThemedText style={styles.nombreTurno}>
                        {item?.nombre ?? "Turno Sin Especificar"}
                      </ThemedText>
                      <View style={styles.badgeVigencia}>
                        <ThemedText style={styles.textoVigencia}>
                          Activo
                        </ThemedText>
                      </View>
                    </View>

                    {/* Tramos horarios de entrada y salida oficiales */}
                    <View style={styles.gridHoras}>
                      <View style={styles.itemHora}>
                        <IconSymbol name="schedule" size={16} color="#475569" />
                        <ThemedText style={styles.textoHoras}>
                          {item
                            ? `${item.hora_inicio.substring(0, 5)} a ${item.hora_fin.substring(0, 5)}`
                            : "-"}
                        </ThemedText>
                      </View>
                      <ThemedText style={styles.textoPausa}>
                        Descanso: {item?.minutos_pausa_obligatoria ?? 0} min.
                      </ThemedText>
                    </View>

                    <View style={styles.separador} />

                    {/* Fechas de validez del cuadrante
                    <ThemedText style={styles.textoRangoFechas}>
                      Válido desde el {item.fecha_inicio}{" "}
                      {item.fecha_fin
                        ? `hasta el ${item.fecha_fin}`
                        : "en adelante"}
                    </ThemedText> */}
                  </View>
                </View>
              </Card>
            );
          }}
          ListEmptyComponent={
            <ThemedText style={styles.emptyText}>
              No tienes ningún cuadrante horario asignado todavía. Contacta con
              RRHH.
            </ThemedText>
          }
        />
      )}
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  sectionTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#1E293B",
    marginVertical: 14,
  },
  filaAsignacion: {
    flexDirection: "row",
    width: "100%",
    gap: 14,
    paddingVertical: 2,
  },
  barraColor: { width: 4, borderRadius: 2 },
  cuerpoTarjeta: { flex: 1, gap: 4 },
  headerTarjeta: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  nombreTurno: { fontSize: 16, fontWeight: "800", color: "#0F172A" },
  badgeVigencia: {
    backgroundColor: "#DCFCE7",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  textoVigencia: {
    fontSize: 11,
    fontWeight: "700",
    color: "#16803D",
    textTransform: "uppercase",
  },
  gridHoras: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 6,
  },
  itemHora: { flexDirection: "row", alignItems: "center", gap: 6 },
  textoHoras: { fontSize: 14, fontWeight: "700", color: "#334155" },
  textoPausa: { fontSize: 12, color: "#64748B", fontWeight: "600" },
  separador: { height: 1, backgroundColor: "#F1F5F9", marginVertical: 8 },
  textoRangoFechas: {
    fontSize: 12,
    color: "#64748B",
    fontWeight: "500",
    fontStyle: "italic",
  },
  emptyText: {
    textAlign: "center",
    color: "#64748B",
    marginTop: 24,
    lineHeight: 20,
  },
});
