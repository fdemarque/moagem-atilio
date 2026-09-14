import React, { useState, useEffect } from 'react';
import { 
  UserPlus, 
  Search, 
  ChevronRight, 
  RefreshCw, 
  Users, 
  Package
} from 'lucide-react';
import { buscarClientesComResumo, cadastrarCliente } from '../lib/supabase';
import NovoClienteModal from '../components/NovoClienteModal';

export default function Clientes({ onSelectCliente, onNovoClienteCadastrado }) {
  const [clientes, setClientes] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [termoBusca, setTermoBusca] = useState('');
  const [modalNovoClienteAberto, setModalNovoClienteAberto] = useState(false);
  const [salvandoCliente, setSalvandoCliente] = useState(false);
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

  const handleConfirmarNovoCliente = async (nomeCliente) => {
    setSalvandoCliente(true);
    setErro('');
    try {
      await cadastrarCliente(nomeCliente);
      setModalNovoClienteAberto(false);
      await carregarClientes();
      if (onNovoClienteCadastrado) {
        onNovoClienteCadastrado(nomeCliente);
      } else if (onSelectCliente) {
        onSelectCliente(nomeCliente);
      }
    } catch (err) {
      console.error('Erro ao cadastrar cliente:', err);
      setErro('Não foi possível cadastrar o cliente. Tente novamente.');
    } finally {
      setSalvandoCliente(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-4 pb-safe space-y-4 bg-white text-black min-h-[calc(100vh-65px)]">
      
      {/* Botão Novo Cliente em Destaque Alto Contraste */}
      <div className="pt-1">
        <button
          onClick={() => setModalNovoClienteAberto(true)}
          className="w-full h-16 rounded-xl bg-emerald-700 hover:bg-emerald-800 active:bg-emerald-900 text-white font-black text-lg sm:text-xl flex items-center justify-center gap-3 shadow-md border-2 border-emerald-900 touch-btn transition-colors"
        >
          <div className="w-10 h-10 rounded-lg bg-emerald-900/60 flex items-center justify-center">
            <UserPlus className="w-6 h-6 text-white stroke-[2.5]" />
          </div>
          <span>+ NOVO CLIENTE</span>
        </button>
      </div>

      {/* Busca Rápida de Clientes (Fundo Branco, Borda Escura, Texto Preto) */}
      <div className="relative">
        <input
          type="text"
          value={termoBusca}
          onChange={(e) => setTermoBusca(e.target.value)}
          placeholder="Buscar cliente por nome..."
          className="w-full h-14 pl-12 pr-12 rounded-xl bg-white border-2 border-slate-400 focus:border-black text-base font-bold text-black placeholder-slate-500 focus:outline-none shadow-sm"
        />
        <Search className="w-6 h-6 text-slate-700 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none stroke-[2.5]" />
        {termoBusca && (
          <button
            onClick={() => setTermoBusca('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-black text-black px-3 py-1.5 rounded-lg bg-slate-200 hover:bg-slate-300 border border-slate-400"
          >
            Limpar
          </button>
        )}
      </div>

      {/* Título da Seção e Contador */}
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-2">
          <Users className="w-5 h-5 text-emerald-800 stroke-[2.5]" />
          <h2 className="text-xs font-black uppercase tracking-wider text-slate-900">
            Clientes em Estoque ({clientesFiltrados.length})
          </h2>
        </div>
        <button
          onClick={carregarClientes}
          disabled={carregando}
          className="p-2 rounded-lg bg-slate-100 hover:bg-slate-200 border border-slate-300 text-black touch-btn flex items-center gap-1.5 text-xs font-bold shadow-sm"
          title="Atualizar lista"
        >
          <RefreshCw className={`w-4 h-4 text-emerald-800 ${carregando ? 'animate-spin' : ''}`} />
          <span>Atualizar</span>
        </button>
      </div>

      {/* Mensagem de Erro se houver */}
      {erro && (
        <div className="p-4 rounded-xl bg-red-50 border-2 border-red-700 text-red-900 text-sm font-black shadow-sm">
          {erro}
        </div>
      )}

      {/* Lista de Cards de Clientes */}
      {carregando && clientes.length === 0 ? (
        <div className="space-y-3">
          {[1, 2, 3].map(n => (
            <div key={n} className="h-28 rounded-xl bg-slate-100 animate-pulse border-2 border-slate-300" />
          ))}
        </div>
      ) : clientesFiltrados.length === 0 ? (
        <div className="text-center py-12 px-4 bg-slate-50 border-2 border-dashed border-slate-400 rounded-2xl space-y-3">
          <div className="w-16 h-16 mx-auto rounded-xl bg-slate-200 border border-slate-300 flex items-center justify-center text-slate-700">
            <Package className="w-8 h-8 stroke-[2.5]" />
          </div>
          <h3 className="text-lg font-black text-black">
            {termoBusca ? 'Nenhum cliente encontrado' : 'Nenhum cliente cadastrado ainda'}
          </h3>
          <p className="text-sm font-semibold text-slate-700 max-w-xs mx-auto">
            {termoBusca 
              ? `Nenhum resultado para "${termoBusca}". Verifique a digitação.` 
              : 'Clique no botão verde acima para cadastrar o primeiro cliente.'
            }
          </p>
          {!termoBusca && (
            <button
              onClick={() => setModalNovoClienteAberto(true)}
              className="mt-2 inline-flex items-center gap-2 px-6 py-3.5 rounded-xl bg-emerald-700 text-white font-black text-base shadow-md border-2 border-emerald-900 touch-btn"
            >
              <UserPlus className="w-5 h-5 stroke-[2.5]" />
              <span>Cadastrar Primeiro Cliente</span>
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {clientesFiltrados.map((cli) => {
            const saldoNormal = cli.saldoNormal || 0;
            const saldoPequena = cli.saldoPequena || 0;

            return (
              <div
                key={cli.nome}
                onClick={() => onSelectCliente(cli.nome)}
                className="group relative bg-white hover:bg-slate-50 active:bg-slate-100 border-2 border-slate-300 hover:border-slate-500 rounded-xl p-4 transition-all shadow-sm touch-btn cursor-pointer"
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1 pr-3">
                    <h3 className="text-xl sm:text-2xl font-black text-black group-hover:text-emerald-800 transition-colors leading-snug">
                      {cli.nome}
                    </h3>
                    <p className="text-xs font-bold text-slate-700 mt-1">
                      {cli.totalMovimentacoes} {cli.totalMovimentacoes === 1 ? 'movimentação' : 'movimentações'} registradas
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <div className="w-10 h-10 rounded-xl bg-slate-100 border-2 border-slate-300 flex items-center justify-center text-slate-800 group-hover:text-white group-hover:bg-emerald-700 group-hover:border-emerald-700 transition-all shadow-sm">
                      <ChevronRight className="w-6 h-6 stroke-[3]" />
                    </div>
                  </div>
                </div>

                {/* Saldo de Estoque em Destaque no Cartão */}
                <div className="mt-3 pt-3 border-t-2 border-slate-200 flex items-center justify-between">
                  <div>
                    <span className="block text-[11px] font-black text-slate-700 uppercase tracking-wider">
                      Saldo Disponível
                    </span>
                    <div className={`text-xl sm:text-2xl font-black ${
                      (cli.saldoTotalKg || 0) >= 0 ? 'text-black' : 'text-red-600'
                    }`}>
                      {(cli.saldoTotalKg || 0).toLocaleString('pt-BR')} <span className="text-sm font-extrabold text-slate-700">kg</span>
                    </div>
                  </div>

                  <div className="text-right">
                    <span className="block text-[11px] font-black text-slate-600 uppercase tracking-wider">
                      Equivalente
                    </span>
                    <span className="inline-block px-2.5 py-1 rounded-lg bg-slate-100 border border-slate-300 text-xs font-black text-black">
                      ~{cli.estimativaSacas || 0} sacas (50kg)
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
        salvando={salvandoCliente}
      />

    </div>
  );
}
