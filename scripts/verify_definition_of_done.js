import { 
  autenticarUsuario, 
  registrarMovimentacao, 
  buscarClientesComResumo, 
  buscarMovimentacoesMensais,
  uploadComprovante,
  supabase 
} from '../src/lib/supabase.js';

async function rodarDefinicaoDePronto() {
  console.log('===============================================================');
  console.log('VALIDAÇÃO DA DEFINIÇÃO DE PRONTO (MOAGEM ATÍLIO - SUPABASE)');
  console.log('===============================================================\n');

  // 1. TESTE DE AUTENTICAÇÃO
  console.log('1. TESTANDO AUTENTICAÇÃO...');
  const authCorreta = await autenticarUsuario('pai', '#Atilio1975!');
  if (!authCorreta.success) {
    throw new Error('Falha no login com credenciais corretas: ' + authCorreta.error);
  }
  console.log('  ✅ Login com sucesso para usuário:', authCorreta.data.usuario);

  const authInvalida = await autenticarUsuario('pai', 'senha_falsa_123');
  if (authInvalida.success) {
    throw new Error('Erro de segurança: autenticação aceitou senha incorreta!');
  }
  console.log('  ✅ Login com senha incorreta foi bloqueado com sucesso.');

  // 2. CADASTRO DE NOVO CLIENTE COM MOVIMENTAÇÃO DE SAÍDA [OUT]
  const clienteTeste = `Cliente Operacao Real ${Date.now()}`;
  console.log(`\n2. CADASTRANDO CLIENTE E REGISTRANDO SAÍDA [OUT] (${clienteTeste})...`);
  
  const movOut = await registrarMovimentacao({
    cliente: clienteTeste,
    tipo_movimentacao: 'OUT',
    tipo_sacaria: 'normal',
    quantidade: 120,
    data_movimentacao: '2026-09-12',
    documentos: ['https://mnnjxbqyeuedisibwcjc.supabase.co/storage/v1/object/public/comprovantes/testes/saida_comprovante.jpg']
  });
  console.log('  ✅ Saída [OUT] cadastrada no Supabase com ID:', movOut[0].id, 'Quantidade:', movOut[0].quantidade, 'Sacas');

  // 3. REGISTRO DE MOVIMENTAÇÃO DE ENTRADA [IN]
  console.log(`\n3. REGISTRANDO ENTRADA [IN] PARA O MESMO CLIENTE...`);
  const movIn = await registrarMovimentacao({
    cliente: clienteTeste,
    tipo_movimentacao: 'IN',
    tipo_sacaria: 'normal',
    quantidade: 70,
    data_movimentacao: '2026-09-12',
    documentos: []
  });
  console.log('  ✅ Entrada [IN] cadastrada no Supabase com ID:', movIn[0].id, 'Quantidade:', movIn[0].quantidade, 'Sacas');

  // 4. REGISTRO DE SACARIA PEQUENA
  console.log(`\n4. REGISTRANDO SAÍDA [OUT] SACARIA PEQUENA...`);
  const movPequena = await registrarMovimentacao({
    cliente: clienteTeste,
    tipo_movimentacao: 'OUT',
    tipo_sacaria: 'pequena',
    quantidade: 45,
    data_movimentacao: '2026-09-12',
    documentos: []
  });
  console.log('  ✅ Saída [OUT] Sacaria Pequena cadastrada com ID:', movPequena[0].id);

  // 5. CONSULTA DE CLIENTES E CONSOLIDAÇÃO DE SALDO (TELA I)
  console.log('\n5. TESTANDO CONSULTA DINÂMICA DE CLIENTES E SALDOS...');
  const listaClientes = await buscarClientesComResumo();
  const clienteEncontrado = listaClientes.find(c => c.nome === clienteTeste);
  if (!clienteEncontrado) {
    throw new Error('Cliente recém cadastrado não foi encontrado na listagem!');
  }
  console.log('  ✅ Cliente encontrado na lista geral com:');
  console.log('     - Saldo Normal em posse (120 out - 70 in):', clienteEncontrado.saldoNormal, '(Esperado: 50)');
  console.log('     - Saldo Pequena em posse (45 out):', clienteEncontrado.saldoPequena, '(Esperado: 45)');
  console.log('     - Total de movimentações:', clienteEncontrado.totalMovimentacoes, '(Esperado: 3)');

  if (clienteEncontrado.saldoNormal !== 50 || clienteEncontrado.saldoPequena !== 45) {
    throw new Error('Cálculo de saldo incorreto na consolidação de clientes!');
  }

  // 6. CONSULTA DE MOVIMENTAÇÕES MENSAIS (TELA II)
  console.log('\n6. TESTANDO RELATÓRIO MENSAL DO CLIENTE (Mês 9/2026)...');
  const movsMes = await buscarMovimentacoesMensais(clienteTeste, 9, 2026);
  console.log(`  ✅ ${movsMes.length} movimentações retornadas para o cliente no mês 09/2026.`);
  if (movsMes.length !== 3) {
    throw new Error(`Esperado 3 movimentações no mês, obtido: ${movsMes.length}`);
  }

  console.log('\n===============================================================');
  console.log('🎉 DEFINIÇÃO DE PRONTO ATENDIDA COM 100% DE SUCESSO!');
  console.log('===============================================================');
}

rodarDefinicaoDePronto().catch(err => {
  console.error('\n❌ ERRO NA DEFINIÇÃO DE PRONTO:', err);
  process.exit(1);
});
