import React, { useState, useEffect } from 'react';
import {
  ArrowLeft,
  ArrowDownLeft,
  ArrowUpRight,
  Printer,
  Share2,
  ChevronLeft,
  ChevronRight,
  FileText,
  Calendar,
  RefreshCw,
  Image as ImageIcon,
  Check,
  AlertCircle
} from 'lucide-react';
import { buscarMovimentacoesMensais } from '../lib/supabase';
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

  // Modais
  const [modalMovimentacaoAberto, setModalMovimentacaoAberto] = useState(false);
  const [tipoMovimentacaoAtivo, setTipoMovimentacaoAtivo] = useState('OUT');
  const [urlComprovanteAtivo, setUrlComprovanteAtivo] = useState(null);
  const [feedbackCompartilhar, setFeedbackCompartilhar] = useState('');

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

  const saldoMesNormal = totais.outNormal - totais.inNormal;
  const saldoMesPequena = totais.outPequena - totais.inPequena;

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

📦 *TOTAIS DO MÊS:*
• ENTRADA (Devolvidas):
  - Normal: ${totais.inNormal}
  - Pequena: ${totais.inPequena}

• SAÍDA (Enviadas):
  - Normal: ${totais.outNormal}
  - Pequena: ${totais.outPequena}

⚖️ *SALDO NO PERÍODO:*
- Normal: ${saldoMesNormal >= 0 ? `+${saldoMesNormal}` : saldoMesNormal}
- Pequena: ${saldoMesPequena >= 0 ? `+${saldoMesPequena}` : saldoMesPequena}

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
      // Fallback para cópia
      navigator.clipboard.writeText(textoResumo);
      setFeedbackCompartilhar('Copiado para a área de transferência!');
      setTimeout(() => setFeedbackCompartilhar(''), 3000);
    }
  };

  const abrirModalMovimentacao = (tipo) => {
    setTipoMovimentacaoAtivo(tipo);
    setModalMovimentacaoAberto(true);
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-3 pb-safe space-y-4">

      {/* Cabeçalho do Cliente com Botão Voltar */}
      <div className="flex items-center justify-between no-print pt-1">
        <div className="flex items-center gap-2.5">
          <button
            onClick={onVoltar}
            className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white touch-btn"
            title="Voltar aos clientes"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <span className="text-[11px] font-bold text-green-400 uppercase tracking-wider block">
              Painel do Cliente
            </span>
            <h1 className="text-xl font-black text-white leading-tight">
              {cliente}
            </h1>
          </div>
        </div>

        <button
          onClick={carregarMovimentacoes}
          className="p-2 rounded-xl bg-slate-800 text-slate-400 hover:text-white"
          title="Recarregar dados"
        >
          <RefreshCw className={`w-4 h-4 ${carregando ? 'animate-spin text-green-400' : ''}`} />
        </button>
      </div>

      {/* Ações Rápidas em Destaque: Botão Vermelho [OUT -] e Verde [IN +] */}
      <div className="grid grid-cols-2 gap-3 no-print">

        {/* Botão Vermelho [OUT -] */}
        <button
          onClick={() => abrirModalMovimentacao('OUT')}
          className="h-20 rounded-2xl bg-gradient-to-b from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 text-white font-black flex flex-col items-center justify-center shadow-xl shadow-red-950/70 border-2 border-red-400/30 touch-btn"
        >
          <div className="flex items-center gap-1.5">
            <ArrowUpRight className="w-6 h-6 stroke-[3]" />
            <span className="text-xl tracking-wide">SAÍDA</span>
          </div>
        </button>

        {/* Botão Verde [IN +] */}
        <button
          onClick={() => abrirModalMovimentacao('IN')}
          className="h-20 rounded-2xl bg-gradient-to-b from-green-600 to-green-700 hover:from-green-500 hover:to-green-600 text-white font-black flex flex-col items-center justify-center shadow-xl shadow-green-950/70 border-2 border-green-400/30 touch-btn"
        >
          <div className="flex items-center gap-1.5">
            <ArrowDownLeft className="w-6 h-6 stroke-[3]" />
            <span className="text-xl tracking-wide">ENTRADA</span>
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
            <span className="text-base font-black text-white">
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

      {/* Feedback de compartilhamento */}
      {feedbackCompartilhar && (
        <div className="p-3 bg-green-950/80 border border-green-700 text-green-200 text-xs font-bold rounded-xl flex items-center gap-2 no-print">
          <Check className="w-4 h-4 text-green-400" />
          <span>{feedbackCompartilhar}</span>
        </div>
      )}

      {/* Relatório para Impressão (Aparece apenas na impressão) */}
      <div className="hidden print:block mb-4">
        <div className="border-b-2 border-black pb-2 mb-4">
          <h1 className="text-2xl font-black text-black">Moagem Atílio - Relatório de Sacarias</h1>
          <p className="text-sm text-black">Cliente: <strong>{cliente}</strong> | Período: <strong>{MESES[mesSelecionado - 1]}/{anoSelecionado}</strong></p>
          <p className="text-xs text-black">Emitido em: {new Date().toLocaleDateString('pt-BR')}</p>
        </div>
      </div>

      {/* Lista / Tabela de Movimentações */}
      <div className="space-y-2">
        <div className="flex items-center justify-between px-1">
          <h3 className="text-xs font-black uppercase tracking-wider text-slate-400">
            Movimentações do Período ({movimentacoes.length})
          </h3>
        </div>

        {carregando ? (
          <div className="space-y-2">
            {[1, 2, 3].map(n => (
              <div key={n} className="h-16 rounded-xl bg-slate-800/50 animate-pulse" />
            ))}
          </div>
        ) : movimentacoes.length === 0 ? (
          <div className="text-center py-10 px-4 bg-slate-900/50 border border-dashed border-slate-800 rounded-2xl">
            <p className="text-slate-400 text-sm font-semibold">
              Nenhuma movimentação em {MESES[mesSelecionado - 1]}/{anoSelecionado}.
            </p>
            <p className="text-xs text-slate-500 mt-1">
              Use os botões SAÍDA ou ENTRADA acima para registrar.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {movimentacoes.map((mov) => {
              const isOut = mov.tipo_movimentacao === 'OUT';
              const temDocs = mov.documentos && mov.documentos.length > 0;

              return (
                <div
                  key={mov.id}
                  className="bg-slate-900 border border-slate-800 rounded-2xl p-3.5 flex items-center justify-between shadow-sm"
                >
                  {/* Tipo e Data */}
                  <div className="flex items-center gap-3">
                    <div className={`w-12 h-12 rounded-xl flex flex-col items-center justify-center font-black text-xs ${isOut
                      ? 'bg-red-950/80 text-red-400 border border-red-800/60'
                      : 'bg-green-950/80 text-green-400 border border-green-800/60'
                      }`}>
                      {isOut ? <ArrowUpRight className="w-5 h-5 stroke-[2.5]" /> : <ArrowDownLeft className="w-5 h-5 stroke-[2.5]" />}
                      <span className="text-[10px] uppercase font-black">{mov.tipo_movimentacao}</span>
                    </div>

                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-lg font-black text-white">
                          {mov.quantidade} <span className="text-xs font-semibold text-slate-400">sacas</span>
                        </span>
                        <span className={`px-2 py-0.5 rounded-md text-[11px] font-bold uppercase ${mov.tipo_sacaria === 'normal'
                          ? 'bg-slate-800 text-slate-300 border border-slate-700'
                          : 'bg-amber-950/80 text-amber-300 border border-amber-800/60'
                          }`}>
                          {mov.tipo_sacaria}
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 mt-0.5 flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5" />
                        <span>{formatarData(mov.data_movimentacao)}</span>
                      </p>
                    </div>
                  </div>

                  {/* Atalho para Documentos/Comprovantes */}
                  <div>
                    {temDocs ? (
                      <button
                        onClick={() => setUrlComprovanteAtivo(mov.documentos[0])}
                        className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-green-400 font-bold text-xs touch-btn"
                      >
                        <ImageIcon className="w-4 h-4" />
                        <span>Ver Foto ({mov.documentos.length})</span>
                      </button>
                    ) : (
                      <span className="text-xs text-slate-600 font-medium px-2 py-1">
                        Sem anexo
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Painel de Totais no Rodapé */}
      <div className="bg-slate-900 border-2 border-slate-800 rounded-3xl p-5 shadow-xl space-y-4 print-card">
        <h3 className="text-xs font-black uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
          <span>Resumo Mensal ({MESES[mesSelecionado - 1]}/{anoSelecionado})</span>
        </h3>

        <div className="grid grid-cols-2 gap-3">

          {/* Coluna ENTRADAS (Verde) */}
          <div className="bg-green-950/40 border border-green-800/50 rounded-2xl p-3 space-y-2">
            <div className="flex items-center gap-1.5 text-green-400 font-bold text-xs uppercase">
              <ArrowDownLeft className="w-4 h-4" />
              <span>Entrada</span>
            </div>
            <div className="space-y-1">
              <div className="flex justify-between text-xs">
                <span className="text-slate-400">Normal:</span>
                <span className="font-black text-white">{totais.inNormal}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-slate-400">Pequena:</span>
                <span className="font-black text-white">{totais.inPequena}</span>
              </div>
              <div className="pt-1 border-t border-green-800/40 flex justify-between text-sm font-black text-green-300">
                <span>Total:</span>
                <span>{totais.inNormal + totais.inPequena}</span>
              </div>
            </div>
          </div>

          {/* Coluna SAÍDAS (Vermelha) */}
          <div className="bg-red-950/40 border border-red-800/50 rounded-2xl p-3 space-y-2">
            <div className="flex items-center gap-1.5 text-red-400 font-bold text-xs uppercase">
              <ArrowUpRight className="w-4 h-4" />
              <span>Saída</span>
            </div>
            <div className="space-y-1">
              <div className="flex justify-between text-xs">
                <span className="text-slate-400">Normal:</span>
                <span className="font-black text-white">{totais.outNormal}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-slate-400">Pequena:</span>
                <span className="font-black text-white">{totais.outPequena}</span>
              </div>
              <div className="pt-1 border-t border-red-800/40 flex justify-between text-sm font-black text-red-300">
                <span>Total:</span>
                <span>{totais.outNormal + totais.outPequena}</span>
              </div>
            </div>
          </div>

        </div>

        {/* Saldo Líquido do Mês */}
        <div className="bg-slate-950 px-4 py-3 rounded-2xl border border-slate-800 flex items-center justify-between">
          <span className="text-xs font-bold text-slate-300 uppercase">
            Saldo de Sacarias no Mês:
          </span>
          <div className="text-right">
            <span className="text-xs font-bold text-slate-400 mr-2">
              Normal: <strong className="text-white">{saldoMesNormal >= 0 ? `+${saldoMesNormal}` : saldoMesNormal}</strong>
            </span>
            <span className="text-xs font-bold text-slate-400">
              Pequena: <strong className="text-white">{saldoMesPequena >= 0 ? `+${saldoMesPequena}` : saldoMesPequena}</strong>
            </span>
          </div>
        </div>

        {/* Botões de Ação: Compartilhar e Imprimir */}
        <div className="grid grid-cols-2 gap-3 pt-1 no-print">
          <button
            onClick={handleCompartilhar}
            className="h-13 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-white font-bold text-sm flex items-center justify-center gap-2 touch-btn"
          >
            <Share2 className="w-4 h-4 text-green-400" />
            <span>Compartilhar</span>
          </button>

          <button
            onClick={() => window.print()}
            className="h-13 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-white font-bold text-sm flex items-center justify-center gap-2 touch-btn"
          >
            <Printer className="w-4 h-4 text-amber-400" />
            <span>Imprimir</span>
          </button>
        </div>

      </div>

      {/* Modal de Nova Movimentação */}
      <MovimentacaoModal
        isOpen={modalMovimentacaoAberto}
        onClose={() => setModalMovimentacaoAberto(false)}
        cliente={cliente}
        tipoInicial={tipoMovimentacaoAtivo}
        onSucesso={() => carregarMovimentacoes()}
      />

      {/* Modal de Visualização de Comprovante */}
      <ComprovanteModal
        url={urlComprovanteAtivo}
        onClose={() => setUrlComprovanteAtivo(null)}
      />

    </div>
  );
}
