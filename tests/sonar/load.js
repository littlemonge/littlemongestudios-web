// Loads the browser scripts the way a page does: engine.js and sonar.js as classic scripts
// sharing one global scope. Works whatever "type" package.json declares.
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const dir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../public/sonar');

// Objects made inside a vm context have another realm's prototypes, which strict deepEqual rejects.
// Hand everything back as plain host-realm data.
const plain = v => (v === undefined ? v : JSON.parse(JSON.stringify(v)));
function hostify(api) {
  return Object.fromEntries(Object.entries(api).map(([k, v]) => [k, typeof v === 'function' ? (...args) => plain(v(...args)) : plain(v)]));
}

function run(file, ctx) {
  vm.runInContext(fs.readFileSync(path.join(dir, file), 'utf8'), ctx, { filename: file });
}

export function loadEngine() {
  const ctx = vm.createContext({ module: { exports: {} } });
  run('engine.js', ctx);
  return hostify(ctx.module.exports);
}

export function loadSonar() {
  const ctx = vm.createContext({ module: { exports: {} } });
  run('engine.js', ctx);
  ctx.module = { exports: {} };
  run('sonar.js', ctx);
  return { sonar: hostify(ctx.module.exports), engine: vm.runInContext('({ N, MAX_MISSES })', ctx) };
}

// Same file evaluated with no `module` at all: the browser case.
export function loadEngineAsBrowser() {
  const ctx = vm.createContext({});
  run('engine.js', ctx);
  return hostify(vm.runInContext('({ N, MAX_MISSES, PAR_BY_WEEKDAY, SIZE_BY_WEEKDAY, generatePuzzle, pingDistance, distanceTo, neighbors })', ctx));
}
