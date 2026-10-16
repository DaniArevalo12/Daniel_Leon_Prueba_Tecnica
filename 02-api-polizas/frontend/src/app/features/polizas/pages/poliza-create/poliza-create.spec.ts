import { registerLocaleData } from '@angular/common';
import localeEsCo from '@angular/common/locales/es-CO';
import { LOCALE_ID } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';

import { ApiError } from '../../../../core/http/api-error';
import { PolizasService } from '../../../../core/services/polizas.service';
import { ToastService } from '../../../../shared/services/toast.service';
import { unaPoliza } from '../../../../testing/datos-prueba';
import { PolizaCreate } from './poliza-create';

describe('PolizaCreate', () => {
  let fixture: ComponentFixture<PolizaCreate>;
  let componente: PolizaCreate;
  let elemento: HTMLElement;
  let crear: ReturnType<typeof vi.fn>;
  let navigate: ReturnType<typeof vi.spyOn>;

  beforeEach(async () => {
    crear = vi.fn().mockReturnValue(of(unaPoliza({ id: 1000, numero: 'POL-001000' })));
    registerLocaleData(localeEsCo);
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        { provide: PolizasService, useValue: { crear } },
        { provide: LOCALE_ID, useValue: 'es-CO' },
      ],
    });
    navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    fixture = TestBed.createComponent(PolizaCreate);
    componente = fixture.componentInstance;
    elemento = fixture.nativeElement;
    await fixture.whenStable();
  });

  const riesgos = () => componente.form.controls.riesgos;
  const formulariosRiesgo = () => elemento.querySelectorAll('[data-testid="riesgo-form"]');
  const botonAgregar = () =>
    Array.from(elemento.querySelectorAll('button')).find((b) => b.textContent?.includes('Agregar riesgo'));

  async function seleccionarTipo(tipo: 'INDIVIDUAL' | 'COLECTIVA'): Promise<void> {
    (elemento.querySelector(`[data-testid="tipo-${tipo}"]`) as HTMLInputElement).click();
    await fixture.whenStable();
  }

  function diligenciarDatosValidos(): void {
    componente.form.patchValue({
      tomador: '  Inmobiliaria Andina  ',
      fechaInicioVigencia: '2026-11-01',
      mesesVigencia: 12,
      valorCanon: 1800000,
    });
    riesgos().at(0).setValue({ direccionInmueble: 'Calle 1', arrendatario: 'Ana', arrendador: 'Luis' });
  }

  async function enviar(): Promise<void> {
    (elemento.querySelector('form') as HTMLFormElement).dispatchEvent(new Event('submit'));
    await fixture.whenStable();
  }

  describe('riesgos según el tipo', () => {
    it('INDIVIDUAL tiene exactamente un riesgo, sin agregar ni quitar', () => {
      expect(formulariosRiesgo()).toHaveLength(1);
      expect(botonAgregar()).toBeUndefined();
      expect(elemento.querySelector('button[aria-label^="Quitar"]')).toBeNull();
    });

    it('COLECTIVA permite agregar y quitar riesgos (de 0 a n)', async () => {
      await seleccionarTipo('COLECTIVA');

      botonAgregar()?.click();
      botonAgregar()?.click();
      await fixture.whenStable();
      expect(formulariosRiesgo()).toHaveLength(3);

      while (riesgos().length > 0) {
        elemento.querySelector<HTMLButtonElement>('button[aria-label^="Quitar"]')?.click();
        await fixture.whenStable();
      }
      expect(riesgos().length).toBe(0);
      expect(elemento.textContent).toContain('Sin riesgos por ahora');
    });

    it('al volver a INDIVIDUAL deja un solo riesgo', async () => {
      await seleccionarTipo('COLECTIVA');
      botonAgregar()?.click();
      botonAgregar()?.click();

      await seleccionarTipo('INDIVIDUAL');

      expect(riesgos().length).toBe(1);
    });

    it('al volver a INDIVIDUAL sin riesgos crea uno vacío', async () => {
      await seleccionarTipo('COLECTIVA');
      riesgos().clear();

      await seleccionarTipo('INDIVIDUAL');

      expect(riesgos().length).toBe(1);
    });
  });

  it('muestra la prima estimada (canon × meses) aclarando que la calcula el sistema', async () => {
    componente.form.patchValue({ valorCanon: 1800000, mesesVigencia: 12 });
    await fixture.whenStable();

    const prima = elemento.querySelector('[data-testid="prima-estimada"]') as HTMLElement;
    expect(prima.textContent?.replace(/\s/g, ' ').trim()).toBe('$ 21.600.000');
    expect(prima.parentElement?.textContent).toContain('estimada, la calcula el sistema');
  });

  it('con datos inválidos no llama al backend y marca los campos', async () => {
    await enviar();

    expect(crear).not.toHaveBeenCalled();
    expect(elemento.querySelector('#tomador')?.getAttribute('aria-invalid')).toBe('true');
    expect(elemento.textContent).toContain('Este campo es obligatorio.');
  });

  it('valida formato de meses y decimales del canon', async () => {
    componente.form.patchValue({ mesesVigencia: 121, valorCanon: 100.123 });

    expect(componente.form.controls.mesesVigencia.hasError('max')).toBe(true);
    expect(componente.form.controls.valorCanon.hasError('maxDecimales')).toBe(true);
  });

  it('envía el contrato del backend, notifica y navega al detalle', async () => {
    diligenciarDatosValidos();

    await enviar();

    expect(crear).toHaveBeenCalledWith({
      tipo: 'INDIVIDUAL',
      tomador: 'Inmobiliaria Andina',
      fechaInicioVigencia: '2026-11-01',
      mesesVigencia: 12,
      valorCanon: 1800000,
      riesgos: [{ direccionInmueble: 'Calle 1', arrendatario: 'Ana', arrendador: 'Luis' }],
    });
    expect(TestBed.inject(ToastService).toasts()[0].mensaje).toContain('POL-001000');
    expect(navigate).toHaveBeenCalledWith(['/polizas', 1000]);
  });

  it('marca en el formulario los errores por campo de un 400 del backend', async () => {
    crear.mockReturnValue(
      throwError(
        () =>
          new ApiError(400, 'Datos inválidos', 'Revise los campos', 'cid', {
            tomador: 'no debe estar vacío',
            'riesgos[0].arrendador': 'el tamaño debe estar entre 0 y 150',
          }),
      ),
    );
    diligenciarDatosValidos();

    await enviar();

    expect(componente.form.controls.tomador.errors?.['servidor']).toBe('no debe estar vacío');
    expect(riesgos().at(0).controls.arrendador.errors?.['servidor']).toBe('el tamaño debe estar entre 0 y 150');
    expect(elemento.textContent).toContain('no debe estar vacío');
    expect(navigate).not.toHaveBeenCalled();
    expect((elemento.querySelector('button[type="submit"]') as HTMLButtonElement).disabled).toBe(false);
  });
});
