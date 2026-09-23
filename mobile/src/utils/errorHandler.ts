
/**
 * Extrae y formatea mensajes de error amigables para el usuario a partir de respuestas HTTP o fallos de red.
 *
 * @param error - Objeto de error capturado (puede provenir de Axios, Fetch o excepciones genéricas).
 * @returns Cadena de texto limpia y comprensible para mostrar al usuario final.
 */
export const obtenerMensajeAmigableError = (error: any): string => {
  const mensaje = error?.response?.data;

  if (mensaje) {
    // Maneja arrays de validación uniendo los mensajes
    if (Array.isArray(mensaje.detail)) {
      return (
        mensaje.detail.map((err: any) => err.msg).join(", ") ||
        "Error de validación en los datos."
      );
    }

    // Mensaje estructurado enviado como propiedad 'message' en JSON
    if (typeof mensaje.message === "string") {
      return mensaje.message;
    }

    // Respuesta de error directa en texto plano
    if (typeof mensaje === "string") {
      return mensaje;
    }
  }

  // Identifica caídas de conexión o ausencia de respuesta del servidor
  if (mensaje?.message === "Network Error" || !mensaje?.response) {
    return "No se pudo establecer conexión con el servidor. Comprueba tu conexión a internet.";
  }

  // Traducción de códigos de estado HTTP a mensajes comprensibles
  const status = mensaje?.response?.status;
  if (status) {
    switch (status) {
      case 400:
        return "Los datos enviados no son válidos o están incompletos. Por favor, revísalos.";
      case 401:
        return "Tu sesión ha expirado o no estás autorizado. Por favor, vuelve a iniciar sesión.";
      case 403:
        return "No tienes los permisos necesarios para realizar esta acción.";
      case 404:
        return "El recurso o registro solicitado no se encuentra disponible.";
      case 409:
        return "Existe un conflicto con este registro (es posible que ya exista o esté duplicado).";
      case 422:
        return "Hay errores de validación en la información proporcionada.";
      case 500:
      case 502:
      case 503:
        return "Hubo un fallo en los servidores. Por favor, inténtalo de nuevo más tarde.";
      default:
        return "Ocurrió un error inesperado en el servidor.";
    }
  }

  // Mensaje genérico final si no se reconoce el tipo de error
  return error?.message || "Ocurrió un error desconocido. Inténtalo de nuevo.";
};
