import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { API_BASE_URL } from '../http/api-config';
import { ParametrosRenovacion } from '../models/poliza.model';

/** Parámetros de negocio vigentes: el IPC tiene una única fuente de verdad en el backend. */
@Injectable({ providedIn: 'root' })
export class ParametrosService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${inject(API_BASE_URL)}/parametros`;

  renovacion(): Observable<ParametrosRenovacion> {
    return this.http.get<ParametrosRenovacion>(`${this.baseUrl}/renovacion`);
  }
}
