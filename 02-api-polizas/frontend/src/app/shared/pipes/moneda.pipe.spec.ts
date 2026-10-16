import { registerLocaleData } from '@angular/common';
import localeEsCo from '@angular/common/locales/es-CO';
import { LOCALE_ID } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { MonedaPipe } from './moneda.pipe';

describe('MonedaPipe', () => {
  let pipe: MonedaPipe;

  beforeEach(() => {
    registerLocaleData(localeEsCo);
    TestBed.configureTestingModule({ providers: [{ provide: LOCALE_ID, useValue: 'es-CO' }] });
    pipe = TestBed.runInInjectionContext(() => new MonedaPipe());
  });

  // El locale usa espacio no separable entre el símbolo y la cifra
  const normalizar = (texto: string) => texto.replace(/\s/g, ' ');

  it('formatea pesos con separador de miles del locale es-CO', () => {
    expect(normalizar(pipe.transform(1500000))).toBe('$ 1.500.000');
  });

  it('conserva los centavos cuando existen', () => {
    expect(normalizar(pipe.transform(1000000.5))).toBe('$ 1.000.000,50');
  });

  it('devuelve vacío para valores ausentes', () => {
    expect(pipe.transform(null)).toBe('');
    expect(pipe.transform(undefined)).toBe('');
  });
});
