import React, { useState, useEffect } from 'react';
import { 
  UserPlus, 
  Search, 
  ChevronRight, 
  RefreshCw, 
  Users, 
  Layers,
  ArrowDownLeft,
  ArrowUpRight,
  Package
} from 'lucide-react';
import { buscarClientesComResumo } from '../lib/supabase';
import NovoClienteModal from '../components/NovoClienteModal';

export default function Clientes({ onSelectCliente, onNovoClienteComMovimentacao }) {
  const [clientes, setClientes] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [termoBusca, setTermoBusca] = useState('');
  const [modalNovoClienteAberto, setModalNovoClienteAberto] = useState(false);
  const [erro, setErro] = useState('');

  const carregarClientes = async () => {
    setCarregando(true);
    setErro('');
    try {
      const lista = await buscarClientesComResumo();
      setClientes(lista);
    } catch (err) {
      console.error('Erro ao listar clientes:', err);
      setErro('Não foi possível carregar a lista de clientes. Verifique a conexão com o Supabase.');
    } finally {
      setCarregando(false);
    }
  };

  useEffect(() => {
    carregarClientes();
  }, []);

  const clientesFiltrados = clientes.filter(c => 
    c.nome.toLowerCase().includes(termoBusca.toLowerCase().trim())
  );

  const handleConfirmarNovoCliente = (nomeCliente) => {
    setModalNovoClienteAberto(false);
    // Direciona imediatamente para o formulário de movimentação do novo cliente
    onNovoClienteComMovimentacao(nomeCliente);
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-4 pb-safe space-y-4">
      
      {/* Barra de Ações Principais: Botão Novo Cliente em Destaque */}
      <div className="pt-2">
        <button
          onClick={() => setModalNovoClienteAberto(true)}
          className="w-full h-16 rounded-2xl bg-green-600 hover:bg-green-500 text-white font-black text-lg flex items-center justify-center gap-3 shadow-xl shadow-green-950/60 touch-btn border-2 border-green-400/30"
        >
          <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center">
            <UserPlus className="w-5 h-5 text-white" />
          </div>
          <span>+ NOVO CLIENTE</span>
        </button>
      </div>

      {/* Busca Rápida de Clientes */}
      <div className="relative">
        <input
          type="text"
          value={termoBusca}
          onChange={(e) => setTermoBusca(e.target.value)}
          placeholder="Buscar cliente por nome..."
          className="w-full h-13 pl-12 pr-10 rounded-2xl bg-slate-800/90 border border-slate-700 text-base font-semibold text-white placeholder-slate-400 focus:outline-none focus:border-green-500 focus:ring-2 focus:ring-green-500/20"
        />
        <Search className="w-5 h-5 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" />
        {termoBusca && (
          <button
            onClick={() => setTermoBusca('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400 hover:text-white px-2 py-1 rounded-md bg-slate-700"
          >
            Limpar
          </button>
        )}
      </div>

      {/* Título da Seção e Contador */}
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-2">
          <Users className="w-4 h-4 text-green-400" />
          <h2 className="text-xs font-black uppercase tracking-wider text-slate-400">
            Clientes em Estoque ({clientesFiltrados.length})
          </h2>
        </div>
        <button
          onClick={carregarClientes}
          disabled={carregando}
          className="p-1.5 rounded-lg text-slate-400 hover:text-white touch-btn flex items-center gap-1 text-xs"
          title="Atualizar lista"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${carregando ? 'animate-spin text-green-400' : ''}`} />
          <span>Atualizar</span>
        </button>
      </div>

      {/* Mensagem de Erro se houver */}
      {erro && (
        <div className="p-4 rounded-2xl bg-red-950/80 border border-red-800 text-red-200 text-sm font-semibold">
          {erro}
        </div>
      )}

      {/* Lista de Cards de Clientes */}
      {carregando && clientes.length === 0 ? (
        <div className="space-y-3">
          {[1, 2, 3].map(n => (
            <div key={n} className="h-28 rounded-2xl bg-slate-800/50 animate-pulse border border-slate-800" />
          ))}
        </div>
      ) : clientesFiltrados.length === 0 ? (
        <div className="text-center py-12 px-4 bg-slate-900/60 border border-dashed border-slate-800 rounded-3xl space-y-3">
          <div className="w-16 h-16 mx-auto rounded-2xl bg-slate-800 flex items-center justify-center text-slate-500">
            <Package className="w-8 h-8" />
          </div>
          <h3 className="text-base font-bold text-white">
            {termoBusca ? 'Nenhum cliente encontrado' : 'Nenhum cliente cadastrado ainda'}
          </h3>
          <p className="text-xs text-slate-400 max-w-xs mx-auto">
            {termoBusca 
              ? `Nenhum resultado para "${termoBusca}". Verifique a digitação.` 
              : 'Clique no botão verde acima para cadastrar o primeiro cliente e registrar sacarias.'
            }
          </p>
          {!termoBusca && (
            <button
              onClick={() => setModalNovoClienteAberto(true)}
              className="mt-2 inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-green-600 text-white font-bold text-sm touch-btn"
            >
              <UserPlus className="w-4 h-4" />
              <span>Cadastrar Primeiro Cliente</span>
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {clientesFiltrados.map((cli) => {
            const saldoNormal = cli.saldoNormal || 0;
            const saldoPequena = cli.saldoPequena || 0;
            const totalEmPosse = saldoNormal + saldoPequena;

            return (
              <div
                key={cli.nome}
                onClick={() => onSelectCliente(cli.nome)}
                className="group relative bg-slate-900 hover:bg-slate-800/90 active:bg-slate-800 border-2 border-slate-800 hover:border-slate-700 rounded-2xl p-4 transition-all shadow-md touch-btn cursor-pointer"
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1 pr-3">
                    <h3 className="text-lg font-black text-white group-hover:text-green-400 transition-colors">
                      {cli.nome}
                    </h3>
                    <p className="text-xs text-slate-400 mt-0.5">
                      {cli.totalMovimentacoes} {cli.totalMovimentacoes === 1 ? 'movimentação' : 'movimentações'} registradas
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <div className="w-9 h-9 rounded-xl bg-slate-800 flex items-center justify-center text-slate-400 group-hover:text-white group-hover:bg-green-600 transition-all">
                      <ChevronRight className="w-5 h-5" />
                    </div>
                  </div>
                </div>

                {/* Balanço Rápido de Sacarias no Cartão */}
                <div className="mt-3 pt-3 border-t border-slate-800/80 grid grid-cols-2 gap-2">
                  <div className="bg-slate-950/70 px-3 py-2 rounded-xl border border-slate-800/70">
                    <span className="block text-[11px] font-bold text-slate-400 uppercase">
                      Sacaria Normal
                    </span>
                    <span className={`text-base font-black ${saldoNormal > 0 ? 'text-amber-400' : 'text-slate-300'}`}>
                      {saldoNormal} <span className="text-xs font-semibold text-slate-500">em posse</span>
                    </span>
                  </div>

                  <div className="bg-slate-950/70 px-3 py-2 rounded-xl border border-slate-800/70">
                    <span className="block text-[11px] font-bold text-slate-400 uppercase">
                      Sacaria Pequena
                    </span>
                    <span className={`text-base font-black ${saldoPequena > 0 ? 'text-amber-400' : 'text-slate-300'}`}>
                      {saldoPequena} <span className="text-xs font-semibold text-slate-500">em posse</span>
                    </span>
                  </div>
                </div>

              </div>
            );
          })}
        </div>
      )}

      {/* Modal de Novo Cliente */}
      <NovoClienteModal
        isOpen={modalNovoClienteAberto}
        onClose={() => setModalNovoClienteAberto(false)}
        onConfirm={handleConfirmarNovoCliente}
      />

    </div>
  );
}
