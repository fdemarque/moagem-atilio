# Planilha Google como fonte dos dados

Status: implementado na branch feat/planilha-google; aguarda criação da planilha e publicação (07/11/2026)

## Objetivo

Guardar clientes e movimentações em tabelas de uma planilha da conta pessoal do responsável, que funciona também como backup. O app continua funcionando sem internet.

## Critérios de aceitação

1. Abas `Movimentações` e `Clientes` guardam um registro por linha, com ID, data de atualização e exclusão lógica.
2. O app envia somente o que mudou e recebe somente o que mudou desde a última revisão (cursor).
3. Conflitos: vence o `updated_at` maior; empate com exclusão vence a exclusão; demais empates ficam com a planilha, que devolve sua versão.
4. Comprovantes viram arquivos no Drive (pasta `Moagem Atílio/Comprovantes`); a célula guarda os links; o app recebe a foto de volta para uso offline.
5. Edição feita direto na planilha atualiza `Atualizado em`/`Revisão` e chega aos aparelhos.
6. Rotina diária (06h, America/Sao_Paulo): verifica linhas, marca inválidas, recalcula `Saldos atuais` e `Resumo mensal`, salva cópia .xlsx em `Moagem Atílio/Backups` (60 dias + dia 1 de cada mês) e registra em `Registro`.
7. Conexão do aparelho por link `#conectar=<código>` ou colando o código. Sem token no Git ou no bundle.
8. Dentro de um cliente, o usuário troca entre Milho, Sacarias e Soja sem sair do cliente; o botão Voltar do celular navega entre telas.

## Fora de escopo

Renomear cliente em massa; múltiplos usuários com permissões diferentes.

## Migração

Na primeira conexão, cada aparelho envia todos os registros locais. O estado final do Blob também é exportado e enviado por `scripts/enviar-para-planilha.js`. O Blob antigo não é apagado.
