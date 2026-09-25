import type { ClaveDia } from '@/services/fechas';

// Tipos de los avisos (notificaciones locales). Sin nada de expo-notifications:
// así la planificación se puede probar con Jest.

// Tipos de aviso que existen. Para añadir uno, añádelo aquí y crea su generador
// en planificar.ts. Los "epoca-..." son de la Época dorada (services/avisos/epoca.ts)
// y "salida" es el "Sal ya" de la fase 6.
export type TipoAviso =
  | 'evento'
  | 'resumen-manana'
  | 'cierre-dia'
  | 'epoca-salir'
  | 'epoca-bloque'
  | 'epoca-descanso'
  | 'epoca-dormir'
  | 'salida';

// Adónde lleva la app al tocar el aviso.
export type Destino =
  | { pantalla: 'hoy' }
  | { pantalla: 'evento'; id: string }
  | { pantalla: 'mapa'; id: string; dia: ClaveDia }; // la ruta hasta ese evento (fase 6)

// Botones dentro de la notificación. Cada categoría se registra una vez al
// arrancar (services/avisos/programar.ts).
export type CategoriaAviso = 'cierre-dia' | 'salida';

export const ACCION_A_MANANA = 'a-manana';
export const ACCION_ABRIR = 'abrir';
// "Sal ya" (fase 6): abre WhatsApp con "Voy con unos 10 min de retraso, lo siento".
export const ACCION_RETRASO = 'avisar-retraso';

export type AvisoPlanificado = {
  // Único y estable, por ejemplo "evento:<id>:2026-09-24" o "resumen-manana:2026-09-24".
  id: string;
  tipo: TipoAviso;
  dia: ClaveDia; // día al que se refiere (el cierre de la noche es del día que termina)
  cuando: Date;
  titulo: string;
  cuerpo: string;
  destino: Destino;
  categoria?: CategoriaAviso;
};

// Lo que se guarda dentro de la notificación para saber qué hacer al tocarla.
export type DatosAviso = {
  tipo: TipoAviso | 'prueba';
  dia: ClaveDia;
  destino: Destino;
};
