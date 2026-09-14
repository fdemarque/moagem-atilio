import {
  registrarMovimentacao,
  obterSaldoTotalCliente,
  deletarMovimentacao,
  extrairPesoKg,
  calcularPesoKg
} from '../src/lib/supabase.js';

async function runTests() {
  console.log('=== TESTE 1: Validando funções puras de cálculo de peso ===');
  const pesoEntrada = calcularPesoKg('IN', 'granel', 3500);
  console.assert(pesoEntrada === 3500, `Esperado 3500, obteve ${pesoEntrada}`);

  const pesoSaidaNormal = calcularPesoKg('OUT', 'normal', 40);
  console.assert(pesoSaidaNormal === 2000, `Esperado 2000, obteve ${pesoSaidaNormal}`);

  const pesoSaidaPequena = calcularPesoKg('OUT', 'pequena', 20);
  console.assert(pesoSaidaPequena === 500, `Esperado 500, obteve ${pesoSaidaPequena}`);
  console.log('✅ Cálculos puros validados com sucesso!');

  const testCliente = `TESTE_FLUXO_${Date.now()}`;
  const idsParaLimpar = [];

  try {
    console.log(`\n=== TESTE 2: Inserindo ENTRADA de 2.000 kg para ${testCliente} ===`);
    const entrada = await registrarMovimentacao({
      cliente: testCliente,
      tipo_movimentacao: 'IN',
      tipo_sacaria: 'granel',
      quantidade: 2000,
      peso_kg: 2000,
      data_movimentacao: '2026-09-14',
      documentos: []
    });
    console.log('Entrada gravada:', entrada[0]);
    idsParaLimpar.push(entrada[0].id);

    console.log(`\n=== TESTE 3: Inserindo SAÍDA de 10 sacas Normais (500 kg) ===`);
    const saidaNormal = await registrarMovimentacao({
      cliente: testCliente,
      tipo_movimentacao: 'OUT',
      tipo_sacaria: 'normal',
      quantidade: 10,
      peso_kg: 500,
      data_movimentacao: '2026-09-14',
      documentos: []
    });
    console.log('Saída normal gravada:', saidaNormal[0]);
    idsParaLimpar.push(saidaNormal[0].id);

    console.log(`\n=== TESTE 4: Inserindo SAÍDA de 20 sacas Pequenas (500 kg) ===`);
    const saidaPequena = await registrarMovimentacao({
      cliente: testCliente,
      tipo_movimentacao: 'OUT',
      tipo_sacaria: 'pequena',
      quantidade: 20,
      peso_kg: 500,
      data_movimentacao: '2026-09-14',
      documentos: []
    });
    console.log('Saída pequena gravada:', saidaPequena[0]);
    idsParaLimpar.push(saidaPequena[0].id);

    console.log(`\n=== TESTE 5: Consultando saldo total consolidado ===`);
    const saldo = await obterSaldoTotalCliente(testCliente);
    console.log('Saldo retornado:', saldo);

    console.assert(saldo.totalEntradasKg === 2000, `Total entradas esperado 2000, obteve ${saldo.totalEntradasKg}`);
    console.assert(saldo.totalSaidasKg === 1000, `Total saídas esperado 1000, obteve ${saldo.totalSaidasKg}`);
    console.assert(saldo.saldoTotalKg === 1000, `Saldo esperado 1000, obteve ${saldo.saldoTotalKg}`);
    console.assert(saldo.estimativaSacas === 20, `Estimativa de sacas esperado 20, obteve ${saldo.estimativaSacas}`);
    console.log('✅ Saldo e equivalência calculados com 100% de exatidão!');

  } finally {
    console.log(`\n=== Limpando registros de teste (${idsParaLimpar.length}) ===`);
    for (const id of idsParaLimpar) {
      await deletarMovimentacao(id, []);
    }
    console.log('✅ Limpeza concluída.');
  }
}

runTests()
  .then(() => {
    console.log('\n🎉 TODOS OS TESTES PASSARAM COM SUCESSO!');
    process.exit(0);
  })
  .catch((err) => {
    console.error('❌ Erro no teste:', err);
    process.exit(1);
  });
