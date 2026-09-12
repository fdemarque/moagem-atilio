import React, { useState } from 'react';
import { autenticarUsuario } from '../lib/supabase';
import { PackageCheck, LogIn, Lock, User, Eye, EyeOff, Loader2 } from 'lucide-react';

export default function Login({ onLoginSucesso }) {
  const [usuario, setUsuario] = useState('');
  const [senha, setSenha] = useState('');
  const [mostrarSenha, setMostrarSenha] = useState(false);
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState('');

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!usuario.trim() || !senha.trim()) {
      setErro('Informe o usuário e a senha.');
      return;
    }

    setCarregando(true);
    setErro('');

    const resultado = await autenticarUsuario(usuario, senha);

    if (resultado.success) {
      localStorage.setItem('moagem_usuario_sessao', JSON.stringify(resultado.data));
      onLoginSucesso(resultado.data);
    } else {
      setErro(resultado.error || 'Usuário ou senha incorretos.');
    }
    setCarregando(false);
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col justify-center px-4 py-8 sm:px-6 lg:px-8">
      <div className="max-w-md w-full mx-auto space-y-7">
        
        {/* Logo e Cabeçalho */}
        <div className="text-center space-y-3">
          <div className="w-20 h-20 mx-auto rounded-3xl bg-gradient-to-tr from-green-600 to-green-500 flex items-center justify-center shadow-xl shadow-green-900/50">
            <PackageCheck className="w-11 h-11 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-white tracking-tight">
              Moagem Atílio
            </h1>
            <p className="text-sm font-semibold text-green-400 mt-1">
              Controle de Movimentação de Sacarias
            </p>
          </div>
        </div>

        {/* Card de Login */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-5">
          <h2 className="text-base font-bold text-slate-200 text-center">
            Acesso ao Sistema
          </h2>

          <form onSubmit={handleLogin} className="space-y-4">
            
            {/* Campo Usuário */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                Usuário
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <User className="h-5 h-5 text-slate-400" />
                </div>
                <input
                  type="text"
                  autoCapitalize="none"
                  autoCorrect="off"
                  required
                  value={usuario}
                  onChange={(e) => {
                    setUsuario(e.target.value);
                    if (erro) setErro('');
                  }}
                  placeholder="Ex: pai ou backup"
                  className="w-full h-14 pl-12 pr-4 text-base font-semibold rounded-2xl bg-slate-950 border-2 border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:border-green-500 focus:ring-2 focus:ring-green-500/20"
                />
              </div>
            </div>

            {/* Campo Senha */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                Senha
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-slate-400" />
                </div>
                <input
                  type={mostrarSenha ? "text" : "password"}
                  required
                  value={senha}
                  onChange={(e) => {
                    setSenha(e.target.value);
                    if (erro) setErro('');
                  }}
                  placeholder="Digite sua senha"
                  className="w-full h-14 pl-12 pr-12 text-base font-semibold rounded-2xl bg-slate-950 border-2 border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:border-green-500 focus:ring-2 focus:ring-green-500/20"
                />
                <button
                  type="button"
                  onClick={() => setMostrarSenha(!mostrarSenha)}
                  className="absolute inset-y-0 right-0 pr-4 flex items-center text-slate-400 hover:text-slate-200"
                >
                  {mostrarSenha ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
            </div>

            {/* Mensagem de Erro */}
            {erro && (
              <div className="p-3.5 rounded-xl bg-red-950/80 border border-red-800 text-red-200 text-xs font-semibold animate-in fade-in">
                {erro}
              </div>
            )}

            {/* Botão Entrar */}
            <button
              type="submit"
              disabled={carregando}
              className="w-full h-15 rounded-2xl bg-green-600 hover:bg-green-500 text-white font-black text-base flex items-center justify-center gap-2 shadow-xl shadow-green-900/40 transition-all touch-btn disabled:opacity-60"
            >
              {carregando ? (
                <>
                  <Loader2 className="w-6 h-6 animate-spin" />
                  <span>Verificando...</span>
                </>
              ) : (
                <>
                  <LogIn className="w-5 h-5" />
                  <span>ENTRAR NO SISTEMA</span>
                </>
              )}
            </button>
          </form>

        </div>

        {/* Rodapé Informativo */}
        <p className="text-center text-xs text-slate-500">
          Uso operacional interno — Moagem Atílio &copy; {new Date().getFullYear()}
        </p>

      </div>
    </div>
  );
}
