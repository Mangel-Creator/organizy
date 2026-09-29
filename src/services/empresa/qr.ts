// Código QR para el enlace de invitación (Organizy grupal). Sin librerías: genera la
// matriz de cuadritos (true = negro) de un texto corto, en modo "bytes" y con
// corrección de errores M (se lee aunque se tape un 15 %). Versiones 1 a 10 (hasta
// ~210 letras); un enlace de invitación ocupa la versión 6 (41 x 41).
//
// Sigue el estándar ISO/IEC 18004 (el mismo método que la biblioteca de Nayuki). Se
// comprobó el 29/09/2026 que, con la misma máscara, da exactamente la misma matriz que
// "toqr" (la que usa Expo para enseñar sus QR); la prueba está en __tests__/qr.test.ts.

type Matriz = boolean[][];

const ECC_POR_BLOQUE = [0, 10, 16, 26, 18, 24, 16, 18, 22, 22, 26];
const BLOQUES = [0, 1, 1, 1, 2, 2, 4, 4, 4, 5, 5];
const ALINEACION = [[], [], [6, 18], [6, 22], [6, 26], [6, 30], [6, 34], [6, 22, 38], [6, 24, 42], [6, 26, 46], [6, 28, 50]];
const MAX_VERSION = 10;

function modulosDeDatos(version: number): number {
  let r = (16 * version + 128) * version + 64;
  if (version >= 2) {
    const n = Math.floor(version / 7) + 2;
    r -= (25 * n - 10) * n - 55;
    if (version >= 7) r -= 36;
  }
  return r;
}

function palabrasDeDatos(version: number): number {
  return Math.floor(modulosDeDatos(version) / 8) - ECC_POR_BLOQUE[version] * BLOQUES[version];
}

// --- Reed-Solomon en GF(256) ---

function multiplicar(x: number, y: number): number {
  let z = 0;
  for (let i = 7; i >= 0; i--) {
    z = (z << 1) ^ ((z >>> 7) * 0x11d);
    z ^= ((y >>> i) & 1) * x;
  }
  return z;
}

function divisor(grado: number): number[] {
  const r = new Array<number>(grado).fill(0);
  r[grado - 1] = 1;
  let raiz = 1;
  for (let i = 0; i < grado; i++) {
    for (let j = 0; j < r.length; j++) {
      r[j] = multiplicar(r[j], raiz);
      if (j + 1 < r.length) r[j] ^= r[j + 1];
    }
    raiz = multiplicar(raiz, 0x02);
  }
  return r;
}

function resto(datos: number[], div: number[]): number[] {
  const r = new Array<number>(div.length).fill(0);
  for (const b of datos) {
    const factor = b ^ (r.shift() as number);
    r.push(0);
    div.forEach((c, i) => {
      r[i] ^= multiplicar(c, factor);
    });
  }
  return r;
}

// --- Datos ---

function utf8(texto: string): number[] {
  return Array.from(new TextEncoder().encode(texto));
}

function codificar(bytes: number[], version: number): number[] {
  const bits: number[] = [];
  const poner = (valor: number, n: number) => {
    for (let i = n - 1; i >= 0; i--) bits.push((valor >>> i) & 1);
  };
  poner(0b0100, 4); // modo bytes
  poner(bytes.length, version < 10 ? 8 : 16);
  for (const b of bytes) poner(b, 8);
  const capacidad = palabrasDeDatos(version) * 8;
  poner(0, Math.min(4, capacidad - bits.length));
  poner(0, (8 - (bits.length % 8)) % 8);
  for (let relleno = 0xec; bits.length < capacidad; relleno ^= 0xec ^ 0x11) poner(relleno, 8);
  const palabras: number[] = [];
  for (let i = 0; i < bits.length; i += 8) palabras.push(parseInt(bits.slice(i, i + 8).join(''), 2));
  return palabras;
}

function conCorreccion(datos: number[], version: number): number[] {
  const nBloques = BLOQUES[version];
  const ecc = ECC_POR_BLOQUE[version];
  const total = Math.floor(modulosDeDatos(version) / 8);
  const cortos = nBloques - (total % nBloques);
  const largoCorto = Math.floor(total / nBloques);
  const div = divisor(ecc);
  const bloques: number[][] = [];
  for (let i = 0, k = 0; i < nBloques; i++) {
    const trozo = datos.slice(k, k + largoCorto - ecc + (i < cortos ? 0 : 1));
    k += trozo.length;
    const correccion = resto(trozo, div);
    if (i < cortos) trozo.push(0);
    bloques.push(trozo.concat(correccion));
  }
  const salida: number[] = [];
  for (let i = 0; i < bloques[0].length; i++) {
    bloques.forEach((b, j) => {
      if (i !== largoCorto - ecc || j >= cortos) salida.push(b[i]);
    });
  }
  return salida;
}

