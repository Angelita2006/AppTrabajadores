export const obtenerMensajeAmigableError = (error: any): string => {
  // 1. Si el backend envió un mensaje personalizado explícito, lo respetamos
  if (error?.response?.data?.message) {
    return error.response.data.message;
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
        return `Ocurrió un error inesperado en el servidor (Código: ${status}).`;
    }
  }

  // 3. Errores de red (sin conexión a internet)
  if (error?.message === "Network Error" || !error?.response) {
    return "No se pudo establecer conexión con el servidor. Comprueba tu conexión a internet.";
  }

  // 4. Mensaje por defecto para cualquier otro caso
  return error?.message || "Ocurrió un error desconocido. Inténtalo de nuevo.";
};
