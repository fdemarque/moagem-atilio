# Prompt para o Claude no Chrome — atualizar o Apps Script da planilha

```text
Tarefa: atualizar o código do Apps Script da planilha "Moagem Atílio — Dados" (minha conta Google pessoal) e publicar na implantação existente, SEM criar implantação nova e SEM mexer nos dados ou na formatação da planilha (as abas são tabelas e devem continuar assim).

1. Abra numa aba nova: https://raw.githubusercontent.com/fdemarque/moagem-atilio/fix/planilha-colunas-tipadas/gas/Codigo.js?v=4
   Confira que o texto contém exatamente: VERSAO = '4'
   Se não contiver, recarregue com Ctrl+F5 até conter. Não continue sem isso.
   Clique no texto, Ctrl+A, Ctrl+C.
2. Abra a planilha "Moagem Atílio — Dados" → menu Extensões → Apps Script.
3. No editor, abra o arquivo "Codigo". Clique dentro do código, Ctrl+A, Ctrl+V (sempre colar, nunca digitar). Salve com Ctrl+S.
4. Confirme: Ctrl+F no editor, procure VERSAO. Deve aparecer VERSAO = '4'. Se aparecer outra coisa, volte ao passo 1.
5. Implantar → Gerenciar implantações. Na lista da esquerda, clique em cada item até achar aquele cuja URL do App da Web começa com:
   https://script.google.com/macros/s/AKfycbxlA0277
   Use SOMENTE essa implantação.
6. Com ela selecionada, clique no ícone de lápis (editar). No campo "Versão", abra a lista e escolha "Nova versão". Clique em Implantar.
7. Abra numa aba nova:
   https://script.google.com/macros/s/AKfycbxlA0277UygyAC-J9mQM9jny06lLwTe-iT6ahu8-Yql6FXysH7OuYmCvl895wx6Hwjt6g/exec
   O texto precisa ser exatamente: Moagem Atílio: serviço ativo (versão 4).
   Se aparecer sem "(versão 4)", volte ao passo 5 e confira se editou a implantação certa e escolheu "Nova versão".

Não crie implantação nova, não arquive nada, não altere abas, células, tabelas, acionadores nem propriedades do script. Se o Google pedir autorização, pare e me peça para autorizar.
Ao terminar, responda só com o texto exato que apareceu no passo 7.
```
