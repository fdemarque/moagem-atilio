import { createHash } from 'node:crypto';
import { emptyDocument, validateDocument, mergeDocuments, monthlyBalance, MODULES } from '../src/lib/document.js';

export const hash = text => createHash('sha256').update(text).digest('hex');
const rootPath = 'moagem/state.json';
function stable(doc) {
  validateDocument(doc);
  const copy = structuredClone(doc);
  let updated=0;
  for (const entity of ['clientes','movimentacoes']) {
    copy.payload[entity].sort((a,b) => a.uuid.localeCompare(b.uuid));
    for(const row of copy.payload[entity])updated=Math.max(updated,Date.parse(row.updated_at));
  }
  copy.last_updated = new Date(updated).toISOString();
  return copy;
}
const same = (a,b) => JSON.stringify(stable(a)) === JSON.stringify(stable(b));
export function cutoffFor(date) {
  const d = new Date(date); return new Date(Date.UTC(d.getUTCFullYear(),d.getUTCMonth()-6,1)).toISOString().slice(0,10);
}
const sixMonthsAfter = stamp => { const d=new Date(stamp),target=d.getUTCMonth()+6,lastDay=new Date(Date.UTC(d.getUTCFullYear(),target+1,0)).getUTCDate();return Date.UTC(d.getUTCFullYear(),target,Math.min(d.getUTCDate(),lastDay),d.getUTCHours(),d.getUTCMinutes(),d.getUTCSeconds()); };

// Storage adapters implement fresh reads and atomic compare-and-set. All
// snapshots/archives are immutable; a single conditional root commits them.
export function createDocumentStore({files,googleBackup,clock=()=>new Date()}) {
  async function read() {
    const saved=await files.read(rootPath);
    if(!saved) return {root:null,etag:null,document:stable(emptyDocument())};
    const root=JSON.parse(saved.text);
    if(root.format!==1 || !Array.isArray(root.archives)) throw new Error('Manifesto remoto inválido. Dados locais preservados.');
    let document=validateDocument(root.active);
    for(const ref of root.archives) {
      const archive=await files.read(ref.path);
      if(!archive || hash(archive.text)!==ref.hash) throw new Error('Histórico incompleto. Sincronização interrompida para preservar os dados.');
      document=mergeDocuments(document,validateDocument(JSON.parse(archive.text))).document;
    }
    return {root,etag:saved.etag,document:stable(document)};
  }
  async function immutable(kind,document) {
    const text=JSON.stringify(stable(document)), checksum=hash(text);
    const path=`moagem/${kind}/${checksum}.json`;
    await files.immutable(path,text);
    const checked=await files.read(path);
    if(!checked || hash(checked.text)!==checksum) throw new Error('Falha ao conferir cópia na Vercel. Estado anterior preservado.');
    return {path,hash:checksum,count:document.payload.movimentacoes.length};
  }
  async function partition(document,cutoff,previous=[]) {
    const active=structuredClone(document), months=new Map();
    active.payload.movimentacoes=[];
    for(const row of document.payload.movimentacoes) {
      if(cutoff && row.data_movimentacao<cutoff) {
        const month=row.data_movimentacao.slice(0,7);
        if(!months.has(month)) months.set(month,[]);
        months.get(month).push(row);
      } else active.payload.movimentacoes.push(row);
    }
    const archives=[];
    for(const [month,rows] of [...months].sort()) {
      const archive=stable({...document,payload:{clientes:document.payload.clientes,movimentacoes:rows}});
      const checksum=hash(JSON.stringify(archive));
      const old=previous.find(ref=>ref.month===month && ref.hash===checksum);
      if(old) archives.push(old);
      else {
        // Includes edits/deletions made by a device offline across archival.
        const verified=await googleBackup.saveSnapshot(archive,{historical:true});
        if(!verified?.verified) throw new Error('Histórico não conferido no Drive. Arquivamento cancelado.');
        archives.push({month,...await immutable('history',archive),google:verified});
      }
    }
    const openings=[];
    if(cutoff) for(const name of new Set(document.payload.movimentacoes.map(r=>r.cliente))) for(const module of MODULES) {
      const opening=monthlyBalance(document.payload.movimentacoes.filter(r=>r.cliente===name),module,cutoff.slice(0,7)).opening;
      openings.push({cliente:name,modulo:module,month:cutoff.slice(0,7),opening});
    }
    return {active:stable(active),archives,openings};
  }
  async function commit(saved,root) {
    try { await files.compareAndSet(rootPath,JSON.stringify(root),saved.etag); return true; }
    catch(error) {
      const latest=await files.read(rootPath);
      // Retry only when another writer (or an uncertain successful request)
      // actually changed the root. Storage outages are never mistaken for CAS.
      if(latest?.etag!==saved.etag && latest) return false;
      throw error;
    }
  }
  return {
    read,
    async sync(incoming) {
      validateDocument(incoming);
      for(let attempt=0;attempt<8;attempt++) {
        const saved=await read(), document=stable(mergeDocuments(saved.document,incoming).document);
        if(saved.root && same(document,saved.document)) return {document,archived:saved.root.archives.length};
        if(saved.root) await immutable('snapshots',saved.document);
        const parts=await partition(document,saved.root?.cutoff,saved.root?.archives);
        const root={...saved.root,format:1,created_at:saved.root?.created_at || clock().toISOString(),revision:(saved.root?.revision || 0)+1,...parts};
        if(await commit(saved,root)) return {document,archived:root.archives.length};
      }
      throw new Error('Outro aparelho está salvando. A cópia local será reenviada.');
    },
    async maintain() {
      for(let attempt=0;attempt<8;attempt++) {
        const saved=await read(); if(!saved.root) return {empty:true};
        const verified=await googleBackup.saveSnapshot(saved.document);
        if(!verified?.verified) throw new Error('Backup Google não conferido. Arquivamento cancelado.');
        const snapshot=await immutable('snapshots',saved.document);
        const date=clock(),due=date.getTime()>=sixMonthsAfter(saved.root.last_archive_at || saved.root.created_at);
        const parts=due?await partition(saved.document,cutoffFor(date),saved.root.archives):{};
        const root={...saved.root,...parts,revision:saved.root.revision+1,backup:{at:date.toISOString(),...snapshot,google:verified},...(due?{cutoff:cutoffFor(date),last_archive_at:date.toISOString()}: {})};
        if(await commit(saved,root)) {
          let removed=0,cleanupPending=false;
          // Retention runs only AFTER both backup destinations have been
          // verified and the conditional root commit succeeded.
          try {removed=await files.pruneSnapshots?.(snapshot.path,date) || 0;}catch{cleanupPending=true;}
          return {verified:true,archived:root.archives.length,last_archive_at:root.last_archive_at || null,removedSnapshots:removed,cleanupPending};
        }
      }
      throw new Error('Estoque foi alterado durante o backup. A próxima execução tentará novamente.');
    },
  };
}
