import { test, expect } from '@playwright/test';
import { migrateLegacy } from '../../src/lib/document.js';

const fixture = migrateLegacy({ clientes: ['Cliente preservado'], movimentacoes: [{ id: 42, cliente: 'Cliente preservado', tipo_movimentacao: 'IN', tipo_sacaria: 'granel', quantidade: 1000, peso_kg: 1000, data_movimentacao: '2026-10-01', documentos: [] }] });
const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+a0uoAAAAASUVORK5CYII=', 'base64');

async function importJson(page, value) {
  await page.goto('/#/configuracoes');
  await page.getByLabel('Importar dados JSON').setInputFiles({ name: 'backup.json', mimeType: 'application/json', buffer: Buffer.from(typeof value === 'string' ? value : JSON.stringify(value)) });
}

test('PWA offline: migração, módulos, abas por cliente, CRUD, anexos, relatórios e JSON', async ({ page, context }) => {
  const errors = []; page.on('pageerror', e => errors.push(e.message));
  const external = []; page.on('request', r => { if (!r.url().startsWith('http://127.0.0.1:4173') && !r.url().startsWith('data:') && !r.url().startsWith('blob:')) external.push(r.url()); });
  await page.addInitScript(() => localStorage.setItem('moagem_clientes_cadastrados', '["Nome local antigo"]'));
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Produtos' })).toBeVisible();
  await expect(page.getByRole('link', { name: /Conectar planilha/ })).toBeVisible();
  await importJson(page, fixture); await expect(page.getByText(/Importação concluída/)).toBeVisible();
  await expect(page.getByText(/Este aparelho já funciona sem internet/)).toBeVisible();
  await importJson(page, fixture); await expect(page.getByText(/0 registros novos e 0 atualizados/)).toBeVisible();
  await importJson(page, '{corrompido'); await expect(page.getByRole('alert')).toContainText('corrompido');

  await page.getByRole('link', { name: /Moagem Atílio/ }).click();
  await page.getByRole('link', { name: /^Milho/ }).click();
  await expect(page.getByRole('link', { name: /Nome local antigo/ })).toBeVisible();
  await page.getByRole('link', { name: /Cliente preservado/ }).click();
  await page.getByLabel('Mês do balanço').fill('2026-10');
  await expect(page.locator('.credit strong')).toHaveText('1.000 kg');

  // Abas: troca de produto mantém cliente e mês; Voltar do celular sai do cliente.
  await page.getByRole('button', { name: /^Soja/ }).click();
  await expect(page.getByRole('heading', { name: 'Cliente preservado' })).toBeVisible();
  await expect(page.getByLabel('Mês do balanço')).toHaveValue('2026-10');
  await page.goBack(); await expect(page.getByRole('heading', { name: 'Milho', exact: true })).toBeVisible();
  await page.goBack(); await expect(page.getByRole('heading', { name: 'Produtos' })).toBeVisible();

  // Recarrega sem rede; todos os chunks (inclusive PDF) estão em cache.
  await context.setOffline(true); await page.reload(); await expect(page.getByRole('heading', { name: 'Produtos' })).toBeVisible();
  for (const module of ['Sacarias vazias', 'Soja']) {
    const unit = module === 'Soja' ? 'sacos' : 'unidades', field = module === 'Soja' ? 'Quantidade de sacos' : 'Quantidade de sacarias vazias';
    await page.getByRole('link', { name: new RegExp(`^${module}`) }).click();
    await page.getByRole('link', { name: /Cliente preservado/ }).click();
    await page.getByLabel('Mês do balanço').fill('2026-10');
    await page.getByRole('button', { name: 'Entrada', exact: true }).click();
    await page.getByLabel(field).fill('20');
    await page.getByLabel('Data do registro').fill('2026-10-01');
    if (module === 'Soja') await page.getByLabel('Anexar foto').setInputFiles({ name: 'foto.png', mimeType: 'image/png', buffer: PNG });
    await page.getByRole('button', { name: 'Salvar registro' }).click();
    await expect(page.getByText('Entrada registrada.')).toBeVisible();
    await page.getByRole('button', { name: 'Saída', exact: true }).click();
    await page.getByLabel(field).fill('3'); await page.getByLabel('Data do registro').fill('2026-10-02'); await page.getByRole('button', { name: 'Salvar registro' }).click();
    await expect(page.locator('.credit strong')).toHaveText(`17 ${unit}`);
    await expect(page.getByRole('button', { name: new RegExp(`^${module}.*17 ${unit}`) })).toBeVisible();
    await page.getByRole('button', { name: 'Próximo mês' }).click(); await expect(page.locator('.credit strong')).toHaveText(`17 ${unit}`); await page.getByRole('button', { name: 'Mês anterior' }).click();
    if (module === 'Soja') { await page.getByRole('button', { name: /Ver 1 foto/ }).click(); await expect(page.getByAltText('Comprovante 1')).toBeVisible(); await page.getByRole('button', { name: 'Fechar', exact: true }).click(); }
    await page.getByRole('button', { name: /^Saída de 3 .* Editar registro/ }).click(); await page.getByLabel(field).fill('4'); await page.getByRole('button', { name: 'Salvar registro' }).click();
    await expect(page.locator('.credit strong')).toHaveText(`16 ${unit}`);
    await page.getByRole('button', { name: 'Apagar registro de 02/10/2026' }).click(); await page.getByRole('button', { name: 'Sim, apagar' }).click();
    await expect(page.locator('.credit strong')).toHaveText(`20 ${unit}`);
    const pdf = page.waitForEvent('download'); await page.getByRole('button', { name: 'Baixar PDF do cliente' }).click(); expect((await pdf).suggestedFilename()).toMatch(/\.pdf$/);
    await page.getByRole('link', { name: /Moagem Atílio/ }).click();
  }
  await page.getByLabel('Mês do relatório').fill('2026-10');
  const download = page.waitForEvent('download'); await page.getByRole('button', { name: 'Baixar relatório geral' }).click(); expect((await download).suggestedFilename()).toBe('moagem-geral-2026-10.pdf');
  await page.goto('/#/configuracoes');
  const backup = page.waitForEvent('download'); await page.getByRole('button', { name: 'Exportar dados JSON' }).click(); expect((await backup).suggestedFilename()).toMatch(/\.json$/);
  await page.goto('/'); await expect(page.getByText('3 registros · 2 clientes')).toBeVisible();
  for (const width of [390, 360]) {
    await page.setViewportSize({ width, height: 800 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.screenshot({ path: `test-results/home-${width}.png`, fullPage: true });
  }
  expect(errors).toEqual([]); expect(external).toEqual([]);
});

test('manifest e cache contêm todos os assets incluindo relatórios', async ({ page }) => {
  await page.goto('/'); await page.evaluate(() => navigator.serviceWorker.ready);
  const evidence = await page.evaluate(async () => {
    const manifest = await fetch('/manifest.json').then(r => r.json()); const keys = await caches.keys(); const cache = await caches.open(keys.find(k => k.startsWith('moagem-assets-'))); const requests = await cache.keys(); return { manifest, assets: requests.map(r => r.url) };
  });
  expect(evidence.manifest.display).toBe('standalone'); expect(evidence.manifest.icons.some(i => i.sizes === '192x192')).toBe(true); expect(evidence.manifest.icons.some(i => i.sizes === '512x512')).toBe(true); expect(evidence.assets.some(a => a.includes('/reports-'))).toBe(true);
});
