# Moagem Atílio

PWA offline-first para estoque por cliente em três produtos: milho, sacarias vazias e soja. Os dados ficam no aparelho (IndexedDB) e são sincronizados com uma **planilha Google da conta pessoal do responsável**, que é a fonte organizada e o backup. A Vercel só hospeda o app.

```
Aparelho (IndexedDB) ──POST texto/JSON──► Apps Script (App da Web) ──► Planilha + Drive
   pendências por registro                 revisão + trava               Movimentações, Clientes,
   cursor de revisão                       fotos → Drive                 Saldos, Resumo, Registro
```

## Comandos

```powershell
npm.cmd install
npm.cmd test            # regras, armazenamento, sync e Apps Script (simulado)
npm.cmd run build
npm.cmd run test:e2e    # Chromium: offline, abas por cliente, sync entre dois aparelhos
```

## Planilha e Apps Script

- Código em `gas/` (`Codigo.js`, `Regras.js`, `appsscript.json`). Instalação guiada para o Claude no Chrome: [gas/PROMPT-EXTENSAO.md](gas/PROMPT-EXTENSAO.md).
- Abas: **Movimentações** e **Clientes** (um registro por linha, com ID, `Atualizado em`, `Apagado em`, `Revisão`), **Saldos atuais**, **Resumo mensal** e **Registro**.
- Editar uma célula direto na planilha gera nova revisão e chega aos aparelhos. Para apagar, preencha `Apagado em`. Não exclua linhas.
- Rotina diária às 06h: marca linhas inválidas (vermelho, com nota), recalcula saldos e resumo, ordena e salva `.xlsx` em `Drive/Moagem Atílio/Backups` (60 dias + dia 1 de cada mês).
- Comprovantes viram arquivos em `Drive/Moagem Atílio/Comprovantes`; o app guarda uma cópia reduzida (≤1600 px) para uso offline.
- Conexão de cada aparelho, uma vez: planilha → menu **Moagem → Link de conexão dos aparelhos**. Abrir o link no aparelho ou colar o código em **Configurações**. O código fica só no aparelho.
- `src/lib/document.js` e `gas/Regras.js` têm as mesmas regras de estoque; `tests/gas.test.js` confere a equivalência.

## Regras de estoque

- **Milho:** entrada em kg; saída em sacos de 50 kg ou 25 kg. Outubro/2026 é a base validada do crédito; a partir de novembro/2026, o saldo anterior usa os movimentos desde outubro. Meses anteriores seguem o balanço mensal antigo.
- **Sacarias vazias:** unidades inteiras.
- **Soja:** sacos inteiros, contados por unidade.

Clientes são compartilhados entre produtos; dentro de um cliente, as abas Milho/Sacarias/Soja mostram o crédito de cada um e trocam de produto mantendo cliente e mês.

## Sincronização

- Cada alteração local marca o registro como pendente na mesma transação do IndexedDB. O envio acontece após cada alteração, ao abrir/voltar ao app, ao reconectar e a cada minuto.
- Conflitos: vence o `updated_at` mais novo; empate com exclusão vence a exclusão; nos demais empates a planilha devolve a sua versão. Exclusões são lógicas.
- A resposta traz só registros com revisão posterior ao cursor do aparelho, paginada por tamanho.
- Falhas nunca apagam pendências. Cópias automáticas locais continuam em **Configurações → Cópias automáticas deste aparelho**.

## Migração do Vercel Blob

O estado final do Blob foi exportado em `backups/estado-blob-2026-11-07.json` (privado, fora do Git). Depois de criar a planilha:

```powershell
$env:MOAGEM_CONEXAO="<código de conexão>"; node scripts/enviar-para-planilha.js backups/estado-blob-2026-11-07.json
```

Os aparelhos já em uso também enviam todos os registros locais na primeira conexão. O Blob antigo não é apagado.

## Publicação

Repositório: https://github.com/fdemarque/moagem-atilio. Push na `main` publica na Vercel (`moagem-atilio.vercel.app`). Documentos legais em `/docs` (GitHub Pages): [privacidade](https://fdemarque.github.io/moagem-atilio/privacidade.html) e [termos](https://fdemarque.github.io/moagem-atilio/termos.html).
