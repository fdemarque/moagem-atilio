import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Camera,
  Upload,
  Calendar,
  CheckCircle2,
  Loader2,
  ArrowDown,
  ArrowUp,
  FileText,
  Scale
} from 'lucide-react';
import { uploadComprovante, registrarMovimentacao, atualizarMovimentacao } from '../lib/supabase';

export default function MovimentacaoModal({
  isOpen,
  onClose,
  cliente,
  tipoInicial = 'OUT',
  movimentacaoParaEditar = null,
  onSucesso
}) {
  if (!isOpen) return null;

  const ehEdicao = Boolean(movimentacaoParaEditar);
  const hoje = new Date().toISOString().split('T')[0];

  const [tipoMovimentacao, setTipoMovimentacao] = useState(tipoInicial); // 'IN' ou 'OUT'
  const [tipoSacaria, setTipoSacaria] = useState('normal'); // 'normal' ou 'pequena' (apenas para OUT)
  const [quantidade, setQuantidade] = useState('');
  const [dataMovimentacao, setDataMovimentacao] = useState(hoje);
  const [documentosUrls, setDocumentosUrls] = useState([]); // URLs salvas
  const [arquivosParaUpload, setArquivosParaUpload] = useState([]); // { tempId, file, isUploading }
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState('');

  const cameraInputRef = useRef(null);
  const galleryInputRef = useRef(null);

  // Inicializa ou sincroniza campos se for edição ou nova movimentação
  useEffect(() => {
    if (movimentacaoParaEditar) {
      const tipo = movimentacaoParaEditar.tipo_movimentacao || 'OUT';
      setTipoMovimentacao(tipo);
      setTipoSacaria(movimentacaoParaEditar.tipo_sacaria === 'pequena' ? 'pequena' : 'normal');

      // Se for entrada, a quantidade é o peso em kg
      if (tipo === 'IN') {
        const pesoKg = movimentacaoParaEditar.peso_kg || movimentacaoParaEditar.quantidade || '';
        setQuantidade(pesoKg ? String(pesoKg) : '');
      } else {
        setQuantidade(movimentacaoParaEditar.quantidade ? String(movimentacaoParaEditar.quantidade) : '');
      }

      setDataMovimentacao(movimentacaoParaEditar.data_movimentacao || hoje);
      setDocumentosUrls(movimentacaoParaEditar.documentos || []);
      setArquivosParaUpload([]);
      setErro('');
    } else {
      setTipoMovimentacao(tipoInicial || 'OUT');
      setTipoSacaria('normal');
      setQuantidade('');
      setDataMovimentacao(hoje);
      setDocumentosUrls([]);
      setArquivosParaUpload([]);
      setErro('');
    }
  }, [isOpen, movimentacaoParaEditar, tipoInicial]);

  const isOut = tipoMovimentacao === 'OUT';

  // Incremento rápido
  const incrementarQuantidade = (valor) => {
    const atual = parseInt(quantidade, 10) || 0;
    setQuantidade(String(atual + valor));
    if (erro) setErro('');
  };

  // Cálculo de abatimento em tempo real para SAÍDA
  const qtdSacasNum = parseInt(quantidade, 10) || 0;
  const pesoAbatidoKg = qtdSacasNum * (tipoSacaria === 'pequena' ? 25 : 50);

  // Processa seleção de arquivos (Câmera ou Galeria)
  const handleFilesSelected = async (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;

    setErro('');
    for (const file of files) {
      const tempId = `${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      setArquivosParaUpload(prev => [...prev, { tempId, file, isUploading: true }]);

      try {
        const urlPublica = await uploadComprovante(file);
        setDocumentosUrls(prev => [...prev, urlPublica]);
        setArquivosParaUpload(prev => prev.filter(item => item.tempId !== tempId));
      } catch (err) {
        console.error('Erro no upload do arquivo:', err);
        setErro(`Falha ao subir comprovante ${file.name}. Verifique a conexão.`);
        setArquivosParaUpload(prev => prev.filter(item => item.tempId !== tempId));
      }
    }
    if (e.target) e.target.value = '';
  };

  // Remover documento existente ou recém-enviado
  const removerDocumentoUrl = (urlParaRemover) => {
    setDocumentosUrls(prev => prev.filter(url => url !== urlParaRemover));
  };

  // Submissão do formulário
  const handleSalvar = async () => {
    const qtdNum = parseInt(quantidade, 10);

    if (!qtdNum || qtdNum <= 0) {
      setErro(isOut ? 'Informe uma quantidade válida de sacas (maior que 0).' : 'Informe um peso recebido válido em quilos (maior que 0).');
      return;
    }

    if (!dataMovimentacao) {
      setErro('Selecione a data da movimentação.');
      return;
    }

    const temUploadPendente = arquivosParaUpload.some(item => item.isUploading);
    if (temUploadPendente) {
      setErro('Aguarde o término do envio dos comprovantes.');
      return;
    }

    setSalvando(true);
    setErro('');

    try {
      // Regra de negócio:
      // ENTRADA: tipo_sacaria = 'granel', quantidade = peso em kg, peso_kg = peso em kg
      // SAÍDA: tipo_sacaria = 'normal' ou 'pequena', quantidade = sacas, peso_kg = sacas * (50 ou 25)
      const sacariaFinal = isOut ? tipoSacaria : 'granel';
      const pesoKgFinal = isOut ? qtdNum * (tipoSacaria === 'pequena' ? 25 : 50) : qtdNum;

      if (ehEdicao) {
        await atualizarMovimentacao(movimentacaoParaEditar.id, {
          tipo_movimentacao: tipoMovimentacao,
          tipo_sacaria: sacariaFinal,
          quantidade: qtdNum,
          peso_kg: pesoKgFinal,
          data_movimentacao: dataMovimentacao,
          documentos: documentosUrls
        });

        onSucesso({
          editado: true,
          id: movimentacaoParaEditar.id,
          cliente,
          tipo_movimentacao: tipoMovimentacao,
          tipo_sacaria: sacariaFinal,
          quantidade: qtdNum,
          peso_kg: pesoKgFinal
        });
      } else {
        await registrarMovimentacao({
          cliente,
          tipo_movimentacao: tipoMovimentacao,
          tipo_sacaria: sacariaFinal,
          quantidade: qtdNum,
          peso_kg: pesoKgFinal,
          data_movimentacao: dataMovimentacao,
          documentos: documentosUrls
        });

        onSucesso({
          editado: false,
          cliente,
          tipo_movimentacao: tipoMovimentacao,
          tipo_sacaria: sacariaFinal,
          quantidade: qtdNum,
          peso_kg: pesoKgFinal
        });
      }
      onClose();
    } catch (err) {
      console.error('Erro ao salvar movimentação:', err);
      setErro(err.message || 'Erro ao registrar movimentação. Verifique a conexão.');
    } finally {
      setSalvando(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
      <div className="w-full sm:max-w-lg bg-white border-t-2 sm:border-2 border-slate-400 rounded-t-2xl sm:rounded-2xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden animate-in slide-in-from-bottom-5">

        {/* Header com destaque de Alto Contraste (Fundo Claro) */}
        <div className={`px-5 py-4 border-b-2 flex items-center justify-between ${isOut
            ? 'bg-red-50 border-red-700 text-black'
            : 'bg-emerald-50 border-emerald-700 text-black'
          }`}>
          <div>
            <div className="flex items-center gap-2">
              <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-black uppercase tracking-wider text-white ${isOut ? 'bg-[#B91C1C]' : 'bg-[#15803D]'
                }`}>
                {isOut ? <ArrowUp className="w-4 h-4 stroke-[3]" /> : <ArrowDown className="w-4 h-4 stroke-[3]" />}
                {isOut ? 'SAÍDA' : 'ENTRADA'}
              </span>
              <h2 className="text-lg sm:text-xl font-black text-black truncate max-w-[200px]">
                {cliente}
              </h2>
            </div>
            <p className="text-xs font-bold text-slate-700 mt-1">
              {ehEdicao
                ? `Editar registro de ${isOut ? 'saída ensacada' : 'entrada de milho a granel'}`
                : isOut
                  ? 'Retirada de sacas do saldo do cliente'
                  : 'Recebimento de carga de milho a granel'}
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2.5 rounded-xl bg-white hover:bg-slate-100 active:bg-slate-200 text-black border-2 border-slate-300 touch-btn shadow-sm"
            title="Fechar formulário"
          >
            <X className="w-5 h-5 stroke-[2.5]" />
          </button>
        </div>

        {/* Formulário com Scroll */}
        <form onSubmit={(e) => e.preventDefault()} className="flex-1 overflow-y-auto p-5 space-y-5 bg-white">

          {/* SAÍDA: Seleção do Tipo de Sacaria (NORMAL 50kg / PEQUENA 25kg) */}
          {isOut ? (
            <div>
              <label className="block text-xs font-black uppercase tracking-wider text-slate-900 mb-2">
                Tipo de Sacaria
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setTipoSacaria('normal')}
                  className={`h-16 rounded-xl border-3 flex flex-col items-center justify-center font-black transition-all touch-btn ${tipoSacaria === 'normal'
                      ? 'border-black bg-slate-100 text-black shadow-md ring-2 ring-black/10'
                      : 'border-slate-300 bg-white text-slate-800 hover:border-slate-400'
                    }`}
                >
                  <span className="text-base font-black tracking-wide">NORMAL</span>
                  <span className="text-xs font-bold text-slate-700">50 kg</span>
                </button>

                <button
                  type="button"
                  onClick={() => setTipoSacaria('pequena')}
                  className={`h-16 rounded-xl border-3 flex flex-col items-center justify-center font-black transition-all touch-btn ${tipoSacaria === 'pequena'
                      ? 'border-black bg-slate-100 text-black shadow-md ring-2 ring-black/10'
                      : 'border-slate-300 bg-white text-slate-800 hover:border-slate-400'
                    }`}
                >
                  <span className="text-base font-black tracking-wide">PEQUENA</span>
                  <span className="text-xs font-bold text-slate-700">25 kg</span>
                </button>
              </div>
            </div>
          ) : null}

          {/* ENTRADA: Campo de PESO RECEBIDO (EM QUILOS) */}
          {!isOut && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-xs font-black uppercase tracking-wider text-slate-900 flex items-center gap-1.5">
                  <Scale className="w-4 h-4 text-emerald-800" />
                  <span>PESO RECEBIDO (EM QUILOS)</span>
                </label>
                <span className="text-xs font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded">
                  Milho a granel
                </span>
              </div>

              {/* Visor Numérico de Balança em Destaque */}
              <div className="relative">
                <input
                  type="number"
                  inputMode="numeric"
                  min="1"
                  required
                  value={quantidade}
                  onChange={(e) => {
                    setQuantidade(e.target.value);
                    if (erro) setErro('');
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      e.currentTarget.blur();
                    }
                  }}
                  placeholder="0"
                  className="w-full h-20 text-center text-4xl font-black rounded-xl bg-white border-3 border-black text-black placeholder-slate-400 focus:outline-none focus:ring-4 focus:ring-emerald-200 shadow-inner pr-14"
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xl font-black text-slate-600 pointer-events-none">
                  kg
                </span>
                {quantidade && (
                  <button
                    type="button"
                    onClick={() => setQuantidade('')}
                    className="absolute left-3 top-1/2 -translate-y-1/2 px-3 py-1.5 rounded-lg bg-slate-200 hover:bg-slate-300 text-xs font-black text-black border border-slate-400 shadow-sm"
                  >
                    Limpar
                  </button>
                )}
              </div>

              {/* Botões de Incremento Rápido para Cargas Maiores: +100 kg, +500 kg, +1.000 kg, +5.000 kg */}
              <div className="grid grid-cols-4 gap-2 mt-2.5">
                {[100, 500, 1000, 5000].map((peso) => (
                  <button
                    key={peso}
                    type="button"
                    onClick={() => incrementarQuantidade(peso)}
                    className="py-2.5 px-1 rounded-xl bg-emerald-50 hover:bg-emerald-100 active:bg-emerald-200 border-2 border-emerald-300 text-emerald-950 font-black text-xs sm:text-sm touch-btn shadow-xs transition-colors"
                  >
                    +{peso >= 1000 ? `${peso / 1000}.000` : peso} kg
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* SAÍDA: Campo de QUANTIDADE DE SACAS */}
          {isOut && (
            <div>
              <label className="block text-xs font-black uppercase tracking-wider text-slate-900 mb-2">
                QUANTIDADE DE SACAS
              </label>

              {/* Visor Numérico de Sacas */}
              <div className="relative">
                <input
                  type="number"
                  inputMode="numeric"
                  min="1"
                  required
                  value={quantidade}
                  onChange={(e) => {
                    setQuantidade(e.target.value);
                    if (erro) setErro('');
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      e.currentTarget.blur();
                    }
                  }}
                  placeholder="0"
                  className="w-full h-20 text-center text-4xl font-black rounded-xl bg-white border-3 border-black text-black placeholder-slate-400 focus:outline-none focus:ring-4 focus:ring-red-200 shadow-inner pr-16"
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm sm:text-base font-black text-slate-600 pointer-events-none">
                  sacas
                </span>
                {quantidade && (
                  <button
                    type="button"
                    onClick={() => setQuantidade('')}
                    className="absolute left-3 top-1/2 -translate-y-1/2 px-3 py-1.5 rounded-lg bg-slate-200 hover:bg-slate-300 text-xs font-black text-black border border-slate-400 shadow-sm"
                  >
                    Limpar
                  </button>
                )}
              </div>

              {/* Botões de Incremento Rápido de Sacas */}
              <div className="grid grid-cols-4 gap-2 mt-2.5">
                {[5, 10, 20, 50].map((sacos) => (
                  <button
                    key={sacos}
                    type="button"
                    onClick={() => incrementarQuantidade(sacos)}
                    className="py-2.5 px-1 rounded-xl bg-slate-100 hover:bg-slate-200 active:bg-slate-300 border-2 border-slate-300 text-black font-black text-xs sm:text-sm touch-btn shadow-xs transition-colors"
                  >
                    +{sacos}
                  </button>
                ))}
              </div>

              {/* Cálculo do Abatimento em Tempo Real */}
              <div className="mt-3 p-3.5 rounded-xl bg-amber-50 border-2 border-amber-300 shadow-xs">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-amber-950 uppercase tracking-wide">
                    Abatimento do saldo:
                  </span>
                  <span className="text-base sm:text-lg font-black text-red-700">
                    Abate {pesoAbatidoKg.toLocaleString('pt-BR')} kg do saldo
                  </span>
                </div>
                <p className="text-[11px] font-semibold text-slate-600 mt-0.5">
                  {qtdSacasNum} {qtdSacasNum === 1 ? 'saca' : 'sacas'} de {tipoSacaria === 'pequena' ? '25 kg' : '50 kg'} = {pesoAbatidoKg.toLocaleString('pt-BR')} kg
                </p>
              </div>
            </div>
          )}

          {/* Campo de Data */}
          <div>
            <label className="block text-xs font-black uppercase tracking-wider text-slate-900 mb-2">
              Data da Movimentação
            </label>
            <div className="relative">
              <input
                type="date"
                required
                value={dataMovimentacao}
                onChange={(e) => setDataMovimentacao(e.target.value)}
                className="w-full h-14 px-4 pl-12 text-base font-bold rounded-xl bg-white border-2 border-slate-400 text-black focus:border-black focus:outline-none"
              />
              <Calendar className="w-5 h-5 text-slate-700 absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none stroke-[2.5]" />
            </div>
          </div>

          {/* Gerenciamento de Documentos e Comprovantes (Ticket de Pesagem / Nota Fiscal) */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-xs font-black uppercase tracking-wider text-slate-900">
                {isOut
                  ? `Comprovantes / Canhotos (${documentosUrls.length + arquivosParaUpload.length})`
                  : `Ticket de Pesagem / Nota Fiscal (${documentosUrls.length + arquivosParaUpload.length})`}
              </label>
              <span className="text-xs text-slate-600 font-bold">Opcional</span>
            </div>

            {/* Botões de Ação para Fotos */}
            <div className="grid grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={() => cameraInputRef.current?.click()}
                className="h-14 rounded-xl bg-slate-100 hover:bg-slate-200 active:bg-slate-300 border-2 border-slate-300 flex items-center justify-center gap-2 text-black font-black text-sm sm:text-base touch-btn shadow-sm"
              >
                <Camera className="w-5 h-5 text-emerald-800 stroke-[2.5]" />
                <span>Tirar Foto</span>
              </button>
              <input
                ref={cameraInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                onChange={handleFilesSelected}
              />

              <button
                type="button"
                onClick={() => galleryInputRef.current?.click()}
                className="h-14 rounded-xl bg-slate-100 hover:bg-slate-200 active:bg-slate-300 border-2 border-slate-300 flex items-center justify-center gap-2 text-black font-black text-sm sm:text-base touch-btn shadow-sm"
              >
                <Upload className="w-5 h-5 text-amber-700 stroke-[2.5]" />
                <span>Galeria / PDF</span>
              </button>
              <input
                ref={galleryInputRef}
                type="file"
                accept="image/*,application/pdf"
                multiple
                className="hidden"
                onChange={handleFilesSelected}
              />
            </div>

            {/* Miniaturas de Documentos com Botão Vermelho de 'X' */}
            {(documentosUrls.length > 0 || arquivosParaUpload.length > 0) && (
              <div className="flex gap-3 mt-3 overflow-x-auto pb-2 pt-1">
                {documentosUrls.map((url, index) => {
                  const isPdf = url.toLowerCase().includes('.pdf');
                  return (
                    <div
                      key={url + index}
                      className="relative w-20 h-20 rounded-xl overflow-hidden border-2 border-slate-400 bg-slate-100 flex-shrink-0 flex items-center justify-center shadow-sm"
                    >
                      {isPdf ? (
                        <div className="flex flex-col items-center justify-center text-red-700 p-1">
                          <FileText className="w-7 h-7 stroke-[2.5]" />
                          <span className="text-[10px] font-black text-black">PDF</span>
                        </div>
                      ) : (
                        <img
                          src={url}
                          alt="Comprovante"
                          className="w-full h-full object-cover"
                        />
                      )}

                      {/* Botão Vermelho 'X' */}
                      <button
                        type="button"
                        onClick={() => removerDocumentoUrl(url)}
                        title="Remover anexo"
                        className="absolute top-1 right-1 w-6 h-6 rounded-full bg-[#B91C1C] hover:bg-red-800 text-white flex items-center justify-center shadow-md active:scale-95 touch-btn"
                      >
                        <X className="w-3.5 h-3.5 stroke-[3]" />
                      </button>
                    </div>
                  );
                })}

                {/* Itens em upload */}
                {arquivosParaUpload.map((item) => (
                  <div
                    key={item.tempId}
                    className="relative w-20 h-20 rounded-xl overflow-hidden border-2 border-amber-500 bg-amber-50 flex-shrink-0 flex flex-col items-center justify-center p-1 text-center"
                  >
                    <Loader2 className="w-5 h-5 text-amber-700 animate-spin mb-1" />
                    <span className="text-[10px] font-black text-amber-900">Enviando</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Mensagem de Erro */}
          {erro && (
            <div className="p-3.5 rounded-xl bg-red-100 border-2 border-red-700 text-red-950 text-sm font-black">
              {erro}
            </div>
          )}

          <div className="h-4" />
        </form>

        {/* Botão Principal de Confirmação: Altura de 64px, texto em caixa alta text-xl font-bold */}
        <div className="p-4 bg-white border-t-2 border-slate-300 pb-safe">
          <button
            type="button"
            disabled={salvando}
            onClick={handleSalvar}
            className={`w-full h-16 sm:h-18 rounded-xl font-black text-lg sm:text-xl uppercase tracking-wide flex items-center justify-center gap-3 shadow-md border-2 transition-all touch-btn ${ehEdicao
                ? 'bg-amber-600 hover:bg-amber-700 active:bg-amber-800 border-amber-800 text-white'
                : isOut
                  ? 'bg-[#B91C1C] hover:bg-red-800 active:bg-red-900 border-red-950 text-white'
                  : 'bg-[#15803D] hover:bg-emerald-800 active:bg-emerald-900 border-emerald-950 text-white'
              } ${salvando ? 'opacity-70 cursor-not-allowed' : ''}`}
          >
            {salvando ? (
              <>
                <Loader2 className="w-7 h-7 animate-spin" />
                <span>{ehEdicao ? 'Salvando Alterações...' : 'Gravando Movimentação...'}</span>
              </>
            ) : (
              <>
                <CheckCircle2 className="w-7 h-7 stroke-[3]" />
                <span>
                  {ehEdicao
                    ? 'SALVAR ALTERAÇÕES'
                    : isOut
                      ? 'CONFIRMAR SAÍDA DE SACAS'
                      : 'CONFIRMAR ENTRADA DE MILHO'}
                </span>
              </>
            )}
          </button>
        </div>

      </div>
    </div>
  );
}
