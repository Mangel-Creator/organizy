import { describe, expect, it } from '@jest/globals';

import {
  enlaceBusquedaBooksy,
  esBooksy,
  extraerEnlace,
  nombreDesdeEnlace,
  textoDonde,
} from '@/services/servicios';

describe('extraerEnlace', () => {
  it('acepta un enlace normal', () => {
    expect(extraerEnlace('https://booksy.com/es-es/123_pelu_peluqueria_1_madrid')).toBe(
      'https://booksy.com/es-es/123_pelu_peluqueria_1_madrid',
    );
  });

  it('lo saca del texto que se comparte desde Booksy', () => {
    expect(extraerEnlace('Reserva en Pelu Laura: https://booksy.com/es-es/dl/show-business/123.')).toBe(
      'https://booksy.com/es-es/dl/show-business/123',
    );
  });

  it('añade https si no lo lleva y cambia http por https', () => {
    expect(extraerEnlace('booksy.com/es-es/123')).toBe('https://booksy.com/es-es/123');
    expect(extraerEnlace('http://mipelu.es/reservas')).toBe('https://mipelu.es/reservas');
  });

  it('rechaza lo que no es una dirección web', () => {
    expect(extraerEnlace('')).toBeNull();
    expect(extraerEnlace('Peluquería Laura')).toBeNull();
    expect(extraerEnlace('ftp://booksy.com')).toBeNull();
    expect(extraerEnlace('https://localhost')).toBeNull();
  });
});

describe('Booksy', () => {
  it('reconoce sus enlaces', () => {
    expect(esBooksy('https://booksy.com/es-es/1')).toBe(true);
    expect(esBooksy('https://b.booksy.com/abc')).toBe(true);
    expect(esBooksy('https://nobooksy.com/1')).toBe(false);
  });

  it('dice dónde se reserva', () => {
    expect(textoDonde('https://booksy.com/es-es/1')).toBe('En Booksy');
    expect(textoDonde('https://www.mipelu.es/citas')).toBe('En mipelu.es');
  });

  it('saca el nombre del negocio de la dirección', () => {
    expect(nombreDesdeEnlace('https://booksy.com/es-es/123456_peluqueria-laura_peluqueria_53009_madrid')).toBe(
      'Peluqueria laura',
    );
    expect(nombreDesdeEnlace('https://booksy.com/es-es/dl/show-business/123')).toBeNull();
    expect(nombreDesdeEnlace('https://mipelu.es/123_algo_x')).toBeNull();
  });

  it('busca por categoría', () => {
    expect(enlaceBusquedaBooksy('unas')).toBe('https://booksy.com/es-es/s/salon-de-unas');
    expect(enlaceBusquedaBooksy('otro')).toBe('https://booksy.com/es-es/');
  });
});
