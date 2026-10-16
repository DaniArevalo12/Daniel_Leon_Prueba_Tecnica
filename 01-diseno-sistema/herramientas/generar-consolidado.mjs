// Genera el entregable único de la prueba: los 5 módulos en un solo PDF.
//   node generar-consolidado.mjs   → Daniel_Leon_Prueba_Tecnica.pdf en la raíz del repositorio
// Se apoya en generar-pdf.mjs (mismo estilo y pie de página para todo el documento).
import { execFileSync } from 'node:child_process';
import { readFileSync, renameSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const aqui = path.dirname(fileURLToPath(import.meta.url));
const raiz = path.resolve(aqui, '..'); // 01-diseno-sistema
const proyecto = path.resolve(raiz, '..'); // raíz del repositorio
const repoUrl = 'https://github.com/DaniArevalo12/Daniel_Leon_Prueba_Tecnica';

const modulos = [
  { n: 1, titulo: 'Diseño de sistema', ruta: path.join(raiz, 'ARQUITECTURA.md') },
  { n: 2, titulo: 'Prueba técnica práctica (API de pólizas)', ruta: path.join(proyecto, '02-api-polizas', 'README.md') },
  { n: 3, titulo: 'Conocimientos en base de datos', ruta: path.join(proyecto, '03-base-datos', 'RESPUESTA.md') },
  { n: 4, titulo: 'Conocimientos en versionamiento', ruta: path.join(proyecto, '04-versionamiento', 'RESPUESTA.md') },
  { n: 5, titulo: 'Liderazgo técnico y gestión', ruta: path.join(proyecto, '05-liderazgo', 'RESPUESTA.md') },
];

const sinH1 = (md) => md.replace(/^#\s+.*\r?\n/, '').replace(/^\s*\n/, '');

const portada = `# Prueba técnica — Desarrollador TI/Sénior

**Seguros Bolívar** · Candidato: **Daniel León** · danielarevalodev2005@gmail.com

Este documento único reúne las respuestas de los cinco módulos de la prueba.

**Código del Módulo 2 (repositorio):** [${repoUrl}](${repoUrl})

## Contenido

| Módulo | Contenido | Formato |
|---|---|---|
| 1. Diseño de sistema | Arquitectura, patrones, modelo de datos y diagramas de componentes | Texto y diagramas |
| 2. Prueba técnica práctica | API de pólizas (Spring Boot + Angular). El código está en el repositorio de GitHub | Resumen en este documento y código en GitHub |
| 3. Base de datos | Estrategias de optimización SQL | Texto |
| 4. Versionamiento | Comando y justificación (Git) | Texto |
| 5. Liderazgo técnico | Respuestas a las preguntas de gestión y liderazgo | Texto |

---

`;

const cuerpo = modulos
  .map((m) => {
    const contenido = sinH1(readFileSync(m.ruta, 'utf8'));
    // Cada módulo empieza en una página nueva
    return `<h1 style="break-before: page">Módulo ${m.n}: ${m.titulo}</h1>\n\n${contenido}`;
  })
  .join('\n\n---\n\n');

const borrador = path.join(raiz, '.consolidado.md');
const pdfCrudo = path.join(raiz, '.consolidado.pdf');
const pdfFinal = path.join(proyecto, 'Daniel_Leon_Prueba_Tecnica.pdf');

writeFileSync(borrador, portada + cuerpo + '\n', 'utf8');
try {
  execFileSync('node', [path.join(aqui, 'generar-pdf.mjs'), borrador, '--compacto'], { stdio: 'inherit' });
  rmSync(pdfFinal, { force: true });
  renameSync(pdfCrudo, pdfFinal);
  console.log(`✔ ${path.relative(proyecto, pdfFinal)}`);
} finally {
  rmSync(borrador, { force: true });
  rmSync(pdfCrudo, { force: true });
}
