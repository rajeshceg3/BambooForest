const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path'),assert=require('node:assert/strict'),ts=require('typescript'),THREE=require('three');
const root=path.resolve(__dirname,'../..');function load(p,extras={}){const code=ts.transpileModule(fs.readFileSync(path.join(root,p),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText;const box={exports:{},Float32Array,Math,require:id=>require(require.resolve(id,{paths:[root]})),...extras};vm.runInNewContext(code,box);return box}
const {createBambooChunks,partitionBambooTransforms}=load('src/utils/bambooChunks.ts').exports;
let result;const worker=load('src/workers/bambooWorker.ts',{self:{},postMessage:x=>result=x});worker.self.onmessage({data:{count:5000,spread:350}});
const key=a=>Buffer.from(a.buffer,a.byteOffset,a.byteLength).toString('hex');
for(const [kind,data] of Object.entries(result)){
 if(!(data instanceof Float32Array))continue;
 const original=[];for(let i=0;i<data.length;i+=16)original.push(key(data.subarray(i,i+16)));original.sort();
 const split=partitionBambooTransforms(data,25),actual=[];for(const a of split)for(let i=0;i<a.length;i+=16)actual.push(key(a.subarray(i,i+16)));actual.sort();assert.deepEqual(actual,original,kind+' must preserve every transform exactly, including duplicates');
 const geometry=new THREE.SphereGeometry(1,8,6),material=new THREE.MeshBasicMaterial();const source=new THREE.InstancedMesh(geometry,material,data.length/16);source.name='bamboo-stalks';source.instanceMatrix.array.set(data);source.castShadow=true;
 const chunks=createBambooChunks(source,25);assert.equal(chunks.reduce((s,m)=>s+m.count,0),source.count);for(const m of chunks){assert.equal(m.geometry,geometry);assert.equal(m.material,material);assert(m.castShadow);assert(m.layers.isEnabled(1));assert(Number.isFinite(m.boundingSphere.radius));m.dispose()}source.dispose();geometry.dispose();material.dispose();console.log(kind,{count:data.length/16,batches:chunks.length,preserved:true});
}
