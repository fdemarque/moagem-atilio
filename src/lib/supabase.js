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
      creditoTotalKg: 0,
      saldoTotalKg: 0, // mantido para compatibilidade
      estimativaSacas: 0,
      totalEntradasKg: 0,
      totalSaidasKg: 0,
      creditoNormal: 0,
      saldoNormal: 0,
      creditoPequena: 0,
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
        creditoTotalKg: 0,
        saldoTotalKg: 0,
        estimativaSacas: 0,
        totalEntradasKg: 0,
        totalSaidasKg: 0,
        creditoNormal: 0,
        saldoNormal: 0,
        creditoPequena: 0,
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
    const dataMov = mov.data_movimentacao;

    if (mov.tipo_movimentacao === 'IN') {
      clientesMap[nome].totalEntradasKg += peso;
      if (mov.tipo_sacaria === 'normal') {
        clientesMap[nome].totalInNormal += qtd;
        clientesMap[nome].creditoNormal -= qtd;
        clientesMap[nome].saldoNormal -= qtd;
      } else if (mov.tipo_sacaria === 'pequena') {
        clientesMap[nome].totalInPequena += qtd;
        clientesMap[nome].creditoPequena -= qtd;
        clientesMap[nome].saldoPequena -= qtd;
      }
    } else {
      // OUT (Saída de sacas abatendo peso do crédito)
      clientesMap[nome].totalSaidasKg += peso;
      if (mov.tipo_sacaria === 'normal') {
        clientesMap[nome].totalOutNormal += qtd;
        clientesMap[nome].creditoNormal += qtd;
        clientesMap[nome].saldoNormal += qtd;
      } else if (mov.tipo_sacaria === 'pequena') {
        clientesMap[nome].totalOutPequena += qtd;
        clientesMap[nome].creditoPequena += qtd;
        clientesMap[nome].saldoPequena += qtd;
      }
    }

    // Acumula crédito considerando a base de Outubro/2026 (validada pelo cliente)
    // e movimentações futuras a partir de Novembro/2026
    if (clientesMap[nome].inOutubro === undefined) {
      clientesMap[nome].inOutubro = 0;
      clientesMap[nome].outOutubro = 0;
      clientesMap[nome].inPos = 0;
      clientesMap[nome].outPos = 0;
      clientesMap[nome].inPre = 0;
      clientesMap[nome].outPre = 0;
    }

    if (dataMov && dataMov.startsWith('2026-10')) {
      if (mov.tipo_movimentacao === 'IN') clientesMap[nome].inOutubro += peso;
      else clientesMap[nome].outOutubro += peso;
    } else if (dataMov && dataMov > '2026-10-31') {
      if (mov.tipo_movimentacao === 'IN') clientesMap[nome].inPos += peso;
      else clientesMap[nome].outPos += peso;
    } else {
      if (mov.tipo_movimentacao === 'IN') clientesMap[nome].inPre += peso;
      else clientesMap[nome].outPre += peso;
    }
  });

  todosNomes.forEach(nome => {
    const c = clientesMap[nome];
    const temOutubroOuDepois = (c.inOutubro > 0 || c.outOutubro > 0 || c.inPos > 0 || c.outPos > 0);
    if (temOutubroOuDepois) {
      c.creditoTotalKg = (c.inOutubro - c.outOutubro) + (c.inPos - c.outPos);
    } else {
      c.creditoTotalKg = c.inPre - c.outPre;
    }
    c.saldoTotalKg = c.creditoTotalKg;
    c.estimativaSacas = Math.floor(c.creditoTotalKg / 50);
  });

  return Object.values(clientesMap).sort((a, b) => a.nome.localeCompare(b.nome));
}

/**
 * Obtém o crédito cumulativo total de um cliente
 * Reflete o crédito validado em Outubro/2026 acrescido de todas as movimentações futuras
 */
