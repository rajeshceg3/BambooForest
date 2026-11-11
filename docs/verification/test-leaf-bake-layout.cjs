const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path'),assert=require('node:assert/strict'),ts=require('typescript'),THREE=require('three');
const root=path.resolve(__dirname,'../..');
function load(p,extras={}){const code=ts.transpileModule(fs.readFileSync(path.join(root,p),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText;const box={exports:{},Float32Array,Math,require:id=>require(require.resolve(id,{paths:[root]})),...extras};vm.runInNewContext(code,box);return box}
const {installLeafRandomIds,leafTranslationKey}=load('src/utils/leafRandomBake.ts').exports;
const {createBambooChunks}=load('src/utils/bambooChunks.ts').exports;
let result;const worker=load('src/workers/bambooWorker.ts',{self:{},postMessage:x=>result=x});worker.self.onmessage({data:{count:5000,spread:350}});
const geometry=new THREE.PlaneGeometry(1,1,1,1),material=new THREE.MeshStandardMaterial();const source=new THREE.InstancedMesh(geometry,material,result.leafInstances.length/16);source.instanceMatrix.array.set(result.leafInstances);
const map=new Map();for(let i=0;i<source.count;i++){const key=leafTranslationKey(result.leafInstances,i*16);if(!map.has(key))map.set(key,Math.fround((map.size%100)/100));}
let tested=0;for(const chunk of createBambooChunks(source,25)){
 const matrices=Buffer.from(chunk.instanceMatrix.array.buffer).toString('hex');
 installLeafRandomIds(chunk,map);assert.notEqual(chunk.geometry,geometry);assert.equal(chunk.material,material);
 assert.equal(Buffer.from(chunk.instanceMatrix.array.buffer).toString('hex'),matrices);
 for(const kind of ['position','normal','uv'])assert.deepEqual(chunk.geometry.getAttribute(kind).array,geometry.getAttribute(kind).array);
 assert.deepEqual(chunk.geometry.index.array,geometry.index.array);
 const attr=chunk.geometry.getAttribute('aLeafRandom');assert.equal(attr.count,chunk.count);
 for(let i=0;i<chunk.count;i++)assert.equal(attr.getX(i),map.get(leafTranslationKey(chunk.instanceMatrix.array,i*16)));
 tested+=chunk.count;chunk.geometry.dispose();chunk.dispose();
}
assert.equal(tested,35126);assert.equal(geometry.getAttribute('aLeafRandom'),undefined);console.log({tested,allMatricesAndGeometryPreserved:true,exactLookupOrder:true});
