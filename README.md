# Moagem Atílio

PWA local-first para registrar estoque por cliente, com três módulos: milho, sacarias vazias e soja. Funciona offline após o primeiro carregamento completo. Não utiliza servidor de dados, tabelas remotas ou login remoto. O acesso aos registros é protegido pelo próprio aparelho; use o bloqueio de tela do dispositivo.

## Desenvolvimento e validação

```powershell
npm.cmd install
npm.cmd test
npm.cmd run build
npm.cmd run preview -- --host 127.0.0.1 --port 4173
```

Abra http://127.0.0.1:4173. A validação de PWA deve usar o pacote gerado por `build` e servido por `preview`. O modo `npm.cmd run dev` não registra service worker para evitar cache de código em desenvolvimento.

Para executar o fluxo automatizado de navegador:

```powershell
npx.cmd playwright install chromium
npm.cmd run test:e2e
```

Os testes cobrem migração, validação, merge, concorrência, rollback, exclusão e recuperação. O teste Chromium desliga toda a rede após o primeiro carregamento, recarrega o app, registra entradas e saídas, edita, exclui, visualiza comprovantes e gera PDFs sem internet. Também verifica 360/390 px, cache dos chunks de relatórios e ausência de requisições externas.

## Regras de estoque

- **Milho:** entrada em kg; saída em sacos normais de 50 kg ou pequenos de 25 kg. Preserva o peso explícito dos registros antigos. Outubro/2026 é a base validada do crédito, como no sistema anterior. A partir de novembro/2026, o saldo anterior usa os movimentos desde outubro. Meses anteriores continuam visíveis e seguem o balanço mensal antigo.
- **Sacarias vazias:** entradas e saídas em unidades inteiras. Não utiliza peso, lotes ou tamanho de saca para calcular crédito.
- **Soja:** entradas e saídas em sacos inteiros. O saco padrão é de 50 kg, mas o estoque e o crédito são calculados estritamente por unidade, com transferência do crédito entre meses e anos.

Clientes são compartilhados entre os módulos; movimentações e créditos ficam separados. Cada cliente tem PDF mensal; cada módulo tem um PDF com todos os clientes; o relatório geral inclui os três módulos em seções distintas, sem somar kg com unidades.

## Documento local e sincronização

O estado fica no IndexedDB `moagem-atilio-local`, versão 1, store `documents`, chave `state`. Formato:

```json
{
  "app": "moagem-atilio",
  "schema_version": 1,
  "last_updated": "2026-10-13T12:00:00.000Z",
  "payload": { "clientes": [], "movimentacoes": [] }
}
```

Cada registro possui `uuid` e `updated_at`. Movimentações também possuem `modulo`, `cliente`, `tipo_movimentacao`, `quantidade`, `data_movimentacao` e `documentos`. Comprovantes são imagens em data URLs incorporadas no JSON, disponíveis offline e incluídas no backup. Fotos novas são limitadas a 8 MB por arquivo; importações a 100 MB.

Não há sincronização automática pela internet. Use **Exportar dados JSON** ou **Compartilhar backup JSON** em um aparelho e **Importar dados JSON** no outro. A importação valida todo o arquivo antes de escrever, soma UUIDs novos e usa Last-Write-Wins por registro. Em empates, prioriza exclusão e usa comparação canônica determinística. Campos desconhecidos de registros legados são preservados. Exclusões usam `deleted_at`; backups antigos não ressuscitam registros apagados. Mantenha data e hora dos aparelhos corretas para a comparação de versões.

Leitura, backup e escrita ocorrem na mesma transação IndexedDB. As transações são serializadas entre abas. Falhas de validação ou falta de espaço abortam a transação inteira. A interface só informa sucesso após a conclusão da gravação. BroadcastChannel e atualização ao retornar à aba mantêm as telas atualizadas.

O store `backups` guarda cópias anteriores à migração, importação, edição, exclusão e recuperação. **Ver backups automáticos → Recuperar esta cópia** permite desfazer versões antigas explicitamente: restaura os registros da cópia com timestamps novos, mantendo também os registros criados depois dela. Esta ação exige confirmação na própria interface e faz outro backup antes de escrever. Importar arquivos comuns continua usando merge e não desfaz versões mais recentes.

