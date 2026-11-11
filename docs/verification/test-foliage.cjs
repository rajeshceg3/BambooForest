const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const ts = require('typescript');
const root = path.resolve(__dirname, '../..');
function compile(relative, extra = {}) {
  const source = fs.readFileSync(path.join(root, relative), 'utf8');
  const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
  const box = { exports: {}, require: id => require(require.resolve(id, { paths: [root] })), ...extra };
  vm.runInNewContext(code, box);
  return box;
}
const { createBambooLeafGeometry } = compile('src/utils/bambooLeaf.ts').exports;
const geometry = createBambooLeafGeometry();
for (const attribute of ['position', 'normal', 'uv']) {
  assert([...geometry.attributes[attribute].array].every(Number.isFinite), attribute + ' must be finite');
}
assert.equal(geometry.index.count / 3, 24);
assert(Math.abs(geometry.boundingBox.min.y) < 1e-6);
assert(geometry.boundingBox.max.y <= 0.71 && geometry.boundingBox.max.y > 0.65);
assert(geometry.boundingBox.max.x - geometry.boundingBox.min.x < 0.6);
const p = geometry.attributes.position;
assert.equal(p.count, 28);
// Both rounded blades start together at the attachment; tips stay finite.
assert([...p.array].every(Number.isFinite));
// A regression anchor: foliage edits must not move or delete existing trunks.
let output;
const box = compile('src/workers/bambooWorker.ts', { self: {}, postMessage: value => { output = value; }, Float32Array, Math });
box.self.onmessage({ data: { count: 5000, spread: 350 } });
const stalkHash = crypto.createHash('sha256').update(Buffer.from(output.stalkInstances.buffer)).digest('hex');
assert.equal(stalkHash, 'e8ce5068bca9ae0791ba34d11bbb27ebf59691f4c2af2e08a0bfaa5ef9816c62');
assert.equal(output.branchInstances.length / 16, 8800);
assert.equal(output.leafInstances.length / 16, 35126);
assert([...output.leafInstances].every(Number.isFinite));
const source = fs.readFileSync(path.join(root, 'src/components/BambooForest.tsx'), 'utf8');
assert(!source.includes('pow(widthFactor'), 'no second shader taper with a negative fractional power');
assert(!source.includes('smoothstep(0.2, -0.5'), 'smoothstep edges must be ordered');
console.log(JSON.stringify({ leafTriangles: 24, finiteGeometryAndMatrices: true, unchangedStalkLayout: stalkHash, branches: 8800, leaves: 35126 }));
geometry.dispose();
