import { AbstractControl, FormGroup, ValidationErrors, ValidatorFn } from '@angular/forms';

/**
 * Validaciones de FORMATO equivalentes a las del backend (Bean Validation), para dar retroalimentación
 * inmediata. No son reglas de negocio: esas solo las valida el backend.
 */

/** Como Validators.required, pero rechaza también "   " (equivale a @NotBlank). */
export const requeridoSinEspacios: ValidatorFn = (control: AbstractControl): ValidationErrors | null => {
  const valor = control.value;
  return typeof valor === 'string' && valor.trim().length === 0 ? { required: true } : null;
};

/** Máximo de decimales permitidos (equivale a @Digits(fraction = n)). */
export function maxDecimales(maximo: number): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const valor = control.value;
    if (valor === null || valor === undefined || valor === '') {
      return null;
    }
    const decimales = String(valor).split('.')[1]?.length ?? 0;
    return decimales > maximo ? { maxDecimales: { maximo } } : null;
  };
}

/** Solo números enteros. */
export const entero: ValidatorFn = (control: AbstractControl): ValidationErrors | null => {
  const valor = control.value;
  return valor === null || valor === '' || Number.isInteger(Number(valor)) ? null : { entero: true };
};

/**
 * Lleva los errores de validación de un 400 del backend a los controles del formulario.
 * Las rutas de Spring ("riesgos[0].direccionInmueble") se traducen a rutas de Angular ("riesgos.0.direccionInmueble").
 *
 * @returns true si al menos un error se pudo asociar a un campo
 */
export function aplicarErroresServidor(form: FormGroup, errores: Readonly<Record<string, string>>): boolean {
  let aplicados = false;
  for (const [campo, mensaje] of Object.entries(errores)) {
    const control = form.get(campo.replace(/\[(\d+)\]/g, '.$1'));
    if (control) {
      control.setErrors({ ...control.errors, servidor: mensaje });
      control.markAsTouched();
      aplicados = true;
    }
  }
  return aplicados;
}
