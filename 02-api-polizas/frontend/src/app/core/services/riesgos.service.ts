import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { API_BASE_URL } from '../http/api-config';
import { Riesgo } from '../models/poliza.model';

@Injectable({ providedIn: 'root' })
export class RiesgosService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${inject(API_BASE_URL)}/riesgos`;

  cancelar(id: number): Observable<Riesgo> {
    return this.http.post<Riesgo>(`${this.baseUrl}/${id}/cancelar`, null);
  }
}
