export const TIPOS_DISPOSITIVOS = [
  { label: "App Móvil", value: "App_móvil" },
  { label: "Terminal RFID", value: "Terminal_rfid" },
  { label: "Terminal PIN", value: "Terminal_pin" },
  { label: "Lector QR", value: "Lector_qr" },
  { label: "Web", value: "Web" },
  { label: "Geolocalización", value: "Geolocalización" },
  { label: "Manual", value: "Manual" },
];

export enum MetodoFichajeEnum {
  APP_MOVIL = "App_móvil",
  TERMINAL_RFID = "Terminal_rfid",
  TERMINAL_PIN = "Terminal_pin",
  LECTOR_QR = "Lector_qr",
  WEB = "Web",
  GEOLOCALIZACION = "Geolocalización",
  MANUAL = "Manual",
}

export interface Dispositivo {
  id: string;
  empresa_id: string;
  tipo_dispositivo: MetodoFichajeEnum | string;
  centro_trabajo_id?: string | null;
  activo?: boolean;
  creado_at?: string;
}

export interface DispositivoCreate {
  empresa_id: string;
  tipo_dispositivo: MetodoFichajeEnum | string;
  centro_trabajo_id?: string | null;
  activo?: boolean;
}

export interface DispositivoUpdate {
  tipo_dispositivo?: MetodoFichajeEnum | string;
  centro_trabajo_id?: string | null;
  activo?: boolean;
}
