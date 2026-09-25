// Descarga los radares fijos oficiales de la DGT y los guarda dentro de la app
// (src/data/radares/radares-dgt.json). Para actualizarlos: npm run radares
//
// Fuente: Punto de Acceso Nacional de Tráfico (https://nap.dgt.es/dataset/radares-fijos-dgt),
// datos abiertos en formato DATEX II. Trae las cabinas de radar fijo y los tramos de
// velocidad media de las carreteras del Estado (sin País Vasco ni Cataluña, que tienen
// su propio servicio de tráfico). No trae el límite de velocidad.
// Solo radares fijos oficiales: nada de radares móviles avisados por otros usuarios.

import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const URL_DGT = 'https://infocar.dgt.es/datex2/dgt/PredefinedLocationsPublication/radares/content.xml';
const DESTINO = join(dirname(fileURLToPath(import.meta.url)), '..', 'src', 'data', 'radares', 'radares-dgt.json');

function valor(bloque, etiqueta) {
  const encontrado = bloque.match(new RegExp(`<_0:${etiqueta}>([^<]*)</_0:${etiqueta}>`));
  return encontrado ? encontrado[1].trim() : null;
}

function coordenadas(bloque) {
  const lat = Number(valor(bloque, 'latitude'));
  const lon = Number(valor(bloque, 'longitude'));
  return Number.isFinite(lat) && Number.isFinite(lon) ? [redondear(lat), redondear(lon)] : null;
}

// 5 decimales: aproximadamente 1 metro.
function redondear(n) {
  return Math.round(n * 1e5) / 1e5;
}

function punto(bloque, nombre) {
  const encontrado = bloque.match(new RegExp(`<_0:${nombre} [^>]*>([\\s\\S]*?)</_0:${nombre}>`));
  return encontrado ? coordenadas(encontrado[1]) : null;
}

async function main() {
  const respuesta = await fetch(URL_DGT);
  if (!respuesta.ok) throw new Error(`La DGT ha respondido ${respuesta.status}`);
  const xml = await respuesta.text();

  const publicado = valor(xml, 'publicationTime');
  // Cada radar es un <_0:predefinedLocation id="GUID_..."> hasta su cierre.
  const bloques = xml.split('<_0:predefinedLocation id="').slice(1);
  const radares = [];
  for (const bloque of bloques) {
    const id = bloque.slice(0, bloque.indexOf('"')).replace(/^GUID_/, '');
    const carretera = valor(bloque, 'roadNumber') ?? valor(bloque, 'value') ?? '';
    const provincia = bloque.match(/<_0:administrativeArea>\s*<_0:value>([^<]*)</)?.[1]?.trim() ?? '';
    if (bloque.includes('xsi:type="_0:Linear"')) {
      // Tramo de velocidad media: desde "from" hasta "to".
      const desde = punto(bloque, 'from');
      const hasta = punto(bloque, 'to');
      if (desde && hasta) radares.push({ id, tipo: 'tramo', lat: desde[0], lon: desde[1], fin: hasta, carretera, provincia });
    } else {
      const aqui = punto(bloque, 'point');
      if (aqui) radares.push({ id, tipo: 'fijo', lat: aqui[0], lon: aqui[1], carretera, provincia });
    }
  }
  if (radares.length < 100) throw new Error(`Solo se han leído ${radares.length} radares: el formato puede haber cambiado`);

  const datos = {
    fuente: 'DGT, Punto de Acceso Nacional de Tráfico y Movilidad (datos abiertos)',
    publicado: publicado ? publicado.slice(0, 10) : null,
    radares,
  };
  mkdirSync(dirname(DESTINO), { recursive: true });
  writeFileSync(DESTINO, `${JSON.stringify(datos)}\n`);
  const tramos = radares.filter((r) => r.tipo === 'tramo').length;
  console.log(`Guardados ${radares.length} radares (${radares.length - tramos} fijos y ${tramos} tramos) publicados el ${datos.publicado}.`);
}

main().catch((error) => {
  console.error(`No se han podido actualizar los radares: ${error.message}`);
  process.exit(1);
});
