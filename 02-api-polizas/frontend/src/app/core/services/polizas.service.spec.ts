import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { SILENCIAR_TOAST_ERROR } from '../http/api-config';
import { CrearPolizaRequest } from '../models/poliza.model';
import { ParametrosService } from './parametros.service';
import { PolizasService } from './polizas.service';
import { RiesgosService } from './riesgos.service';

describe('Servicios HTTP', () => {
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  describe('PolizasService', () => {
    let service: PolizasService;

    beforeEach(() => (service = TestBed.inject(PolizasService)));

    it('lista sin filtros cuando no se envían', () => {
      service.listar().subscribe();

      const req = http.expectOne('/api/polizas');
      expect(req.request.method).toBe('GET');
      expect(req.request.params.keys()).toEqual([]);
      req.flush([]);
    });

    it('envía solo los filtros definidos', () => {
      service.listar({ tipo: 'COLECTIVA', estado: null }).subscribe();

      const req = http.expectOne((r) => r.url === '/api/polizas');
      expect(req.request.params.get('tipo')).toBe('COLECTIVA');
      expect(req.request.params.has('estado')).toBe(false);
      req.flush([]);
    });

    it('las consultas silencian el toast porque la vista muestra su propio estado de error', () => {
      service.obtener(4).subscribe();
      service.listarRiesgos(4).subscribe();

      expect(http.expectOne('/api/polizas/4').request.context.get(SILENCIAR_TOAST_ERROR)).toBe(true);
      expect(http.expectOne('/api/polizas/4/riesgos').request.context.get(SILENCIAR_TOAST_ERROR)).toBe(true);
    });

    it('crea una póliza con el contrato del backend', () => {
      const request: CrearPolizaRequest = {
        tipo: 'INDIVIDUAL',
        tomador: 'Tomador',
        fechaInicioVigencia: '2026-11-01',
        mesesVigencia: 12,
        valorCanon: 1800000,
        riesgos: [{ direccionInmueble: 'Calle 1', arrendatario: 'A', arrendador: 'B' }],
      };
      service.crear(request).subscribe();

      const req = http.expectOne('/api/polizas');
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual(request);
      expect(req.request.context.get(SILENCIAR_TOAST_ERROR)).toBe(false);
    });

    it.each([
      ['renovar', '/api/polizas/1/renovar'],
      ['cancelar', '/api/polizas/1/cancelar'],
    ] as const)('%s hace POST a %s', (metodo, url) => {
      service[metodo](1).subscribe();

      expect(http.expectOne(url).request.method).toBe('POST');
    });

    it('agrega un riesgo a la póliza', () => {
      service.agregarRiesgo(7, { direccionInmueble: 'Calle 2', arrendatario: 'A', arrendador: 'B' }).subscribe();

      const req = http.expectOne('/api/polizas/7/riesgos');
      expect(req.request.method).toBe('POST');
      expect(req.request.body.direccionInmueble).toBe('Calle 2');
    });
  });

  it('RiesgosService cancela un riesgo', () => {
    TestBed.inject(RiesgosService).cancelar(5).subscribe();

    expect(http.expectOne('/api/riesgos/5/cancelar').request.method).toBe('POST');
  });

  it('ParametrosService consulta el IPC vigente', () => {
    let ipc: number | undefined;
    TestBed.inject(ParametrosService)
      .renovacion()
      .subscribe((p) => (ipc = p.ipc));

    http.expectOne('/api/parametros/renovacion').flush({ ipc: 0.052 });

    expect(ipc).toBe(0.052);
  });
});