// --- Dibujo ---

class Dibujo {
  readonly lado: number;
  readonly m: Matriz;
  readonly fijo: Matriz;

  constructor(readonly version: number) {
    this.lado = version * 4 + 17;
    this.m = Array.from({ length: this.lado }, () => new Array<boolean>(this.lado).fill(false));
    this.fijo = Array.from({ length: this.lado }, () => new Array<boolean>(this.lado).fill(false));
  }

  poner(x: number, y: number, negro: boolean) {
    this.m[y][x] = negro;
    this.fijo[y][x] = true;
  }

  patronesFijos() {
    const n = this.lado;
    for (let i = 0; i < n; i++) {
      this.poner(6, i, i % 2 === 0);
      this.poner(i, 6, i % 2 === 0);
    }
    for (const [cx, cy] of [[3, 3], [n - 4, 3], [3, n - 4]]) {
      for (let dy = -4; dy <= 4; dy++) {
        for (let dx = -4; dx <= 4; dx++) {
          const d = Math.max(Math.abs(dx), Math.abs(dy));
          const x = cx + dx;
          const y = cy + dy;
          if (x >= 0 && x < n && y >= 0 && y < n) this.poner(x, y, d !== 2 && d !== 4);
        }
      }
    }
    const pos = ALINEACION[this.version];
    const ultimo = pos.length - 1;
    pos.forEach((a, i) =>
      pos.forEach((b, j) => {
        if ((i === 0 && j === 0) || (i === 0 && j === ultimo) || (i === ultimo && j === 0)) return;
        for (let dy = -2; dy <= 2; dy++) {
          for (let dx = -2; dx <= 2; dx++) this.poner(a + dx, b + dy, Math.max(Math.abs(dx), Math.abs(dy)) !== 1);
        }
      }),
    );
    this.formato(0);
    if (this.version >= 7) {
      let r = this.version;
      for (let i = 0; i < 12; i++) r = (r << 1) ^ ((r >>> 11) * 0x1f25);
      const bits = (this.version << 12) | r;
      for (let i = 0; i < 18; i++) {
        const negro = ((bits >>> i) & 1) !== 0;
        const a = n - 11 + (i % 3);
        const b = Math.floor(i / 3);
        this.poner(a, b, negro);
        this.poner(b, a, negro);
      }
    }
  }

  // Nivel M (bits 00) y la máscara elegida.
  formato(mascara: number) {
    const datos = (0 << 3) | mascara;
    let r = datos;
    for (let i = 0; i < 10; i++) r = (r << 1) ^ ((r >>> 9) * 0x537);
    const bits = ((datos << 10) | r) ^ 0x5412;
    const bit = (i: number) => ((bits >>> i) & 1) !== 0;
    const n = this.lado;
    for (let i = 0; i <= 5; i++) this.poner(8, i, bit(i));
    this.poner(8, 7, bit(6));
    this.poner(8, 8, bit(7));
    this.poner(7, 8, bit(8));
    for (let i = 9; i < 15; i++) this.poner(14 - i, 8, bit(i));
    for (let i = 0; i < 8; i++) this.poner(n - 1 - i, 8, bit(i));
    for (let i = 8; i < 15; i++) this.poner(8, n - 15 + i, bit(i));
    this.poner(8, n - 8, true);
  }

  palabras(datos: number[]) {
    const n = this.lado;
    let i = 0;
    for (let derecha = n - 1; derecha >= 1; derecha -= 2) {
      if (derecha === 6) derecha = 5;
      for (let v = 0; v < n; v++) {
        for (let j = 0; j < 2; j++) {
          const x = derecha - j;
          const subiendo = ((derecha + 1) & 2) === 0;
          const y = subiendo ? n - 1 - v : v;
          if (!this.fijo[y][x] && i < datos.length * 8) {
            this.m[y][x] = ((datos[i >>> 3] >>> (7 - (i & 7))) & 1) !== 0;
            i++;
          }
        }
      }
    }
  }

