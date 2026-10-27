import http from 'node:http';
import fs from 'node:fs/promises';
import {localBucket} from './local-bucket.mjs';
const worker=(await import('../worker/index.js')).default;
const vars=Object.fromEntries((await fs.readFile('.dev.vars','utf8')).trim().split('\n').map(line=>{const i=line.indexOf('=');return [line.slice(0,i),line.slice(i+1)]}));
const env={...vars,BUCKET:localBucket('.local-data')};
const port=Number(process.env.PORT||4173);
http.createServer(async(req,res)=>{try{const chunks=[];for await(const c of req)chunks.push(c);const bytes=Buffer.concat(chunks);const url=new URL(req.url,'http://'+req.headers.host);const request=new Request(url,{method:req.method,headers:req.headers,body:['GET','HEAD'].includes(req.method)?undefined:bytes});const response=await worker.fetch(request,env,{});res.writeHead(response.status,Object.fromEntries(response.headers));res.end(Buffer.from(await response.arrayBuffer()))}catch(e){res.writeHead(500);res.end('Preview request failed')}}).listen(port,'0.0.0.0',()=>console.log('Preview listening on '+port));
