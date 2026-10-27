import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
const source=await readFile('worker/index.js','utf8');
const worker=await import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'));
assert.equal(typeof worker.default?.fetch,'function');
const config=JSON.parse(await readFile('wrangler.json','utf8'));
assert.equal(config.main,'worker/index.js');
assert.equal(config.r2_buckets[0].binding,'BUCKET');
console.log('Portable Worker and Cloudflare configuration are valid.');
