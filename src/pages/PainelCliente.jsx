import React, { useState, useEffect } from 'react';
import {
  ArrowLeft,
  ArrowDown,
  ArrowUp,
  Share2,
  ChevronLeft,
  ChevronRight,
  Calendar,
  RefreshCw,
  Image as ImageIcon,
  Check,
  Trash2,
  Loader2,
  AlertTriangle,
  FileDown
} from 'lucide-react';
import {
  buscarMovimentacoesMensais,
  deletarMovimentacao,
  obterSaldoTotalCliente,
  extrairPesoKg
} from '../lib/supabase';
import { exportarOuCompartilharPdf } from '../utils/relatorioPdf';
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
  const [saldoGeral, setSaldoGeral] = useState({
    saldoTotalKg: 0,
    estimativaSacas: 0,
    totalEntradasKg: 0,
    totalSaidasKg: 0,
    totalMovimentacoes: 0
  });
  const [carregando, setCarregando] = useState(true);
  const [gerandoPdf, setGerandoPdf] = useState(false);
  const [erro, setErro] = useState('');

  // Modais e Estados de Ação
  const [modalMovimentacaoAberto, setModalMovimentacaoAberto] = useState(false);
  const [tipoMovimentacaoAtivo, setTipoMovimentacaoAtivo] = useState('OUT');
  const [movimentacaoParaEditar, setMovimentacaoParaEditar] = useState(null);
  const [movimentacaoParaExcluir, setMovimentacaoParaExcluir] = useState(null);
  const [excluindo, setExcluindo] = useState(false);

  const [urlComprovanteAtivo, setUrlComprovanteAtivo] = useState(null);
  const [feedbackAcao, setFeedbackAcao] = useState('');

  const carregarDados = async () => {
    setCarregando(true);
    setErro('');
    try {
      const [dadosMensais, saldoTotal] = await Promise.all([
        buscarMovimentacoesMensais(cliente, mesSelecionado, anoSelecionado),
        obterSaldoTotalCliente(cliente)
      ]);
      setMovimentacoes(dadosMensais);
      setSaldoGeral(saldoTotal);
    } catch (err) {
      console.error('Erro ao carregar dados do cliente:', err);
      setErro('Falha ao obter movimentações deste período.');
    } finally {
      setCarregando(false);
    }
  };

  useEffect(() => {
    carregarDados();
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

  // Cálculo de Totais do Mês em kg e sacas
  const totaisMes = movimentacoes.reduce(
    (acc, m) => {
      const peso = extrairPesoKg(m);
      const qtd = m.quantidade || 0;

      if (m.tipo_movimentacao === 'IN') {
        acc.entradasKg += peso;
      } else {
        acc.saidasKg += peso;
        acc.totalSacas += qtd;
        if (m.tipo_sacaria === 'pequena') {
          acc.sacasPequenas += qtd;
        } else {
          acc.sacasNormais += qtd;
        }
      }
      return acc;
    },
    { entradasKg: 0, saidasKg: 0, totalSacas: 0, sacasNormais: 0, sacasPequenas: 0 }
  );

  const saldoMesKg = totaisMes.entradasKg - totaisMes.saidasKg;
  const estimativaSacasMes = Math.floor(saldoMesKg / 50);

  // Formatação de data BR (dd/mm/aaaa)
  const formatarData = (dataStr) => {
    if (!dataStr) return '-';
    const partes = dataStr.split('-');
    if (partes.length === 3) {
      return `${partes[2]}/${partes[1]}/${partes[0]}`;
    }
    return dataStr;
  };

  // Ação de Gerar / Compartilhar Relatório PDF
  const handleGerarPdf = async (forcarDownload = false) => {
    try {
      setGerandoPdf(true);
      setErro('');
      const resultado = await exportarOuCompartilharPdf({
        cliente,
        mes: mesSelecionado,
        ano: anoSelecionado,
        movimentacoes,
        totaisMes,
        saldoMesKg,
        forcarDownload
      });

      if (resultado.method === 'share') {
        setFeedbackAcao('Relatório PDF compartilhado com sucesso!');
      } else if (resultado.method === 'download' || resultado.method === 'download_fallback') {
        setFeedbackAcao('Download do relatório PDF iniciado!');
      }
      setTimeout(() => setFeedbackAcao(''), 3500);
    } catch (err) {
      console.error('Erro ao processar relatório PDF:', err);
      setErro('Não foi possível gerar o arquivo PDF.');
    } finally {
      setGerandoPdf(false);
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
    carregarDados();
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
      await carregarDados();
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
      <div className="flex items-center justify-between pt-1">
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
          onClick={carregarDados}
          className="p-3 rounded-xl bg-slate-100 hover:bg-slate-200 border-2 border-slate-400 text-black touch-btn shadow-sm"
          title="Recarregar dados"
        >
          <RefreshCw className={`w-5 h-5 text-emerald-800 stroke-[2.5] ${carregando ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Botões de Ação Superior posicionados logo abaixo do cabeçalho */}
      <div className="grid grid-cols-2 gap-3">

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
      <div className="bg-white border-2 border-slate-300 rounded-xl p-3 shadow-sm">
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
        <div className="p-3.5 bg-emerald-100 border-2 border-emerald-800 text-emerald-950 text-sm font-black rounded-xl flex items-center gap-2.5 shadow-sm animate-in fade-in">
          <Check className="w-5 h-5 text-emerald-800 stroke-[3]" />
          <span>{feedbackAcao}</span>
        </div>
      )}

      {/* Mensagem de Erro se houver */}
      {erro && (
        <div className="p-3.5 bg-red-100 border-2 border-red-800 text-red-950 text-sm font-black rounded-xl flex items-center gap-2.5 shadow-sm">
          <AlertTriangle className="w-5 h-5 text-red-800 stroke-[2.5]" />
          <span>{erro}</span>
        </div>
      )}

      {/* Lista de Movimentações (Cartões com Fundo Branco e Borda Sólida Cinza Escura) */}
      <div className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <h3 className="text-xs font-black uppercase tracking-wider text-slate-900">
            Movimentações do Período ({movimentacoes.length})
          </h3>
          <span className="text-xs text-slate-700 font-bold">
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
          <div className="space-y-3.5 sm:space-y-4">
            {movimentacoes.map((mov) => {
              const isOut = mov.tipo_movimentacao === 'OUT';
              const pesoKg = extrairPesoKg(mov);
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
                  {/* Badge Visual e Detalhes da Movimentação */}
                  <div className="flex items-center gap-3.5">
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
                      {!isOut ? (
                        <div className="flex flex-wrap items-baseline gap-2">
                          <span className="text-xl sm:text-2xl font-black text-black">
                            {pesoKg.toLocaleString('pt-BR')} kg
                          </span>
                          <span className="px-2 py-0.5 rounded-md text-[11px] font-black uppercase bg-white border-2 border-emerald-300 text-emerald-950 shadow-xs">
                            Granel
                          </span>
                        </div>
                      ) : (
                        <div className="flex flex-wrap items-baseline gap-1.5">
                          <span className="text-xl sm:text-2xl font-black text-black">
                            {mov.quantidade} {mov.quantidade === 1 ? 'saca' : 'sacas'}
                          </span>
                          <span className="text-xs sm:text-sm font-bold text-slate-800">
                            ({mov.tipo_sacaria === 'pequena' ? 'Pequena' : 'Normal'} - {pesoKg.toLocaleString('pt-BR')} kg)
                          </span>
                        </div>
                      )}

                      <p className="text-xs text-slate-700 mt-1 flex items-center gap-1.5 font-bold">
                        <Calendar className="w-3.5 h-3.5 text-slate-600" />
                        <span>{formatarData(mov.data_movimentacao)}</span>
                      </p>
                    </div>
                  </div>

                  {/* Lado Direito: Anexos e Botão de Lixeira */}
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

      {/* Card de Fechamento: Balanço do Mês e Destaque CRÉDITO */}
      <div className="bg-white border-2 border-slate-300 rounded-2xl p-5 sm:p-6 shadow-sm space-y-4">

        {/* Mês e Ano de Referência */}
        <div className="flex items-center justify-between">
          <span className="text-sm sm:text-base font-black tracking-wider text-slate-900 uppercase">
            Balanço de {MESES[mesSelecionado - 1]}/{anoSelecionado}
          </span>
          <span className="text-xs font-bold text-slate-600">
            {movimentacoes.length} {movimentacoes.length === 1 ? 'registro' : 'registros'}
          </span>
        </div>

        {/* Resumo em 2 colunas: Entradas do mês e Saídas do mês */}
        <div className="grid grid-cols-2 gap-2.5 text-xs font-bold">
          <div className="p-3 rounded-xl bg-emerald-50 border-2 border-emerald-200">
            <span className="text-emerald-900 block text-[11px] uppercase font-black">Entradas no Mês</span>
            <span className="text-base sm:text-lg font-black text-black">
              {totaisMes.entradasKg.toLocaleString('pt-BR')} kg
            </span>
          </div>

          <div className="p-3 rounded-xl bg-red-50 border-2 border-red-200">
            <span className="text-red-900 block text-[11px] uppercase font-black">Saídas no Mês</span>
            <span className="text-base sm:text-lg font-black text-black">
              {totaisMes.saidasKg.toLocaleString('pt-BR')} kg
            </span>
            <span className="text-[10px] text-slate-600 block">
              ({totaisMes.totalSacas} sacas retiradas)
            </span>
          </div>
        </div>

        {/* Card Amarelo em Destaque: Nomenclatura CRÉDITO */}
        <div className="bg-amber-100 border-2 border-amber-300 rounded-xl py-6 px-4 sm:py-7 sm:px-6 flex flex-col items-center justify-center text-center shadow-sm">
          <span className="text-lg sm:text-xl font-black text-slate-900 tracking-wider uppercase">
            CRÉDITO
          </span>
          <span className={`text-4xl sm:text-5xl font-black mt-1 ${saldoMesKg >= 0 ? 'text-black' : 'text-red-700'}`}>
            {saldoMesKg >= 0 ? '+' : ''}{saldoMesKg.toLocaleString('pt-BR')} kg
          </span>
          <span className="text-xs sm:text-sm font-bold text-slate-700 mt-1">
            Equivalente a cerca de {estimativaSacasMes} sacas normais (50kg)
          </span>
        </div>

        {/* Botões de Ação: Compartilhar PDF e Baixar PDF */}
        <div className="grid grid-cols-2 gap-3 pt-1">
          <button
            type="button"
            disabled={gerandoPdf}
            onClick={() => handleGerarPdf(false)}
            className="h-14 rounded-xl bg-emerald-700 hover:bg-emerald-800 active:bg-emerald-900 text-white font-black text-sm sm:text-base flex items-center justify-center gap-2 touch-btn transition-colors shadow-md border-2 border-emerald-900 disabled:opacity-70"
            title="Compartilhar relatório em PDF"
          >
            {gerandoPdf ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>Gerando...</span>
              </>
            ) : (
              <>
                <Share2 className="w-5 h-5 stroke-[2.5]" />
                <span>Compartilhar PDF</span>
              </>
            )}
          </button>

          <button
            type="button"
            disabled={gerandoPdf}
            onClick={() => handleGerarPdf(true)}
            className="h-14 rounded-xl bg-white hover:bg-slate-100 active:bg-slate-200 border-2 border-slate-400 text-black font-black text-sm sm:text-base flex items-center justify-center gap-2 touch-btn transition-colors shadow-sm disabled:opacity-70"
            title="Baixar arquivo PDF diretamente"
          >
            <FileDown className="w-5 h-5 text-amber-700 stroke-[2.5]" />
            <span>Baixar PDF</span>
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
            <div className="p-4 rounded-xl bg-slate-50 border-2 border-slate-300 space-y-2 text-black font-bold text-sm">
              <div className="flex justify-between items-center">
                <span className="text-slate-700">Operação:</span>
                <span className={movimentacaoParaExcluir.tipo_movimentacao === 'IN' ? 'text-[#15803D] font-black' : 'text-[#B91C1C] font-black'}>
                  {movimentacaoParaExcluir.tipo_movimentacao === 'IN' ? '↓ ENTRADA (Granel)' : '↑ SAÍDA (Ensaque)'}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-700">Quantidade / Peso:</span>
                <span className="text-black text-base font-black">
                  {movimentacaoParaExcluir.tipo_movimentacao === 'IN'
                    ? `${extrairPesoKg(movimentacaoParaExcluir).toLocaleString('pt-BR')} kg`
                    : `${movimentacaoParaExcluir.quantidade} sacas (${movimentacaoParaExcluir.tipo_sacaria === 'pequena' ? 'Pequena' : 'Normal'} - ${extrairPesoKg(movimentacaoParaExcluir).toLocaleString('pt-BR')} kg)`}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-700">Data:</span>
                <span className="text-slate-900">
                  {formatarData(movimentacaoParaExcluir.data_movimentacao)}
                </span>
              </div>
            </div>

            {/* Dois botões grandes: Cancelar e Sim, Apagar */}
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
