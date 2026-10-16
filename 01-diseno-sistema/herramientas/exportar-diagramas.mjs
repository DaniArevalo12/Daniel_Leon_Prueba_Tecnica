// Exporta cada diagramas/*.mmd a .svg y .png (2x, fondo blanco) con el tema común.
import { execFileSync } from 'node:child_process';
import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const aqui = path.dirname(fileURLToPath(import.meta.url));
const carpeta = path.join(aqui, '..', 'diagramas');
const config = path.join(aqui, 'mermaid-config.json');
// Se invoca el script de mermaid-cli con node (sin shell): funciona igual en Windows y Linux,
// incluso con espacios en la ruta del proyecto.
const paquete = path.join(aqui, 'node_modules', '@mermaid-js', 'mermaid-cli');
const { bin } = JSON.parse(readFileSync(path.join(paquete, 'package.json'), 'utf8'));
const mmdc = path.join(paquete, typeof bin === 'string' ? bin : bin.mmdc);

for (const archivo of readdirSync(carpeta).filter((f) => f.endsWith('.mmd')).sort()) {
  const entrada = path.join(carpeta, archivo);
  for (const [ext, extra] of [['svg', []], ['png', ['-s', '2']]]) {
    const salida = entrada.replace(/\.mmd$/, `.${ext}`);
    execFileSync(process.execPath, [mmdc, '-q', '-i', entrada, '-o', salida, '-c', config, '-b', 'white', ...extra], {
      stdio: 'inherit',
    });
  }
  console.log(`✔ ${archivo}`);
}
