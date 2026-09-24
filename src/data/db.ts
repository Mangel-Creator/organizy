import * as SQLite from 'expo-sqlite';

// Base de datos local (SQLite) para datos con más volumen, como los eventos.
//
// Cómo añadir tablas en fases posteriores:
// añade una función al final de MIGRACIONES. Cada migración se ejecuta una sola
// vez y la versión aplicada se guarda en "PRAGMA user_version".

const NOMBRE_BD = 'organizy.db';

type Migracion = (bd: SQLite.SQLiteDatabase) => Promise<void>;

const MIGRACIONES: Migracion[] = [
  // 1. Fase 3: tabla de eventos (ver data/eventos/tipos.ts).
  async (bd) => {
    await bd.execAsync(`
      CREATE TABLE eventos (
        id TEXT PRIMARY KEY NOT NULL,
        titulo TEXT NOT NULL,
        fecha TEXT NOT NULL,
        hora_inicio TEXT,
        hora_fin TEXT,
        tipo TEXT NOT NULL,
        lugar_nombre TEXT,
        lugar_direccion TEXT,
        lugar_latitud REAL,
        lugar_longitud REAL,
        notas TEXT NOT NULL DEFAULT '',
        repeticion TEXT NOT NULL DEFAULT 'nunca',
        flexible INTEGER NOT NULL DEFAULT 0,
        duracion_min INTEGER,
        hecha INTEGER NOT NULL DEFAULT 0,
        foco INTEGER NOT NULL DEFAULT 0,
        ejemplo INTEGER NOT NULL DEFAULT 0
      );
      CREATE INDEX eventos_fecha ON eventos (fecha);
    `);
  },
];

let bdPromesa: Promise<SQLite.SQLiteDatabase> | null = null;

export function obtenerBD(): Promise<SQLite.SQLiteDatabase> {
  if (!bdPromesa) {
    bdPromesa = abrirYMigrar();
  }
  return bdPromesa;
}

async function abrirYMigrar(): Promise<SQLite.SQLiteDatabase> {
  const bd = await SQLite.openDatabaseAsync(NOMBRE_BD);
  await bd.execAsync('PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;');

  const fila = await bd.getFirstAsync<{ user_version: number }>('PRAGMA user_version');
  let version = fila?.user_version ?? 0;

  while (version < MIGRACIONES.length) {
    await bd.withTransactionAsync(() => MIGRACIONES[version](bd));
    version += 1;
    await bd.execAsync(`PRAGMA user_version = ${version}`);
  }
  return bd;
}