export async function obterCreditoTotalCliente(cliente) {
  const { data, error } = await supabase
    .from('movimentacoes_sacaria')
    .select('*')
    .eq('cliente', cliente.trim());

  if (error) {
    console.error('Erro ao obter crédito total do cliente:', error);
    throw error;
  }

  let inOutubro = 0, outOutubro = 0;
  let inPos = 0, outPos = 0;
  let inPre = 0, outPre = 0;
  let temOutubroOuDepois = false;

  (data || []).forEach(mov => {
    const peso = extrairPesoKg(mov);
    const dataMov = mov.data_movimentacao;

    if (dataMov && dataMov.startsWith('2026-10')) {
      temOutubroOuDepois = true;
      if (mov.tipo_movimentacao === 'IN') inOutubro += peso;
      else outOutubro += peso;
    } else if (dataMov && dataMov > '2026-10-31') {
      temOutubroOuDepois = true;
      if (mov.tipo_movimentacao === 'IN') inPos += peso;
      else outPos += peso;
    } else {
      if (mov.tipo_movimentacao === 'IN') inPre += peso;
      else outPre += peso;
    }
  });

  const creditoTotalKg = temOutubroOuDepois
    ? (inOutubro - outOutubro) + (inPos - outPos)
    : (inPre - outPre);

  const estimativaSacas = Math.floor(creditoTotalKg / 50);

  return {
    creditoTotalKg,
    saldoTotalKg: creditoTotalKg,
    estimativaSacas,
    totalMovimentacoes: (data || []).length
  };
}

// Alias para preservar compatibilidade com código existente
export const obterSaldoTotalCliente = obterCreditoTotalCliente;

/**
 * Busca movimentações de um cliente em um determinado mês e ano
 */
export async function buscarMovimentacoesMensais(cliente, mes, ano) {
  const dataInicio = `${ano}-${String(mes).padStart(2, '0')}-01`;
  const ultimoDia = new Date(ano, mes, 0).getDate();
  const dataFim = `${ano}-${String(mes).padStart(2, '0')}-${String(ultimoDia).padStart(2, '0')}`;

  const { data, error } = await supabase
    .from('movimentacoes_sacaria')
    .select('*')
    .eq('cliente', cliente.trim())
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

/**
 * Obtém todos os dados mensais com rollover automático para os próximos meses:
 * - Movimentações do mês selecionado
 * - Crédito anterior contínuo (virada automática do mês sem zerar a partir de Novembro/2026)
 * - Mês base validado: Outubro/2026
 */
export async function obterDadosMensaisCliente(cliente, mes, ano) {
  const dataInicio = `${ano}-${String(mes).padStart(2, '0')}-01`;
  const ultimoDia = new Date(ano, mes, 0).getDate();
  const dataFim = `${ano}-${String(mes).padStart(2, '0')}-${String(ultimoDia).padStart(2, '0')}`;

  // 1. Busca movimentações do mês selecionado
  const { data: movimentacoesMes, error: errMes } = await supabase
    .from('movimentacoes_sacaria')
    .select('*')
    .eq('cliente', cliente.trim())
    .gte('data_movimentacao', dataInicio)
    .lte('data_movimentacao', dataFim)
    .order('data_movimentacao', { ascending: false })
    .order('id', { ascending: false });

  if (errMes) {
    console.error('Erro ao buscar movimentações do mês:', errMes);
    throw errMes;
  }

  // 2. Rollover automático: a partir de Novembro/2026, herda o crédito contínuo
  let creditoAnteriorKg = 0;
  const ehMesFuturoOuNovo = (ano > 2026) || (ano === 2026 && mes > 10);

  if (ehMesFuturoOuNovo) {
    // Busca todas as movimentações desde Outubro/2026 até o início do mês corrente
    const { data: movsBase, error: errBase } = await supabase
      .from('movimentacoes_sacaria')
      .select('*')
      .eq('cliente', cliente.trim())
      .gte('data_movimentacao', '2026-10-01')
      .lt('data_movimentacao', dataInicio);

    if (errBase) {
      console.error('Erro ao calcular crédito acumulado anterior:', errBase);
      throw errBase;
    }

    (movsBase || []).forEach(m => {
      const peso = extrairPesoKg(m);
      if (m.tipo_movimentacao === 'IN') {
        creditoAnteriorKg += peso;
      } else {
        creditoAnteriorKg -= peso;
      }
    });
  }

  return {
    movimentacoes: movimentacoesMes || [],
    creditoAnteriorKg,
    temRollover: ehMesFuturoOuNovo
  };
}
