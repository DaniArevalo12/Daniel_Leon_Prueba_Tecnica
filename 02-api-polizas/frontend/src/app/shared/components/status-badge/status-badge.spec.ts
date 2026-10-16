import { TestBed } from '@angular/core/testing';

import { StatusBadge } from './status-badge';

describe('StatusBadge', () => {
  it.each([
    ['ACTIVA', 'Activa', 'bg-primario-100'],
    ['RENOVADA', 'Renovada', 'bg-acento-100'],
    ['CANCELADA', 'Cancelada', 'bg-red-50'],
    ['ACTIVO', 'Activo', 'bg-primario-100'],
    ['CANCELADO', 'Cancelado', 'bg-red-50'],
  ] as const)('%s se muestra como "%s" con su color', async (estado, etiqueta, clase) => {
    const fixture = TestBed.createComponent(StatusBadge);
    fixture.componentRef.setInput('estado', estado);
    await fixture.whenStable();

    const badge: HTMLElement = fixture.nativeElement.querySelector('[data-estado]');
    expect(badge.textContent?.trim()).toBe(etiqueta);
    expect(badge.className).toContain(clase);
  });
});
