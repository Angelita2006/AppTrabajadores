export const obtenerMensajeAmigableError = (error: any): string => {
  const errorData = error?.response?.data;

  if (errorData) {
    // Si es un array de validaciones (ej. Pydantic)
    if (Array.isArray(errorData.detail)) {
      return (
        errorData.detail.map((err: any) => err.msg).join(", ") ||
        "Error de validación en los datos."
      );
    }

    // Si el backend envía un JSON con { "message": "Mensaje..." }
    if (typeof errorData.message === "string") {
      return errorData.message;
    }

    // Si el backend envía el error directamente como texto plano
    if (typeof errorData === "string") {
      return errorData;
    }
  }

  // Errores de Red
  if (error?.message === "Network Error" || !error?.response) {
    return "No se pudo establecer conexión con el servidor. Comprueba tu conexión a internet.";
  }

  // Fallbacks genéricos según el Status Code HTTP
  const status = error?.response?.status;
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
        return `Ocurrió un error inesperado en el servidor.`;
    }
  }

  // Mensaje por defecto final
  return error?.message || "Ocurrió un error desconocido. Inténtalo de nuevo.";
};
