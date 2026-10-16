import { registerLocaleData } from '@angular/common';
import localeEsCo from '@angular/common/locales/es-CO';
import { LOCALE_ID } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Subject, of, throwError } from 'rxjs';

import { ApiError } from '../../../../core/http/api-error';
import { Poliza } from '../../../../core/models/poliza.model';
import { ParametrosService } from '../../../../core/services/parametros.service';
import { PolizasService } from '../../../../core/services/polizas.service';
import { unaPoliza } from '../../../../testing/datos-prueba';
import { RenovacionDialog } from './renovacion-dialog';

describe('RenovacionDialog', () => {
  let fixture: ComponentFixture<RenovacionDialog>;
  let elemento: HTMLElement;
  let renovar: ReturnType<typeof vi.fn>;

  const renovada = unaPoliza({
    estado: 'RENOVADA',
    valorCanon: 1578000,
    valorPrima: 18936000,
    fechaInicioVigencia: '2027-01-01',
    fechaFinVigencia: '2028-01-01',
  });

  async function crear(ipc = of({ ipc: 0.052 })): Promise<void> {
    renovar = vi.fn().mockReturnValue(of(renovada));
    registerLocaleData(localeEsCo);
    TestBed.configureTestingModule({
      providers: [
        { provide: PolizasService, useValue: { renovar } },
        { provide: ParametrosService, useValue: { renovacion: () => ipc } },
        { provide: LOCALE_ID, useValue: 'es-CO' },
      ],
    });
    fixture = TestBed.createComponent(RenovacionDialog);
    fixture.componentRef.setInput('poliza', unaPoliza());
    fixture.componentRef.setInput('abierto', true);
    elemento = fixture.nativeElement;
    await fixture.whenStable();
  }

  const confirmar = () => elemento.querySelector('[data-testid="confirmar"]') as HTMLButtonElement;
  const normalizar = (texto: string | null | undefined) => texto?.replace(/\s+/g, ' ').trim();

  it('muestra el IPC vigente consultado al backend antes de confirmar', async () => {
    await crear();

    expect(normalizar(elemento.querySelector('[data-testid="ipc"]')?.textContent)).toBe('5,20%');
    expect(confirmar().disabled).toBe(false);
  });

  it('no permite confirmar mientras no se conozca el IPC', async () => {
    await crear(new Subject<{ ipc: number }>());

    expect(elemento.textContent).toContain('Consultando IPC vigente');
    expect(confirmar().disabled).toBe(true);
  });

  it('si no se puede consultar el IPC lo informa y no permite renovar', async () => {
    await crear(throwError(() => new ApiError(500, 'Error', 'x', null)));

    expect(elemento.querySelector('[role="alert"]')?.textContent).toContain('No fue posible consultar el IPC');
    expect(confirmar().disabled).toBe(true);
  });

  it('tras renovar compara canon y prima anteriores con los nuevos', async () => {
    await crear();
    const emitida = vi.fn();
    fixture.componentInstance.renovada.subscribe(emitida);

    confirmar().click();
    await fixture.whenStable();

    expect(renovar).toHaveBeenCalledWith(1);
    expect(emitida).toHaveBeenCalledWith(renovada);
    const filas = Array.from(elemento.querySelectorAll('[data-testid="comparacion-renovacion"] tbody tr')).map((fila) =>
      Array.from(fila.children).map((celda) => normalizar(celda.textContent)),
    );
    expect(filas).toEqual([
      ['Canon mensual', '$ 1.500.000', '$ 1.578.000'],
      ['Prima', '$ 18.000.000', '$ 18.936.000'],
    ]);
    expect(elemento.textContent).toContain('1 ene 2027 al 1 ene 2028');
  });

  it('si el backend rechaza la renovación (p. ej. 409) cierra el diálogo y avisa para recargar, sin emitir renovada', async () => {
    await crear();
    renovar.mockReturnValue(throwError(() => new ApiError(409, 'Operación no permitida', 'Está cancelada', 'cid')));
    const cerrado = vi.fn();
    const emitida = vi.fn<(p: Poliza) => void>();
    const rechazada = vi.fn();
    fixture.componentInstance.cerrado.subscribe(cerrado);
    fixture.componentInstance.renovada.subscribe(emitida);
    fixture.componentInstance.rechazada.subscribe(rechazada);

    confirmar().click();
    await fixture.whenStable();

    expect(cerrado).toHaveBeenCalled();
    expect(rechazada).toHaveBeenCalled();
    expect(emitida).not.toHaveBeenCalled();
  });
});
