import fs from 'node:fs/promises';
await fs.rm('dist',{recursive:true,force:true});
await fs.mkdir('dist/server',{recursive:true});
await fs.copyFile('worker/index.js','dist/server/index.js');
console.log('Built portable Worker: worker/index.js and dist/server/index.js');
