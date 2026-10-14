# Armazenamento automático, backups e arquivamento

Estado verificado em 14/10/2026. Publicação na main e nos dois projetos Vercel autorizada pelo responsável. A versão anterior está preservada na branch `codex/backup-main-2026-10-14`.

## Funcionamento implementado

- O IndexedDB guarda o documento completo e as cópias locais antes de migração, edição, exclusão, importação e recuperação. Nenhuma chave legada é apagada.
- `src/lib/sync.js` envia alterações automaticamente, reenvia ao voltar a ter internet e consulta o estado remoto a cada minuto. A fila é o próprio documento persistido. O merge da resposta lê o estado mais recente dentro da transação, preservando registros criados durante a requisição. Mudanças idênticas não escrevem nem geram ciclos de notificações.
- `/api/session` autoriza o aparelho com um código forte do responsável, guardado em configuração privada. A sessão usa cookie HttpOnly, SameSite=Strict e Secure em HTTPS, com duração de um ano. Endpoints validam sessão e origem; `/api/maintenance` exige segredo exclusivo do agendamento.
- `/api/sync` valida o schema, mescla por UUID/timestamp e devolve o documento consolidado. Documentos grandes são enviados em partes privadas menores que o limite de requisição da Vercel. A resposta é transmitida por streaming. Comprovantes permanecem no JSON.
- `server/blob-files.js` utiliza Blob privado com leituras sem cache e escrita condicional pela versão ETag. A criação usa `allowOverwrite: false`; atualizações usam `ifMatch`. O SDK recebe ETags de entrega com marcador W/ em respostas comprimidas, enquanto o armazenamento usa a mesma revisão sem esse marcador. Essa diferença foi conferida contra `head()` e corrigida; gravações concorrentes reais passaram.
- `server/document-store.js` mantém um manifesto consolidado, snapshots e históricos imutáveis. Uma disputa de versão relê e repete o merge; falhas de armazenamento não são tratadas como conflitos silenciosos.
- `server/google-auth.js` renova a autorização Google no servidor. `server/google-backup.js` confere a conta dedicada, grava JSON, confere SHA-256 e cria planilhas com valores literais RAW. A leitura posterior confere as células. Os arquivos históricos vão para a pasta Histórico; planilhas ficam em Planilhas. Falhas não apagam o estado ativo.
- Nenhuma credencial utiliza prefixo VITE_ ou entra no GitHub, bundle ou service worker. APIs não são cacheadas pelo service worker. Não há chamadas SQL/NoSQL ou ao banco antigo no aplicativo.

## Rotina automática e retenção

`vercel.json` define uma execução diária de `/api/maintenance` às 06:00 UTC. Ela faz o backup consolidado na Vercel e no Drive e verifica se passaram seis meses de calendário desde a criação do manifesto ou o último arquivamento bem-sucedido.

Quando vence o período, movimentos anteriores aos seis meses completos mais recentes são separados em documentos por mês. Registros completos, fotos, IDs, timestamps e exclusões são mantidos. Antes de atualizar o manifesto, cada histórico é conferido no Drive e no Blob. O manifesto só muda por escrita condicional depois dessas verificações. Uma falha anterior mantém o documento ativo intacto.

O manifesto registra créditos de abertura por cliente/módulo, calculados com a regra existente do milho e unidades de sacarias/soja. A sincronização reconstitui o documento completo com os históricos; o aparelho conserva todos os registros para consultar e exportar meses antigos offline. Não é realizada limpeza destrutiva do IndexedDB. Um aparelho antigo pode voltar, enviar lançamentos novos e editar registros arquivados: o merge usa os mesmos UUIDs e versões, reconstrói o arquivo mensal e recalcula os créditos. Tombstones continuam disponíveis.

Após o backup conferido e a publicação condicional do manifesto, a retenção no Blob seleciona somente snapshots redundantes com mais de seis meses completos. Conserva a cópia atual e as duas mais recentes. Nunca seleciona o estado ativo, históricos, arquivos de transferência ou arquivos de formato desconhecido. Exclusões usam ETag. Uma falha de limpeza fica pendente para a próxima execução; não desfaz o backup confirmado. Arquivos históricos e cópias no Drive são mantidos permanentemente nesta versão.

A publicação de produção configura a tarefa diária nos dois projetos. A manutenção é idempotente e usa comparação condicional de versão: os dois endereços compartilham os mesmos arquivos privados. No localhost, a API também foi executada explicitamente para validação.

## Configuração realizada

