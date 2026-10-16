import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/** Indicador de carga con texto para lectores de pantalla. */
@Component({
  selector: 'app-spinner',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <span class="inline-flex items-center gap-2" role="status">
      <span
        class="inline-block size-5 animate-spin rounded-full border-2 border-current border-r-transparent"
        aria-hidden="true"
      ></span>
      <span [class.sr-only]="!textoVisible()">{{ texto() }}</span>
    </span>
  `,
})
export class Spinner {
  readonly texto = input('Cargando…');
  readonly textoVisible = input(false);
}
