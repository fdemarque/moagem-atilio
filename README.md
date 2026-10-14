# Moagem Atílio

PWA local-first para registrar estoque por cliente, com três módulos: milho, sacarias vazias e soja. Funciona offline após o primeiro carregamento completo. Usa IndexedDB no aparelho e arquivos JSON privados no Vercel Blob; não utiliza bancos SQL/NoSQL. A conexão de um aparelho é autorizada uma vez pelo responsável. Backups adicionais ficam na conta Google exclusiva do moinho, em JSON e planilhas de consulta.

## Desenvolvimento e validação

```powershell
npm.cmd install
npm.cmd test
npm.cmd run build
npm.cmd run local
```

Abra http://127.0.0.1:4173. O comando `local` serve o build e as mesmas APIs usadas na Vercel, lendo credenciais privadas de `.env.local`. `preview` serve somente os assets. O modo `npm.cmd run dev` não registra service worker para evitar cache de código em desenvolvimento.

Para executar o fluxo automatizado de navegador:

```powershell
npx.cmd playwright install chromium
npm.cmd run test:e2e
```

Os testes cobrem migração, validação, merge, concorrência, rollback, exclusão e recuperação. O teste Chromium desliga toda a rede após o primeiro carregamento, recarrega o app, registra entradas e saídas, edita, exclui, visualiza comprovantes e gera PDFs sem internet. Também verifica 360/390 px, cache dos chunks de relatórios, ausência de requisições externas e a abertura sem ferramentas técnicas de backup.

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

A sincronização envia automaticamente o documento local após uma alteração e ao reconectar, e consulta a versão remota a cada minuto. O documento local é a fila durável; uma falha não apaga lançamentos pendentes. As ferramentas **Exportar dados JSON**, **Compartilhar backup JSON** e **Importar dados JSON** ficam em **Configurações → Manutenção**, fora do fluxo diário do usuário. A importação valida todo o arquivo antes de escrever, soma UUIDs novos e usa Last-Write-Wins por registro. Em empates, prioriza exclusão e usa comparação canônica determinística. Campos desconhecidos de registros legados são preservados. Exclusões usam `deleted_at`; backups antigos não ressuscitam registros apagados. Mantenha data e hora dos aparelhos corretas para a comparação de versões.

A implementação, configuração e evidências da Vercel, Drive e arquivamento estão em [ARMAZENAMENTO-AUTOMATICO.md](./ARMAZENAMENTO-AUTOMATICO.md). O ambiente local foi validado contra serviços reais. O agendamento diário é ativado na publicação de produção. A rotina diária verifica backups e arquiva a cada seis meses, preservando versões, exclusões, créditos e o histórico offline. A retenção elimina apenas snapshots redundantes antigos na Vercel, mantendo o atual, pelo menos duas cópias e seis meses; não elimina arquivos históricos.

Leitura, backup e escrita ocorrem na mesma transação IndexedDB. As transações são serializadas entre abas. Falhas de validação ou falta de espaço abortam a transação inteira. A interface só informa sucesso após a conclusão da gravação. BroadcastChannel e atualização ao retornar à aba mantêm as telas atualizadas.

O store `backups` guarda cópias anteriores à migração, importação, edição, exclusão e recuperação. **Ver backups automáticos → Recuperar esta cópia** permite desfazer versões antigas explicitamente: restaura os registros da cópia com timestamps novos, mantendo também os registros criados depois dela. Esta ação exige confirmação na própria interface e faz outro backup antes de escrever. Importar arquivos comuns continua usando merge e não desfaz versões mais recentes.

## Migração e preservação da base existente

O código anterior mantinha os movimentos remotamente e apenas nomes de clientes em `localStorage`. Não havia armazenamento de movimentações em IndexedDB no código existente.

No primeiro acesso, a nova versão faz backup dos valores brutos de `moagem_clientes_cadastrados`, `moagem_movimentacoes` e `moagem_estado` antes da conversão. Chaves antigas permanecem intactas. JSON inválido interrompe a migração e mantém o armazenamento original. Inicializações paralelas mesclam o estado e não substituem dados já gravados. Arquivos antigos no formato `{ clientes, movimentacoes }` são convertidos na importação; IDs legados viram UUIDs determinísticos para impedir duplicatas entre aparelhos.

