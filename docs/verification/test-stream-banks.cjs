const fs = require('node:fs'), vm = require('node:vm'), path = require('node:path'), assert = require('node:assert/strict'), ts = require('typescript');
const root = path.resolve(__dirname, '../..');
const code = ts.transpileModule(fs.readFileSync(root + '/src/utils/streamBanks.ts', 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
const box = { exports: {}, require: id => require(require.resolve(id, { paths: [root] })) };
vm.runInNewContext(code, box);
const { streamSection, createStreamBanks, createShoreStones } = box.exports;
const bank = createStreamBanks();
for (const attribute of Object.values(bank.attributes)) assert([...attribute.array].every(Number.isFinite));
assert.equal(bank.attributes.color.itemSize, 4);
assert.equal(bank.index.count / 3, 4096);
let maxBank = 0;
for (let i = 0; i < bank.attributes.position.count; i++) {
  maxBank = Math.max(maxBank, Math.abs(bank.attributes.position.getX(i)));
  assert(bank.attributes.position.getY(i) >= -0.060001);
  assert(bank.attributes.position.getY(i) <= 0.105001);
}
assert(maxBank < 12, 'all soil geometry stays inside existing exclusion');
let maxWater = 0;
for (let i = -100000; i <= 100000; i++) {
  const { center, halfWidth } = streamSection(i / 100);
  assert(halfWidth >= 6.3);
  maxWater = Math.max(maxWater, Math.abs(center) + halfWidth);
}
assert(maxWater + 1.85 < 12);
const a = createShoreStones(), b = createShoreStones();
assert.deepEqual([...a], [...b]);
assert.equal(a.length, 800 * 16);
assert([...a].every(Number.isFinite));
let maxStone = 0;
for (let i = 0; i < a.length; i += 16) {
  // Include the displaced unit stone's full x extent, not only its center.
  const radiusX = Math.hypot(a[i], a[i+4], a[i+8]) * 1.6;
  maxStone = Math.max(maxStone, Math.abs(a[i+12]) + radiusX);
}
assert(maxStone < 12, 'complete displaced stones stay within exclusion');
console.log({ bankTriangles: 4096, addedShoreStones: 800, maxBank, maxWater, finiteAndDeterministic: true });
bank.dispose();
