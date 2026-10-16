import { registerLocaleData } from '@angular/common';
import localeEsCo from '@angular/common/locales/es-CO';
import { LOCALE_ID } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { Subject, of, throwError } from 'rxjs';

import { ApiError } from '../../../../core/http/api-error';
import { Poliza } from '../../../../core/models/poliza.model';
import { PolizasService } from '../../../../core/services/polizas.service';
import { unaPoliza } from '../../../../testing/datos-prueba';
import { PolizaList } from './poliza-list';

describe('PolizaList', () => {
  let fixture: ComponentFixture<PolizaList>;
  let listar: ReturnType<typeof vi.fn>;
  let elemento: HTMLElement;

  async function crear(respuesta: unknown, queryParams: Record<string, string> = {}): Promise<void> {
    listar = vi.fn().mockReturnValue(respuesta);
    registerLocaleData(localeEsCo);
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        { provide: PolizasService, useValue: { listar } },
        { provide: LOCALE_ID, useValue: 'es-CO' },
      ],
    });
    fixture = TestBed.createComponent(PolizaList);
    for (const [k, v] of Object.entries(queryParams)) {
      fixture.componentRef.setInput(k, v);
    }
    elemento = fixture.nativeElement;
    await fixture.whenStable();
  }

  it('muestra las pólizas con su estado y valores en pesos', async () => {
    await crear(of([unaPoliza(), unaPoliza({ id: 3, numero: 'POL-000003', estado: 'CANCELADA' })]));

    const filas = elemento.querySelectorAll('[data-testid="fila-poliza"]');
    expect(filas).toHaveLength(2);
    expect(filas[0].textContent).toContain('POL-000001');
    expect(filas[0].textContent?.replace(/\s/g, ' ')).toContain('$ 18.000.000');
    expect(filas[1].querySelector('[data-estado]')?.textContent?.trim()).toBe('Cancelada');
    expect(filas[0].querySelector('a')?.getAttribute('href')).toBe('/polizas/1');
  });

  it('envía al servicio los filtros de la URL e ignora valores inválidos', async () => {
    await crear(of([]), { tipo: 'COLECTIVA', estado: 'INVENTADO' });

    expect(listar).toHaveBeenCalledWith({ tipo: 'COLECTIVA', estado: null });
  });

  it('al filtrar actualiza la URL (la URL es la fuente de verdad de los filtros)', async () => {
    await crear(of([]));
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);

    const select = elemento.querySelector('#filtro-estado') as HTMLSelectElement;
    select.value = 'RENOVADA';
    select.dispatchEvent(new Event('change'));

    expect(navigate).toHaveBeenCalledWith([], {
      queryParams: { tipo: null, estado: 'RENOVADA' },
      queryParamsHandling: 'merge',
    });
  });

  it('muestra el estado de carga mientras responde el backend', async () => {
    await crear(new Subject<Poliza[]>());

    expect(elemento.querySelector('[role="status"]')?.textContent).toContain('Cargando pólizas');
  });

  it('distingue "sin resultados" con filtros de "aún no hay pólizas"', async () => {
    await crear(of([]), { tipo: 'COLECTIVA' });
    expect(elemento.textContent).toContain('Sin resultados');

    TestBed.resetTestingModule();
    await crear(of([]));
    expect(elemento.textContent).toContain('Aún no hay pólizas');
  });

  it('muestra el error con código de seguimiento y permite reintentar', async () => {
    await crear(throwError(() => new ApiError(0, 'Sin conexión', 'No se pudo conectar con el servidor.', 'cid-1')));
    expect(elemento.querySelector('[role="alert"]')?.textContent).toContain('No se pudo conectar');
    expect(elemento.textContent).toContain('cid-1');

    listar.mockReturnValue(of([unaPoliza()]));
    (elemento.querySelector('[role="alert"] button') as HTMLButtonElement).click();
    await fixture.whenStable();

    expect(listar).toHaveBeenCalledTimes(2);
    expect(elemento.querySelectorAll('[data-testid="fila-poliza"]')).toHaveLength(1);
  });
});
