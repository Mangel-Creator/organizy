import type { ClaveDia } from '@/services/fechas';

// Tipos de los avisos (notificaciones locales). Sin nada de expo-notifications:
// así la planificación se puede probar con Jest.

// Tipos de aviso que existen. Para añadir uno (por ejemplo "inicio-bloque" u
// "hora-dormir" en la fase 4b), añádelo aquí y crea su generador en planificar.ts.
export type TipoAviso = 'evento' | 'resumen-manana' | 'cierre-dia';

// Adónde lleva la app al tocar el aviso.
export type Destino = { pantalla: 'hoy' } | { pantalla: 'evento'; id: string };

// Botones dentro de la notificación. Cada categoría se registra una vez al
// arrancar (services/avisos/programar.ts).
export type CategoriaAviso = 'cierre-dia';

export const ACCION_A_MANANA = 'a-manana';
export const ACCION_ABRIR = 'abrir';

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
