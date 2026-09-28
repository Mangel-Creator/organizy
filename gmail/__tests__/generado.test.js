import { describe, expect, it } from '@jest/globals';

// El ayudante que se pega en Google se genera juntando gmail/ayudante.js y las reglas
// del servidor. Si esto falla, ejecuta `npm run ayudante-gmail` y súbelo.
const fs = require('fs');
const { generarAyudante, SALIDA } = require('../../scripts/generar-ayudante-gmail.js');

describe('gmail/organizy-correo.js', () => {
  it('está al día con las reglas y la parte de Google', () => {
    expect(fs.readFileSync(SALIDA, 'utf8').replace(/\r\n/g, '\n')).toBe(generarAyudante());
  });

  it('se puede pegar en Google: sin "export" ni "import" y sin errores de sintaxis', () => {
    const codigo = generarAyudante();
    expect(codigo).not.toMatch(/^(export|import) /m);
    expect(() => new Function(codigo)).not.toThrow();
  });
});
