import { readDocument, changeDocument } from './storage.js';
import { mergeDocuments, validateDocument } from './document.js';
export const payloadKey = doc => JSON.stringify(Object.fromEntries(['clientes','movimentacoes'].map(entity=>[entity,[...doc.payload[entity]].sort((a,b)=>a.uuid.localeCompare(b.uuid))])));
export async function sendDocument(document,request) {
  const contents=JSON.stringify(document);
  if(new Blob([contents]).size<2*1024*1024) return request('/api/sync',{document});
  const upload_id=crypto.randomUUID(),size=256*1024,total=Math.ceil(contents.length/size);
  for(let index=0;index<total;index++) await request('/api/sync',{upload_id,total,index,part:contents.slice(index*size,(index+1)*size)});
  return request('/api/sync',{upload_id,total});
}
export function startSync(onStatus,{fetchImpl=fetch,interval=60000}={}) {
  let stopped=false,running=false,applying=false,timer,retry=interval,connected=false;
  async function request(path,body) {
    const response=await fetchImpl(path,{method:body?'POST':'GET',credentials:'same-origin',cache:'no-store',headers:body?{'Content-Type':'application/json'}:{},...(body?{body:JSON.stringify(body)}:{}),signal:AbortSignal.timeout(180000)});
    if(!response.headers.get('content-type')?.includes('application/json')) throw new Error('Conexão ainda não configurada.');
    const result=await response.json();
    if(!response.ok) {const error=new Error(result.error || 'Falha ao enviar cópia.');error.status=response.status;throw error;}
    return result;
  }
  function schedule(delay=1500) {clearTimeout(timer);if(!stopped) timer=setTimeout(run,delay);}
  async function run() {
    if(stopped || running) return;
    if(globalThis.navigator?.onLine===false) {onStatus({kind:'offline',text:'Salvo neste aparelho — aguardando internet'});schedule(interval);return;}
    running=true;
    try {
      if(!connected) {
        const session=await request('/api/session');
        if(!session.configured) {onStatus({kind:'setup',text:'Salvo neste aparelho. A conexão está sendo preparada.'});schedule(interval);return;}
        if(!session.authorized) {onStatus({kind:'access',text:'Salvo neste aparelho — conecte para enviar a cópia'});schedule(interval);return;}
        connected=true;
      }
      const document=await readDocument();if(!document)return;
      onStatus({kind:'sending',text:'Salvo neste aparelho — enviando cópia…'});
      const result=await sendDocument(document,request);validateDocument(result.document);
      let pending=false;applying=true;
      try {await changeDocument(current=>{const merged=mergeDocuments(current,result.document),combined=merged.document;pending=payloadKey(combined)!==payloadKey(result.document);return merged.added || merged.updated?combined:null;});}finally{applying=false;}
      retry=interval;
      onStatus({kind:pending?'sending':'saved',text:pending?'Salvo neste aparelho — enviando cópia…':'Salvo neste aparelho e na cópia de segurança'});
      schedule(pending?1500:interval);
    } catch(error) {
      if(error.status===401)connected=false;
      onStatus({kind:error.status===401?'access':'error',text:error.status===401?'Salvo neste aparelho — conecte para enviar a cópia':'Salvo neste aparelho — não foi possível enviar a cópia'});
      schedule(retry);retry=Math.min(retry*2,5*interval);
    } finally {running=false;}
  }
  const changed=()=>{if(!applying)schedule();};
  const online=()=>schedule(0),offline=()=>onStatus({kind:'offline',text:'Salvo neste aparelho — aguardando internet'});
  const channel=typeof BroadcastChannel!=='undefined'?new BroadcastChannel('moagem-atilio'):null;
  if(channel)channel.onmessage=changed;
  window.addEventListener('moagem-change',changed);window.addEventListener('online',online);window.addEventListener('offline',offline);schedule(0);
  return {retry:()=>{connected=false;schedule(0);},connect:async password=>{await request('/api/session',{password});connected=true;schedule(0);},stop:()=>{stopped=true;clearTimeout(timer);channel?.close();window.removeEventListener('moagem-change',changed);window.removeEventListener('online',online);window.removeEventListener('offline',offline);}};
}
