import { formatCurrency } from '@angular/common';
import { LOCALE_ID, Pipe, PipeTransform, inject } from '@angular/core';

/**
 * Pesos colombianos con el formato del locale es-CO: 1500000 → "$ 1.500.000".
 * Sin decimales para valores enteros; con exactamente dos cuando hay centavos ("$ 1.000.000,50").
 */
@Pipe({ name: 'moneda' })
export class MonedaPipe implements PipeTransform {
  private readonly locale = inject(LOCALE_ID);

  transform(valor: number | null | undefined): string {
    if (valor === null || valor === undefined) {
      return '';
    }
    const digitos = Number.isInteger(valor) ? '1.0-0' : '1.2-2';
    return formatCurrency(valor, this.locale, '$', 'COP', digitos);
  }
}
