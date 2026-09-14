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
    const usuarioLimpo = usuario?.trim() || '';
    const senhaLimpa = senha?.trim() || '';

    if (!usuarioLimpo || !senhaLimpa) {
      return { success: false, error: 'Informe o usuário e a senha.' };
    }

    const { data, error } = await supabase
      .from('usuarios')
      .select('*')
      .ilike('usuario', usuarioLimpo)
      .eq('senha', senhaLimpa)
      .maybeSingle();

    if (error) {
      console.error('Erro na consulta de usuário:', error);
      // Contingência caso haja falha temporária de rede
      if (
        (usuarioLimpo.toLowerCase() === 'atilio' || usuarioLimpo.toLowerCase() === 'pai' || usuarioLimpo.toLowerCase() === 'backup') &&
        senhaLimpa === '#Atilio1975!'
      ) {
        return { success: true, data: { id: 1, usuario: usuarioLimpo.toLowerCase() } };
      }
      return { success: false, error: 'Erro de conexão com o banco de dados. Tente novamente.' };
    }

    if (!data) {
      return { success: false, error: 'Usuário ou senha inválidos.' };
    }

    return { success: true, data };
  } catch (err) {
    console.error('Exceção ao autenticar:', err);
    const usuarioLimpo = usuario?.trim()?.toLowerCase();
    const senhaLimpa = senha?.trim();
    if (
      (usuarioLimpo === 'atilio' || usuarioLimpo === 'pai' || usuarioLimpo === 'backup') &&
      senhaLimpa === '#Atilio1975!'
    ) {
      return { success: true, data: { id: 1, usuario: usuarioLimpo } };
    }
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
 * Calcula o peso em quilos de acordo com a regra de negócio:
 * - IN (granel): peso é a própria quantidade informada em kg
 * - OUT (sacas): quantidade * (50kg se normal, 25kg se pequena)
 */
export function calcularPesoKg(tipo_movimentacao, tipo_sacaria, quantidade) {
  const qtd = parseInt(quantidade, 10) || 0;
  if (tipo_movimentacao === 'IN') {
    return qtd;
  }
  const pesoUnitario = tipo_sacaria === 'pequena' ? 25 : 50;
  return qtd * pesoUnitario;
}

/**
 * Extrai o peso_kg de uma movimentação com suporte a registros legados
 */
export function extrairPesoKg(mov) {
  if (!mov) return 0;
  if (mov.peso_kg !== null && mov.peso_kg !== undefined && Number(mov.peso_kg) > 0) {
    return Number(mov.peso_kg);
  }
  const qtd = parseInt(mov.quantidade, 10) || 0;
  if (mov.tipo_movimentacao === 'IN') {
    return qtd;
  }
  const pesoUnitario = mov.tipo_sacaria === 'pequena' ? 25 : 50;
  return qtd * pesoUnitario;
}

/**
 * Salva uma nova movimentação de sacaria / grãos a granel
 */
export async function registrarMovimentacao({ cliente, tipo_movimentacao, tipo_sacaria, quantidade, peso_kg, data_movimentacao, documentos }) {
  const qtdNum = parseInt(quantidade, 10) || 0;
  const sacariaFinal = tipo_movimentacao === 'IN' ? 'granel' : (tipo_sacaria || 'normal');
  const pesoFinal = (peso_kg !== undefined && peso_kg !== null && !isNaN(Number(peso_kg)))
    ? Number(peso_kg)
    : calcularPesoKg(tipo_movimentacao, sacariaFinal, qtdNum);

  const { data, error } = await supabase
    .from('movimentacoes_sacaria')
    .insert([
      {
        cliente: cliente.trim(),
        tipo_movimentacao,
        tipo_sacaria: sacariaFinal,
        quantidade: qtdNum,
        peso_kg: pesoFinal,
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
 * Atualiza uma movimentação existente
 */
export async function atualizarMovimentacao(id, { tipo_movimentacao, tipo_sacaria, quantidade, peso_kg, data_movimentacao, documentos }) {
  const qtdNum = parseInt(quantidade, 10) || 0;
  const sacariaFinal = tipo_movimentacao === 'IN' ? 'granel' : (tipo_sacaria || 'normal');
  const pesoFinal = (peso_kg !== undefined && peso_kg !== null && !isNaN(Number(peso_kg)))
    ? Number(peso_kg)
    : calcularPesoKg(tipo_movimentacao, sacariaFinal, qtdNum);

  const { data, error } = await supabase
    .from('movimentacoes_sacaria')
    .update({
      tipo_movimentacao,
      tipo_sacaria: sacariaFinal,
      quantidade: qtdNum,
      peso_kg: pesoFinal,
      data_movimentacao,
      documentos: documentos || []
    })
    .eq('id', id)
    .select();

  if (error) {
    console.error('Erro ao atualizar movimentação:', error);
    throw error;
  }

  return data;
}

/**
 * Exclui uma movimentação e opcionalmente remove seus comprovantes do storage
 */
export async function deletarMovimentacao(id, documentos = []) {
  if (Array.isArray(documentos) && documentos.length > 0) {
    try {
      const pathsParaRemover = documentos
        .map(url => {
          const match = url.match(/\/comprovantes\/(.+)$/);
          return match ? match[1] : null;
        })
        .filter(Boolean);

      if (pathsParaRemover.length > 0) {
        await supabase.storage.from('comprovantes').remove(pathsParaRemover);
      }
    } catch (storageErr) {
      console.warn('Erro ao limpar arquivos do storage (não impeditivo):', storageErr);
    }
  }

  const { error } = await supabase
    .from('movimentacoes_sacaria')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Erro ao excluir movimentação:', error);
    throw error;
  }

  return true;
}

const CLIENTES_STORAGE_KEY = 'moagem_clientes_cadastrados';

/**
 * Retorna lista de clientes cadastrados no armazenamento local
 */
export function obterClientesLocais() {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(CLIENTES_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    return [];
  }
}

/**
 * Salva um cliente no armazenamento local (garante disponibilidade e suporte offline)
 */
export function salvarClienteLocal(nome) {
  if (typeof window === 'undefined') return;
  try {
    const lista = obterClientesLocais();
    if (!lista.some(item => item.toLowerCase() === nome.toLowerCase())) {
      lista.push(nome);
      localStorage.setItem(CLIENTES_STORAGE_KEY, JSON.stringify(lista));
    }
  } catch (e) {
    console.warn('Erro ao salvar cliente localmente:', e);
  }
}

/**
 * Cadastra um novo cliente no sistema (sem exigir nenhuma movimentação prévia)
 */
export async function cadastrarCliente(nome) {
  const nomeLimpo = nome?.trim();
  if (!nomeLimpo) throw new Error('O nome do cliente é obrigatório.');

  // 1. Salva localmente de imediato
  salvarClienteLocal(nomeLimpo);

  // 2. Tenta persistir na tabela 'clientes' do Supabase se ela existir
  try {
    const { error } = await supabase
      .from('clientes')
      .insert([{ nome: nomeLimpo }]);
    if (error) {
      console.info('Aviso Supabase clientes (usando persistência híbrida):', error.message);
    }
  } catch (e) {
    console.info('Aviso conexão clientes:', e);
  }

  return { nome: nomeLimpo };
}

/**
 * Busca todos os clientes distintos (mesclando cadastros e movimentações) e consolida saldo de sacarias
 */
export async function buscarClientesComResumo() {
  // 1. Tenta buscar da tabela 'clientes' do Supabase
  let clientesDbNomes = [];
  try {
    const { data: dbClientes, error: dbError } = await supabase
      .from('clientes')
      .select('nome')
      .order('nome');
    if (!dbError && Array.isArray(dbClientes)) {
      clientesDbNomes = dbClientes.map(c => c.nome);
    }
  } catch (e) {
    // Tabela pode não existir ainda no banco
  }

  // 2. Busca nomes cadastrados localmente
  const clientesLocais = obterClientesLocais();

  // 3. Busca movimentações de sacaria
  const { data, error } = await supabase
    .from('movimentacoes_sacaria')
    .select('*')
    .order('data_movimentacao', { ascending: false });

  if (error) {
    console.error('Erro ao buscar movimentações dos clientes:', error);
    throw error;
  }

  const clientesMap = {};

  // Inicializa todos os clientes conhecidos (inclusive sem movimentações)
  const todosNomes = Array.from(new Set([
    ...clientesDbNomes,
    ...clientesLocais,
    ...(data || []).map(m => m.cliente)
  ])).filter(Boolean);

  todosNomes.forEach(nome => {
    clientesMap[nome] = {
      nome,
      totalMovimentacoes: 0,
      ultimaMovimentacao: null,
      saldoTotalKg: 0,
      estimativaSacas: 0,
      totalEntradasKg: 0,
      totalSaidasKg: 0,
      saldoNormal: 0,
      saldoPequena: 0,
      totalInNormal: 0,
      totalOutNormal: 0,
      totalInPequena: 0,
      totalOutPequena: 0,
    };
  });

  (data || []).forEach(mov => {
    const nome = mov.cliente;
    if (!clientesMap[nome]) {
      clientesMap[nome] = {
        nome,
        totalMovimentacoes: 0,
        ultimaMovimentacao: mov.data_movimentacao,
        saldoTotalKg: 0,
        estimativaSacas: 0,
        totalEntradasKg: 0,
        totalSaidasKg: 0,
        saldoNormal: 0,
        saldoPequena: 0,
        totalInNormal: 0,
        totalOutNormal: 0,
        totalInPequena: 0,
        totalOutPequena: 0,
      };
    }

    clientesMap[nome].totalMovimentacoes += 1;
    if (!clientesMap[nome].ultimaMovimentacao) {
      clientesMap[nome].ultimaMovimentacao = mov.data_movimentacao;
    }

    const peso = extrairPesoKg(mov);
    const qtd = mov.quantidade || 0;

    if (mov.tipo_movimentacao === 'IN') {
      clientesMap[nome].totalEntradasKg += peso;
      clientesMap[nome].saldoTotalKg += peso;
      if (mov.tipo_sacaria === 'normal') {
        clientesMap[nome].totalInNormal += qtd;
        clientesMap[nome].saldoNormal -= qtd;
      } else if (mov.tipo_sacaria === 'pequena') {
        clientesMap[nome].totalInPequena += qtd;
        clientesMap[nome].saldoPequena -= qtd;
      }
    } else {
      // OUT (Saída de sacas abatendo peso)
      clientesMap[nome].totalSaidasKg += peso;
      clientesMap[nome].saldoTotalKg -= peso;
      if (mov.tipo_sacaria === 'normal') {
        clientesMap[nome].totalOutNormal += qtd;
        clientesMap[nome].saldoNormal += qtd;
      } else if (mov.tipo_sacaria === 'pequena') {
        clientesMap[nome].totalOutPequena += qtd;
        clientesMap[nome].saldoPequena += qtd;
      }
    }

    clientesMap[nome].estimativaSacas = Math.floor(clientesMap[nome].saldoTotalKg / 50);
  });

  return Object.values(clientesMap).sort((a, b) => a.nome.localeCompare(b.nome));
}

/**
 * Obtém o saldo cumulativo total de um cliente (todas as movimentações)
 */
export async function obterSaldoTotalCliente(cliente) {
  const { data, error } = await supabase
    .from('movimentacoes_sacaria')
    .select('*')
    .eq('cliente', cliente.trim());

  if (error) {
    console.error('Erro ao obter saldo total do cliente:', error);
    throw error;
  }

  let totalEntradasKg = 0;
  let totalSaidasKg = 0;

  (data || []).forEach(mov => {
    const peso = extrairPesoKg(mov);
    if (mov.tipo_movimentacao === 'IN') {
      totalEntradasKg += peso;
    } else {
      totalSaidasKg += peso;
    }
  });

  const saldoTotalKg = totalEntradasKg - totalSaidasKg;
  const estimativaSacas = Math.floor(saldoTotalKg / 50);

  return {
    saldoTotalKg,
    estimativaSacas,
    totalEntradasKg,
    totalSaidasKg,
    totalMovimentacoes: (data || []).length
  };
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
