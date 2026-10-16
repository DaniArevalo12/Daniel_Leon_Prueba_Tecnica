import { Observable, OperatorFunction, catchError, map, of, startWith } from 'rxjs';

import { ApiError } from '../../core/http/api-error';

/**
 * Estado de una consulta como unión discriminada: la plantilla no puede mostrar datos
 * mientras carga ni olvidar el caso de error (el compilador obliga a distinguirlos).
 */
export type Carga<T> =
  | { readonly estado: 'cargando' }
  | { readonly estado: 'listo'; readonly datos: T }
  | { readonly estado: 'error'; readonly error: ApiError };

/** Convierte una petición en la secuencia cargando → listo | error. */
export function conEstadoDeCarga<T>(): OperatorFunction<T, Carga<T>> {
  return (fuente: Observable<T>) =>
    fuente.pipe(
      map((datos): Carga<T> => ({ estado: 'listo', datos })),
      startWith<Carga<T>>({ estado: 'cargando' }),
      catchError((error: unknown) => of<Carga<T>>({ estado: 'error', error: aApiError(error) })),
    );
}

function aApiError(error: unknown): ApiError {
  return error instanceof ApiError
    ? error
    : new ApiError(0, 'Error inesperado', 'Ocurrió un error inesperado al cargar la información.', null);
}
