// Source contract for async initialization, not a renderer-performance test.
const fs=require('node:fs'),assert=require('node:assert/strict');
const source=fs.readFileSync(new URL('../../src/components/BambooForest.tsx','file://'+__filename),'utf8');
assert.equal((source.match(/count=\{0\}/g)||[]).length,3,'all uninitialized allocations start with zero draw count');
assert(source.includes('useLayoutEffect(() => {\n    if (!matrices) return'),'matrix installation precedes next draw');
for(const name of ['meshRef','branchMeshRef','leafMeshRef']) {
 assert(source.includes(`${name}.current.count = matrices.`));
 assert(source.includes(`${name}.current.instanceMatrix.array.set(matrices.`));
}
console.log('Worker-first-draw source contract: no identity-pile drawing; all three real worker arrays installed');
