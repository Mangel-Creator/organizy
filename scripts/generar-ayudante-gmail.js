// Genera gmail/organizy-correo.js, el archivo que el usuario pega en script.google.com:
// la parte de Google (gmail/ayudante.js) y, detrás, las reglas que comparte con el
// servidor (supabase/functions/_shared/reglasCorreo.js) sin los "export", porque Google
// Apps Script no entiende módulos.
//
//   npm run ayudante-gmail
//
// Una prueba (gmail/__tests__) avisa si alguien cambia las reglas y olvida generarlo.

const fs = require('fs');
const path = require('path');

const RAIZ = path.join(__dirname, '..');
const AYUDANTE = path.join(RAIZ, 'gmail', 'ayudante.js');
const REGLAS = path.join(RAIZ, 'supabase', 'functions', '_shared', 'reglasCorreo.js');
const SALIDA = path.join(RAIZ, 'gmail', 'organizy-correo.js');

function leer(archivo) {
  return fs.readFileSync(archivo, 'utf8').replace(/\r\n/g, '\n');
}

function generarAyudante() {
  const reglas = leer(REGLAS)
    // Sin la cabecera del módulo (el ayudante ya tiene la suya) ni sus "global".
    .replace(/^\/\*[\s\S]*?\*\/\n\/\* global [^*]*\*\/\n\n/, '')
    .replace(/^export (const|function) /gm, (_, tipo) => (tipo === 'const' ? 'var ' : 'function '));
  return (
    leer(AYUDANTE).trimEnd() +
    '\n\n// ===========================================================================\n' +
    '// Reglas (sin IA): copia de supabase/functions/_shared/reglasCorreo.js\n' +
    '// ===========================================================================\n\n' +
    reglas.trimEnd() +
    '\n'
  );
}

module.exports = { generarAyudante, SALIDA };

if (require.main === module) {
  fs.writeFileSync(SALIDA, generarAyudante());
  console.log('Generado gmail/organizy-correo.js');
}
