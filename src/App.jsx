import React, { useState, useEffect } from 'react';
import Header from './components/Header';
import Login from './pages/Login';
import Clientes from './pages/Clientes';
import PainelCliente from './pages/PainelCliente';

export default function App() {
  const [usuarioLogado, setUsuarioLogado] = useState(null);
  const [telaAtiva, setTelaAtiva] = useState('clientes'); // 'clientes' | 'painel_cliente'
  const [clienteSelecionado, setClienteSelecionado] = useState(null);

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

  // Cadastrar Novo Cliente sem solicitar movimentação prévia
  const handleNovoClienteCadastrado = (nomeCliente) => {
    mostrarToast(`Cliente "${nomeCliente}" cadastrado com sucesso!`);
    handleSelectCliente(nomeCliente);
  };

  if (!usuarioLogado) {
    return <Login onLoginSucesso={(user) => setUsuarioLogado(user)} />;
  }

  return (
    <div className="min-h-screen bg-white text-black flex flex-col">
      {/* Top Header */}
      <Header
        usuario={usuarioLogado.usuario}
        onLogout={handleLogout}
      />

      {/* Main Screen Content */}
      <main className="flex-1 bg-white">
        {telaAtiva === 'clientes' ? (
          <Clientes
            onSelectCliente={handleSelectCliente}
            onNovoClienteCadastrado={handleNovoClienteCadastrado}
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

      {/* Toast Notification */}
      {toastMensagem && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 px-6 py-3.5 rounded-xl bg-emerald-800 text-white font-black text-base shadow-2xl border-2 border-emerald-950 animate-in fade-in slide-in-from-bottom-4">
          {toastMensagem}
        </div>
      )}
    </div>
  );
}
