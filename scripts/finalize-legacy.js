import fs from 'node:fs/promises';
import {migrateLegacy} from '../src/lib/document.js';
const canonical=value=>Array.isArray(value)?value.map(canonical):value&&typeof value==='object'?Object.fromEntries(Object.keys(value).sort().map(key=>[key,canonical(value[key])])):value;
const equal=(a,b)=>JSON.stringify(canonical(a))===JSON.stringify(canonical(b));
const before=JSON.parse(await fs.readFile('backups/legado-original.json','utf8'));
const previous=JSON.parse(await fs.readFile('backups/moagem-migracao-validada.json','utf8'));
const current=JSON.parse(await fs.readFile(process.argv[2],'utf8'));
const document=migrateLegacy(current);let changed=0;
for(const entity of ['clientes','movimentacoes']) {
  for(const row of document.payload[entity]) {
    const oldVersion=previous.payload[entity].find(old=>old.uuid===row.uuid);
    const identity=entity==='clientes'?'nome':'id';
    const oldRaw=before[entity].find(old=>old[identity]===row[identity]);
    const newRaw=current[entity].find(item=>item[identity]===row[identity]);
    // A fresh export is not an edit. Keep existing timestamps for unchanged
    // legacy rows so a newer local edit is not silently overwritten.
    if(oldVersion && equal(oldRaw,newRaw))row.updated_at=oldVersion.updated_at;
    else changed++;
  }
}
await fs.writeFile('backups/moagem-migracao-final.json',JSON.stringify(document,null,2));
console.log(JSON.stringify({movements:document.payload.movimentacoes.length,clients:document.payload.clientes.length,changed}));
