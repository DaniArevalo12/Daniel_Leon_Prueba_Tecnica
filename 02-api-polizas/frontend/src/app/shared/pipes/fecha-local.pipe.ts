import { formatDate } from '@angular/common';
import { LOCALE_ID, Pipe, PipeTransform, inject } from '@angular/core';

const FECHA_ISO = /^(\d{4})-(\d{2})-(\d{2})$/;

/**
 * Formatea fechas sin hora (LocalDate del backend, "2026-01-01").
 *
 * El DatePipe interpreta "2026-01-01" como medianoche UTC; en Colombia (UTC-5) mostraría
 * "31 dic 2025". Aquí la fecha se construye en la zona local, así el día nunca se corre.
 */
@Pipe({ name: 'fechaLocal' })
export class FechaLocalPipe implements PipeTransform {
  private readonly locale = inject(LOCALE_ID);

  transform(valor: string | null | undefined, formato = 'd MMM y'): string {
    if (!valor) {
      return '';
    }
    const partes = FECHA_ISO.exec(valor);
    if (!partes) {
      return valor;
    }
    const [, anio, mes, dia] = partes;
    return formatDate(new Date(Number(anio), Number(mes) - 1, Number(dia)), formato, this.locale);
  }
}
