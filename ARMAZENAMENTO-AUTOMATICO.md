# Armazenamento automático e arquivamento — próxima etapa

Este documento registra a arquitetura escolhida em 13/10/2026. O backend descrito abaixo ainda precisa ser implementado e configurado; não existe sincronização externa ativa nesta branch. O código atual continua preservando o IndexedDB e os backups locais. As ferramentas técnicas saíram da abertura e ficam em Configurações → Manutenção. O pedido de armazenamento persistente permanece automático.

## Decisões confirmadas pelo usuário

- Persistir documentos JSON privados na Vercel, sem banco SQL/NoSQL.
- Sincronizar automaticamente ao voltar a ter internet, mantendo funcionamento offline.
- Arquivar movimentos antigos a cada seis meses sem perder créditos ou histórico.
- Usar uma conta Google separada para o moinho, com uma pasta exclusiva para o aplicativo e cópias consultáveis em planilhas.
- Continuar nesta branch. Publicação e merge permanecem pendentes da validação.

## Vercel

Usar Vercel Blob privado, acessado por funções autenticadas do aplicativo. Arquivos gravados dentro do código publicado ou no disco temporário de uma função não são persistência. As credenciais de Blob ficam exclusivamente no servidor. O acesso do aparelho precisa ser autorizado e lembrado, para evitar login repetitivo e impedir que terceiros leiam ou alterem o estoque.

A API lê a versão atual, valida o documento recebido, mescla por UUID/timestamp e escreve com a pré-condição ETag `ifMatch`. Ao detectar outra gravação simultânea, relê e repete o merge. A criação inicial usa `ifNoneMatch: '*'`. O cliente só confirma a sincronização após receber a gravação consolidada. Respostas de dados não entram no cache de assets do service worker.

Movimentos registrados offline ficam numa fila persistente. Ao reconectar, o app envia os registros pendentes sem substituir lançamentos de outro aparelho. A sincronização deve ler o estado mais recente do IndexedDB antes de aplicar a resposta, evitando perder uma gravação local feita enquanto a requisição estava em andamento.

Estados possíveis na interface: “Salvo”, “Salvo neste aparelho — aguardando internet” e “Não foi possível enviar a cópia”. Não exibir JSON, importação, exportação ou permissões de armazenamento como tarefas diárias do usuário.

## Arquivamento semestral

Uma tarefa da própria aplicação na Vercel verifica quando completam seis meses desde o último arquivamento bem-sucedido. A rotina deve:

1. Fazer snapshot completo anterior à mudança, privado e identificado por UUID e data.
2. Separar meses encerrados antigos em arquivos JSON imutáveis. Guardar movimentações completas, IDs, datas, documentos, versões e exclusões.
3. Criar balanços de abertura por cliente e módulo, com o mês de referência. Preservar a base validada do milho em outubro/2026, sem somar créditos históricos já desconsiderados pela regra atual. Sacarias e soja transferem quantidades em unidades.
4. Gravar o arquivo histórico na Vercel e sua cópia JSON no Drive. Conferir leitura, contagem e checksum de ambas as cópias.
5. Atualizar o manifesto e o documento ativo mediante escrita condicional. Só então retirar os movimentos arquivados do documento ativo. Uma falha anterior deixa o estado ativo intacto.
6. Manter todos os arquivos históricos permanentes. Ao escolher um mês antigo, carregar e consultar o arquivo correspondente. Se for necessário consultar históricos offline, garantir o download local desses arquivos antes da limpeza local.

O merge precisa reconhecer UUIDs já arquivados. Um aparelho que ficou meses offline não pode reintroduzir os mesmos registros como novos nem perder seus lançamentos pendentes. Uma edição de movimento arquivado deve atualizar sua versão e recalcular os créditos afetados. Tombstones devem permanecer disponíveis à sincronização; não eliminá-los arbitrariamente por idade.

A limpeza de snapshots redundantes é separada do arquivamento de movimentos: conservar o estado atual, snapshots recentes e os arquivos históricos verificados. Não apagar histórico permanente nem a única cópia recuperável. Qualquer política de retenção de snapshots deve ser explícita e testada.

## Google Drive e planilhas

O usuário cria a conta Google separada e configura/autoriz­a a aplicação nessa conta. A conexão Google disponível ao Codex não é uma credencial de execução para o PWA. Nenhuma senha ou token deve ir ao GitHub, bundle do navegador ou conversa.

Na conta dedicada, a pasta `Moagem Atílio` terá:

- Backups JSON completos, para recuperação exata, incluindo metadados, UUIDs, versões e comprovantes.
- Arquivos históricos JSON por período, mantidos permanentemente.
- Google Sheets de consulta, com abas de clientes, milho, sacarias, soja e balanços. Colunas explícitas incluem UUID, cliente, data, operação, quantidade, unidade, versão e estado de exclusão.

Planilhas são cópias para leitura humana. O JSON é a cópia de recuperação, pois planilhas isoladas não representam todos os metadados e fotos. Textos provenientes de clientes devem ser escritos como valores literais (`RAW`), evitando interpretação como fórmulas.

Autorização de Google deve ocorrer no servidor com permissão restrita aos arquivos da aplicação. Para uma conta Google pessoal dedicada, preparar OAuth e renovação dos tokens; não presumir que uma conta de serviço consegue armazenar arquivos no Drive pessoal sem configuração apropriada. Confirmar a estabilidade da autorização para operação automática antes de ativar a rotina semestral.

## Validação obrigatória da próxima etapa

- Duas gravações simultâneas em aparelhos diferentes preservam ambas.
- Sincronização interrompida pode ser repetida sem duplicação.
- Dispositivo offline durante o arquivamento reencontra seus registros e envia lançamentos novos.
- Créditos de cada cliente/módulo são iguais antes e depois do arquivamento.
- Histórico anterior continua consultável e gera PDF.
- Falha do Drive, Blob ou validação impede retirar movimentos do estado ativo.
- Retenção nunca remove a única cópia de um período.
- Endpoints de sincronização e agendamento rejeitam acesso sem autorização.
- Nenhum dado real está incluído em assets públicos.

## Referências

- Vercel Blob privado: https://vercel.com/docs/vercel-blob/private-storage
- Escritas condicionais do SDK: https://vercel.com/docs/vercel-blob/using-blob-sdk
- Tarefas agendadas do aplicativo: https://vercel.com/docs/cron-jobs
- Autorização de Drive: https://developers.google.com/workspace/drive/api/guides/api-specific-auth
- Escrita de valores no Sheets: https://developers.google.com/workspace/sheets/api/reference/rest/v4/spreadsheets.values/update
