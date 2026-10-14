import { test, expect } from '@playwright/test';
import { emptyDocument, migrateLegacy } from '../../src/lib/document.js';
const fixture=migrateLegacy({clientes:['Cliente preservado'],movimentacoes:[{id:42,cliente:'Cliente preservado',tipo_movimentacao:'IN',tipo_sacaria:'granel',quantidade:1000,peso_kg:1000,data_movimentacao:'2026-10-01',documentos:[]}]});
async function importJson(page,value) {
 if(!await page.getByLabel('Importar dados JSON').isVisible()) await page.getByRole('button',{name:'Configurações',exact:true}).click();
 await page.getByLabel('Importar dados JSON').setInputFiles({name:'backup.json',mimeType:'application/json',buffer:Buffer.from(typeof value==='string'?value:JSON.stringify(value))});
}
test('PWA offline: migração, módulos, CRUD, anexos, relatórios e JSON',async({page,context})=>{
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 const external=[];page.on('request',r=>{if(!r.url().startsWith('http://127.0.0.1:4173') && !r.url().startsWith('data:'))external.push(r.url());});
 await page.addInitScript(()=>localStorage.setItem('moagem_clientes_cadastrados','["Nome local antigo"]'));
 await page.goto('/');await expect(page.getByRole('heading',{name:'O que vamos registrar?'})).toBeVisible();
 await expect(page.getByText(/Funciona sem internet/)).toBeVisible();
 await expect(page.getByRole('heading',{name:'Seus dados'})).toHaveCount(0);
 await expect(page.getByRole('heading',{name:'Usar sem internet'})).toHaveCount(0);
 await expect(page.getByLabel('Importar dados JSON')).toHaveCount(0);
 await importJson(page,fixture);await expect(page.getByText(/Importação concluída/)).toBeVisible();
 await page.getByRole('button',{name:'Milho',exact:false}).first().click();
 await page.getByRole('button',{name:/Cliente preservado/}).click();
 await page.getByLabel('Mês do balanço').fill('2026-10');
 await expect(page.getByText('1.000 kg').first()).toBeVisible();
 await page.getByRole('button',{name:'Início',exact:true}).click();
 await importJson(page,fixture);await expect(page.getByText(/0 registros novos e 0 atualizados/)).toBeVisible();
 await importJson(page,'{corrompido');await expect(page.getByRole('alert')).toContainText('corrompido');
 await page.getByRole('button',{name:/Milho Entradas/}).click();await expect(page.getByRole('button',{name:/Nome local antigo/})).toBeVisible();
 await page.getByRole('button',{name:'Início',exact:true}).click();
 // Reload with the network fully disabled; all lazy PDF chunks were pre-cached.
 await context.setOffline(true);await page.reload();await expect(page.getByRole('heading',{name:'O que vamos registrar?'})).toBeVisible();
 for(const module of ['Sacarias vazias','Soja']) {
  await page.getByRole('button',{name:new RegExp(`^${module} Entradas`)}).click();await page.getByRole('button',{name:/Cliente preservado/}).click();
  await page.getByLabel('Mês do balanço').fill('2026-10');
  await page.getByRole('button',{name:'Entrada',exact:true}).click();
  await page.getByLabel(module==='Soja'?'Quantidade de sacos':'Quantidade de sacarias vazias').fill('20');
  await page.getByLabel('Data do registro').fill('2026-10-01');
  if(module==='Soja') await page.getByLabel('Anexar foto').setInputFiles({name:'foto.png',mimeType:'image/png',buffer:Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+a0uoAAAAASUVORK5CYII=','base64')});
  await page.getByRole('button',{name:'Salvar registro'}).click();
  await page.getByRole('button',{name:'Saída',exact:true}).click();
  await page.getByLabel(module==='Soja'?'Quantidade de sacos':'Quantidade de sacarias vazias').fill('3');await page.getByLabel('Data do registro').fill('2026-10-02');await page.getByRole('button',{name:'Salvar registro'}).click();
  await expect(page.locator('.credit strong')).toHaveText(module==='Soja'?'17 sacos':'17 unidades');
  await page.getByLabel('Mês do balanço').fill('2026-11');await expect(page.locator('.credit strong')).toHaveText(module==='Soja'?'17 sacos':'17 unidades');await page.getByLabel('Mês do balanço').fill('2026-10');
  if(module==='Soja'){await page.getByRole('button',{name:'Ver fotos (1)'}).click();await expect(page.getByAltText('Comprovante 1')).toBeVisible();await page.getByRole('button',{name:'Fechar',exact:true}).click();}
  await page.locator('.movement-edit').filter({hasText:'Saída'}).click();await page.getByLabel(module==='Soja'?'Quantidade de sacos':'Quantidade de sacarias vazias').fill('4');await page.getByRole('button',{name:'Salvar registro'}).click();await expect(page.locator('.credit strong')).toHaveText(module==='Soja'?'16 sacos':'16 unidades');
  await page.getByRole('button',{name:'Apagar registro de 2026-10-02'}).click();await page.getByRole('button',{name:'Sim, apagar'}).click();await expect(page.locator('.credit strong')).toHaveText(module==='Soja'?'20 sacos':'20 unidades');
  const pdfDownload=page.waitForEvent('download');await page.getByRole('button',{name:'Baixar PDF do cliente'}).click();expect((await pdfDownload).suggestedFilename()).toMatch(/\.pdf$/);
  await page.getByRole('button',{name:'Início',exact:true}).click();
 }
 const download=page.waitForEvent('download');await page.getByRole('button',{name:'Baixar relatório geral'}).click();expect((await download).suggestedFilename()).toBe('moagem-geral-2026-10.pdf');
 await page.getByRole('button',{name:'Configurações',exact:true}).click();
 const backup=page.waitForEvent('download');await page.getByRole('button',{name:'Exportar dados JSON'}).click();expect((await backup).suggestedFilename()).toMatch(/\.json$/);
 await page.reload();await expect(page.getByText('3 registros · 2 clientes')).toBeVisible();
 await page.screenshot({path:'test-results/home-390.png',fullPage:true});
 await page.setViewportSize({width:360,height:800});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);await page.screenshot({path:'test-results/home-360.png',fullPage:true});
 expect(errors).toEqual([]);expect(external).toEqual([]);
});
test('manifest e cache contêm todos os assets incluindo relatórios',async({page})=>{
 await page.goto('/');await page.evaluate(()=>navigator.serviceWorker.ready);
 const evidence=await page.evaluate(async()=>{
  const manifest=await fetch('/manifest.json').then(r=>r.json());const keys=await caches.keys();const cache=await caches.open(keys.find(k=>k.startsWith('moagem-assets-')));const requests=await cache.keys();return {manifest,assets:requests.map(r=>r.url)};
 });
 expect(evidence.manifest.display).toBe('standalone');expect(evidence.manifest.icons.some(i=>i.sizes==='192x192')).toBe(true);expect(evidence.manifest.icons.some(i=>i.sizes==='512x512')).toBe(true);expect(evidence.assets.some(a=>a.includes('/reports-'))).toBe(true);
});
