import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { API_BASE_URL, sinToastDeError } from '../http/api-config';
import {
  CrearPolizaRequest,
  CrearRiesgoRequest,
  FiltrosPoliza,
  Poliza,
  Riesgo,
} from '../models/poliza.model';

/**
 * Cliente HTTP de pólizas. Solo traduce llamadas a la API: las reglas de negocio viven en el backend.
 */
@Injectable({ providedIn: 'root' })
export class PolizasService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${inject(API_BASE_URL)}/polizas`;

  listar(filtros: FiltrosPoliza = {}): Observable<Poliza[]> {
    let params = new HttpParams();
    if (filtros.tipo) {
      params = params.set('tipo', filtros.tipo);
    }
    if (filtros.estado) {
      params = params.set('estado', filtros.estado);
    }
    return this.http.get<Poliza[]>(this.baseUrl, { params, context: sinToastDeError() });
  }

  obtener(id: number): Observable<Poliza> {
    return this.http.get<Poliza>(`${this.baseUrl}/${id}`, { context: sinToastDeError() });
  }

  listarRiesgos(polizaId: number): Observable<Riesgo[]> {
    return this.http.get<Riesgo[]>(`${this.baseUrl}/${polizaId}/riesgos`, { context: sinToastDeError() });
  }

  crear(request: CrearPolizaRequest): Observable<Poliza> {
    return this.http.post<Poliza>(this.baseUrl, request);
  }

  renovar(id: number): Observable<Poliza> {
    return this.http.post<Poliza>(`${this.baseUrl}/${id}/renovar`, null);
  }

  cancelar(id: number): Observable<Poliza> {
    return this.http.post<Poliza>(`${this.baseUrl}/${id}/cancelar`, null);
  }

  agregarRiesgo(polizaId: number, request: CrearRiesgoRequest): Observable<Riesgo> {
    return this.http.post<Riesgo>(`${this.baseUrl}/${polizaId}/riesgos`, request);
  }
}
