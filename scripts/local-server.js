import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import { Readable } from 'node:stream';
import session from '../api/session.js';
import sync from '../api/sync.js';
import maintenance from '../api/maintenance.js';
const routes={'/api/session':session.fetch,'/api/sync':sync.fetch,'/api/maintenance':maintenance.fetch};
const types={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.png':'image/png','.svg':'image/svg+xml','.webmanifest':'application/manifest+json','.woff2':'font/woff2'};
const port=Number(process.env.LOCAL_PORT || 4173),root=path.resolve('dist');
http.createServer(async(req,res)=>{
  try {
    const url=new URL(req.url,`http://127.0.0.1:${port}`),handler=routes[url.pathname];
    if(handler) {
      const request=new Request(url,{method:req.method,headers:req.headers,...(['GET','HEAD'].includes(req.method)?{}:{body:Readable.toWeb(req),duplex:'half'})});
      const response=await handler(request);res.writeHead(response.status,Object.fromEntries(response.headers));
      if(response.body)Readable.fromWeb(response.body).pipe(res);else res.end();return;
    }
    if(url.pathname.startsWith('/api/')){res.writeHead(404);res.end();return;}
    const filename=path.resolve(root,`.${decodeURIComponent(url.pathname==='/'?'/index.html':url.pathname)}`);
    if(!filename.startsWith(root+path.sep)){res.writeHead(403);res.end();return;}
    const data=await fs.readFile(filename);res.writeHead(200,{'Content-Type':types[path.extname(filename)] || 'application/octet-stream','Cache-Control':'no-cache'});res.end(data);
  }catch {res.writeHead(404);res.end('Arquivo indisponível.');}
}).listen(port,'127.0.0.1',()=>console.log(`PWA e API local: http://127.0.0.1:${port}`));
