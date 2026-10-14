import { test, expect } from '@playwright/test';
import { emptyDocument, legacyUuid } from '../../src/lib/document.js';
import { createDocumentStore } from '../../server/document-store.js';
function store() {
  const data=new Map();let version=0;
  const files={read:async key=>data.get(key)||null,immutable:async(key,text)=>{if(!data.has(key))data.set(key,{text,etag:String(++version)});},compareAndSet:async(key,text,etag)=>{if((data.get(key)?.etag||null)!==etag)throw new Error('CAS');data.set(key,{text,etag:String(++version)});}};
  return createDocumentStore({files,googleBackup:{saveSnapshot:async()=>({verified:true})}});
}
test('sincronização entre aparelhos, escrita durante resposta e envio após offline',async({browser})=>{
  const remote=store(),seed=emptyDocument();seed.payload.clientes=[{uuid:legacyUuid('Cliente'),nome:'Cliente',updated_at:'2026-10-14T00:00:00Z'}];await remote.sync(seed);
  const contexts=await Promise.all([browser.newContext(),browser.newContext()]);
  const pages=await Promise.all(contexts.map(c=>c.newPage()));
  let requestCount=0,hold=false,release,arrived;
  for(const context of contexts) {
    await context.route('**/api/session',route=>route.fulfill({json:{authorized:true,configured:true}}));
    await context.route('**/api/sync',async route=>{
      requestCount++;
      const result=await remote.sync(route.request().postDataJSON().document);
      if(hold){hold=false;arrived?.();await new Promise(resolve=>{release=resolve;});}
      await route.fulfill({json:result});
    });
  }
  for(const page of pages){await page.goto('/');await expect(page.getByText(/Salvo neste aparelho e na cópia/)).toBeVisible();}
  const fields={cliente:'Cliente',modulo:'soja',tipo_movimentacao:'IN',tipo_sacaria:'unidade',quantidade:10,peso_kg:null,data_movimentacao:'2026-10-14',documentos:[]};
  // Imports are through the shipped interface, not mutations of browser internals.
  async function importRows(page,rows){
    if(!await page.getByLabel('Importar dados JSON').isVisible())await page.getByRole('button',{name:'Configurações',exact:true}).click();
    const document={...seed,payload:{clientes:seed.payload.clientes,movimentacoes:rows}};
    await page.getByLabel('Importar dados JSON').setInputFiles({name:'backup.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(document))});
  }
  const first={...fields,uuid:legacyUuid('one'),updated_at:'2026-10-14T01:00:00Z'};
  const second={...fields,uuid:legacyUuid('two'),updated_at:'2026-10-14T02:00:00Z',quantidade:5};
  hold=true;const waiting=new Promise(resolve=>{arrived=resolve;});await importRows(pages[0],[first]);await waiting;
  await importRows(pages[0],[second]);release();
  await expect.poll(async()=> (await remote.read()).document.payload.movimentacoes.length).toBe(2);
  await contexts[1].setOffline(true);await pages[1].reload();await importRows(pages[1],[{...fields,uuid:legacyUuid('offline'),updated_at:'2026-10-14T03:00:00Z',quantidade:3}]);
  await contexts[1].setOffline(false);
  await expect.poll(async()=> (await remote.read()).document.payload.movimentacoes.length).toBe(3);
  await pages[0].reload();await expect(pages[0].getByText(/3 registros · 1 clientes/)).toBeVisible();
  for(const page of pages)await expect(page.locator('p[role="status"]')).toContainText('Salvo neste aparelho e na cópia');
  // Let the cross-tab announcement of newly received records settle, then
  // check there is no repeated write/broadcast cycle on an unchanged state.
  await pages[0].waitForTimeout(1800);
  const count=requestCount;await pages[0].waitForTimeout(2500);expect(requestCount-count).toBe(0);
  await Promise.all(contexts.map(c=>c.close()));
});
