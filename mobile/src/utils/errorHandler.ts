export const obtenerMensajeAmigableError = (error: any): string => {
  // 1. Capturar el mensaje personalizado o el 'detail' que envía FastAPI
  const errorData = error?.response?.data;
  if (errorData) {
    // FastAPI suele enviar los errores en `detail` (puede ser un string o un array de errores de validación)
    if (typeof errorData.detail === "string") {
      return errorData.detail;
    }
    if (Array.isArray(errorData.detail)) {
      // Si es un error de validación de Pydantic (422), podemos extraer el primer mensaje legible
      return (
        errorData.detail.map((err: any) => err.msg).join(", ") ||
        "Error de validación en los datos."
      );
    }
    // Compatibilidad por si en algún sitio usas `message`
    if (errorData.message) {
      return errorData.message;
    }
  }

  // 2. Capturar por código de estado HTTP si proviene de Axios o fetch
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

  // 3. Errores de red (sin conexión a internet)
  if (error?.message === "Network Error" || !error?.response) {
    return "No se pudo establecer conexión con el servidor. Comprueba tu conexión a internet.";
  }

  // 4. Mensaje por defecto para cualquier otro caso
  return error?.message || "Ocurrió un error desconocido. Inténtalo de nuevo.";
};