- Google dedicado: `atiliomoinho@gmail.com`.
- Projeto Google Cloud: `Moagem Atilio Backups`, `aerial-gadget-511601-p2`; Drive API e Sheets API ativadas. Nenhum plano pago foi contratado nesta configuração.
- Cadastro OAuth: `Moagem Atílio — Backups`, em produção, solicitando somente `https://www.googleapis.com/auth/drive.file`. A autorização foi concluída e a conta confirmada. As credenciais de servidor ficam no `.env.local` ignorado. O modo em produção evita a expiração automática de sete dias dos tokens de teste; a autorização ainda pode ser revogada pelo responsável ou Google.
- Blob privado: `moagem-atilio-dados`, usado pelos dois projetos `moagem-atilio` e `fdemarque-moagem-atilio` com a mesma credencial privada no servidor. As credenciais de Google e acesso também foram configuradas nos dois ambientes Production.
- Base inicial mesclada no Blob: 119 movimentos e 5 clientes normalizados, provenientes do snapshot autorizado. Não substituiu uma base remota existente.
- Pasta Google: https://drive.google.com/drive/folders/1VcSvXtyCbI9OdW3xpjYQGF8O8clw6dH6
- Primeiro JSON completo conferido: https://drive.google.com/file/d/1MRSEWwi9a-tfD0XDhg96_ASU3BpPa6U2/view
- Primeira planilha conferida: https://docs.google.com/spreadsheets/d/1YlOB-MDxYLGMms5u_BsaQJ8GsZvLxYGDXrA66inhAJg
- Documentos legais: https://fdemarque.github.io/moagem-atilio/privacidade.html e https://fdemarque.github.io/moagem-atilio/termos.html. Publicados via GitHub Pages em `/docs`, sem publicar o PWA.

## Comandos locais

```powershell
npm.cmd run build
npm.cmd run local
```

O servidor local lê `.env.local` e serve assets e APIs em `http://127.0.0.1:4173`. `scripts/setup-local-secrets.js` prepara segredos privados e guarda o código do responsável em `backups/acesso-aparelhos.txt`. Não enviar esse arquivo, o cliente OAuth ou `.env.local` ao GitHub.

Para uma nova autorização, `scripts/authorize-google.js` usa state, PKCE e retorno restrito a `127.0.0.1:4175/oauth/google/callback`. O responsável autoriza pela tela Google. `scripts/google-backup.js` verifica um JSON explícito no Drive; `scripts/seed-cloud.js` mescla o documento validado no Blob e confere sua leitura. Esses comandos nunca imprimem tokens.

## Evidências de validação

- Testes de domínio/armazenamento/API/Google/arquivamento/retenção: 30 aprovados.
- Chromium: módulos, CRUD, fotos, PDFs e JSON offline; cache completo, manifest, 360/390 px; sincronização entre dois aparelhos, escrita local durante resposta e envio após offline aprovados.
- Conta Google e pastas conferidas no navegador; JSON por checksum e planilhas por leitura de todas as células enviados conferidos usando APIs reais.
- API local real: login 200, sincronização 200, 119 movimentos, manutenção 200 e `verified: true`.
- Duas manutenções concorrentes no Blob real concluíram com sucesso e preservaram exatamente os 119 registros.
- Arquivamento semestral foi validado com relógio controlado: créditos iguais, histórico preservado, aparelho antigo sem duplicação, edição/exclusão arquivadas, falha do Drive e checksum bloqueando alteração. Nenhum registro real foi antecipadamente arquivado.
- Dependências de produção sem vulnerabilidades reportadas no audit.

## Publicação e conferência

O export final de 14/10/2026 foi conciliado sem alterações: 119 movimentações e 5 clientes normalizados. Os arquivos originais e backups foram preservados fora do Git. As configurações antigas de banco foram removidas dos dois projetos Vercel; nenhum banco antigo foi apagado.

Cada aparelho deve ser conectado uma vez pelo responsável para receber a base compartilhada. O código fica no arquivo privado `backups/acesso-aparelhos.txt`. Localhost e os dois domínios possuem armazenamentos separados. Após conectar, as cópias são automáticas.

A validação Chromium de funcionamento offline não substitui a conferência de instalação e modo avião em Android/Chrome e iPhone/Safari reais.

## Referências oficiais

- https://vercel.com/docs/vercel-blob/using-blob-sdk
- https://vercel.com/docs/vercel-blob/private-storage
- https://vercel.com/docs/cron-jobs/usage-and-pricing
- https://developers.google.com/workspace/drive/api/guides/api-specific-auth
- https://developers.google.com/workspace/sheets/api/reference/rest/v4/spreadsheets.values/update
- https://developers.google.com/identity/protocols/oauth2
