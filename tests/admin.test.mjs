import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import vm from 'node:vm';
import {localBucket} from '../scripts/local-bucket.mjs';
import worker from '../worker/index.js';

test('低信心提示與未收錄食譜判斷',async()=>{const source=await fs.readFile('web/app.js','utf8');const scope={};vm.createContext(scope);vm.runInContext(source.slice(source.indexOf('function predictionOutcome'),source.indexOf('async function syncConfig')),scope);const items=[{name:'蛋塔'}];assert.equal(scope.predictionOutcome({className:'蛋塔',probability:.79},items),'new');assert.equal(scope.predictionOutcome({className:'蛋塔',probability:.8},items),'known');assert.equal(scope.predictionOutcome({className:'司康',probability:.95},items),'missing')});

test('管理驗證 發布 共享 版本還原與未授權防護',async()=>{
 const dir=await fs.mkdtemp(path.join(os.tmpdir(),'pastry-tests-'));
 const env={BUCKET:localBucket(dir),ADMIN_PASSWORD:'test-password',ADMIN_SESSION_SECRET:'test-session-key-unique'};
 const realFetch=globalThis.fetch;
 let csv='辨識名稱,材料,步驟\n蛋塔,砂糖 50g,烤熟\n瑪德蓮,麵粉 50g,攪拌\n布朗尼,巧克力 100g,烤熟';
 globalThis.fetch=async(url,init)=>{url=String(url);if(url.endsWith('/metadata.json'))return Response.json({labels:['蛋塔','瑪德蓮','布朗尼'],imageSize:224});if(url.endsWith('/model.json'))return Response.json({modelTopology:{class_name:'Model'},weightsManifest:[{paths:['weights.bin']}]});if(url.endsWith('/weights.bin'))return new Response(null,{status:200});if(url.includes('format=xlsx'))return new Response(await fs.readFile('tests/fixtures/recipes.xlsx'));if(url.includes('docs.google.com'))return new Response(csv);throw Error('Unexpected upstream')};
 let cookie='';
 const call=async(route,data,options={})=>{const headers={...(data?{'content-type':'application/json',origin:options.origin||'https://pastry.test'}:{}),...(options.anonymous?{}:{cookie})};const response=await worker.fetch(new Request('https://pastry.test'+route,{method:data?'POST':'GET',headers,body:data?JSON.stringify(data):undefined}),env,{});return {response,status:response.status,data:await response.json()}};
 const config={model:'https://teachablemachine.withgoogle.com/models/demo/',sheet:'https://docs.google.com/spreadsheets/d/e/example/pub?output=csv'};
 try{
  assert.equal((await call('/api/admin/versions')).status,401);
  assert.equal((await call('/api/admin/publish',{validationId:'random'})).status,401);
  assert.equal((await call('/api/admin/login',{password:'wrong'})).status,401);
  const login=await call('/api/admin/login',{password:'test-password'});assert.equal(login.status,200);cookie=login.response.headers.get('set-cookie').split(';')[0];assert(login.response.headers.get('set-cookie').includes('HttpOnly'));assert(login.response.headers.get('set-cookie').includes('Secure'));
  assert.equal((await call('/api/admin/validate',config,{origin:'https://other.test'})).status,403);
  assert.equal((await call('/api/admin/validate',{...config,model:'http://127.0.0.1/'})).status,400);
  assert.equal((await call('/api/admin/publish',{validationId:'random'})).status,400);
  const good=await call('/api/admin/validate',config);assert.equal(good.status,200);assert.equal(good.data.recipes.length,3);
  csv=csv.replace('砂糖 50g','砂糖 40g');assert.equal((await call('/api/admin/publish',{validationId:good.data.validationId})).status,409);
  csv+='\n蛋塔,重複材料,步驟';assert.equal((await call('/api/admin/validate',config)).status,400);csv=csv.split('\n').slice(0,4).join('\n');
  const kept=csv;csv='辨識名稱,材料,步驟\n蛋塔,糖,烤熟';assert.equal((await call('/api/admin/validate',config)).status,400);csv=kept;
  const a=await call('/api/admin/validate',config),b=await call('/api/admin/validate',config);assert.equal(a.status,200);
  const saved=await call('/api/admin/publish',{validationId:a.data.validationId});assert.equal(saved.status,200);
  assert.equal((await call('/api/admin/publish',{validationId:b.data.validationId})).status,409);
  const published=(await call('/api/config',undefined,{anonymous:true})).data;assert.equal(published.model,config.model);assert.equal(published.revision,saved.data.revision);
  const live=(await call('/api/recipes')).data;assert.equal(live.recipes[0].ingredients,'砂糖 40g');
  const hist=(await call('/api/admin/versions')).data;assert.equal(hist.versions.length,2);
  const restored=await call('/api/admin/restore',{versionId:'initial',baseRevision:hist.revision});assert.equal(restored.status,200);
  const snapshot=(await call('/api/recipes')).data;assert.equal(snapshot.source,'snapshot');assert(snapshot.recipes[0].ingredients.includes('砂糖 20g'));
  const refresh=(await call('/api/recipes?live=1')).data;assert.equal(refresh.source,'live');assert(refresh.recipes[0].ingredients.includes('砂糖 20g'));
  assert.equal((await call('/api/admin/versions')).data.versions.length,3);
  const logout=await call('/api/admin/logout',{});assert(logout.response.headers.get('set-cookie').includes('Max-Age=0'));
  const homepage=await worker.fetch(new Request('https://pastry.test/'),env,{});assert(!(await homepage.text()).includes('test-password'));
 }finally{globalThis.fetch=realFetch;await fs.rm(dir,{recursive:true,force:true})}
});
