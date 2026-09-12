import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

// Carrega .env manualmente
const envFile = fs.readFileSync('.env', 'utf-8');
const env = {};
envFile.split('\n').forEach(line => {
  const [key, ...val] = line.split('=');
  if (key && val) {
    env[key.trim()] = val.join('=').trim().replace(/^\[|\]$/g, '');
  }
});

const supabaseUrl = env['VITE_SUPABASE_URL'];
const supabaseKey = env['VITE_SUPABASE_ANON_KEY'];

console.log('Testando conexão com Supabase...');
console.log('URL:', supabaseUrl);
console.log('Key iniciada com:', supabaseKey.substring(0, 15) + '...');

const supabase = createClient(supabaseUrl, supabaseKey);

async function testarTudo() {
  console.log('\n--- 1. Testando tabela `usuarios` ---');
  const { data: usuarios, error: errUsuarios } = await supabase
    .from('usuarios')
    .select('*');

  if (errUsuarios) {
    console.error('❌ Erro ao consultar tabela `usuarios`:', errUsuarios.message, errUsuarios.details, errUsuarios.hint);
  } else {
    console.log('✅ Sucesso! Usuários encontrados:', usuarios);
  }

  console.log('\n--- 2. Testando tabela `movimentacoes_sacaria` ---');
  const { data: movs, error: errMovs } = await supabase
    .from('movimentacoes_sacaria')
    .select('*')
    .limit(5);

  if (errMovs) {
    console.error('❌ Erro ao consultar `movimentacoes_sacaria`:', errMovs.message, errMovs.details, errMovs.hint);
  } else {
    console.log('✅ Sucesso! Movimentações encontradas:', movs);
  }

  console.log('\n--- 3. Testando Storage bucket `comprovantes` ---');
  const { data: buckets, error: errBuckets } = await supabase.storage.listBuckets();
  if (errBuckets) {
    console.error('❌ Erro ao listar buckets:', errBuckets.message);
  } else {
    console.log('✅ Buckets disponíveis:', buckets.map(b => b.name));
    const existeComprovantes = buckets.some(b => b.name === 'comprovantes');
    console.log('Bucket `comprovantes` existe?', existeComprovantes ? 'SIM' : 'NÃO');
  }

  console.log('\n--- 4. Testando inserção de movimentação (Entrada e Saída) ---');
  const testeCliente = 'Cliente Teste Automatizado';
  
  // Teste SAÍDA
  const { data: insOut, error: errOut } = await supabase
    .from('movimentacoes_sacaria')
    .insert([
      {
        cliente: testeCliente,
        tipo_movimentacao: 'OUT',
        tipo_sacaria: 'normal',
        quantidade: 15,
        data_movimentacao: new Date().toISOString().split('T')[0],
        documentos: ['https://exemplo.com/teste_out.jpg']
      }
    ])
    .select();

  if (errOut) {
    console.error('❌ Erro ao inserir SAÍDA:', errOut.message, errOut.details);
  } else {
    console.log('✅ SAÍDA inserida com sucesso:', insOut);
  }

  // Teste ENTRADA
  const { data: insIn, error: errIn } = await supabase
    .from('movimentacoes_sacaria')
    .insert([
      {
        cliente: testeCliente,
        tipo_movimentacao: 'IN',
        tipo_sacaria: 'normal',
        quantidade: 10,
        data_movimentacao: new Date().toISOString().split('T')[0],
        documentos: []
      }
    ])
    .select();

  if (errIn) {
    console.error('❌ Erro ao inserir ENTRADA:', errIn.message, errIn.details);
  } else {
    console.log('✅ ENTRADA inserida com sucesso:', insIn);
  }

  // Consulta saldo do cliente teste
  const { data: movsCliente, error: errMovsCli } = await supabase
    .from('movimentacoes_sacaria')
    .select('*')
    .eq('cliente', testeCliente);

  if (errMovsCli) {
    console.error('❌ Erro ao consultar cliente teste:', errMovsCli.message);
  } else {
    console.log(`✅ Movimentações totais para ${testeCliente}:`, movsCliente.length);
  }
}

testarTudo();
