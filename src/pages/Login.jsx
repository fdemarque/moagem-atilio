import React, { useState, useEffect } from 'react';
import { autenticarUsuario } from '../lib/supabase';
import {
  PackageCheck,
  LogIn,
  Lock,
  User,
  Eye,
  EyeOff,
  Loader2,
  Fingerprint
} from 'lucide-react';
import {
  isBiometricsSupported,
  getBiometriaSalva,
  salvarBiometriaLocal,
  registrarBiometria,
  autenticarComBiometria
} from '../utils/biometrics';

export default function Login({ onLoginSucesso }) {
  const [usuario, setUsuario] = useState('');
  const [senha, setSenha] = useState('');
  const [mostrarSenha, setMostrarSenha] = useState(false);
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState('');

  // Estados de Biometria
  const [suportaBiometria, setSuportaBiometria] = useState(false);
  const [biometriaSalva, setBiometriaSalva] = useState(null);
  const [modoBiometrico, setModoBiometrico] = useState(false);
  const [autenticandoBiometria, setAutenticandoBiometria] = useState(false);
  const [modalAtivarBiometriaAberto, setModalAtivarBiometriaAberto] = useState(false);
  const [usuarioPendenteBiometria, setUsuarioPendenteBiometria] = useState(null);
  const [registrandoBiometria, setRegistrandoBiometria] = useState(false);

  // Verifica suporte e credencial salva ao carregar
  useEffect(() => {
    async function checarBiometria() {
      const suportado = await isBiometricsSupported();
      setSuportaBiometria(suportado);

      const salva = getBiometriaSalva();
      if (salva) {
        setBiometriaSalva(salva);
        if (suportado) {
          setModoBiometrico(true);
        }
      }
    }
    checarBiometria();
  }, []);

  // Finaliza sessão e avança para a aplicação
  const finalizarSessao = (dados) => {
    localStorage.setItem('moagem_usuario_sessao', JSON.stringify(dados));
    onLoginSucesso(dados);
  };

  // Executa autenticação pela digital
  const handleAutenticarBiometria = async () => {
    if (!biometriaSalva) return;
    setAutenticandoBiometria(true);
    setErro('');

    try {
      await autenticarComBiometria(biometriaSalva.credentialId);
      finalizarSessao(biometriaSalva.usuario);
    } catch (err) {
      console.warn('Falha na autenticação biométrica:', err);
      setErro('Não foi possível ler a digital. Tente novamente ou entre com sua senha abaixo.');
    } finally {
      setAutenticandoBiometria(false);
    }
  };

  // Login tradicional com Usuário e Senha
  const handleLoginComSenha = async (e) => {
    e.preventDefault();
    if (!usuario.trim() || !senha.trim()) {
      setErro('Informe o usuário e a senha.');
      return;
    }

    setCarregando(true);
    setErro('');

    const resultado = await autenticarUsuario(usuario, senha);

    if (resultado.success) {
      const credencialSalva = getBiometriaSalva();
      if (suportaBiometria && !credencialSalva) {
        setUsuarioPendenteBiometria(resultado.data);
        setModalAtivarBiometriaAberto(true);
      } else {
        finalizarSessao(resultado.data);
      }
    } else {
      setErro(resultado.error || 'Usuário ou senha incorretos.');
    }
    setCarregando(false);
  };

  // Usuário opta por registrar a digital no primeiro acesso
  const handleConfirmarAtivacaoBiometria = async () => {
    if (!usuarioPendenteBiometria) return;
    setRegistrandoBiometria(true);
    setErro('');

    try {
      const credentialId = await registrarBiometria(usuarioPendenteBiometria.usuario);
      salvarBiometriaLocal(credentialId, usuarioPendenteBiometria);
      setBiometriaSalva({ credentialId, usuario: usuarioPendenteBiometria });
      setModalAtivarBiometriaAberto(false);
      finalizarSessao(usuarioPendenteBiometria);
    } catch (err) {
      console.warn('Registro de biometria cancelado ou com erro:', err);
      setModalAtivarBiometriaAberto(false);
      finalizarSessao(usuarioPendenteBiometria);
    } finally {
      setRegistrandoBiometria(false);
    }
  };

  // Usuário escolhe "Não" na oferta de biometria
  const handleRecusarAtivacaoBiometria = () => {
    setModalAtivarBiometriaAberto(false);
    if (usuarioPendenteBiometria) {
      finalizarSessao(usuarioPendenteBiometria);
    }
  };

  return (
    <div className="min-h-screen bg-white text-black flex flex-col justify-center px-4 py-8 sm:px-6 lg:px-8">
      <div className="max-w-md w-full mx-auto space-y-7">
        
        {/* Logo e Identificação */}
        <div className="text-center space-y-3">
          <div className="w-20 h-20 mx-auto rounded-2xl bg-[#15803D] flex items-center justify-center shadow-md border-2 border-emerald-900 text-white">
            <PackageCheck className="w-11 h-11 stroke-[2.5]" />
          </div>
          <div>
            <h1 className="text-3xl font-black text-black tracking-tight">
              Moagem Atílio
            </h1>
            <p className="text-sm font-bold text-slate-800 mt-1 uppercase tracking-wider">
              Controle de Movimentação de Sacarias
            </p>
          </div>
        </div>

        {/* MODO 1: ENTRADA RÁPIDA POR DIGITAL (Alto Contraste / Polaridade Positiva) */}
        {modoBiometrico ? (
          <div className="bg-white border-2 border-slate-300 rounded-2xl p-6 sm:p-8 shadow-md space-y-6 text-center animate-in fade-in">
            
            {/* Ícone de Destaque */}
            <div className="w-24 h-24 mx-auto rounded-2xl bg-emerald-50 border-3 border-[#15803D] flex items-center justify-center text-[#15803D] shadow-sm">
              <Fingerprint className="w-14 h-14 stroke-[2.5]" />
            </div>

            <div>
              <h2 className="text-2xl font-black text-black tracking-tight">
                Acesso com Digital
              </h2>
              <p className="text-base font-bold text-slate-800 mt-1.5">
                Olá, <strong className="text-black underline">{biometriaSalva?.usuario?.usuario || 'Operador'}</strong>!
                <br />
                Toque no botão e encoste o dedo no leitor.
              </p>
            </div>

            {/* Mensagem de Erro de Biometria */}
            {erro && (
              <div className="p-3.5 rounded-xl bg-red-100 border-2 border-red-700 text-red-950 text-sm font-black text-center animate-in fade-in">
                {erro}
              </div>
            )}

            {/* Botão Gigante de Confirmação Biométrica (Mínimo 64px de altura) */}
            <button
              type="button"
              disabled={autenticandoBiometria}
              onClick={handleAutenticarBiometria}
              className="w-full h-18 sm:h-20 rounded-xl bg-[#15803D] hover:bg-emerald-800 active:bg-emerald-900 text-white font-black text-xl uppercase tracking-wide flex items-center justify-center gap-3 shadow-md border-2 border-emerald-900 touch-btn transition-transform active:scale-[0.98]"
            >
              {autenticandoBiometria ? (
                <>
                  <Loader2 className="w-7 h-7 animate-spin" />
                  <span>Aguardando Leitor...</span>
                </>
              ) : (
                <>
                  <Fingerprint className="w-8 h-8 stroke-[2.5]" />
                  <span>ENTRAR COM A DIGITAL</span>
                </>
              )}
            </button>

            {/* Alternativa Direta: Entrar com Usuário e Senha */}
            <div className="pt-2 border-t-2 border-slate-200">
              <button
                type="button"
                onClick={() => {
                  setModoBiometrico(false);
                  setErro('');
                }}
                className="w-full py-3 rounded-xl text-slate-800 hover:text-black font-black text-base hover:bg-slate-100 transition-colors"
              >
                Entrar com usuário e senha
              </button>
            </div>

          </div>
        ) : (
          /* MODO 2: FORMULÁRIO TRADICIONAL COM USUÁRIO E SENHA (Fundo Branco, Bordas Pretas) */
          <div className="bg-white border-2 border-slate-300 rounded-2xl p-6 shadow-md space-y-5">
            
            {/* Opção de Retornar à Digital (se existir credencial) */}
            {suportaBiometria && biometriaSalva && (
              <button
                type="button"
                onClick={() => {
                  setModoBiometrico(true);
                  setErro('');
                }}
                className="w-full h-14 rounded-xl bg-slate-100 hover:bg-slate-200 active:bg-slate-300 border-2 border-slate-300 text-emerald-900 font-black text-base flex items-center justify-center gap-2.5 touch-btn transition-colors shadow-sm"
              >
                <Fingerprint className="w-6 h-6 stroke-[2.5] text-[#15803D]" />
                <span>Usar Minha Digital para Entrar</span>
              </button>
            )}

            <h2 className="text-xl font-black text-black text-center">
              Acesso com Usuário e Senha
            </h2>

            <form onSubmit={handleLoginComSenha} className="space-y-4">
              
              {/* Campo Usuário */}
              <div>
                <label className="block text-xs font-black uppercase tracking-wider text-slate-900 mb-1.5">
                  Usuário
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <User className="h-5 h-5 text-slate-700 stroke-[2.5]" />
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
                    className="w-full h-14 pl-12 pr-4 text-base font-bold rounded-xl bg-white border-2 border-slate-400 focus:border-black text-black placeholder-slate-500 focus:outline-none shadow-sm"
                  />
                </div>
              </div>

              {/* Campo Senha */}
              <div>
                <label className="block text-xs font-black uppercase tracking-wider text-slate-900 mb-1.5">
                  Senha
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <Lock className="h-5 w-5 text-slate-700 stroke-[2.5]" />
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
                    className="w-full h-14 pl-12 pr-12 text-base font-bold rounded-xl bg-white border-2 border-slate-400 focus:border-black text-black placeholder-slate-500 focus:outline-none shadow-sm"
                  />
                  <button
                    type="button"
                    onClick={() => setMostrarSenha(!mostrarSenha)}
                    className="absolute inset-y-0 right-0 pr-4 flex items-center text-slate-700 hover:text-black"
                  >
                    {mostrarSenha ? <EyeOff className="h-5 w-5 stroke-[2.5]" /> : <Eye className="h-5 w-5 stroke-[2.5]" />}
                  </button>
                </div>
              </div>

              {/* Mensagem de Erro */}
              {erro && (
                <div className="p-3.5 rounded-xl bg-red-100 border-2 border-red-700 text-red-950 text-sm font-black animate-in fade-in">
                  {erro}
                </div>
              )}

              {/* Botão Entrar com Senha */}
              <button
                type="submit"
                disabled={carregando}
                className="w-full h-16 rounded-xl bg-[#15803D] hover:bg-emerald-800 active:bg-emerald-900 text-white font-black text-lg flex items-center justify-center gap-2 shadow-md border-2 border-emerald-900 transition-all touch-btn disabled:opacity-60"
              >
                {carregando ? (
                  <>
                    <Loader2 className="w-6 h-6 animate-spin" />
                    <span>Verificando...</span>
                  </>
                ) : (
                  <>
                    <LogIn className="w-5 h-5 stroke-[2.5]" />
                    <span>ENTRAR NO SISTEMA</span>
                  </>
                )}
              </button>
            </form>

          </div>
        )}

        {/* Rodapé Informativo */}
        <p className="text-center text-xs font-bold text-slate-600">
          Uso operacional interno — Moagem Atílio &copy; {new Date().getFullYear()}
        </p>

      </div>

      {/* MODAL: OFERTA DE ATIVAÇÃO DA DIGITAL NO PRIMEIRO ACESSO */}
      {modalAtivarBiometriaAberto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-md bg-white border-3 border-[#15803D] rounded-2xl p-6 sm:p-7 space-y-6 shadow-2xl animate-in zoom-in-95">
            
            <div className="text-center space-y-3">
              <div className="w-20 h-20 mx-auto rounded-2xl bg-emerald-50 border-3 border-[#15803D] flex items-center justify-center text-[#15803D] shadow-sm">
                <Fingerprint className="w-11 h-11 stroke-[2.5]" />
              </div>
              <h3 className="text-xl sm:text-2xl font-black text-black leading-tight">
                Deseja usar sua digital para entrar mais rápido nas próximas vezes?
              </h3>
              <p className="text-base font-semibold text-slate-800">
                Com a digital ativa neste aparelho, você não precisará mais digitar usuário e senha.
              </p>
            </div>

            {/* Dois Botões Grandes e Acessíveis */}
            <div className="grid grid-cols-2 gap-3 pt-2">
              <button
                type="button"
                disabled={registrandoBiometria}
                onClick={handleRecusarAtivacaoBiometria}
                className="h-14 sm:h-16 rounded-xl bg-slate-200 hover:bg-slate-300 active:bg-slate-400 border-2 border-slate-400 text-black font-black text-base touch-btn transition-colors"
              >
                Não
              </button>

              <button
                type="button"
                disabled={registrandoBiometria}
                onClick={handleConfirmarAtivacaoBiometria}
                className="h-14 sm:h-16 rounded-xl bg-[#15803D] hover:bg-emerald-800 active:bg-emerald-900 text-white font-black text-base flex items-center justify-center gap-2 shadow-md border-2 border-emerald-900 touch-btn transition-colors"
              >
                {registrandoBiometria ? (
                  <Loader2 className="w-6 h-6 animate-spin" />
                ) : (
                  <>
                    <Fingerprint className="w-6 h-6 stroke-[2.5]" />
                    <span>Ativar Digital</span>
                  </>
                )}
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
