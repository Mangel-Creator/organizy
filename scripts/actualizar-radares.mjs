// Descarga los radares fijos oficiales de la DGT, los revisa y los guarda dentro de
// la app (src/data/radares/radares-dgt.json). Para actualizarlos: npm run radares
//
// Fuente: Punto de Acceso Nacional de Tráfico (https://nap.dgt.es/dataset/radares-fijos-dgt),
// datos abiertos en formato DATEX II. Trae las cabinas de radar fijo y los tramos de
// velocidad media de las carreteras del Estado (sin País Vasco ni Cataluña, que tienen
// su propio servicio de tráfico). No trae el límite de velocidad.
// Solo radares fijos oficiales: nada de radares móviles avisados por otros usuarios.
//
// Revisión (con OpenStreetMap, © colaboradores de OpenStreetMap, licencia ODbL):
//   1. Se quitan las cabinas repetidas: las del principio y el final de cada tramo de
//      velocidad media ya están en el tramo, y alguna viene dos veces.
//   2. Se descartan los radares que no están sobre ninguna carretera (a más de 120 m
//      de cualquier carretera de OpenStreetMap): sus coordenadas están mal.
//   3. El límite de velocidad se toma del radar de OpenStreetMap que esté en el mismo
//      sitio (a menos de 60 m), si lo tiene. Sirve solo de información.
// Si OpenStreetMap no responde, no se toca nada: prueba otra vez en unos minutos.

import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const URL_DGT = 'https://infocar.dgt.es/datex2/dgt/PredefinedLocationsPublication/radares/content.xml';
const URL_OVERPASS = 'https://overpass-api.de/api/interpreter';
const AGENTE = 'Organizy/1.0 (actualizar radares DGT; https://github.com/Mangel-Creator/organizy)';
const DESTINO = join(dirname(fileURLToPath(import.meta.url)), '..', 'src', 'data', 'radares', 'radares-dgt.json');

const MISMO_SITIO_M = 60; // dos radares a menos de esto son el mismo
const FUERA_DE_CARRETERA_M = 120;
// Carreteras de verdad (no caminos, sendas ni pistas).
const VIAS =
  'motorway|trunk|primary|secondary|tertiary|unclassified|residential|motorway_link|trunk_link|primary_link|secondary_link|tertiary_link|living_street|road';

// --- Utilidades ---

function valor(bloque, etiqueta) {
  const encontrado = bloque.match(new RegExp(`<_0:${etiqueta}>([^<]*)</_0:${etiqueta}>`));
  return encontrado ? encontrado[1].trim() : null;
}

// 5 decimales: aproximadamente 1 metro.
function redondear(n) {
  return Math.round(n * 1e5) / 1e5;
}

function coordenadas(bloque) {
  const lat = Number(valor(bloque, 'latitude'));
  const lon = Number(valor(bloque, 'longitude'));
  return Number.isFinite(lat) && Number.isFinite(lon) ? [redondear(lat), redondear(lon)] : null;
}

function punto(bloque, nombre) {
  const encontrado = bloque.match(new RegExp(`<_0:${nombre} [^>]*>([\\s\\S]*?)</_0:${nombre}>`));
  return encontrado ? coordenadas(encontrado[1]) : null;
}

function distanciaM(a, b) {
  const t = Math.PI / 180;
  const dLat = (b[0] - a[0]) * t;
  const dLon = (b[1] - a[1]) * t;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(a[0] * t) * Math.cos(b[0] * t) * Math.sin(dLon / 2) ** 2;
  return 12742000 * Math.asin(Math.min(1, Math.sqrt(h)));
}

// Distancia de un punto a una línea (lista de { lat, lon }), en metros.
function distanciaALineaM(p, linea) {
  const mLat = 111320;
  const mLon = mLat * Math.cos((p[0] * Math.PI) / 180);
  let minima = Infinity;
  for (let i = 1; i < linea.length; i++) {
    const ax = (linea[i - 1].lon - p[1]) * mLon;
    const ay = (linea[i - 1].lat - p[0]) * mLat;
    const bx = (linea[i].lon - p[1]) * mLon;
    const by = (linea[i].lat - p[0]) * mLat;
    const dx = bx - ax;
    const dy = by - ay;
    const l = dx * dx + dy * dy;
    const u = l ? Math.max(0, Math.min(1, -(ax * dx + ay * dy) / l)) : 0;
    minima = Math.min(minima, Math.hypot(ax + u * dx, ay + u * dy));
  }
  return minima;
}

async function overpass(consulta) {
  const respuesta = await fetch(URL_OVERPASS, {
    method: 'POST',
    headers: { 'User-Agent': AGENTE, Accept: 'application/json', 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ data: consulta }),
  });
  if (!respuesta.ok) throw new Error(`OpenStreetMap ha respondido ${respuesta.status}`);
  const texto = await respuesta.text();
  if (!texto.trim().startsWith('{')) throw new Error('OpenStreetMap está ocupado');
  return JSON.parse(texto).elements;
}

// --- Pasos ---

