import fs from 'node:fs/promises';
const assets={};
for(const [name,type] of [['index.html','text/html'],['admin.html','text/html'],['style.css','text/css'],['app.js','text/javascript'],['admin.js','text/javascript'],['teacher-guide.html','text/html'],['recipes.csv','text/csv'],['vendor/SheetJS-LICENSE.txt','text/plain']])assets['/'+name]={type:type+'; charset=utf-8',text:await fs.readFile('web/'+name,'utf8')};
const vendor=await fs.readFile('web/vendor/xlsx.full.min.js','utf8');
const old=await fs.readFile('web/app.js','utf8');
const exampleSource=old.slice(old.indexOf('const EXAMPLES='),old.indexOf('const $='));
const server=await fs.readFile('worker/server.js','utf8');
await fs.writeFile('worker/index.js',vendor+'\nconst ASSETS='+JSON.stringify(assets)+';\n'+exampleSource+'\n'+server);
