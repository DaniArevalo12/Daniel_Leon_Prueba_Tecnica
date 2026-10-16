import { TestBed } from '@angular/core/testing';

import { ToastService } from './toast.service';

describe('ToastService', () => {
  let service: ToastService;

  beforeEach(() => {
    vi.useFakeTimers();
    service = TestBed.inject(ToastService);
  });

  afterEach(() => vi.useRealTimers());

  it('agrega toasts y los cierra automáticamente', () => {
    service.exito('Listo', 'Póliza creada');

    expect(service.toasts()).toHaveLength(1);
    vi.advanceTimersByTime(4000);
    expect(service.toasts()).toHaveLength(0);
  });

  it('los errores duran más que los éxitos', () => {
    service.exito('Listo', 'ok');
    service.error('Falló', 'detalle', 'cid-1');

    vi.advanceTimersByTime(4000);

    expect(service.toasts()).toEqual([expect.objectContaining({ tipo: 'error', correlationId: 'cid-1' })]);
  });

  it('permite cerrar un toast manualmente', () => {
    service.info('Info', 'mensaje');

    service.cerrar(service.toasts()[0].id);

    expect(service.toasts()).toHaveLength(0);
  });
});
