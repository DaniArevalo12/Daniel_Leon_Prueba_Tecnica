import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ConfirmDialog } from './confirm-dialog';

describe('ConfirmDialog', () => {
  let fixture: ComponentFixture<ConfirmDialog>;
  let dialogo: HTMLDialogElement;

  async function abrir(entradas: Record<string, unknown> = {}): Promise<void> {
    fixture.componentRef.setInput('abierto', true);
    for (const [nombre, valor] of Object.entries(entradas)) {
      fixture.componentRef.setInput(nombre, valor);
    }
    await fixture.whenStable();
  }

  function boton(texto: string): HTMLButtonElement {
    return Array.from(dialogo.querySelectorAll('button')).find((b) => b.textContent?.includes(texto)) as HTMLButtonElement;
  }

  beforeEach(() => {
    fixture = TestBed.createComponent(ConfirmDialog);
    fixture.componentRef.setInput('abierto', false);
    fixture.componentRef.setInput('titulo', 'Cancelar póliza');
    dialogo = fixture.nativeElement.querySelector('dialog');
  });

  it('se abre y cierra según la entrada "abierto"', async () => {
    await fixture.whenStable();
    expect(dialogo.open).toBe(false);

    await abrir();
    expect(dialogo.open).toBe(true);

    fixture.componentRef.setInput('abierto', false);
    await fixture.whenStable();
    expect(dialogo.open).toBe(false);
  });

  it('está etiquetado por su título', async () => {
    await abrir();

    const titulo = dialogo.querySelector('h2') as HTMLElement;
    expect(dialogo.getAttribute('aria-labelledby')).toBe(titulo.id);
    expect(titulo.textContent).toBe('Cancelar póliza');
  });

  it('emite confirmar y cancelar', async () => {
    const confirmar = vi.fn();
    const cancelar = vi.fn();
    fixture.componentInstance.confirmar.subscribe(confirmar);
    fixture.componentInstance.cancelar.subscribe(cancelar);
    await abrir({ textoConfirmar: 'Sí, cancelar' });

    boton('Sí, cancelar').click();
    boton('Cancelar').click();

    expect(confirmar).toHaveBeenCalledOnce();
    expect(cancelar).toHaveBeenCalledOnce();
  });

  it('Esc equivale a cancelar, salvo mientras se procesa', async () => {
    const cancelar = vi.fn();
    fixture.componentInstance.cancelar.subscribe(cancelar);
    await abrir();

    dialogo.dispatchEvent(new Event('cancel', { cancelable: true }));
    expect(cancelar).toHaveBeenCalledOnce();

    await abrir({ procesando: true });
    const evento = new Event('cancel', { cancelable: true });
    dialogo.dispatchEvent(evento);
    expect(cancelar).toHaveBeenCalledOnce();
    expect(evento.defaultPrevented).toBe(true);
  });

  it('mientras procesa deshabilita los botones para evitar dobles envíos', async () => {
    await abrir({ procesando: true, textoConfirmar: 'Renovar' });

    expect(boton('Renovar').disabled).toBe(true);
    expect(boton('Cancelar').disabled).toBe(true);
  });

  it('usa estilo de peligro para acciones destructivas', async () => {
    await abrir({ tono: 'peligro' });

    expect((dialogo.querySelector('[data-testid="confirmar"]') as HTMLElement).className).toContain('bg-red-700');
  });
});
