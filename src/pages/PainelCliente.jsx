import React, { useState, useEffect } from 'react';
import {
  ArrowLeft,
  ArrowDown,
  ArrowUp,
  Printer,
  Share2,
  ChevronLeft,
  ChevronRight,
  Calendar,
  RefreshCw,
  Image as ImageIcon,
  Check,
  Trash2,
  Loader2,
  AlertTriangle
} from 'lucide-react';
import { buscarMovimentacoesMensais, deletarMovimentacao } from '../lib/supabase';
import MovimentacaoModal from '../components/MovimentacaoModal';
import ComprovanteModal from '../components/ComprovanteModal';

const MESES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
];

export default function PainelCliente({ cliente, onVoltar }) {
  const dataAtual = new Date();
  const [mesSelecionado, setMesSelecionado] = useState(dataAtual.getMonth() + 1); // 1-12
  const [anoSelecionado, setAnoSelecionado] = useState(dataAtual.getFullYear());

  const [movimentacoes, setMovimentacoes] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState('');

  // Modais e Estados de Ação
  const [modalMovimentacaoAberto, setModalMovimentacaoAberto] = useState(false);
  const [tipoMovimentacaoAtivo, setTipoMovimentacaoAtivo] = useState('OUT');
  const [movimentacaoParaEditar, setMovimentacaoParaEditar] = useState(null);
  const [movimentacaoParaExcluir, setMovimentacaoParaExcluir] = useState(null);
  const [excluindo, setExcluindo] = useState(false);

  const [urlComprovanteAtivo, setUrlComprovanteAtivo] = useState(null);
  const [feedbackAcao, setFeedbackAcao] = useState('');

  const carregarMovimentacoes = async () => {
    setCarregando(true);
    setErro('');
    try {
      const dados = await buscarMovimentacoesMensais(cliente, mesSelecionado, anoSelecionado);
      setMovimentacoes(dados);
    } catch (err) {
      console.error('Erro ao carregar movimentações:', err);
      setErro('Falha ao obter movimentações deste período.');
    } finally {
      setCarregando(false);
    }
  };

  useEffect(() => {
    carregarMovimentacoes();
  }, [cliente, mesSelecionado, anoSelecionado]);

  // Navegação de mês anterior e próximo
  const irParaMesAnterior = () => {
    if (mesSelecionado === 1) {
      setMesSelecionado(12);
      setAnoSelecionado(prev => prev - 1);
    } else {
      setMesSelecionado(prev => prev - 1);
    }
  };

  const irParaMesProximo = () => {
    if (mesSelecionado === 12) {
      setMesSelecionado(1);
      setAnoSelecionado(prev => prev + 1);
    } else {
      setMesSelecionado(prev => prev + 1);
    }
  };

  // Cálculo de Totais do Mês
  const totais = movimentacoes.reduce(
    (acc, m) => {
      const qtd = m.quantidade || 0;
      if (m.tipo_movimentacao === 'IN') {
        if (m.tipo_sacaria === 'normal') acc.inNormal += qtd;
        if (m.tipo_sacaria === 'pequena') acc.inPequena += qtd;
      } else {
        if (m.tipo_sacaria === 'normal') acc.outNormal += qtd;
        if (m.tipo_sacaria === 'pequena') acc.outPequena += qtd;
      }
      return acc;
    },
    { inNormal: 0, outNormal: 0, inPequena: 0, outPequena: 0 }
  );

  const totalEntradas = totais.inNormal + totais.inPequena;
  const totalSaidas = totais.outNormal + totais.outPequena;
  const saldoMes = totalEntradas - totalSaidas;

  // Formatação de data BR (dd/mm/aaaa)
  const formatarData = (dataStr) => {
    if (!dataStr) return '-';
    const partes = dataStr.split('-');
    if (partes.length === 3) {
      return `${partes[2]}/${partes[1]}/${partes[0]}`;
    }
    return dataStr;
  };

  // Ação de Compartilhar Resumo (WhatsApp / Web Share API)
  const handleCompartilhar = async () => {
    const textoResumo = `*Moagem Atílio - Relatório de Sacarias*
Cliente: *${cliente}*
Período: *${MESES[mesSelecionado - 1]}/${anoSelecionado}*

📦 *MOVIMENTAÇÃO DO MÊS:*
• ENTRADA: ${totalEntradas}
• SAÍDA: ${totalSaidas}

⚖️ *SALDO DO MÊS:* ${saldoMes}

Total de movimentações no mês: ${movimentacoes.length}`;

    if (navigator.share) {
      try {
        await navigator.share({
          title: `Relatório de Sacarias - ${cliente}`,
          text: textoResumo,
        });
      } catch (err) {
        if (err.name !== 'AbortError') {
          console.warn('Erro no share:', err);
        }
      }
    } else {
      navigator.clipboard.writeText(textoResumo);
      setFeedbackAcao('Relatório copiado para a área de transferência!');
      setTimeout(() => setFeedbackAcao(''), 3000);
    }
  };

  // Abertura para novo registro
  const abrirModalNovaMovimentacao = (tipo) => {
    setMovimentacaoParaEditar(null);
    setTipoMovimentacaoAtivo(tipo);
    setModalMovimentacaoAberto(true);
  };

  // Abertura para edição ao tocar no cartão
  const abrirModalEdicao = (mov) => {
    setMovimentacaoParaEditar(mov);
    setTipoMovimentacaoAtivo(mov.tipo_movimentacao || 'OUT');
    setModalMovimentacaoAberto(true);
  };

  // Sucesso de criação/edição
  const handleSucessoMovimentacao = (resultado) => {
    carregarMovimentacoes();
    setFeedbackAcao(resultado?.editado ? 'Alterações salvas com sucesso!' : 'Movimentação registrada com sucesso!');
    setTimeout(() => setFeedbackAcao(''), 3500);
  };

  // Confirmar exclusão do registro
  const handleConfirmarExclusao = async () => {
    if (!movimentacaoParaExcluir) return;
    setExcluindo(true);
    try {
      await deletarMovimentacao(movimentacaoParaExcluir.id, movimentacaoParaExcluir.documentos || []);
      setMovimentacaoParaExcluir(null);
      setFeedbackAcao('Registro apagado com sucesso!');
      setTimeout(() => setFeedbackAcao(''), 3500);
      await carregarMovimentacoes();
    } catch (err) {
      console.error('Erro ao excluir movimentação:', err);
      setErro('Não foi possível excluir o registro. Verifique a conexão.');
    } finally {
      setExcluindo(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-3 pb-safe space-y-4 bg-white text-black min-h-[calc(100vh-65px)]">

      {/* Cabeçalho do Cliente com Botão Voltar */}
      <div className="flex items-center justify-between no-print pt-1">
        <div className="flex items-center gap-2.5">
          <button
            onClick={onVoltar}
            className="p-3 rounded-xl bg-slate-100 hover:bg-slate-200 active:bg-slate-300 border-2 border-slate-400 text-black touch-btn shadow-sm"
            title="Voltar aos clientes"
          >
            <ArrowLeft className="w-6 h-6 stroke-[3]" />
          </button>
          <div>
            <span className="text-xs font-black text-emerald-800 uppercase tracking-wider block">
              Painel do Cliente
            </span>
            <h1 className="text-2xl sm:text-3xl font-black text-black leading-tight">
              {cliente}
            </h1>
          </div>
        </div>

        <button
          onClick={carregarMovimentacoes}
          className="p-3 rounded-xl bg-slate-100 hover:bg-slate-200 border-2 border-slate-400 text-black touch-btn shadow-sm"
          title="Recarregar dados"
        >
          <RefreshCw className={`w-5 h-5 text-emerald-800 stroke-[2.5] ${carregando ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Botões de Ação Superior: [↓ REGISTRAR ENTRADA] e [↑ REGISTRAR SAÍDA] (WCAG AAA) */}
      <div className="grid grid-cols-2 gap-3 no-print">

        {/* Botão Verde Profundo [↓ REGISTRAR ENTRADA] (Base #15803D) */}
        <button
          onClick={() => abrirModalNovaMovimentacao('IN')}
          className="min-h-[58px] sm:h-20 rounded-xl bg-[#15803D] hover:bg-emerald-800 active:bg-emerald-900 text-white font-black flex flex-col items-center justify-center p-3 shadow-md border-2 border-emerald-900 touch-btn transition-transform active:scale-[0.98]"
        >
          <div className="flex items-center gap-2">
            <ArrowDown className="w-6 h-6 stroke-[3]" />
            <span className="text-sm sm:text-base md:text-lg tracking-wide text-center leading-tight">
              REGISTRAR ENTRADA
            </span>
          </div>
        </button>

        {/* Botão Vermelho Rubi Profundo [↑ REGISTRAR SAÍDA] (Base #B91C1C) */}
        <button
          onClick={() => abrirModalNovaMovimentacao('OUT')}
          className="min-h-[58px] sm:h-20 rounded-xl bg-[#B91C1C] hover:bg-red-800 active:bg-red-900 text-white font-black flex flex-col items-center justify-center p-3 shadow-md border-2 border-red-900 touch-btn transition-transform active:scale-[0.98]"
        >
          <div className="flex items-center gap-2">
            <ArrowUp className="w-6 h-6 stroke-[3]" />
            <span className="text-sm sm:text-base md:text-lg tracking-wide text-center leading-tight">
              REGISTRAR SAÍDA
            </span>
          </div>
        </button>

      </div>

      {/* Filtro Mensal e Navegação de Data */}
      <div className="bg-white border-2 border-slate-300 rounded-xl p-3 shadow-sm no-print">
        <div className="flex items-center justify-between">
          <button
            onClick={irParaMesAnterior}
            className="p-2.5 rounded-lg bg-slate-100 hover:bg-slate-200 border-2 border-slate-300 text-black touch-btn"
            title="Mês anterior"
          >
            <ChevronLeft className="w-6 h-6 stroke-[3]" />
          </button>

          <div className="flex items-center gap-2 text-center">
            <Calendar className="w-5 h-5 text-emerald-800 stroke-[2.5]" />
            <span className="text-lg sm:text-xl font-black text-black">
              {MESES[mesSelecionado - 1]} / {anoSelecionado}
            </span>
          </div>

          <button
            onClick={irParaMesProximo}
            className="p-2.5 rounded-lg bg-slate-100 hover:bg-slate-200 border-2 border-slate-300 text-black touch-btn"
            title="Próximo mês"
          >
            <ChevronRight className="w-6 h-6 stroke-[3]" />
          </button>
        </div>
      </div>

      {/* Mensagem de Feedback Temporária */}
      {feedbackAcao && (
        <div className="p-3.5 bg-emerald-100 border-2 border-emerald-800 text-emerald-950 text-sm font-black rounded-xl flex items-center gap-2.5 shadow-sm no-print animate-in fade-in">
          <Check className="w-5 h-5 text-emerald-800 stroke-[3]" />
          <span>{feedbackAcao}</span>
        </div>
      )}

      {/* Mensagem de Erro se houver */}
      {erro && (
        <div className="p-3.5 bg-red-100 border-2 border-red-800 text-red-950 text-sm font-black rounded-xl flex items-center gap-2.5 shadow-sm no-print">
          <AlertTriangle className="w-5 h-5 text-red-800 stroke-[2.5]" />
          <span>{erro}</span>
        </div>
      )}

      {/* Relatório para Impressão */}
      <div className="hidden print:block mb-4">
        <div className="border-b-2 border-black pb-2 mb-4">
          <h1 className="text-2xl font-black text-black">Moagem Atílio - Relatório de Sacarias</h1>
          <p className="text-sm text-black">Cliente: <strong>{cliente}</strong> | Período: <strong>{MESES[mesSelecionado - 1]}/{anoSelecionado}</strong></p>
          <p className="text-xs text-black">Emitido em: {new Date().toLocaleDateString('pt-BR')}</p>
        </div>
      </div>

      {/* Lista de Movimentações (Cartões com Fundo Branco e Borda Sólida Cinza Escura) */}
      <div className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <h3 className="text-xs font-black uppercase tracking-wider text-slate-900">
            Movimentações do Período ({movimentacoes.length})
          </h3>
          <span className="text-xs text-slate-700 font-bold no-print">
            Toque no cartão para editar
          </span>
        </div>

        {carregando ? (
          <div className="space-y-3">
            {[1, 2, 3].map(n => (
              <div key={n} className="h-20 rounded-xl bg-slate-100 animate-pulse border-2 border-slate-300" />
            ))}
          </div>
        ) : movimentacoes.length === 0 ? (
          <div className="text-center py-10 px-4 bg-slate-50 border-2 border-dashed border-slate-400 rounded-2xl">
            <p className="text-black text-base font-black">
              Nenhuma movimentação em {MESES[mesSelecionado - 1]}/{anoSelecionado}.
            </p>
            <p className="text-xs text-slate-700 mt-1 font-semibold">
              Use os botões verde ou vermelho acima para registrar.
            </p>
          </div>
        ) : (
          /* Espaçamento generoso entre cartões */
          <div className="space-y-3.5 sm:space-y-4">
            {movimentacoes.map((mov) => {
              const isOut = mov.tipo_movimentacao === 'OUT';
              const temDocs = mov.documentos && mov.documentos.length > 0;

              return (
                <div
                  key={mov.id}
                  onClick={() => abrirModalEdicao(mov)}
                  className={`group relative rounded-xl p-4 flex items-center justify-between shadow-sm transition-all cursor-pointer touch-btn border-2 ${isOut
                    ? 'bg-red-50 hover:bg-red-100/70 active:bg-red-100 border-red-200 hover:border-red-300'
                    : 'bg-emerald-50 hover:bg-emerald-100/70 active:bg-emerald-100 border-emerald-200 hover:border-emerald-300'
                  }`}
                  title="Toque para editar este registro"
                >
                  {/* Tipo com Badge Visual Duplo e Quantidade em Destaque Preto Gigante */}
                  <div className="flex items-center gap-3.5">
                    {/* Badge sem borda com fundo branco para contraste limpo */}
                    <div className={`px-2.5 py-2 rounded-lg flex flex-col items-center justify-center min-w-[72px] shadow-sm ${isOut
                      ? 'bg-white text-[#B91C1C]'
                      : 'bg-white text-[#15803D]'
                      }`}>
                      {isOut ? <ArrowUp className="w-5 h-5 stroke-[3]" /> : <ArrowDown className="w-5 h-5 stroke-[3]" />}
                      <span className="text-[11px] font-black uppercase tracking-wider">
                        {isOut ? 'SAÍDA' : 'ENTRADA'}
                      </span>
                    </div>

                    <div>
                      <div className="flex items-center gap-2">
                        {/* Quantidade em Destaque Preto Gigante (WCAG AAA) */}
                        <span className="text-2xl font-black text-black">
                          {mov.quantidade} <span className="text-xs font-bold text-slate-700">sacas</span>
                        </span>
                        {/* Tipo de Sacaria em Badge de Contorno Nítido */}
                        <span className="px-2 py-0.5 rounded-md text-xs font-black uppercase bg-white border-2 border-slate-300 text-black shadow-xs">
                          {mov.tipo_sacaria}
                        </span>
                      </div>
                      <p className="text-xs text-slate-700 mt-1 flex items-center gap-1.5 font-bold">
                        <Calendar className="w-3.5 h-3.5 text-slate-600" />
                        <span>{formatarData(mov.data_movimentacao)}</span>
                      </p>
                    </div>
                  </div>

                  {/* Lado Direito: Anexos e Botão de Lixeira (Mínimo 48x48px) */}
                  <div className="flex items-center gap-2.5">
                    {temDocs && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setUrlComprovanteAtivo(mov.documentos[0]);
                        }}
                        className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-white hover:bg-slate-50 border-2 border-slate-300 text-emerald-800 font-bold text-xs touch-btn shadow-sm"
                        title="Ver fotos anexadas"
                      >
                        <ImageIcon className="w-4 h-4" />
                        <span className="hidden sm:inline">Foto</span>
                        <span>({mov.documentos.length})</span>
                      </button>
                    )}

                    {/* Botão de Lixeira com Ícone Cinza e Área de Toque de 48x48px */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setMovimentacaoParaExcluir(mov);
                      }}
                      className="w-12 h-12 rounded-xl bg-white hover:bg-slate-100 active:bg-slate-200 text-slate-400 hover:text-slate-600 border-2 border-slate-200 hover:border-slate-300 flex items-center justify-center touch-btn transition-colors shadow-sm"
                      title="Apagar este registro"
                    >
                      <Trash2 className="w-6 h-6 stroke-[2.2]" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Saldo do Mês - Layout com Borda Sólida e Destaque Conforme Desenho */}
      <div className="bg-white border-2 border-slate-300 rounded-2xl p-5 sm:p-6 shadow-sm space-y-4 print-card">

        {/* Mês e Ano de Referência */}
        <div className="text-left">
          <span className="text-sm sm:text-base font-black tracking-wider text-slate-900 uppercase">
            {MESES[mesSelecionado - 1]}/{anoSelecionado}
          </span>
        </div>

        {/* Caixa de Destaque com tom amarelado pastel opaco (mesmo tom do ícone de imprimir) */}
        <div className="bg-amber-100 border-2 border-amber-200/80 rounded-xl py-7 px-4 sm:py-8 sm:px-6 flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-center shadow-sm">
          <span className="text-xl sm:text-2xl md:text-3xl font-black text-black tracking-wide uppercase">
            SALDO DO MÊS:
          </span>
          <span className={`text-3xl sm:text-4xl md:text-5xl font-black ${saldoMes >= 0 ? 'text-black' : 'text-red-700'}`}>
            {saldoMes}
          </span>
        </div>

        {/* Botões de Ação: Compartilhar e Imprimir */}
        <div className="grid grid-cols-2 gap-3 pt-1 no-print">
          <button
            onClick={handleCompartilhar}
            className="h-14 rounded-xl bg-white hover:bg-slate-100 active:bg-slate-200 border-2 border-slate-400 text-black font-black text-base flex items-center justify-center gap-2.5 touch-btn transition-colors shadow-sm"
          >
            <Share2 className="w-5 h-5 text-emerald-800 stroke-[2.5]" />
            <span>Compartilhar</span>
          </button>

          <button
            onClick={() => window.print()}
            className="h-14 rounded-xl bg-white hover:bg-slate-100 active:bg-slate-200 border-2 border-slate-400 text-black font-black text-base flex items-center justify-center gap-2.5 touch-btn transition-colors shadow-sm"
          >
            <Printer className="w-5 h-5 text-amber-700 stroke-[2.5]" />
            <span>Imprimir</span>
          </button>
        </div>

      </div>

      {/* Modal de Criação ou Edição de Movimentação */}
      <MovimentacaoModal
        isOpen={modalMovimentacaoAberto}
        onClose={() => {
          setModalMovimentacaoAberto(false);
          setMovimentacaoParaEditar(null);
        }}
        cliente={cliente}
        tipoInicial={tipoMovimentacaoAtivo}
        movimentacaoParaEditar={movimentacaoParaEditar}
        onSucesso={handleSucessoMovimentacao}
      />

      {/* Pop-up de Confirmação de Exclusão (Fundo Branco, Borda Vermelha) */}
      {movimentacaoParaExcluir && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-md bg-white border-3 border-red-700 rounded-2xl p-6 space-y-5 shadow-2xl animate-in zoom-in-95">

            <div className="flex items-center gap-3 text-red-700">
              <div className="w-12 h-12 rounded-xl bg-red-100 border-2 border-red-400 flex items-center justify-center flex-shrink-0">
                <Trash2 className="w-6 h-6 stroke-[2.5]" />
              </div>
              <div>
                <h3 className="text-xl font-black text-black leading-tight">
                  Deseja apagar este registro?
                </h3>
                <p className="text-xs font-bold text-slate-700 mt-0.5">
                  Esta ação não poderá ser desfeita.
                </p>
              </div>
            </div>

            {/* Resumo do registro com alto contraste */}
            <div className="p-4 rounded-xl bg-slate-50 border-2 border-slate-300 space-y-1.5 text-black font-bold text-sm">
              <div className="flex justify-between items-center">
                <span className="text-slate-700">Operação:</span>
                <span className={movimentacaoParaExcluir.tipo_movimentacao === 'IN' ? 'text-[#15803D]' : 'text-[#B91C1C]'}>
                  {movimentacaoParaExcluir.tipo_movimentacao === 'IN' ? '↓ ENTRADA' : '↑ SAÍDA'}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-700">Quantidade:</span>
                <span className="text-black text-base font-black">
                  {movimentacaoParaExcluir.quantidade} sacas ({movimentacaoParaExcluir.tipo_sacaria})
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-700">Data:</span>
                <span className="text-slate-900">
                  {formatarData(movimentacaoParaExcluir.data_movimentacao)}
                </span>
              </div>
            </div>

            {/* Dois botões grandes: Cancelar (Cinza Escuro) e Sim, Apagar (Vermelho Escuro) */}
            <div className="grid grid-cols-2 gap-3 pt-2">
              <button
                type="button"
                disabled={excluindo}
                onClick={() => setMovimentacaoParaExcluir(null)}
                className="h-14 sm:h-16 rounded-xl bg-slate-200 hover:bg-slate-300 active:bg-slate-400 border-2 border-slate-400 text-black font-black text-base touch-btn transition-colors"
              >
                Cancelar
              </button>

              <button
                type="button"
                disabled={excluindo}
                onClick={handleConfirmarExclusao}
                className="h-14 sm:h-16 rounded-xl bg-[#B91C1C] hover:bg-red-800 active:bg-red-900 text-white font-black text-base flex items-center justify-center gap-2 shadow-md border-2 border-red-900 touch-btn transition-colors"
              >
                {excluindo ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <>
                    <Trash2 className="w-5 h-5 stroke-[2.5]" />
                    <span>Sim, Apagar</span>
                  </>
                )}
              </button>
            </div>

          </div>
        </div>
      )}

      {/* Modal de Visualização de Comprovante */}
      <ComprovanteModal
        url={urlComprovanteAtivo}
        onClose={() => setUrlComprovanteAtivo(null)}
      />

    </div>
  );
}
