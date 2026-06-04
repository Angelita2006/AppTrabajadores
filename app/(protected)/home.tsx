import { Link } from "expo-router";
import React, { useCallback, useEffect, useMemo, useState } from "react";
// Añade ScrollView a tu importación de react-native
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
} from "react-native";
import { HelloWave } from "../../components/hello-wave";
import { ThemedText } from "../../components/themed-text";
import { ThemedView } from "../../components/themed-view";
import { useTrabajador } from "../../context/TrabajadorContext";
import { Fichaje } from "../../src/models/fichajes";
import { Horario } from "../../src/models/horarios";
import { Estado, Trabajador } from "../../src/models/trabajadores";

import { CalendarTrabajador } from "../../components/Calendar";
import {
  crearFichaje,
  obtenerFichajesEmpresaTrabajador,
} from "../../src/services/fichajesService";
import { obtenerHorarioTrabajadorEmpresa } from "../../src/services/horariosService";
import { getUltimoFichajeTrabajador } from "../../src/services/trabajadoresService";

export default function HomeScreen() {
  // Contexto global: trabajador y empresa seleccionada.
  // El contexto proviene de context/TrabajadorContext.tsx y se usa para compartir
  // el trabajador actual y la empresa seleccionada entre pantallas.
  const { trabajadorActual, empresaSeleccionada } = useTrabajador();

  // Estado local de la pantalla:
  // - horario: horario de trabajo para el trabajador y la empresa actuales.
  // - empresaTrabajadores: lista de trabajadores de la empresa (solo para admin).
  // - ultimoFichaje: último registro de fichaje realizado por el trabajador.
  // - fichajeVersion: contador para forzar recargas de información tras fichar.
  const [horario, setHorario] = useState<Horario | null>(null);
  const [empresaTrabajadores, setEmpresaTrabajadores] = useState<Trabajador[]>(
    [],
  );
  const [ultimoFichaje, setUltimoFichaje] = useState<Fichaje | null>(null);
  const [fichajeVersion, setFichajeVersion] = useState(0);
  const [estado, setEstado] = useState<Estado>(
    trabajadorActual?.estado || Estado.Inactivo,
  );
  const [currentTime, setCurrentTime] = useState<Date>(new Date());

  const handleFichar = useCallback(
    async (tipo: "entrada" | "salida" | "descanso" | "horas_extra") => {
      if (!trabajadorActual?.id || !empresaSeleccionada?.id) return;

      try {
        const nuevoFichaje = await crearFichaje(
          trabajadorActual.id,
          empresaSeleccionada.id,
          tipo,
        );

        if (nuevoFichaje) {
          setUltimoFichaje(nuevoFichaje);
        }

        setEstado(
          tipo === "entrada"
            ? Estado.Trabajando
            : tipo === "salida"
              ? Estado.Activo
              : tipo === "descanso"
                ? Estado.Descansando
                : tipo === "horas_extra"
                  ? Estado.HorasExtra
                  : /*tipo === "vacaciones" ? Estado.Vacaciones :*/ Estado.Activo,
        );

        setFichajeVersion((prev) => prev + 1);

        Alert.alert(
          "Fichaje registrado",
          `Has fichado ${tipo} a las ${new Date(nuevoFichaje.fecha).toLocaleTimeString()}`,
        );
      } catch (error) {
        console.error("Error al fichar:", error);
      }
    },
    [trabajadorActual?.id, empresaSeleccionada?.id],
  );

  useEffect(() => {
    async function cargarHorario() {
      if (empresaSeleccionada?.id && trabajadorActual?.id) {
        const horario = obtenerHorarioTrabajadorEmpresa(
          trabajadorActual.id,
          empresaSeleccionada.id,
        );
        setHorario(horario);
      }
    }
    cargarHorario();
  }, [empresaSeleccionada?.id, trabajadorActual?.id]);

  useEffect(() => {
    // Ejecuta la función cada segundo
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    // Limpia el intervalo al desmontar el componente
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    async function cargarUltimoFichaje() {
      if (trabajadorActual?.id) {
        const fichaje = getUltimoFichajeTrabajador(
          trabajadorActual.id,
          empresaSeleccionada?.id || 0,
        );
        if (fichaje?.tipo === "entrada") {
          setEstado(Estado.Trabajando);
        } else if (fichaje?.tipo === "descanso") {
          setEstado(Estado.Descansando);
        } else if (fichaje?.tipo === "horas_extra") {
          setEstado(Estado.HorasExtra);
        } else if (fichaje?.tipo === "salida") {
          setEstado(Estado.Activo);
        }
        setUltimoFichaje(fichaje);
      }
    }
    cargarUltimoFichaje();
  }, [trabajadorActual?.id, empresaSeleccionada?.id, fichajeVersion]);

  useEffect(() => {
    // El administrador puede ver todos los trabajadores de la empresa seleccionada.
    // Esta carga se ejecuta solo cuando cambia el rol o la empresa seleccionada.
    async function cargarTrabajadoresEmpresa() {
      if (
        trabajadorActual?.role === "admin" &&
        empresaSeleccionada?.id !== undefined
      ) {
        const { obtenerTrabajadoresPorEmpresa } =
          await import("../../src/services/shared/sharedService");
        const t = await obtenerTrabajadoresPorEmpresa(empresaSeleccionada.id);
        setEmpresaTrabajadores(t);
      } else {
        setEmpresaTrabajadores([]);
      }
    }
    cargarTrabajadoresEmpresa();
  }, [trabajadorActual?.role, empresaSeleccionada?.id]);

  // Calcula el tiempo trabajado hoy en horas desde la última entrada registrada.
  const tiempoTrabajado = useMemo(() => {
    if (!trabajadorActual?.id) return 0;

    const fichajesTrabajadorHoy = obtenerFichajesEmpresaTrabajador(
      trabajadorActual.id,
      empresaSeleccionada?.id || 0,
    ).filter((f) => {
      const fechaFichaje = new Date(f.fecha);
      const hoy = currentTime;
      return (
        fechaFichaje.getDate() === hoy.getDate() &&
        fechaFichaje.getMonth() === hoy.getMonth() &&
        fechaFichaje.getFullYear() === hoy.getFullYear()
      );
    });

    let horasTrabajadas = 0;
    let minutosTrabajados = 0;

    for (let i = 0; i < fichajesTrabajadorHoy.length; i++) {
      const fichaje = fichajesTrabajadorHoy[i];
      if (fichaje.tipo === "entrada") {
        const salida = fichajesTrabajadorHoy.find(
          (f) =>
            f.tipo === "salida" &&
            new Date(f.fecha).getTime() > new Date(fichaje.fecha).getTime(),
        );
        if (salida) {
          // Si hay salida registrada, calcula el tiempo hasta la salida
          const diff =
            new Date(salida.fecha).getTime() -
            new Date(fichaje.fecha).getTime();
          horasTrabajadas += Math.floor(diff / (1000 * 60 * 60));
          minutosTrabajados += Math.floor(
            (diff % (1000 * 60 * 60)) / (1000 * 60),
          );
        } else {
          // Si no hay salida registrada, calcula el tiempo hasta ahora
          const diff = new Date().getTime() - new Date(fichaje.fecha).getTime();
          horasTrabajadas += Math.floor(diff / (1000 * 60 * 60));
          minutosTrabajados += Math.floor(
            (diff % (1000 * 60 * 60)) / (1000 * 60),
          );
        }
      }
    }

    if (horasTrabajadas === 0) return minutosTrabajados + " minutos";
    if (minutosTrabajados === 0)
      if (horasTrabajadas === 0) return "No has fichado entrada hoy";
      else return horasTrabajadas + " horas";

    return horasTrabajadas + " horas y " + minutosTrabajados + " minutos";
  }, [trabajadorActual?.id, empresaSeleccionada?.id, currentTime]);

  const formatearHora = (fechaInput: any) => {
    if (!fechaInput) return "00:00";

    // Convierte el input a objeto Date por si viene como String desde la API
    const d = new Date(fechaInput);

    // Agrega un cero a la izquierda si el número es menor de 10 (ej: "09:05")
    const horas = String(d.getHours()).padStart(2, "0");
    const minutos = String(d.getMinutes()).padStart(2, "0");

    return `${horas}:${minutos}`;
  };

  // Determina si hay datos suficientes para mostrar la pantalla principal.
  const tieneDatos = !!(empresaSeleccionada?.id && trabajadorActual?.id);

  return (
    <ScrollView style={styles.page} contentContainerStyle={styles.pageContent}>
      <ThemedView style={styles.timeBanner}>
        <ThemedText type="subtitle">
          Hora actual: {formatearHora(currentTime)}
        </ThemedText>
      </ThemedView>
      {tieneDatos ? (
        <>
          <ThemedView style={styles.stepContainer}>
            <ThemedView style={styles.infoCard}>
              <ThemedText type="subtitle">
                Hola {trabajadorActual?.nombre || "Usuario"} <HelloWave />
              </ThemedText>
              <ThemedText type="subtitle">
                {"\n"}[ {empresaSeleccionada?.nombre || "Empresa"} ]
              </ThemedText>

              <ThemedText type="subtitle">
                Horario: {formatearHora(horario?.hora_entrada1)} a{" "}
                {formatearHora(horario?.hora_salida1)}
                {
                  <>
                    {" "}
                    y {formatearHora(horario?.hora_entrada2)} a{" "}
                    {formatearHora(horario?.hora_salida2)}
                  </>
                }
              </ThemedText>
              <ThemedText type="subtitle">
                {"\n"}·{" "}
                {(estado === Estado.Trabajando && "Trabajando") ||
                  (estado === Estado.Activo && "Activo") ||
                  (estado === Estado.Descansando && "Descansando") ||
                  (estado === Estado.HorasExtra && "Haciendo Horas Extra") ||
                  (estado === Estado.Vacaciones && "De Vacaciones") ||
                  "Inactivo"}{" "}
                ·
              </ThemedText>
              <ThemedText type="subtitle">
                {`\nTiempo trabajado hoy\n${tiempoTrabajado}`}
              </ThemedText>

              <ThemedText type="subtitle">
                {`\nÚltimo fichaje ${ultimoFichaje ? "\n" + ultimoFichaje.tipo.toUpperCase() : ""}\n${ultimoFichaje?.fecha ? new Date(ultimoFichaje.fecha).toLocaleString() : "No hay fichajes aún"}`}
              </ThemedText>

              <ThemedText type="subtitle">
                Fichajes:
                {
                  obtenerFichajesEmpresaTrabajador(
                    trabajadorActual.id,
                    empresaSeleccionada?.id || 0,
                  ).length
                }
                <ThemedText style={{ fontSize: 20, marginBottom: 6 }}>
                  {"\n\n"}📅 Calendario del trabajador
                </ThemedText>
                <ThemedText style={{ fontSize: 12, marginBottom: 6 }}>
                  {"\n"}🟢 Días trabajados
                </ThemedText>
                <ThemedText style={{ fontSize: 12, marginBottom: 6 }}>
                  {"\n"}🔴 Días no trabajados
                </ThemedText>
                <ThemedText style={{ fontSize: 12, marginBottom: 6 }}>
                  {"\n"}🔵 Días a trabajar
                </ThemedText>
                <ThemedText style={{ fontSize: 12, marginBottom: 6 }}>
                  {"\n"}🟡 Días para no trabajar
                </ThemedText>
                <ThemedText style={{ fontSize: 12, marginBottom: 6 }}>
                  {"\n"}🟣 Días de vacaciones
                </ThemedText>
                <ThemedText style={{ fontSize: 12, marginBottom: 6 }}>
                  {"\n"}🟤 Días de baja
                </ThemedText>
                {"\n"}
                <CalendarTrabajador
                  trabajadorId={trabajadorActual.id}
                  empresaId={empresaSeleccionada?.id || 0}
                />
              </ThemedText>
            </ThemedView>
          </ThemedView>

          {/* Admin view: show trabajadores and horarios for the selected empresa */}
          {trabajadorActual?.role === "admin" &&
            empresaTrabajadores.length > 0 && (
              <ThemedView style={styles.infoCard}>
                <ThemedText type="subtitle">
                  Trabajadores en empresa:
                </ThemedText>
                {empresaTrabajadores.map((t) => {
                  if (t === trabajadorActual)
                    return (
                      <ThemedView key={t.id} style={{ marginTop: 8 }}>
                        <ThemedText type="subtitle">
                          {t.nombre} {t.apellidos} - {t.puesto}
                        </ThemedText>
                      </ThemedView>
                    );
                  const horarioTrabajador = obtenerHorarioTrabajadorEmpresa(
                    t.id,
                    empresaSeleccionada?.id || 0,
                  );
                  return (
                    <ThemedView key={t.id} style={{ marginTop: 8 }}>
                      <ThemedText type="subtitle">
                        {t.nombre} {t.apellidos} - {t.puesto}
                      </ThemedText>
                      <ThemedText type="subtitle">
                        Horario:{" "}
                        {formatearHora(horarioTrabajador?.hora_entrada1)} a{" "}
                        {formatearHora(horarioTrabajador?.hora_salida1)}
                      </ThemedText>
                      <ThemedText type="subtitle">
                        Fichajes:
                        {
                          obtenerFichajesEmpresaTrabajador(
                            t.id,
                            empresaSeleccionada?.id || 0,
                          ).length
                        }
                        <ThemedText style={{ fontSize: 20, marginBottom: 6 }}>
                          {"\n\n"}📅 Calendario del trabajador
                        </ThemedText>
                        <ThemedText style={{ fontSize: 12, marginBottom: 6 }}>
                          {"\n"}🟢 Días trabajados
                        </ThemedText>
                        <ThemedText style={{ fontSize: 12, marginBottom: 6 }}>
                          {"\n"}🔴 Días no trabajados
                        </ThemedText>
                        <ThemedText style={{ fontSize: 12, marginBottom: 6 }}>
                          {"\n"}🔵 Días a trabajar
                        </ThemedText>
                        <ThemedText style={{ fontSize: 12, marginBottom: 6 }}>
                          {"\n"}🟡 Días para no trabajar
                        </ThemedText>
                        <ThemedText style={{ fontSize: 12, marginBottom: 6 }}>
                          {"\n"}🟣 Días de vacaciones
                        </ThemedText>
                        <ThemedText style={{ fontSize: 12, marginBottom: 6 }}>
                          {"\n"}🟤 Días de baja
                        </ThemedText>
                        {"\n"}
                        <CalendarTrabajador
                          trabajadorId={t.id}
                          empresaId={empresaSeleccionada?.id || 0}
                        />
                      </ThemedText>
                    </ThemedView>
                  );
                })}
              </ThemedView>
            )}

          <ThemedView style={styles.stepContainer}>
            <ThemedView style={styles.buttonRow}>
              <TouchableOpacity
                style={styles.buttonFichar}
                onPress={() => handleFichar("entrada")}
              >
                <Text style={styles.textFichar}>Fichar Entrada</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.buttonFichar}
                onPress={() => handleFichar("salida")}
              >
                <Text style={styles.textFichar}>Fichar Salida</Text>
              </TouchableOpacity>
            </ThemedView>

            <ThemedView style={styles.buttonRow}>
              <TouchableOpacity
                style={styles.buttonFichar}
                onPress={() => handleFichar("descanso")}
              >
                <Text style={styles.textFichar}>Fichar Descanso</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.buttonFichar}
                onPress={() => handleFichar("horas_extra")}
              >
                <Text style={styles.textFichar}>Horas Extra</Text>
              </TouchableOpacity>
            </ThemedView>

            <Link href="../empresas" asChild>
              <TouchableOpacity style={styles.button}>
                <Text style={styles.textFichar}>Cambiar de Empresa</Text>
              </TouchableOpacity>
            </Link>
          </ThemedView>
        </>
      ) : (
        <ThemedView style={styles.infoContainer}>
          <ThemedText style={styles.infotitle} type="subtitle">
            Inicia sesión y selecciona una empresa para ver tu horario y poder
            fichar.
          </ThemedText>

          <Link href="../empresas" asChild>
            <TouchableOpacity style={styles.button}>
              <Text style={styles.textFichar}>Seleccionar Empresa</Text>
            </TouchableOpacity>
          </Link>
        </ThemedView>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: {
    flex: 1,
    backgroundColor: "#071826",
  },
  pageContent: {
    flexGrow: 1,
    padding: 20,
    paddingBottom: 40,
  },
  infotitle: {
    color: "#cde9ff",
    fontSize: 18,
    textAlign: "center",
  },
  stepContainer: {
    backgroundColor: "transparent",
    marginBottom: 16,
  },
  buttonRow: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginVertical: 10,
    gap: 12,
  },
  button: {
    backgroundColor: "#1e9eb8",
    padding: 14,
    borderRadius: 16,
    alignItems: "center",
    flex: 1,
    margin: 6,
    shadowColor: "#000",
    shadowOpacity: 0.12,
    shadowRadius: 10,
    elevation: 3,
  },
  buttonFichar: {
    backgroundColor: "#1e9eb8",
    paddingVertical: 18,
    borderRadius: 16,
    alignItems: "center",
    flex: 1,
    // shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 4,
  },
  textFichar: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "700",
    textAlign: "center",
  },
  infoCard: {
    backgroundColor: "#0f2a45",
    padding: 20,
    borderRadius: 24,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#14436d",
    // shadowColor: "#000",
    shadowOpacity: 0.14,
    shadowRadius: 14,
    elevation: 4,
  },
  infoContainer: {
    backgroundColor: "#0f2a45",
    padding: 20,
    borderRadius: 24,
    marginBottom: 16,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#14436d",
  },
  timeBanner: {
    backgroundColor: "#0f2a45",
    padding: 14,
    borderRadius: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#14436d",
    alignItems: "center",
  },
});
