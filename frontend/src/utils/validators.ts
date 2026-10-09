/**
 * Valida si una cadena de texto tiene una longitud mínima requerida,
 * eliminando previamente los espacios en blanco sobrantes.
 *
 * @param valor - Cadena de texto que se desea validar.
 * @param minLength - Longitud mínima permitida (por defecto es 3).
 * @returns Verdadero si la longitud del texto cumple o supera el mínimo, falso en caso contrario.
 */
export const validarTextoObligatorio = (
  valor: string,
  minLength: number = 3,
): boolean => {
  return valor.trim().length >= minLength;
};

/**
 * Valida el formato sintáctico de un CIF o NIF de organización
 * comprobando que cumpla con una estructura de exactamente 9 caracteres alfanuméricos.
 *
 * @param cif - Cadena de texto correspondiente al CIF o NIF a comprobar.
 * @returns Verdadero si el formato coincide con la expresión regular corporativa, falso de lo contrario.
 */
export const validarCifNifOrganizacion = (cif: string): boolean => {
  const cifRegex = /^[A-Z0-9]{9}$/i;
  return cifRegex.test(cif.trim());
};

/**
 * Valida estrictamente un DNI español mediante el uso de expresiones regulares,
 * exigiendo exactamente 8 dígitos numéricos seguidos de la letra de control oficial correspondiente.
 *
 * @param dni - Cadena de texto que contiene el DNI a verificar.
 * @returns Verdadero si la estructura y la letra de control son sintácticamente válidas, falso si no lo son.
 */
export const validarDniEspanol = (dni: string): boolean => {
  const dniRegex = /^\d{8}[TRWAGMYFPDXBNJZSQVHLCKE]$/i;
  return dniRegex.test(dni.trim());
};

/**
 * Valida el formato estándar de una dirección de correo electrónico
 * asegurando la presencia de un nombre de usuario, un símbolo "@" y un dominio con extensión.
 *
 * @param email - Dirección de correo electrónico a validar.
 * @returns Verdadero si cumple con el patrón sintáctico de un email, falso si es incorrecto.
 */
export const validarEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email.trim());
};

/**
 * Valida que una contraseña cumpla con los criterios de seguridad mínimos establecidos
 * en cuanto a su longitud de caracteres.
 *
 * @param password - Cadena de texto de la contraseña a evaluar.
 * @param minLength - Longitud mínima de seguridad requerida (por defecto es 6).
 * @returns Verdadero si la contraseña alcanza o supera el tamaño mínimo, falso en caso contrario.
 */
export const validarPassword = (
  password: string,
  minLength: number = 6,
): boolean => {
  return password.length >= minLength;
};

/**
 * Valida el formato de una hora en formato HH:MM o HH:MM:SS.
 *
 * @param hora - Cadena de texto de la hora a validar.
 * @returns Verdadero si el formato es válido, falso en caso contrario.
 */
export const validarFormatoHora = (hora: string): boolean => {
  const regexHora = /^([01]\d|2[0-3]):([0-5]\d)(:[0-5]\d)?$/;
  return regexHora.test(hora.trim());
};

/**
 * Valida que un valor numérico de duración de pausa sea válido y no negativo.
 *
 * @param duracion - Cadena de texto de la duración en minutos.
 * @returns Verdadero si es un número válido mayor o igual a cero, falso en caso contrario.
 */
export const validarDuracionPausa = (duracion: string): boolean => {
  if (!duracion || duracion.trim() === "" || isNaN(Number(duracion))) {
    return false;
  }
  return parseInt(duracion, 10) >= 0;
};

/**
 * Valida y convierte una cadena de año a un número entero,
 * asegurando que se encuentre dentro del rango permitido (2020 - 2100).
 *
 * @param anioStr - Cadena de texto con el año a validar.
 * @returns El año como número entero si es válido, o null en caso contrario.
 */
export const validarAnioRango = (anioStr: string): number | null => {
  const anioNum = parseInt(anioStr, 10);
  if (!anioNum || isNaN(anioNum) || anioNum < 2020 || anioNum > 2100) {
    return null;
  }
  return anioNum;
};

export const cumpleDiasSemana = (
  fecha: Date,
  diasPermitidosStr: number[],
): boolean => {
  const diaSemana = fecha.getDay();
  return diasPermitidosStr.includes(diaSemana);
};
