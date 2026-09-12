import React, { useState, useEffect } from 'react';
import Header from './components/Header';
import Login from './pages/Login';
import Clientes from './pages/Clientes';
import PainelCliente from './pages/PainelCliente';
import MovimentacaoModal from './components/MovimentacaoModal';

export default function App() {
  const [usuarioLogado, setUsuarioLogado] = useState(null);
  const [telaAtiva, setTelaAtiva] = useState('clientes'); // 'clientes' | 'painel_cliente'
  const [clienteSelecionado, setClienteSelecionado] = useState(null);

  // Estado para quando cadastra novo cliente e já abre a movimentação direto
  const [novoClienteModalAberto, setNovoClienteModalAberto] = useState(false);
  const [clienteParaNovaMovimentacao, setClienteParaNovaMovimentacao] = useState(null);

  // Feedback Toast
  const [toastMensagem, setToastMensagem] = useState('');

  const mostrarToast = (msg) => {
    setToastMensagem(msg);
    setTimeout(() => {
      setToastMensagem('');
    }, 4000);
  };

  // Carrega sessão salva no localStorage
  useEffect(() => {
    try {
      const sessaoSalva = localStorage.getItem('moagem_usuario_sessao');
      if (sessaoSalva) {
        const dados = JSON.parse(sessaoSalva);
        if (dados && dados.usuario) {
          setUsuarioLogado(dados);
        }
      }
    } catch (e) {
      console.warn('Falha ao restaurar sessão do localStorage:', e);
    }
  }, []);

  // Logout
  const handleLogout = () => {
    if (window.confirm('Deseja realmente sair do sistema?')) {
      localStorage.removeItem('moagem_usuario_sessao');
      setUsuarioLogado(null);
      setTelaAtiva('clientes');
      setClienteSelecionado(null);
    }
  };

  // Selecionar Cliente para abrir Painel
  const handleSelectCliente = (nomeCliente) => {
    setClienteSelecionado(nomeCliente);
    setTelaAtiva('painel_cliente');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Cadastrar Novo Cliente e abrir formulário de movimentação imediatamente
  const handleNovoClienteComMovimentacao = (nomeCliente) => {
    setClienteParaNovaMovimentacao(nomeCliente);
    setNovoClienteModalAberto(true);
  };

  if (!usuarioLogado) {
    return <Login onLoginSucesso={(user) => setUsuarioLogado(user)} />;
  }

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col">
      {/* Top Header */}
      <Header
        usuario={usuarioLogado.usuario}
        onLogout={handleLogout}
      />

      {/* Main Screen Content */}
      <main className="flex-1">
        {telaAtiva === 'clientes' ? (
          <Clientes
            onSelectCliente={handleSelectCliente}
            onNovoClienteComMovimentacao={handleNovoClienteComMovimentacao}
          />
        ) : (
          <PainelCliente
            cliente={clienteSelecionado}
            onVoltar={() => {
              setTelaAtiva('clientes');
              setClienteSelecionado(null);
            }}
          />
        )}
      </main>

      {/* Modal acionado quando cria novo cliente e direciona direto para movimentação */}
      {novoClienteModalAberto && clienteParaNovaMovimentacao && (
        <MovimentacaoModal
          isOpen={novoClienteModalAberto}
          onClose={() => {
            setNovoClienteModalAberto(false);
            setClienteParaNovaMovimentacao(null);
          }}
          cliente={clienteParaNovaMovimentacao}
          tipoInicial="OUT"
          onSucesso={(mov) => {
            mostrarToast(`Primeira movimentação salva para ${mov.cliente}!`);
            // Abre o painel do cliente recém criado
            handleSelectCliente(mov.cliente);
          }}
        />
      )}

      {/* Toast Notification */}
      {toastMensagem && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 px-5 py-3 rounded-2xl bg-green-600 text-white font-bold text-sm shadow-2xl shadow-green-950/80 border border-green-400/40 animate-in fade-in slide-in-from-bottom-4">
          {toastMensagem}
        </div>
      )}
    </div>
  );
}
