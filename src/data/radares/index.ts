import type { Radar } from '@/services/rutas/radares';

import datos from './radares-dgt.json';

// Radares fijos oficiales (cabinas y tramos de velocidad media), guardados dentro de
// la app. De momento, los de la DGT (carreteras del Estado; el País Vasco y Cataluña
// tienen su propio servicio de tráfico y no vienen). Para actualizarlos:
// "npm run radares" (scripts/actualizar-radares.mjs, que además los revisa con
// OpenStreetMap y añade el límite de velocidad) y después commit y push.
//
// Para añadir otra zona (pendiente: Cataluña, País Vasco, municipales), guarda su
// archivo aquí con el mismo formato y júntalo en RADARES.

export const RADARES: Radar[] = datos.radares as Radar[];

// Fecha en la que la DGT publicó los datos ("2025-12-18").
export const RADARES_PUBLICADOS: string | null = datos.publicado;
