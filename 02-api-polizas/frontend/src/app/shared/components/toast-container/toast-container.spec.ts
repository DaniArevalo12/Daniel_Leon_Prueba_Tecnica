import { TestBed } from '@angular/core/testing';

import { ToastService } from '../../services/toast.service';
import { ToastContainer } from './toast-container';

describe('ToastContainer', () => {
  it('anuncia los errores como alerta, muestra el código de seguimiento y permite cerrarlos', async () => {
    const fixture = TestBed.createComponent(ToastContainer);
    const service = TestBed.inject(ToastService);
    service.error('Operación no permitida', 'Póliza cancelada', 'cid-123');
    await fixture.whenStable();

    const toast: HTMLElement = fixture.nativeElement.querySelector('[data-testid="toast"]');
    expect(toast.getAttribute('role')).toBe('alert');
    expect(toast.textContent).toContain('Póliza cancelada');
    expect(fixture.nativeElement.querySelector('[data-testid="toast-correlation-id"]').textContent).toBe('cid-123');

    fixture.nativeElement.querySelector('button[aria-label="Cerrar notificación"]').click();
    expect(service.toasts()).toHaveLength(0);
  });

  it('los mensajes de éxito usan role="status"', async () => {
    const fixture = TestBed.createComponent(ToastContainer);
    TestBed.inject(ToastService).exito('Listo', 'Póliza creada');
    await fixture.whenStable();

    expect(fixture.nativeElement.querySelector('[data-testid="toast"]').getAttribute('role')).toBe('status');
    expect(fixture.nativeElement.querySelector('[data-testid="toast-correlation-id"]')).toBeNull();
  });
});
