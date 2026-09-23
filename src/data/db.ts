import * as SQLite from 'expo-sqlite';

// Base de datos local (SQLite) para datos con más volumen, como los eventos.
//
// Cómo añadir tablas en fases posteriores:
// añade una función al final de MIGRACIONES. Cada migración se ejecuta una sola
// vez y la versión aplicada se guarda en "PRAGMA user_version".

const NOMBRE_BD = 'organizy.db';

type Migracion = (bd: SQLite.SQLiteDatabase) => Promise<void>;

const MIGRACIONES: Migracion[] = [
  // Fase 3: aquí irá la tabla de eventos.
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
