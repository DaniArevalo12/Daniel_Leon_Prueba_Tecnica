import { registerLocaleData } from '@angular/common';
import localeEsCo from '@angular/common/locales/es-CO';
import { LOCALE_ID } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';

import { ApiError } from '../../../../core/http/api-error';
import { Poliza, Riesgo } from '../../../../core/models/poliza.model';
import { PolizasService } from '../../../../core/services/polizas.service';
import { RiesgosService } from '../../../../core/services/riesgos.service';
import { ParametrosService } from '../../../../core/services/parametros.service';
import { unRiesgo, unaPoliza } from '../../../../testing/datos-prueba';
import { PolizaDetail } from './poliza-detail';

describe('PolizaDetail', () => {
  let fixture: ComponentFixture<PolizaDetail>;
  let elemento: HTMLElement;
  let servicio: {
    obtener: ReturnType<typeof vi.fn>;
    listarRiesgos: ReturnType<typeof vi.fn>;
    cancelar?: ReturnType<typeof vi.fn>;
    agregarRiesgo?: ReturnType<typeof vi.fn>;
  };

  async function crear(id: string, poliza: Poliza | ApiError, riesgos: Riesgo[] = []): Promise<void> {
    servicio = {
      obtener: vi.fn().mockReturnValue(poliza instanceof ApiError ? throwError(() => poliza) : of(poliza)),
      listarRiesgos: vi.fn().mockReturnValue(of(riesgos)),
    };
    registerLocaleData(localeEsCo);
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        { provide: PolizasService, useValue: servicio },
        { provide: RiesgosService, useValue: { cancelar: vi.fn() } },
        { provide: ParametrosService, useValue: { renovacion: () => of({ ipc: 0.052 }) } },
        { provide: LOCALE_ID, useValue: 'es-CO' },
      ],
    });
    fixture = TestBed.createComponent(PolizaDetail);
    fixture.componentRef.setInput('id', id);
    elemento = fixture.nativeElement;
    await fixture.whenStable();
  }

  const texto = (testId: string) =>
    elemento.querySelector(`[data-testid="${testId}"]`)?.textContent?.replace(/\s+/g, ' ').trim();

  it('muestra datos, vigencia, canon, prima y riesgos', async () => {
    await crear('1', unaPoliza(), [unRiesgo()]);

    expect(elemento.querySelector('h1')?.textContent).toContain('Póliza POL-000001');
    expect(texto('vigencia')).toBe('1 ene 2026 – 1 ene 2027 (12 meses)');
    expect(texto('canon')).toBe('$ 1.500.000');
    expect(texto('prima')).toBe('$ 18.000.000');
    expect(elemento.querySelectorAll('[data-testid="fila-riesgo"]')).toHaveLength(1);
    expect(servicio.obtener).toHaveBeenCalledWith(1);
  });

  it('no ofrece cancelar riesgos si la póliza está cancelada', async () => {
    await crear('3', unaPoliza({ id: 3, estado: 'CANCELADA' }), [unRiesgo({ estado: 'CANCELADO' })]);

    expect(elemento.querySelector('button[aria-label^="Cancelar riesgo"]')).toBeNull();
  });

  it('muestra "no encontrada" ante un 404, sin opción de reintentar', async () => {
    await crear('999', new ApiError(404, 'No encontrado', 'No existe póliza con id 999', 'cid-404'));

    const alerta = elemento.querySelector('[role="alert"]') as HTMLElement;
    expect(alerta.textContent).toContain('Póliza no encontrada');
    expect(alerta.textContent).toContain('No existe póliza con id 999');
    expect(Array.from(alerta.querySelectorAll('button')).some((b) => b.textContent?.includes('Reintentar'))).toBe(false);
  });

  it('un id no numérico se trata como no encontrada sin llamar al backend', async () => {
    await crear('abc', unaPoliza());

    expect(servicio.obtener).not.toHaveBeenCalled();
    expect(elemento.textContent).toContain('Póliza no encontrada');
  });

  describe('acciones según estado y tipo', () => {
    const accion = (nombre: string) => elemento.querySelector(`[data-testid="accion-${nombre}"]`) as HTMLButtonElement | null;

    it('póliza COLECTIVA activa: puede renovar, cancelar y agregar riesgos', async () => {
      await crear('4', unaPoliza({ id: 4, tipo: 'COLECTIVA' }), [unRiesgo({ polizaId: 4 })]);

      expect(accion('renovar')?.disabled).toBe(false);
      expect(accion('cancelar')).not.toBeNull();
      expect(accion('agregar-riesgo')).not.toBeNull();
      expect(elemento.querySelector('button[aria-label^="Cancelar riesgo"]')).not.toBeNull();
    });

    it('póliza INDIVIDUAL: no ofrece agregar riesgos', async () => {
      await crear('1', unaPoliza(), [unRiesgo()]);

      expect(accion('agregar-riesgo')).toBeNull();
      expect(accion('renovar')?.disabled).toBe(false);
    });

    it('póliza CANCELADA: renovar deshabilitado con explicación, sin cancelar ni agregar riesgos', async () => {
      await crear('6', unaPoliza({ id: 6, tipo: 'COLECTIVA', estado: 'CANCELADA' }), [unRiesgo({ estado: 'CANCELADO' })]);

      expect(accion('renovar')?.disabled).toBe(true);
      expect(accion('renovar')?.getAttribute('aria-describedby')).toBe('motivo-sin-acciones');
      expect(elemento.querySelector('#motivo-sin-acciones')?.textContent).toContain('cancelada');
      expect(accion('cancelar')).toBeNull();
      expect(accion('agregar-riesgo')).toBeNull();
    });

    it('cancelar póliza advierte sobre sus riesgos activos, llama al backend y recarga', async () => {
      const cancelar = vi.fn().mockReturnValue(of(unaPoliza({ id: 4, estado: 'CANCELADA' })));
      await crear('4', unaPoliza({ id: 4, tipo: 'COLECTIVA' }), [unRiesgo(), unRiesgo({ id: 2 }), unRiesgo({ id: 3, estado: 'CANCELADO' })]);
      Object.assign(servicio, { cancelar });

      accion('cancelar')?.click();
      await fixture.whenStable();
      const dialogo = Array.from(elemento.querySelectorAll('dialog')).find((d) => d.open) as HTMLDialogElement;
      expect(dialogo.textContent).toContain('todos sus riesgos activos (2)');

      servicio.obtener.mockReturnValue(of(unaPoliza({ id: 4, tipo: 'COLECTIVA', estado: 'CANCELADA' })));
      (dialogo.querySelector('[data-testid="confirmar"]') as HTMLButtonElement).click();
      await fixture.whenStable();

      expect(cancelar).toHaveBeenCalledWith(4);
      expect(servicio.obtener).toHaveBeenCalledTimes(2);
      expect(elemento.querySelector('h1')?.parentElement?.textContent).toContain('Cancelada');
      expect(Array.from(elemento.querySelectorAll('dialog')).some((d) => d.open)).toBe(false);
    });

    it('agregar riesgo valida el formulario antes de llamar al backend', async () => {
      const agregarRiesgo = vi.fn().mockReturnValue(of(unRiesgo({ id: 99 })));
      await crear('7', unaPoliza({ id: 7, tipo: 'COLECTIVA' }), []);
      Object.assign(servicio, { agregarRiesgo });

      accion('agregar-riesgo')?.click();
      await fixture.whenStable();
      const dialogo = Array.from(elemento.querySelectorAll('dialog')).find((d) => d.open) as HTMLDialogElement;
      (dialogo.querySelector('[data-testid="confirmar"]') as HTMLButtonElement).click();
      await fixture.whenStable();
      expect(agregarRiesgo).not.toHaveBeenCalled();

      for (const [sufijo, valor] of [['direccion', 'Calle 9'], ['arrendatario', 'Ana'], ['arrendador', 'Luis']]) {
        const input = dialogo.querySelector(`input[id$="-${sufijo}"]`) as HTMLInputElement;
        input.value = valor;
        input.dispatchEvent(new Event('input'));
      }
      (dialogo.querySelector('[data-testid="confirmar"]') as HTMLButtonElement).click();
      await fixture.whenStable();

      expect(agregarRiesgo).toHaveBeenCalledWith(7, { direccionInmueble: 'Calle 9', arrendatario: 'Ana', arrendador: 'Luis' });
    });

    it('cancelar riesgo pide confirmación y llama al backend con su id', async () => {
      const cancelarRiesgo = vi.fn().mockReturnValue(of(unRiesgo({ estado: 'CANCELADO' })));
      TestBed.overrideProvider(RiesgosService, { useValue: { cancelar: cancelarRiesgo } });
      await crear('1', unaPoliza(), [unRiesgo({ id: 11 })]);

      (elemento.querySelector('button[aria-label^="Cancelar riesgo"]') as HTMLButtonElement).click();
      await fixture.whenStable();
      const dialogo = Array.from(elemento.querySelectorAll('dialog')).find((d) => d.open) as HTMLDialogElement;
      expect(dialogo.textContent).toContain('Calle 72 # 10-34');

      (dialogo.querySelector('[data-testid="confirmar"]') as HTMLButtonElement).click();
      await fixture.whenStable();

      expect(cancelarRiesgo).toHaveBeenCalledWith(11);
    });

    it('si el backend rechaza la acción (409) cierra el diálogo y recarga el estado real', async () => {
      const cancelar = vi.fn().mockReturnValue(throwError(() => new ApiError(409, 'Operación no permitida', 'Ya cancelada', 'cid')));
      await crear('1', unaPoliza(), [unRiesgo()]);
      Object.assign(servicio, { cancelar });

      accion('cancelar')?.click();
      await fixture.whenStable();
      (Array.from(elemento.querySelectorAll('dialog')).find((d) => d.open)?.querySelector('[data-testid="confirmar"]') as HTMLButtonElement).click();
      await fixture.whenStable();

      expect(servicio.obtener).toHaveBeenCalledTimes(2);
      expect(Array.from(elemento.querySelectorAll('dialog')).some((d) => d.open)).toBe(false);
    });
  });

  it('otros errores permiten reintentar', async () => {
    await crear('1', new ApiError(500, 'Error del servidor', 'Ocurrió un error inesperado.', 'cid-500'));

    servicio.obtener.mockReturnValue(of(unaPoliza()));
    (elemento.querySelector('[role="alert"] button') as HTMLButtonElement).click();
    await fixture.whenStable();

    expect(elemento.querySelector('h1')?.textContent).toContain('POL-000001');
  });
});
