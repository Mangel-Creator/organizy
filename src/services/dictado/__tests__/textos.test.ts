import { describe, expect, it } from '@jest/globals';

import { falloDesdeCodigo, limpiarDictado, mensajeFallo } from '../textos';

describe('falloDesdeCodigo', () => {
  it('traduce los códigos del móvil y del navegador', () => {
    expect(falloDesdeCodigo('not-allowed')).toBe('sin-permiso');
    expect(falloDesdeCodigo('service-not-allowed')).toBe('sin-permiso');
    expect(falloDesdeCodigo('no-speech')).toBe('sin-voz');
    expect(falloDesdeCodigo('speech-timeout')).toBe('sin-voz');
    expect(falloDesdeCodigo('network')).toBe('sin-conexion');
    expect(falloDesdeCodigo('language-not-supported')).toBe('no-disponible');
    expect(falloDesdeCodigo('interrupted')).toBe('ocupado');
    expect(falloDesdeCodigo('aborted')).toBe('parado');
    expect(falloDesdeCodigo('algo-raro')).toBe('otro');
  });
});

describe('mensajeFallo', () => {
  it('no dice nada si lo ha parado el usuario', () => {
    expect(mensajeFallo('parado', false)).toBeNull();
  });

  it('en la web explica dónde se da el permiso', () => {
    expect(mensajeFallo('sin-permiso', true)).toContain('Safari');
    expect(mensajeFallo('sin-permiso', false)).not.toContain('Safari');
  });

  it('siempre tiene algo que decir para el resto', () => {
    for (const fallo of ['sin-voz', 'sin-conexion', 'no-disponible', 'ocupado', 'otro'] as const) {
      expect(mensajeFallo(fallo, false)).toBeTruthy();
    }
  });
});

describe('limpiarDictado', () => {
  it('quita espacios de más', () => {
    expect(limpiarDictado('  cena con  Laura\nel viernes ')).toBe('cena con Laura el viernes');
    expect(limpiarDictado('   ')).toBe('');
  });
});
