import React, { useState, useEffect } from 'react';
import {
  ArrowLeft,
  ArrowDownLeft,
  ArrowUpRight,
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
    <div className="max-w-2xl mx-auto px-4 py-3 pb-safe space-y-4">

      {/* Cabeçalho do Cliente com Botão Voltar */}
      <div className="flex items-center justify-between no-print pt-1">
        <div className="flex items-center gap-2.5">
          <button
            onClick={onVoltar}
            className="p-3 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white touch-btn shadow-md"
            title="Voltar aos clientes"
          >
            <ArrowLeft className="w-6 h-6" />
          </button>
          <div>
            <span className="text-xs font-bold text-green-400 uppercase tracking-wider block">
              Painel do Cliente
            </span>
            <h1 className="text-xl sm:text-2xl font-black text-white leading-tight">
              {cliente}
            </h1>
          </div>
        </div>

        <button
          onClick={carregarMovimentacoes}
          className="p-2.5 rounded-2xl bg-slate-800 text-slate-400 hover:text-white touch-btn shadow-md"
          title="Recarregar dados"
        >
          <RefreshCw className={`w-5 h-5 ${carregando ? 'animate-spin text-green-400' : ''}`} />
        </button>
      </div>

      {/* Ações Principais: Botões Grandes para Entrada e Saída (Zero Inglês, Touch Amplo) */}
      <div className="grid grid-cols-2 gap-3 no-print">

        {/* Botão Verde [+ REGISTRAR ENTRADA] */}
        <button
          onClick={() => abrirModalNovaMovimentacao('IN')}
          className="h-20 sm:h-22 rounded-2xl bg-gradient-to-b from-green-600 to-green-700 hover:from-green-500 hover:to-green-600 active:from-green-700 active:to-green-800 text-white font-black flex flex-col items-center justify-center p-2 shadow-xl shadow-green-950/70 border-2 border-green-400/30 touch-btn transition-transform active:scale-[0.98]"
        >
          <div className="flex items-center gap-1.5 sm:gap-2">
            <ArrowDownLeft className="w-6 h-6 stroke-[3]" />
            <span className="text-sm sm:text-base md:text-lg tracking-wide text-center leading-tight">
              + REGISTRAR ENTRADA
            </span>
          </div>
        </button>

        {/* Botão Vermelho [- REGISTRAR SAÍDA] */}
        <button
          onClick={() => abrirModalNovaMovimentacao('OUT')}
          className="h-20 sm:h-22 rounded-2xl bg-gradient-to-b from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 active:from-red-700 active:to-red-800 text-white font-black flex flex-col items-center justify-center p-2 shadow-xl shadow-red-950/70 border-2 border-red-400/30 touch-btn transition-transform active:scale-[0.98]"
        >
          <div className="flex items-center gap-1.5 sm:gap-2">
            <ArrowUpRight className="w-6 h-6 stroke-[3]" />
            <span className="text-sm sm:text-base md:text-lg tracking-wide text-center leading-tight">
              - REGISTRAR SAÍDA
            </span>
          </div>
        </button>

      </div>

      {/* Filtro Mensal e Navegação de Data */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-3 shadow-md no-print">
        <div className="flex items-center justify-between">
          <button
            onClick={irParaMesAnterior}
            className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 touch-btn"
            title="Mês anterior"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-2 text-center">
            <Calendar className="w-4 h-4 text-green-400" />
            <span className="text-base sm:text-lg font-black text-white">
              {MESES[mesSelecionado - 1]} / {anoSelecionado}
            </span>
          </div>

          <button
            onClick={irParaMesProximo}
            className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 touch-btn"
            title="Próximo mês"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Mensagem de Feedback Temporária */}
      {feedbackAcao && (
        <div className="p-3.5 bg-green-950/90 border-2 border-green-700 text-green-200 text-sm font-bold rounded-2xl flex items-center gap-2.5 shadow-lg no-print animate-in fade-in">
          <Check className="w-5 h-5 text-green-400 stroke-[3]" />
          <span>{feedbackAcao}</span>
        </div>
      )}

      {/* Mensagem de Erro se houver */}
      {erro && (
        <div className="p-3.5 bg-red-950/90 border-2 border-red-800 text-red-200 text-sm font-bold rounded-2xl flex items-center gap-2.5 shadow-lg no-print">
          <AlertTriangle className="w-5 h-5 text-red-400 stroke-[2.5]" />
          <span>{erro}</span>
        </div>
      )}

      {/* Relatório para Impressão (Apenas na impressão física) */}
      <div className="hidden print:block mb-4">
        <div className="border-b-2 border-black pb-2 mb-4">
          <h1 className="text-2xl font-black text-black">Moagem Atílio - Relatório de Sacarias</h1>
          <p className="text-sm text-black">Cliente: <strong>{cliente}</strong> | Período: <strong>{MESES[mesSelecionado - 1]}/{anoSelecionado}</strong></p>
          <p className="text-xs text-black">Emitido em: {new Date().toLocaleDateString('pt-BR')}</p>
        </div>
      </div>

      {/* Lista de Movimentações com Edição no Toque e Exclusão no Ícone da Lixeira */}
      <div className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <h3 className="text-xs font-black uppercase tracking-wider text-slate-400">
            Movimentações do Período ({movimentacoes.length})
          </h3>
          <span className="text-[11px] text-slate-500 font-semibold no-print">
            Toque para editar
          </span>
        </div>

        {carregando ? (
          <div className="space-y-3">
            {[1, 2, 3].map(n => (
              <div key={n} className="h-20 rounded-2xl bg-slate-800/50 animate-pulse border border-slate-800" />
            ))}
          </div>
        ) : movimentacoes.length === 0 ? (
          <div className="text-center py-10 px-4 bg-slate-900/50 border border-dashed border-slate-800 rounded-3xl">
            <p className="text-slate-300 text-base font-bold">
              Nenhuma movimentação em {MESES[mesSelecionado - 1]}/{anoSelecionado}.
            </p>
            <p className="text-xs text-slate-500 mt-1">
              Use os botões verdes ou vermelhos acima para registrar.
            </p>
          </div>
        ) : (
          /* Espaçamento generoso entre cartões para evitar toques acidentais */
          <div className="space-y-3.5 sm:space-y-4">
            {movimentacoes.map((mov) => {
              const isOut = mov.tipo_movimentacao === 'OUT';
              const temDocs = mov.documentos && mov.documentos.length > 0;

              return (
                <div
                  key={mov.id}
                  onClick={() => abrirModalEdicao(mov)}
                  className="group relative bg-slate-900 hover:bg-slate-850 active:bg-slate-800 border-2 border-slate-800 hover:border-slate-700 rounded-2xl p-4 flex items-center justify-between shadow-md transition-all cursor-pointer touch-btn"
                  title="Toque para editar este registro"
                >
                  {/* Tipo em Português Claro e Quantidade */}
                  <div className="flex items-center gap-3.5">
                    {/* Badge ENTRADA (Verde) / SAÍDA (Vermelho) com Zero Inglês */}
                    <div className={`px-2.5 py-2 rounded-xl flex flex-col items-center justify-center min-w-[64px] ${
                      isOut
                        ? 'bg-red-950/90 text-red-400 border border-red-800/70'
                        : 'bg-green-950/90 text-green-400 border border-green-800/70'
                    }`}>
                      {isOut ? <ArrowUpRight className="w-5 h-5 stroke-[3]" /> : <ArrowDownLeft className="w-5 h-5 stroke-[3]" />}
                      <span className="text-[11px] font-black uppercase tracking-wider">
                        {isOut ? 'SAÍDA' : 'ENTRADA'}
                      </span>
                    </div>

                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xl font-black text-white">
                          {mov.quantidade} <span className="text-xs font-semibold text-slate-400">sacas</span>
                        </span>
                        <span className={`px-2 py-0.5 rounded-md text-[11px] font-black uppercase ${
                          mov.tipo_sacaria === 'normal'
                            ? 'bg-slate-800 text-slate-300 border border-slate-700'
                            : 'bg-amber-950/80 text-amber-300 border border-amber-800/60'
                        }`}>
                          {mov.tipo_sacaria}
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 mt-1 flex items-center gap-1.5 font-medium">
                        <Calendar className="w-3.5 h-3.5 text-slate-500" />
                        <span>{formatarData(mov.data_movimentacao)}</span>
                      </p>
                    </div>
                  </div>

                  {/* Lado Direito: Anexos e Botão de Exclusão (Lixeira) */}
                  <div className="flex items-center gap-2.5">
                    {temDocs && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setUrlComprovanteAtivo(mov.documentos[0]);
                        }}
                        className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 active:bg-slate-600 border border-slate-700 text-green-400 font-bold text-xs touch-btn"
                        title="Ver fotos anexadas"
                      >
                        <ImageIcon className="w-4 h-4" />
                        <span className="hidden sm:inline">Foto</span>
                        <span>({mov.documentos.length})</span>
                      </button>
                    )}

                    {/* Botão de Exclusão (Lixeira suave e de fácil toque) */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setMovimentacaoParaExcluir(mov);
                      }}
                      className="p-3 rounded-xl bg-red-950/40 hover:bg-red-900/60 active:bg-red-800 text-red-400 hover:text-red-200 border border-red-800/40 touch-btn transition-colors"
                      title="Apagar este registro"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Resumo Mensal - Layout Limpo e Acessível (Mobile-First conforme desenho) */}
      <div className="bg-slate-900 border-2 border-slate-800 rounded-3xl p-5 sm:p-6 shadow-xl space-y-4 print-card">
        
        {/* Mês e Ano de Referência (ex: SETEMBRO/2026) */}
        <div className="text-left">
          <span className="text-sm sm:text-base font-black tracking-wider text-slate-200 uppercase">
            {MESES[mesSelecionado - 1]}/{anoSelecionado}
          </span>
        </div>

        {/* Caixa de Destaque com Borda Laranja conforme o desenho de referência */}
        <div className="border-2 sm:border-[3px] border-amber-500 bg-amber-500/10 rounded-2xl sm:rounded-3xl py-7 px-4 sm:py-9 sm:px-6 flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-center shadow-lg shadow-amber-950/20">
          <span className="text-xl sm:text-2xl md:text-3xl font-black text-slate-100 tracking-wide uppercase">
            SALDO DO MÊS:
          </span>
          <span className={`text-3xl sm:text-4xl md:text-5xl font-black ${saldoMes >= 0 ? 'text-amber-400' : 'text-red-400'}`}>
            {saldoMes}
          </span>
        </div>

        {/* Botões de Ação: Compartilhar e Imprimir */}
        <div className="grid grid-cols-2 gap-3 pt-1 no-print">
          <button
            onClick={handleCompartilhar}
            className="h-14 rounded-2xl bg-slate-800 hover:bg-slate-700 active:bg-slate-600 border border-slate-700 text-white font-black text-base flex items-center justify-center gap-2.5 touch-btn transition-colors"
          >
            <Share2 className="w-5 h-5 text-green-400" />
            <span>Compartilhar</span>
          </button>

          <button
            onClick={() => window.print()}
            className="h-14 rounded-2xl bg-slate-800 hover:bg-slate-700 active:bg-slate-600 border border-slate-700 text-white font-black text-base flex items-center justify-center gap-2.5 touch-btn transition-colors"
          >
            <Printer className="w-5 h-5 text-amber-400" />
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

      {/* Pop-up / Modal de Confirmação de Exclusão (Simples e Direto) */}
      {movimentacaoParaExcluir && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-md bg-slate-900 border-2 border-red-900/60 rounded-3xl p-6 space-y-5 shadow-2xl animate-in zoom-in-95">
            
            <div className="flex items-center gap-3 text-red-400">
              <div className="w-12 h-12 rounded-2xl bg-red-950 border border-red-800 flex items-center justify-center flex-shrink-0">
                <Trash2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg sm:text-xl font-black text-white leading-tight">
                  Deseja apagar este registro?
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Esta ação não poderá ser desfeita.
                </p>
              </div>
            </div>

            {/* Resumo do registro */}
            <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-1.5">
              <div className="flex justify-between items-center text-sm font-bold">
                <span className="text-slate-400">Operação:</span>
                <span className={movimentacaoParaExcluir.tipo_movimentacao === 'IN' ? 'text-green-400' : 'text-red-400'}>
                  {movimentacaoParaExcluir.tipo_movimentacao === 'IN' ? 'ENTRADA' : 'SAÍDA'}
                </span>
              </div>
              <div className="flex justify-between items-center text-sm font-bold">
                <span className="text-slate-400">Quantidade:</span>
                <span className="text-white text-base font-black">
                  {movimentacaoParaExcluir.quantidade} sacas ({movimentacaoParaExcluir.tipo_sacaria})
                </span>
              </div>
              <div className="flex justify-between items-center text-sm font-bold">
                <span className="text-slate-400">Data:</span>
                <span className="text-slate-300">
                  {formatarData(movimentacaoParaExcluir.data_movimentacao)}
                </span>
              </div>
            </div>

            {/* Dois botões grandes: Cancelar (Cinza) e Sim, Apagar (Vermelho) */}
            <div className="grid grid-cols-2 gap-3 pt-2">
              <button
                type="button"
                disabled={excluindo}
                onClick={() => setMovimentacaoParaExcluir(null)}
                className="h-14 sm:h-16 rounded-2xl bg-slate-800 hover:bg-slate-700 active:bg-slate-600 border border-slate-700 text-white font-black text-base touch-btn transition-colors"
              >
                Cancelar
              </button>

              <button
                type="button"
                disabled={excluindo}
                onClick={handleConfirmarExclusao}
                className="h-14 sm:h-16 rounded-2xl bg-red-600 hover:bg-red-500 active:bg-red-700 text-white font-black text-base flex items-center justify-center gap-2 shadow-xl shadow-red-950/70 touch-btn transition-colors"
              >
                {excluindo ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <>
                    <Trash2 className="w-5 h-5" />
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
