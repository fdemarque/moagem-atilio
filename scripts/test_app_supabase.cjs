const { createClient } = require('@supabase/supabase-js');

const sb = createClient(
  'https://mnnjxbqyeuedisibwcjc.supabase.co',
  'sb_publishable_7sDiKC9uh4Bl7v33vovDVg_ehGFMSPT'
);

async function testAll() {
  console.log('=== TESTE 1: Autenticar atilio com #Atilio1975! ===');
  const { data: user, error: errUser } = await sb
    .from('usuarios')
    .select('*')
    .ilike('usuario', 'atilio')
    .eq('senha', '#Atilio1975!')
    .maybeSingle();
  console.log('Resultado login atilio:', user, 'Erro:', errUser);

  console.log('=== TESTE 2: Inserir Movimentação ===');
  const { data: movData, error: errMov } = await sb
    .from('movimentacoes_sacaria')
    .insert([
      {
        cliente: 'CLIENTE TESTE',
        tipo_movimentacao: 'OUT',
        tipo_sacaria: 'normal',
        quantidade: 25,
        data_movimentacao: '2026-09-12',
        documentos: []
      }
    ])
    .select();
  console.log('Resultado insert movimentação:', movData, 'Erro:', errMov);

  if (movData && movData[0]) {
    const id = movData[0].id;
    console.log('=== TESTE 3: Buscar Movimentação Inserida ===');
    const { data: buscaMov } = await sb
      .from('movimentacoes_sacaria')
      .select('*')
      .eq('id', id);
    console.log('Busca por ID:', buscaMov);

    console.log('=== TESTE 4: Deletar Movimentação de Teste ===');
    const { error: errDel } = await sb
      .from('movimentacoes_sacaria')
      .delete()
      .eq('id', id);
    console.log('Deletado com sucesso? Erro:', errDel);
  }

  console.log('=== TESTE 5: Tabela Clientes ===');
  const { data: cliData, error: errCli } = await sb
    .from('clientes')
    .select('*');
  console.log('Clientes:', cliData, 'Erro:', errCli);
}

testAll().catch(console.error);