async function leerDgt() {
  const respuesta = await fetch(URL_DGT);
  if (!respuesta.ok) throw new Error(`La DGT ha respondido ${respuesta.status}`);
  const xml = await respuesta.text();
  const publicado = valor(xml, 'publicationTime');
  // Cada radar es un <_0:predefinedLocation id="GUID_..."> hasta su cierre.
  const radares = [];
  for (const bloque of xml.split('<_0:predefinedLocation id="').slice(1)) {
    const id = bloque.slice(0, bloque.indexOf('"')).replace(/^GUID_/, '');
    const carretera = valor(bloque, 'roadNumber') ?? valor(bloque, 'value') ?? '';
    const provincia = bloque.match(/<_0:administrativeArea>\s*<_0:value>([^<]*)</)?.[1]?.trim() ?? '';
    if (bloque.includes('xsi:type="_0:Linear"')) {
      // Tramo de velocidad media: desde "from" hasta "to" (cada sentido viene aparte).
      const desde = punto(bloque, 'from');
      const hasta = punto(bloque, 'to');
      if (desde && hasta) radares.push({ id, tipo: 'tramo', lat: desde[0], lon: desde[1], fin: hasta, carretera, provincia });
    } else {
      const aqui = punto(bloque, 'point');
      if (aqui) radares.push({ id, tipo: 'fijo', lat: aqui[0], lon: aqui[1], carretera, provincia });
    }
  }
  if (radares.length < 100) throw new Error(`Solo se han leído ${radares.length} radares: el formato puede haber cambiado`);
  return { publicado: publicado ? publicado.slice(0, 10) : null, radares };
}

// Quita las cabinas que coinciden con el principio o el final de un tramo, o con otra cabina.
function quitarRepetidos(radares) {
  const tramos = radares.filter((r) => r.tipo === 'tramo');
  const extremos = tramos.flatMap((t) => [[t.lat, t.lon], t.fin]);
  const quedan = [...tramos];
  let repetidos = 0;
  for (const r of radares.filter((x) => x.tipo === 'fijo')) {
    const aqui = [r.lat, r.lon];
    const repetido =
      extremos.some((e) => distanciaM(e, aqui) < MISMO_SITIO_M) ||
      quedan.some((q) => q.tipo === 'fijo' && distanciaM([q.lat, q.lon], aqui) < MISMO_SITIO_M);
    if (repetido) repetidos++;
    else quedan.push(r);
  }
  return { radares: quedan, repetidos };
}

// Límite de velocidad desde OpenStreetMap y lista de radares que no encajan con ningún
// radar de OpenStreetMap (esos se comprueban después contra las carreteras).
async function revisarConOpenStreetMap(radares) {
  const camaras = await overpass(
    '[out:json][timeout:170];area["ISO3166-1"="ES"][admin_level=2]->.es;node["highway"="speed_camera"](area.es);out;',
  );
  const lejos = [];
  for (const r of radares) {
    const puntos = [[r.lat, r.lon], ...(r.fin ? [r.fin] : [])];
    let cerca = null;
    let minima = Infinity;
    for (const c of camaras) {
      const d = distanciaM(puntos[0], [c.lat, c.lon]);
      if (d < minima) {
        minima = d;
        cerca = c;
      }
    }
    const limite = Number(cerca?.tags?.maxspeed);
    if (minima < MISMO_SITIO_M && Number.isFinite(limite) && limite >= 20 && limite <= 130) r.limite = limite;
    if (puntos.some((p) => camaras.every((c) => distanciaM(p, [c.lat, c.lon]) > 300))) lejos.push(r);
  }
  // Para los que no tienen un radar de OpenStreetMap cerca: ¿están sobre una carretera?
  const consultas = lejos.flatMap((r) =>
    [[r.lat, r.lon], ...(r.fin ? [r.fin] : [])].map(
      (p) => `way(around:${FUERA_DE_CARRETERA_M},${p[0]},${p[1]})["highway"~"^(${VIAS})$"];`,
    ),
  );
  const vias = consultas.length ? await overpass(`[out:json][timeout:170];(${consultas.join('')});out geom;`) : [];
  const malos = lejos.filter((r) =>
    [[r.lat, r.lon], ...(r.fin ? [r.fin] : [])].some((p) =>
      vias.every((v) => !v.geometry || distanciaALineaM(p, v.geometry) > FUERA_DE_CARRETERA_M),
    ),
  );
  return { malos, conLimite: radares.filter((r) => r.limite).length };
}

async function main() {
  const dgt = await leerDgt();
  const { radares, repetidos } = quitarRepetidos(dgt.radares);
  const { malos, conLimite } = await revisarConOpenStreetMap(radares);
  const idsMalos = new Set(malos.map((r) => r.id));
  const buenos = radares.filter((r) => !idsMalos.has(r.id));

  const datos = {
    fuente: 'DGT, Punto de Acceso Nacional de Tráfico y Movilidad (datos abiertos)',
    publicado: dgt.publicado,
    revisado: new Date().toISOString().slice(0, 10),
    // Límites de velocidad: © colaboradores de OpenStreetMap (ODbL).
    descartados: malos.map((r) => `${r.id} (${r.carretera}, ${r.provincia})`),
    radares: buenos,
  };
  mkdirSync(dirname(DESTINO), { recursive: true });
  writeFileSync(DESTINO, `${JSON.stringify(datos)}\n`);
  const tramos = buenos.filter((r) => r.tipo === 'tramo').length;
  console.log(`DGT: ${dgt.radares.length} radares publicados el ${dgt.publicado}.`);
  console.log(`Quitados ${repetidos} repetidos y ${malos.length} fuera de carretera:`);
  for (const r of datos.descartados) console.log(`  - ${r}`);
  console.log(`Guardados ${buenos.length} (${buenos.length - tramos} fijos y ${tramos} tramos), ${conLimite} con límite de velocidad.`);
}

main().catch((error) => {
  console.error(`No se han podido actualizar los radares: ${error.message}`);
  process.exit(1);
});
