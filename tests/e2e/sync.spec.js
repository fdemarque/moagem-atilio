import { test, expect } from '@playwright/test';
import { loadGas } from '../fake-gas.js';

const URL_GAS = 'https://script.google.com/macros/s/teste/exec';
const code = Buffer.from(JSON.stringify({ u: URL_GAS, t: 'token-teste-0123456789' })).toString('base64url');

test('dois aparelhos conectados pelo link compartilham dados pela planilha', async ({ browser }) => {
  const server = loadGas();
  const contexts = await Promise.all([browser.newContext(), browser.newContext()]);
  let down = false;
  for (const context of contexts) {
    await context.route('https://script.google.com/**', route => down ? route.abort() : route.fulfill({ contentType: 'application/json', body: JSON.stringify(server.post(route.request().postData())) }));
  }
  const [a, b] = await Promise.all(contexts.map(c => c.newPage()));
  await a.goto('/');
  await expect(a.getByText(/Este aparelho ainda não tem registros/)).toBeVisible();
  for (const page of [a, b]) {
    await page.goto(`/#conectar=${code}`);
    await expect(page.getByText('Aparelho conectado à planilha.')).toBeVisible();
    await expect(page.getByRole('link', { name: /Planilha em dia/ })).toBeVisible();
  }
  await expect(a.getByText(/Este aparelho ainda não tem registros/)).toHaveCount(0);

  // Aparelho A cadastra e registra; a planilha recebe.
  await a.goto('/#/soja');
  await a.getByRole('button', { name: 'Novo cliente' }).click();
  await a.getByLabel('Nome do cliente').fill('Ana Souza');
  await a.getByRole('button', { name: 'Cadastrar cliente' }).click();
  await expect(a.getByRole('heading', { name: 'Ana Souza' })).toBeVisible();
  await a.getByRole('button', { name: 'Entrada', exact: true }).click();
  await a.getByLabel('Quantidade de sacos').fill('12');
  await a.getByRole('button', { name: 'Salvar registro' }).click();
  await expect.poll(() => server.sheets.get('Movimentações').rows().length).toBe(2);
  expect(server.sheets.get('Clientes').rows()[1][1]).toBe('Ana Souza');

  // Aparelho B recebe ao abrir o app.
  await b.goto('/#/soja');
  await b.reload();
  await expect(b.getByRole('link', { name: /Ana Souza.*12 sacos/ })).toBeVisible();

  // Planilha fora do ar: o registro fica no aparelho e é enviado depois.
  down = true;
  await b.getByRole('link', { name: /Ana Souza/ }).click();
  await b.getByRole('button', { name: 'Saída', exact: true }).click();
  await b.getByLabel('Quantidade de sacos').fill('5');
  await b.getByRole('button', { name: 'Salvar registro' }).click();
  await expect(b.getByRole('link', { name: /Planilha sem resposta/ })).toBeVisible();
  await expect(b.locator('.credit strong')).toHaveText('7 sacos');
  down = false;
  await b.goto('/#/configuracoes');
  await b.getByRole('button', { name: 'Enviar e atualizar agora' }).click();
  await expect(b.getByRole('link', { name: /Planilha em dia/ })).toBeVisible();
  expect(server.sheets.get('Movimentações').rows().length).toBe(3);
  await a.reload();
  await a.goto('/#/soja');
  await expect(a.getByRole('link', { name: /Ana Souza.*7 sacos/ })).toBeVisible();
  await Promise.all(contexts.map(c => c.close()));
});