## Migração e preservação da base existente

O código anterior mantinha os movimentos remotamente e apenas nomes de clientes em `localStorage`. Não havia armazenamento de movimentações em IndexedDB no código existente.

No primeiro acesso, a nova versão faz backup dos valores brutos de `moagem_clientes_cadastrados`, `moagem_movimentacoes` e `moagem_estado` antes da conversão. Chaves antigas permanecem intactas. JSON inválido interrompe a migração e mantém o armazenamento original. Inicializações paralelas mesclam o estado e não substituem dados já gravados. Arquivos antigos no formato `{ clientes, movimentacoes }` são convertidos na importação; IDs legados viram UUIDs determinísticos para impedir duplicatas entre aparelhos.

Foi preparado, com autorização do usuário, um snapshot privado em `backups/legado-original.json` e sua conversão em `backups/moagem-migracao-validada.json`. O snapshot contém 119 movimentações, quatro cadastros de clientes e cinco nomes de clientes ao incluir movimentos. Não há comprovantes nessa base. Todos os campos originais foram comparados com a versão convertida. Essa pasta é ignorada pelo Git e não é copiada para `dist`.

**Antes do futuro merge/deploy:**

1. Interromper temporariamente novos lançamentos na versão antiga e obter um export final atualizado, pois o snapshot de 13/10/2026 não contém lançamentos posteriores.
2. Validar contagens, créditos por cliente e eventual presença de fotos. A base antiga não possui timestamp de edição; o export consolidado fornece a data de referência da migração.
3. Importar o JSON completo em cada dispositivo/origem que será utilizado. Localhost, os dois domínios Vercel e navegadores diferentes possuem armazenamentos separados. Nunca considerar os dados de localhost automaticamente migrados para produção.
4. Conferir os 119 registros do snapshot (ou a contagem final atualizada), os créditos e os clientes na interface publicada. Manter a base antiga intacta até concluir a conferência em todos os aparelhos.
5. Validar instalação e modo avião em Android/Chrome e iPhone/Safari reais. O teste Chromium local não comprova esses dois dispositivos reais nem a preservação após um deploy que ainda não ocorreu.

Nenhum dado real é distribuído publicamente pelo app. Novos dispositivos exibem o aviso de importação da base antiga quando não há registros.

## PWA e atualizações

Manifest standalone, ícones locais de 192/512 px, identidade mantida e fontes do sistema. `scripts/build-sw.js` calcula uma versão por hash e inclui todos os assets de `dist`, inclusive chunks de PDF, no pré-cache. O service worker atende assets e HTML com Cache-First. Uma instalação com falha de pré-cache não é ativada. Cache de versões anteriores só é limpo no namespace de assets da aplicação; dados e backups em IndexedDB não são apagados.

Uma nova versão aguarda a ação **Atualizar aplicativo**, desabilitada enquanto há formulário aberto ou operação em andamento. O registro solicita `navigator.storage.persist()`; a tela também oferece o botão **Proteger dados neste aparelho**. A concessão depende do navegador. Armazenamento persistente não protege contra limpeza manual, perda do aparelho ou desinstalação: exporte backups para outro local regularmente.

## GitHub e Vercel

Repositório existente: https://github.com/fdemarque/moagem-atilio.

Foram identificados dois projetos Vercel conectados a esse mesmo repositório, ambos publicados pelo commit `805ce813dc4ce4883fe30af50877a36a9609f4c8` na branch `main`:

- `moagem-atilio`: https://moagem-atilio.vercel.app
- `fdemarque-moagem-atilio`: https://fdemarque-moagem-atilio.vercel.app

Esta evolução fica em `codex/local-first-tres-modulos`. `vercel.json` desativa deployments automáticos somente dessa branch, conforme https://vercel.com/docs/project-configuration/git-configuration. Também explicita o framework Vite, build e pasta `dist`. Nenhum merge ou deploy é autorizado nesta etapa.
