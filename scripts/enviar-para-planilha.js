// Envia um backup JSON completo à planilha (migração única do Vercel Blob).
// Uso: node scripts/enviar-para-planilha.js backups/arquivo.json   (código em MOAGEM_CONEXAO)
import { readFileSync } from 'node:fs';
import { migrateLegacy } from '../src/lib/document.js';
import { parseConnectionCode, pendingBatches } from '../src/lib/sync.js';

const [file] = process.argv.slice(2);
if (!file || !process.env.MOAGEM_CONEXAO) throw new Error('Informe o arquivo e a variável MOAGEM_CONEXAO com o código de conexão.');
const connection = parseConnectionCode(process.env.MOAGEM_CONEXAO);
const document = migrateLegacy(JSON.parse(readFileSync(file, 'utf8')));
const pending = {};
for (const entity of ['clientes', 'movimentacoes']) for (const row of document.payload[entity]) pending[`${entity}:${row.uuid}`] = row.updated_at;
const { batches } = pendingBatches(document, { pending });
let total = 0, rejeitados = 0, cursor = 0;
for (const batch of batches) {
  const response = await fetch(connection.url, { method: 'POST', body: JSON.stringify({ token: connection.token, acao: 'sincronizar', desde: 0, ...batch }) });
  const result = await response.json();
  if (!result.ok) throw new Error(result.erro);
  total += batch.clientes.length + batch.movimentacoes.length; rejeitados += result.rejeitados.length; cursor = result.cursor;
}
console.log(`Enviados ${total} registros (${document.payload.movimentacoes.length} movimentações). Recusados: ${rejeitados}. Revisão da planilha: ${cursor}.`);
