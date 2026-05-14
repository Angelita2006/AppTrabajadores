import { useEffect, useState } from 'react';
import { useFichajeStore } from '@/store/useFichajeStore';

export const useCurrentTimer = () => {
  const [tiempoTrabajado, setTiempoTrabajado] = useState({
    horas: 0,
    minutos: 0,
    segundos: 0,
  });

  const fichajeHoy = useFichajeStore((s) => s.fichajeHoy);
  const estadoActual = useFichajeStore((s) => s.estadoActual);

  useEffect(() => {
    if (estadoActual !== 'trabajando') {
      setTiempoTrabajado({ horas: 0, minutos: 0, segundos: 0 });
      return;
    }

    const calcularTiempo = () => {
      if (fichajeHoy.length === 0) return;

      let totalMs = 0;

      // Buscar todas las entradas y sus correspondientes salidas/descansos
      for (let i = 0; i < fichajeHoy.length; i++) {
        const fichaje = fichajeHoy[i];

        if (fichaje.tipo === 'entrada') {
          // Buscar la siguiente salida o descanso
          const proximoEvento = fichajeHoy
            .slice(i + 1)
            .find((f) => f.tipo === 'salida' || f.tipo === 'descanso');

          if (proximoEvento) {
            const inicio = new Date(fichaje.fecha_hora).getTime();
            const fin = new Date(proximoEvento.fecha_hora).getTime();
            totalMs += fin - inicio;
          } else if (fichaje.tipo !== 'salida') {
            // Si es la última entrada y no hay salida, sumar hasta ahora
            const inicio = new Date(fichaje.fecha_hora).getTime();
            const ahora = new Date().getTime();
            totalMs += ahora - inicio;
          }
        }
      }

      const horas = Math.floor(totalMs / (1000 * 60 * 60));
      const minutos = Math.floor((totalMs % (1000 * 60 * 60)) / (1000 * 60));
      const segundos = Math.floor((totalMs % (1000 * 60)) / 1000);

      setTiempoTrabajado({ horas, minutos, segundos });
    };

    calcularTiempo();
    const intervalo = setInterval(calcularTiempo, 1000);

    return () => clearInterval(intervalo);
  }, [fichajeHoy, estadoActual]);

  return tiempoTrabajado;
};

export const useEstadoFichaje = () => {
  const estado = useFichajeStore((s) => s.estadoActual);
  const fichajeHoy = useFichajeStore((s) => s.fichajeHoy);

  const ultimoFichaje = fichajeHoy[fichajeHoy.length - 1] || null;
  const horaUltimo = ultimoFichaje
    ? new Date(ultimoFichaje.fecha_hora).toLocaleTimeString('es-ES', {
        hour: '2-digit',
        minute: '2-digit',
      })
    : null;

  return {
    estado,
    ultimoFichaje,
    horaUltimo,
  };
};
