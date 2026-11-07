# Política de privacidade — Moagem Atílio

Atualizada em 14 de outubro de 2026.

O Moagem Atílio é um aplicativo de uso do moinho da família para registrar entradas e saídas de milho, sacarias vazias e soja. O responsável pelo aplicativo e pelo acesso aos registros pode ser contatado em **atiliomoinho@gmail.com**.

## Informações utilizadas

O aplicativo armazena nomes dos clientes, produto, datas, entradas e saídas, quantidades, pesos quando aplicáveis, créditos de estoque e fotografias de comprovantes anexadas pelo usuário. Também utiliza identificadores dos registros e datas de atualização para preservar e conciliar alterações feitas em aparelhos diferentes. Não é necessário informar CPF, dados bancários ou senha da conta Google.

## Onde os dados ficam

Os registros são salvos no próprio aparelho para permitir o funcionamento sem internet. Quando o aparelho é conectado pelo responsável, os registros são sincronizados com uma planilha Google Sheets privada na conta Google do responsável, por meio de um script dessa própria planilha (Google Apps Script). Fotos de comprovantes são guardadas como arquivos em uma pasta privada do Google Drive da mesma conta.

O Google processa a planilha e os arquivos para armazenamento e recuperação. A Vercel apenas hospeda o aplicativo e não recebe os registros. Os dados de estoque não são publicados junto com o código no GitHub.

## Permissão da conta Google

O responsável autoriza o aplicativo por meio da tela oficial do Google. É solicitada apenas a permissão `drive.file`, que permite criar e consultar ou atualizar os arquivos usados com o aplicativo. Não são solicitados acesso ao Gmail, agenda, contatos ou acesso geral a todos os arquivos do Drive.

O aplicativo confere o endereço da conta autorizada para que os backups sejam enviados à conta exclusiva do moinho. As credenciais de renovação ficam no servidor ou na configuração local privada durante a validação, fora do código público e do aplicativo entregue ao navegador. Elas são usadas somente para os backups autorizados. O aplicativo não recebe nem armazena a senha Google.

O uso das informações recebidas pelas APIs Google respeita a [Política de Dados do Usuário dos Serviços de API do Google](https://developers.google.com/terms/api-services-user-data-policy), incluindo os requisitos de uso limitado. Os dados não são vendidos, usados para publicidade ou enviados para treinamento de modelos de inteligência artificial.

## Acesso e proteção

O acesso à cópia remota depende da autorização do aparelho pelo responsável. As transferências remotas utilizam HTTPS, e os arquivos de estoque permanecem privados. A proteção do aparelho, de sua conta Google e do código de acesso também depende do responsável. O armazenamento persistente do navegador pode ser solicitado automaticamente, mas nenhum dispositivo ou serviço oferece garantia absoluta contra perda.

## Histórico e retenção

O arquivamento semestral separa movimentos antigos em arquivos históricos, preservando os registros e os saldos. Arquivar não significa apagar. Antes de retirar movimentos do documento ativo na nuvem, o aplicativo confere as cópias. O histórico continua disponível para consulta e relatórios e permanece no aparelho para uso offline. Cópias de segurança e versões anteriores são conservadas para recuperação; não há descarte automático de histórico permanente.

Uma rotina diária salva uma cópia da planilha na mesma conta Google. São mantidas as cópias dos últimos 60 dias e a do primeiro dia de cada mês.

Excluir um movimento no aplicativo altera o estoque e registra sua exclusão para impedir que uma sincronização antiga o recrie. Versões anteriores podem permanecer nos backups. Para remover dados também dos backups, ou solicitar correção, acesso ou exclusão completa, entre em contato com o responsável, que verificará os registros afetados e as necessidades de conservação aplicáveis.

## Revogação e dúvidas

O responsável pode revogar a autorização do script na página de [conexões da Conta Google](https://myaccount.google.com/connections) ou trocar o código de conexão. Isso interrompe a sincronização; não apaga a planilha nem os registros locais. Para encerrar o uso e remover cópias existentes, contate **atiliomoinho@gmail.com**.

Esta política será atualizada caso a forma de tratar os dados mude. A data da versão aparece no início do documento.
