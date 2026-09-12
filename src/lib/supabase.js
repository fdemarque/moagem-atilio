import { createClient } from '@supabase/supabase-js';

const supabaseUrl = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_SUPABASE_URL) || 
  (typeof process !== 'undefined' && process.env?.VITE_SUPABASE_URL) || 
  'https://mnnjxbqyeuedisibwcjc.supabase.co';

const supabaseAnonKey = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_SUPABASE_ANON_KEY) || 
  (typeof process !== 'undefined' && process.env?.VITE_SUPABASE_ANON_KEY) || 
  'sb_publishable_7sDiKC9uh4Bl7v33vovDVg_ehGFMSPT';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

/**
 * Autentica usuário buscando diretamente na tabela usuarios (sem hash)
 */
export async function autenticarUsuario(usuario, senha) {
  try {
    const { data, error } = await supabase
      .from('usuarios')
      .select('*')
      .eq('usuario', usuario.trim())
      .eq('senha', senha.trim())
      .maybeSingle();

    if (error) {
      console.error('Erro na consulta de usuário:', error);
      return { success: false, error: 'Erro de conexão com o banco de dados. Verifique se o script SQL foi executado.' };
    }

    if (!data) {
      return { success: false, error: 'Usuário ou senha inválidos.' };
    }

    return { success: true, data };
  } catch (err) {
    console.error('Exceção ao autenticar:', err);
    return { success: false, error: 'Falha inesperada ao tentar autenticar.' };
  }
}

/**
 * Faz upload de um arquivo para o bucket comprovantes e retorna a URL pública
 */
export async function uploadComprovante(file) {
  try {
    const fileExt = file.name.split('.').pop();
    const cleanFileName = file.name.replace(/[^a-zA-Z0-9]/g, '_');
    const fileName = `${Date.now()}_${Math.random().toString(36).substring(2, 7)}_${cleanFileName}.${fileExt}`;
    const filePath = `movimentacoes/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from('comprovantes')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false
      });

    if (uploadError) {
      console.error('Erro no upload para o Storage:', uploadError);
      throw new Error(`Falha no upload do arquivo ${file.name}. Verifique se o bucket 'comprovantes' foi criado.`);
    }

    const { data: publicUrlData } = supabase.storage
      .from('comprovantes')
      .getPublicUrl(filePath);

    return publicUrlData.publicUrl;
  } catch (err) {
    console.error('Exceção ao fazer upload:', err);
    throw err;
  }
}

/**
 * Salva uma nova movimentação de sacaria
 */
export async function registrarMovimentacao({ cliente, tipo_movimentacao, tipo_sacaria, quantidade, data_movimentacao, documentos }) {
  const { data, error } = await supabase
    .from('movimentacoes_sacaria')
    .insert([
      {
        cliente: cliente.trim(),
        tipo_movimentacao,
        tipo_sacaria,
        quantidade: parseInt(quantidade, 10),
        data_movimentacao,
        documentos: documentos || []
      }
    ])
    .select();

  if (error) {
    console.error('Erro ao salvar movimentação:', error);
    throw error;
  }

  return data;
}

/**
 * Busca todos os clientes distintos e consolida saldo de sacarias
 */
export async function buscarClientesComResumo() {
  const { data, error } = await supabase
    .from('movimentacoes_sacaria')
    .select('*')
    .order('data_movimentacao', { ascending: false });

  if (error) {
    console.error('Erro ao buscar movimentações dos clientes:', error);
    throw error;
  }

  const clientesMap = {};

  (data || []).forEach(mov => {
    const nome = mov.cliente;
    if (!clientesMap[nome]) {
      clientesMap[nome] = {
        nome,
        totalMovimentacoes: 0,
        ultimaMovimentacao: mov.data_movimentacao,
        saldoNormal: 0,
        saldoPequena: 0,
        totalInNormal: 0,
        totalOutNormal: 0,
        totalInPequena: 0,
        totalOutPequena: 0,
      };
    }

    clientesMap[nome].totalMovimentacoes += 1;
    const qtd = mov.quantidade || 0;

    if (mov.tipo_sacaria === 'normal') {
      if (mov.tipo_movimentacao === 'OUT') {
        clientesMap[nome].totalOutNormal += qtd;
        clientesMap[nome].saldoNormal += qtd; // Sacarias enviadas ao cliente
      } else {
        clientesMap[nome].totalInNormal += qtd;
        clientesMap[nome].saldoNormal -= qtd; // Sacarias devolvidas pelo cliente
      }
    } else if (mov.tipo_sacaria === 'pequena') {
      if (mov.tipo_movimentacao === 'OUT') {
        clientesMap[nome].totalOutPequena += qtd;
        clientesMap[nome].saldoPequena += qtd;
      } else {
        clientesMap[nome].totalInPequena += qtd;
        clientesMap[nome].saldoPequena -= qtd;
      }
    }
  });

  return Object.values(clientesMap).sort((a, b) => a.nome.localeCompare(b.nome));
}

/**
 * Busca movimentações de um cliente em um determinado mês e ano
 */
export async function buscarMovimentacoesMensais(cliente, mes, ano) {
  // Gera datas limites do mês selecionado
  const dataInicio = `${ano}-${String(mes).padStart(2, '0')}-01`;
  const ultimoDia = new Date(ano, mes, 0).getDate();
  const dataFim = `${ano}-${String(mes).padStart(2, '0')}-${String(ultimoDia).padStart(2, '0')}`;

  const { data, error } = await supabase
    .from('movimentacoes_sacaria')
    .select('*')
    .eq('cliente', cliente)
    .gte('data_movimentacao', dataInicio)
    .lte('data_movimentacao', dataFim)
    .order('data_movimentacao', { ascending: false })
    .order('id', { ascending: false });

  if (error) {
    console.error('Erro ao buscar movimentações mensais:', error);
    throw error;
  }

  return data || [];
}