Foi preparado, com autorização do usuário, um snapshot privado em `backups/legado-original.json` e sua conversão em `backups/moagem-migracao-validada.json`. O snapshot contém 119 movimentações, quatro cadastros de clientes e cinco nomes de clientes ao incluir movimentos. Não há comprovantes nessa base. Todos os campos originais foram comparados com a versão convertida. Essa pasta é ignorada pelo Git e não é copiada para `dist`.

**Procedimento de publicação e conferência:**

1. Interromper temporariamente novos lançamentos na versão antiga e obter um export final atualizado, pois o snapshot de 13/10/2026 não contém lançamentos posteriores.
2. Validar contagens, créditos por cliente e eventual presença de fotos. A base antiga não possui timestamp de edição; o export consolidado fornece a data de referência da migração.
3. Mesclar o export final atualizado no Blob privado com `scripts/seed-cloud.js`, conferir o backup e configurar as credenciais de produção. Autorizar cada aparelho para receber e conciliar a base automaticamente. Localhost, os dois domínios Vercel e navegadores diferentes possuem armazenamentos separados. Nunca considerar o IndexedDB de localhost automaticamente migrado para produção.
4. Conferir os 119 registros do snapshot (ou a contagem final atualizada), os créditos e os clientes na interface publicada. Manter a base antiga intacta até concluir a conferência em todos os aparelhos.
5. Validar instalação e modo avião em Android/Chrome e iPhone/Safari reais. O teste Chromium local não comprova esses dois dispositivos reais nem a preservação após um deploy que ainda não ocorreu.

Nenhum dado real é distribuído publicamente pelo app. Novos dispositivos recebem a base privada depois da conexão autorizada pelo responsável.

## PWA e atualizações

Manifest standalone, ícones locais de 192/512 px, identidade mantida e fontes do sistema. `scripts/build-sw.js` calcula uma versão por hash e inclui todos os assets de `dist`, inclusive chunks de PDF, no pré-cache. O service worker atende assets e HTML com Cache-First. Uma instalação com falha de pré-cache não é ativada. Cache de versões anteriores só é limpo no namespace de assets da aplicação; dados e backups em IndexedDB não são apagados.

Uma nova versão aguarda a ação **Atualizar aplicativo**, desabilitada enquanto há formulário aberto ou operação em andamento. O registro solicita `navigator.storage.persist()` automaticamente; não exige ação do usuário para proteger o armazenamento. A concessão depende do navegador. Armazenamento persistente não protege contra limpeza manual, perda do aparelho ou desinstalação. O service worker não intercepta nem armazena `/api/`.

## GitHub e Vercel

Repositório existente: https://github.com/fdemarque/moagem-atilio.

Foram identificados dois projetos Vercel conectados a esse mesmo repositório, ambos publicados pelo commit `805ce813dc4ce4883fe30af50877a36a9609f4c8` na branch `main`:

- `moagem-atilio`: https://moagem-atilio.vercel.app
- `fdemarque-moagem-atilio`: https://fdemarque-moagem-atilio.vercel.app

Esta evolução fica em `codex/local-first-tres-modulos`. `vercel.json` desativa deployments automáticos somente dessa branch, conforme https://vercel.com/docs/project-configuration/git-configuration. Também explicita o framework Vite, build e pasta `dist`. A publicação na main e na Vercel foi autorizada em 14/10/2026. A main anterior, commit `805ce813dc4ce4883fe30af50877a36a9609f4c8`, está preservada na branch `codex/backup-main-2026-10-14`.

Os documentos públicos ficam no GitHub Pages, publicado somente a partir de `/docs` desta branch: [privacidade](https://fdemarque.github.io/moagem-atilio/privacidade.html) e [termos](https://fdemarque.github.io/moagem-atilio/termos.html). Isso não publica o PWA na Vercel. Para atualizar essas páginas, editar `PRIVACIDADE.md`/`TERMOS.md`, executar `node scripts/legal-pages.js` e publicar os arquivos gerados junto dos fontes.