  mascara(k: number) {
    for (let y = 0; y < this.lado; y++) {
      for (let x = 0; x < this.lado; x++) {
        let invertir: boolean;
        switch (k) {
          case 0: invertir = (x + y) % 2 === 0; break;
          case 1: invertir = y % 2 === 0; break;
          case 2: invertir = x % 3 === 0; break;
          case 3: invertir = (x + y) % 3 === 0; break;
          case 4: invertir = (Math.floor(x / 3) + Math.floor(y / 2)) % 2 === 0; break;
          case 5: invertir = ((x * y) % 2) + ((x * y) % 3) === 0; break;
          case 6: invertir = (((x * y) % 2) + ((x * y) % 3)) % 2 === 0; break;
          default: invertir = (((x + y) % 2) + ((x * y) % 3)) % 2 === 0;
        }
        if (!this.fijo[y][x] && invertir) this.m[y][x] = !this.m[y][x];
      }
    }
  }

  // Penalización del estándar: cuanto menor, mejor se lee.
  penalizacion(): number {
    const n = this.lado;
    let total = 0;
    const lineas: boolean[][] = [];
    for (let i = 0; i < n; i++) {
      lineas.push(this.m[i]);
      lineas.push(this.m.map((fila) => fila[i]));
    }
    for (const linea of lineas) total += penalizarLinea(linea);
    for (let y = 0; y < n - 1; y++) {
      for (let x = 0; x < n - 1; x++) {
        const c = this.m[y][x];
        if (c === this.m[y][x + 1] && c === this.m[y + 1][x] && c === this.m[y + 1][x + 1]) total += 3;
      }
    }
    const negros = this.m.reduce((s, fila) => s + fila.filter(Boolean).length, 0);
    const k = Math.ceil(Math.abs(negros * 20 - n * n * 10) / (n * n)) - 1;
    return total + k * 10;
  }
}

// Rachas de 5 o más iguales (N1) y patrones parecidos a los de las esquinas (N3),
// igual que la biblioteca de Nayuki (con el borde blanco alrededor).
function penalizarLinea(linea: boolean[]): number {
  let total = 0;
  let color = false;
  let racha = 0;
  const historia = [0, 0, 0, 0, 0, 0, 0];
  const n = linea.length;
  const anadir = (r: number) => {
    if (historia[0] === 0) r += n;
    historia.pop();
    historia.unshift(r);
  };
  const contarPatron = (): number => {
    const c = historia[1];
    const centro = c > 0 && historia[2] === c && historia[3] === c * 3 && historia[4] === c && historia[5] === c;
    return (centro && historia[0] >= c * 4 && historia[6] >= c ? 1 : 0) + (centro && historia[6] >= c * 4 && historia[0] >= c ? 1 : 0);
  };
  for (const celda of linea) {
    if (celda === color) {
      racha++;
      if (racha === 5) total += 3;
      else if (racha > 5) total++;
    } else {
      anadir(racha);
      if (!color) total += contarPatron() * 40;
      color = celda;
      racha = 1;
    }
  }
  // Final de la línea (el borde blanco cuenta como más blanco).
  if (color) {
    anadir(racha);
    racha = 0;
  }
  racha += n;
  anadir(racha);
  total += contarPatron() * 40;
  return total;
}

// Matriz del QR de un texto, o null si no cabe (más de ~210 letras). Se queda con la
// máscara que mejor se lee; "soloMascara" fuerza una (para las pruebas).
export function matrizQR(texto: string, soloMascara?: number): Matriz | null {
  const bytes = utf8(texto);
  let version = 1;
  while (version <= MAX_VERSION && 4 + (version < 10 ? 8 : 16) + bytes.length * 8 > palabrasDeDatos(version) * 8) version++;
  if (version > MAX_VERSION) return null;
  const palabras = conCorreccion(codificar(bytes, version), version);
  let mejor: Matriz | null = null;
  let menor = Infinity;
  for (let k = 0; k < 8; k++) {
    if (soloMascara !== undefined && k !== soloMascara) continue;
    const d = new Dibujo(version);
    d.patronesFijos();
    d.palabras(palabras);
    d.mascara(k);
    d.formato(k);
    const p = d.penalizacion();
    if (p < menor) {
      menor = p;
      mejor = d.m.map((fila) => [...fila]);
    }
  }
  return mejor;
}
