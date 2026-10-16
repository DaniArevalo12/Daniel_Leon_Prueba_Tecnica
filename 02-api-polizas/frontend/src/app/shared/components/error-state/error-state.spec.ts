import { TestBed } from '@angular/core/testing';

import { ErrorState } from './error-state';

describe('ErrorState', () => {
  it('muestra el mensaje y el código de seguimiento, y permite reintentar', async () => {
    const fixture = TestBed.createComponent(ErrorState);
    const reintentar = vi.fn();
    fixture.componentInstance.reintentar.subscribe(reintentar);
    fixture.componentRef.setInput('mensaje', 'Sin conexión');
    fixture.componentRef.setInput('correlationId', 'cid-9');
    await fixture.whenStable();

    const elemento: HTMLElement = fixture.nativeElement;
    expect(elemento.querySelector('[role="alert"]')?.textContent).toContain('Sin conexión');
    expect(elemento.textContent).toContain('cid-9');

    (elemento.querySelector('button') as HTMLButtonElement).click();
    expect(reintentar).toHaveBeenCalledOnce();
  });

  it('oculta el botón de reintentar cuando no aplica (p. ej. 404)', async () => {
    const fixture = TestBed.createComponent(ErrorState);
    fixture.componentRef.setInput('reintentable', false);
    await fixture.whenStable();

    expect(fixture.nativeElement.querySelector('button')).toBeNull();
  });
});
