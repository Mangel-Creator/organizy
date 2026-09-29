import { describe, expect, it } from '@jest/globals';

import { matrizQR } from '../qr';

// Filas del QR en hexadecimal (1 = negro), sacadas de "toqr" (el codificador que usa Expo)
// el 29/09/2026. "hola" con la máscara que elige solo; el enlace, con la máscara 3 (la
// que eligió toqr: la nuestra elige otra igual de válida, y los datos coinciden).
const HOLA = ['1fcd7f', '104541', '175c5d', '17585d', '175f5d', '105941', '1fd57f', '1300', '17c17c', '1d1d29', '8f29a', '17303c', '4d691', '1bc9', '1fcd66', '105fcc', '175922', '175524', '175a9c', '104434', '1fd296'];
const ENLACE = ['1fd24aac27f', '105ac539141', '174b290025d', '175c108785d', '17490a5f25d', '104b7f4d641', '1fd5555557f', '1a0f66f00', '16e8fe83e4b', '8ac4fe97f5', '1e6529b5484', 'fbc855c592', '10578b5aa8e', '12092934acf', '135da3e5363', '3bcc4a1048', '1b6ad1cd011', '81815ff4a2', '1f439542d50', '78cfca1cec', '3da2238d7c', '1fa2baad7db', '11d2e8718f6', 'b9c365d5ab', 'f72b87ca0d', '5b0d71fb4f', '2e3be04339', '9aee6f539b', '849c5f8738', '7b6570a1a8', '15f1d60fdc4', '3274e61955', 'ac238909ff', '168bbc313', '1fd9e529f5e', '105e6b03311', '174920b69f4', '175d8ad701e', '17569791d23', '104766c5552', '1fd630fa7ca'];

function enHex(m: boolean[][]): string[] {
  return m.map((fila) => BigInt(`0b${fila.map((c) => (c ? '1' : '0')).join('')}`).toString(16));
}

describe('matrizQR', () => {
  it('coincide con toqr en un texto corto', () => {
    expect(enHex(matrizQR('hola') as boolean[][])).toEqual(HOLA);
  });

  it('coincide con toqr en un enlace de invitación (versión 6, 41 x 41)', () => {
    const m = matrizQR('https://mangel-creator.github.io/organizy/empresa#invitacion=0123456789abcdef0123456789abcdef', 3);
    expect(m).toHaveLength(41);
    expect(enHex(m as boolean[][])).toEqual(ENLACE);
  });

  it('pone los tres cuadros de las esquinas', () => {
    const m = matrizQR('https://mangel-creator.github.io/organizy/empresa#invitacion=0123456789abcdef0123456789abcdef') as boolean[][];
    const n = m.length;
    for (const [x, y] of [[0, 0], [n - 7, 0], [0, n - 7]]) {
      expect(m[y][x] && m[y + 6][x + 6] && m[y + 3][x + 3]).toBe(true);
      expect(m[y + 1][x + 1]).toBe(false);
    }
  });

  it('no cabe un texto demasiado largo', () => {
    expect(matrizQR('a'.repeat(400))).toBeNull();
  });
});
