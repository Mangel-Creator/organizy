import type { Radar } from '@/services/rutas/radares';

import datos from './radares-dgt.json';

// Radares fijos oficiales de la DGT (cabinas y tramos de velocidad media), guardados
// dentro de la app. Para actualizarlos: "npm run radares" (scripts/actualizar-radares.mjs),
// y después commit y push: la web y la app los reciben con la siguiente versión.
// Cubren las carreteras del Estado; el País Vasco y Cataluña tienen su propio
// servicio de tráfico y no vienen. Los datos no incluyen el límite de velocidad.

export const RADARES: Radar[] = datos.radares as Radar[];

// Fecha en la que la DGT publicó los datos ("2025-12-18").
export const RADARES_PUBLICADOS: string | null = datos.publicado;
