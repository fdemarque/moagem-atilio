# Prompt para o Claude no Chrome — criar a planilha e o Apps Script

Cole o bloco abaixo no Claude da extensão do Chrome, com a conta Google **pessoal** já aberta no navegador.

```text
Tarefa: criar a planilha de dados do app Moagem Atílio na MINHA conta Google pessoal e instalar o Apps Script dela.
Não use a conta atiliomoinho@gmail.com. Antes de criar qualquer arquivo, confira no avatar do Google qual conta está ativa e me diga; se não for a minha conta pessoal, pare e me pergunte.

Código-fonte (repositório público, só leitura):
- Codigo:        https://raw.githubusercontent.com/fdemarque/moagem-atilio/feat/planilha-google/gas/Codigo.js
- Regras:        https://raw.githubusercontent.com/fdemarque/moagem-atilio/feat/planilha-google/gas/Regras.js
- appsscript:    https://raw.githubusercontent.com/fdemarque/moagem-atilio/feat/planilha-google/gas/appsscript.json

Para copiar cada arquivo: abra o link numa aba nova, clique no texto, Ctrl+A, Ctrl+C. No editor do Apps Script, clique dentro do arquivo, Ctrl+A, Ctrl+V. Use sempre colar (nunca digitar o código), porque o editor completa parênteses ao digitar e corrompe o código.

Passos:
1. Abra https://sheets.new e renomeie a planilha para "Moagem Atílio — Dados".
2. Menu Extensões → Apps Script. Renomeie o projeto para "Moagem Atílio".
3. Configurações do projeto (ícone de engrenagem) → marque "Mostrar arquivo de manifesto appsscript.json no editor". Volte ao Editor.
4. Renomeie "Código.gs" (ou "Code.gs") para "Codigo" e cole o conteúdo de Codigo.
5. Adicione um arquivo de script (+ → Script) chamado "Regras" e cole o conteúdo de Regras.
6. Abra appsscript.json e substitua todo o conteúdo pelo de appsscript.
7. Salve (Ctrl+S). Confira que não aparece erro de sintaxe.
8. Na barra superior, escolha a função "instalar" e clique em Executar. O Google vai pedir autorização: PARE e me peça para concluir a autorização eu mesmo (inclusive a tela "O Google não verificou este app" → Avançado → Acessar). Depois que eu confirmar, execute "instalar" de novo se ela não tiver terminado. O registro de execução deve mostrar "Execução concluída".
9. Implantar → Nova implantação → engrenagem → "App da Web". Descrição: "v1". Executar como: Eu. Quem pode acessar: Qualquer pessoa. Clique em Implantar e copie a URL do App da Web (termina em /exec).
10. Abra essa URL numa aba nova. Deve aparecer: "Moagem Atílio: serviço ativo." Se aparecer pedido de login ou erro, me informe o texto exato.
11. Volte à planilha e recarregue a página. Deve existir o menu "Moagem" e as abas: Movimentações, Clientes, Saldos atuais, Resumo mensal, Registro. No Drive deve existir a pasta "Moagem Atílio" com "Comprovantes" e "Backups".
12. Menu Moagem → "Link de conexão dos aparelhos". Quando pedir a URL do App da Web, cole a URL /exec do passo 9 (a mesma de Implantar → Gerenciar implantações). Não copie o código para o chat; apenas confirme que a janela abriu com um link e um código.
13. No Apps Script, menu Acionadores (ícone de relógio): confira um acionador diário de "rotinaDiaria" e um "Ao editar" de "aoEditar".

Ao terminar, me responda só com: conta usada, link da planilha, URL /exec, resultado do passo 10 e qualquer erro encontrado. Não altere nenhuma outra planilha ou arquivo.
```

## Atualizar o código depois

Cole os arquivos alterados como no passo 4–6, salve e use **Implantar → Gerenciar implantações → lápis → Versão: Nova versão → Implantar**. Assim a URL /exec continua a mesma e os aparelhos não precisam ser reconectados.
