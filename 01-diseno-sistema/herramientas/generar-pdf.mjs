// Genera un PDF a partir de un Markdown: Markdown → HTML con estilos de impresión → Chromium.
//   node generar-pdf.mjs                                   → ../ARQUITECTURA.md (con salto de página por sección)
//   node generar-pdf.mjs <archivo.md> [--saltos-seccion] [--compacto]   → <archivo>.pdf junto al .md
//   --compacto: letra y espacios algo menores, para documentos que deben caber en pocas páginas
// Los diagramas (diagramas/*.png) se incrustan como SVG: vectoriales, nítidos al hacer zoom.
import { readFileSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { marked } from 'marked';
import { chromium } from 'playwright';

const aqui = path.dirname(fileURLToPath(import.meta.url));
const argumentos = process.argv.slice(2);
const entrada = path.resolve(argumentos.find((a) => !a.startsWith('--')) ?? path.join(aqui, '..', 'ARQUITECTURA.md'));
const saltosPorSeccion = argumentos.length === 0 || argumentos.includes('--saltos-seccion');
const compacto = argumentos.includes('--compacto');
const raiz = path.dirname(entrada);
const salidaPdf = entrada.replace(/\.md$/i, '.pdf');
const markdown = readFileSync(entrada, 'utf8');
const tituloDocumento = (markdown.match(/^#\s+(.+)$/m)?.[1] ?? path.basename(entrada)).replace(/[*`]/g, '');

const cuerpo = marked
  .parse(markdown)
  .replace(/src="(diagramas\/[^"]+)\.png"/g, 'src="$1.svg"')
  // Los enlaces a archivos locales quedarían como rutas absolutas file:/// del equipo que genera el PDF: se dejan solo como texto
  .replace(/<a href="(?!(?:https?:|mailto:))[^"]*"[^>]*>([\s\S]*?)<\/a>/g, '$1')
  // Los anexos B y C continúan en la misma página que el anterior (son cortos)
  .replace(/<h2>(Anexo [BC])/g, '<h2 class="continua">$1')
  // Solo las tablas cortas se mantienen enteras; las largas se dividen por filas sin dejar huecos
  .replace(/<table>([\s\S]*?)<\/table>/g, (tabla, contenido) =>
    (contenido.match(/<tr>/g) ?? []).length <= 9 ? `<table class="corta">${contenido}</table>` : tabla);

const estilos = `
  @page { size: A4; margin: 16mm 14mm 18mm; }
  @page horizontal { size: A4 landscape; margin: 12mm; }
  * { box-sizing: border-box; }
  body { font-family: "Segoe UI", Helvetica, Arial, sans-serif; font-size: 10.5pt; line-height: 1.45; color: #0f172a; }
  h1 { font-size: 22pt; color: #0a6b38; border-bottom: 4px solid #ffd31a; padding-bottom: 6px; margin-top: 0; }
  h2 { font-size: 15pt; color: #0a6b38; border-bottom: 1px solid #cbd5e1; padding-bottom: 4px; margin-top: 22px; break-after: avoid; }
  ${saltosPorSeccion ? 'h2:not(:first-of-type) { break-before: page; }' : ''}
  h3 { font-size: 12pt; color: #08562e; margin-top: 16px; break-after: avoid; }
  p, li { orphans: 3; widows: 3; }
  blockquote { margin: 10px 0; padding: 8px 12px; background: #eef8f1; border-left: 4px solid #0a6b38; color: #1e293b; }
  table { width: 100%; border-collapse: collapse; margin: 10px 0; font-size: 9pt; break-inside: auto; }
  tr { break-inside: avoid; }
  table.corta { break-inside: avoid; }
  p:has(+ table.corta) { break-after: avoid; }
  h2.continua { break-before: auto; margin-top: 28px; }
  th { background: #0a6b38; color: #fff; text-align: left; padding: 5px 7px; }
  td { border-bottom: 1px solid #e2e8f0; padding: 5px 7px; vertical-align: top; }
  tr:nth-child(even) td { background: #f8fafc; }
  code { font-family: Consolas, "Courier New", monospace; font-size: 8.5pt; background: #f1f5f9; padding: 1px 4px; border-radius: 3px; }
  pre { background: #f1f5f9; border-left: 3px solid #0a6b38; padding: 7px 10px; border-radius: 4px; white-space: pre-wrap; word-break: break-word; break-inside: avoid; }
  pre code { background: none; padding: 0; font-size: 8.2pt; line-height: 1.35; }
  /* Los SVG de Mermaid no tienen tamaño intrínseco (width="100%"): se fija el ancho y se conserva la proporción */
  img { display: block; width: 100%; height: auto; max-height: 232mm; object-fit: contain; margin: 10px auto; break-inside: avoid; }
  hr { display: none; }
  /* Diagramas anchos (contenedores, ER) en página horizontal junto con su título, para que no quede solo */
  :is(h2, h3):has(+ .pagina-horizontal), .pagina-horizontal { page: horizontal; }
  .pagina-horizontal img { max-height: 165mm; }
  ${compacto ? `
  @page { margin: 12mm 13mm 14mm; }
  body { font-size: 9.6pt; line-height: 1.35; }
  h1 { font-size: 18pt; margin-bottom: 8px; }
  h2 { font-size: 12.5pt; margin-top: 14px; margin-bottom: 6px; }
  p, ul, ol { margin: 5px 0; }
  li { margin: 1px 0; }
  blockquote { padding: 5px 10px; margin: 6px 0; }
  table { font-size: 8.4pt; margin: 6px 0; }
  th, td { padding: 3px 6px; }` : ''}
`;

const html = `<!doctype html><html lang="es"><head><meta charset="utf-8"><title>${tituloDocumento}</title>
<style>${estilos}</style></head><body>${cuerpo}</body></html>`;

// Se escribe junto al .md para que las rutas relativas de los diagramas resuelvan igual
const temporal = path.join(raiz, '.generar-pdf.html');
writeFileSync(temporal, html, 'utf8');

const navegador = await chromium.launch();
try {
  const pagina = await navegador.newPage();
  await pagina.goto(pathToFileURL(temporal).href, { waitUntil: 'networkidle' });
  await pagina.pdf({
    path: salidaPdf,
    format: 'A4',
    printBackground: true,
    preferCSSPageSize: true,
    displayHeaderFooter: true,
    headerTemplate: '<span></span>',
    footerTemplate:
      '<div style="font-size:8px;width:100%;text-align:center;color:#64748b;font-family:Segoe UI,Arial">' +
      `${tituloDocumento} · <span class="pageNumber"></span> / <span class="totalPages"></span></div>`,
  });
  console.log(`✔ ${path.relative(process.cwd(), salidaPdf)}`);
} finally {
  await navegador.close();
  rmSync(temporal, { force: true });
}
