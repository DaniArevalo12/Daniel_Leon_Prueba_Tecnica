import { registerLocaleData } from '@angular/common';
import localeEsCo from '@angular/common/locales/es-CO';
import { LOCALE_ID } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { FechaLocalPipe } from './fecha-local.pipe';

describe('FechaLocalPipe', () => {
  let pipe: FechaLocalPipe;

  beforeEach(() => {
    registerLocaleData(localeEsCo);
    TestBed.configureTestingModule({ providers: [{ provide: LOCALE_ID, useValue: 'es-CO' }] });
    pipe = TestBed.runInInjectionContext(() => new FechaLocalPipe());
  });

  it('no corre el día por la zona horaria (1 de enero sigue siendo 1 de enero)', () => {
    expect(pipe.transform('2026-01-01', 'yyyy-MM-dd')).toBe('2026-01-01');
    expect(pipe.transform('2026-01-01')).toMatch(/^1 ene 2026$/);
  });

  it('acepta un formato personalizado', () => {
    expect(pipe.transform('2027-05-15', 'd/MM/y')).toBe('15/05/2027');
  });

  it('devuelve vacío para nulos y el valor original si no es una fecha ISO', () => {
    expect(pipe.transform(null)).toBe('');
    expect(pipe.transform(undefined)).toBe('');
    expect(pipe.transform('no-es-fecha')).toBe('no-es-fecha');
  });
});
