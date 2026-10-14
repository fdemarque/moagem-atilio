import { authorized, json, sameOrigin, safeFailure } from '../server/http.js';
import { getRuntime } from '../server/runtime.js';
import { validateDocument } from '../src/lib/document.js';
const uuid=/^[a-f0-9-]{36}$/i;
export default async function handler(request) {
  if(!authorized(request)) return json({error:'Conecte este aparelho para enviar a cópia.'},401);
  if(!sameOrigin(request)) return json({error:'Origem inválida.'},403);
  if(request.method!=='POST') return json({error:'Método inválido.'},405);
  try {
    const body=await request.json(),{files,store}=getRuntime();
    // Small authenticated pieces avoid Vercel's 4.5 MB request limit even
    // when a single receipt is large. Parts are private, immutable and retryable.
    if(body.upload_id) {
      if(!uuid.test(body.upload_id) || !Number.isInteger(body.total) || body.total<1 || body.total>512) return json({error:'Envio inválido.'},400);
      const prefix=`moagem/transfers/${body.upload_id}`;
      if(typeof body.part==='string') {
        if(!Number.isInteger(body.index) || body.index<0 || body.index>=body.total || Buffer.byteLength(body.part)>1024*1024) return json({error:'Parte inválida.'},400);
        await files.immutable(`${prefix}/${body.index}.json`,JSON.stringify({part:body.part,total:body.total}));
        return json({received:true});
      }
      let contents='';
      for(let index=0;index<body.total;index++) {
        const saved=await files.read(`${prefix}/${index}.json`); if(!saved)return json({error:'Envio incompleto. Será reenviado.'},409);
        const part=JSON.parse(saved.text); if(part.total!==body.total) return json({error:'Envio inconsistente.'},400);
        contents+=part.part;
        if(Buffer.byteLength(contents)>100*1024*1024)return json({error:'Cópia acima de 100 MB. Dados locais preservados.'},413);
      }
      body.document=JSON.parse(contents);
    }
    try {validateDocument(body.document);}catch(error){return json({error:error.message},400);}
    const result=await store.sync(body.document);
    // Streaming avoids the response size cap and returns full history so the
    // device can continue consulting old months with no network connection.
    return new Response(new ReadableStream({start(controller){controller.enqueue(new TextEncoder().encode(JSON.stringify(result)));controller.close();}}),{headers:{'Content-Type':'application/json','Cache-Control':'no-store'}});
  } catch(error) {return safeFailure(error);}
}
