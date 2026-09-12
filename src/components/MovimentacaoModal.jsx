import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Camera,
  Upload,
  Calendar,
  Trash2,
  CheckCircle2,
  Loader2,
  ArrowDownLeft,
  ArrowUpRight,
  Plus,
  FileText
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
  const [tipoSacaria, setTipoSacaria] = useState('normal'); // 'normal' ou 'pequena'
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
      setTipoMovimentacao(movimentacaoParaEditar.tipo_movimentacao || 'OUT');
      setTipoSacaria(movimentacaoParaEditar.tipo_sacaria || 'normal');
      setQuantidade(movimentacaoParaEditar.quantidade ? String(movimentacaoParaEditar.quantidade) : '');
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

  // Adicionar quantidade rápida com botões grandes
  const adicionarQtd = (valor) => {
    const atual = parseInt(quantidade || '0', 10);
    setQuantidade(String(atual + valor));
    if (erro) setErro('');
  };

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

  // Submissão consciente do formulário
  const handleSalvar = async () => {
    const qtdNum = parseInt(quantidade, 10);

    if (!qtdNum || qtdNum <= 0) {
      setErro('Informe uma quantidade válida (maior que 0).');
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
      if (ehEdicao) {
        await atualizarMovimentacao(movimentacaoParaEditar.id, {
          tipo_movimentacao: tipoMovimentacao,
          tipo_sacaria: tipoSacaria,
          quantidade: qtdNum,
          data_movimentacao: dataMovimentacao,
          documentos: documentosUrls
        });

        onSucesso({
          editado: true,
          id: movimentacaoParaEditar.id,
          cliente,
          tipo_movimentacao: tipoMovimentacao,
          tipo_sacaria: tipoSacaria,
          quantidade: qtdNum
        });
      } else {
        await registrarMovimentacao({
          cliente,
          tipo_movimentacao: tipoMovimentacao,
          tipo_sacaria: tipoSacaria,
          quantidade: qtdNum,
          data_movimentacao: dataMovimentacao,
          documentos: documentosUrls
        });

        onSucesso({
          editado: false,
          cliente,
          tipo_movimentacao: tipoMovimentacao,
          tipo_sacaria: tipoSacaria,
          quantidade: qtdNum
        });
      }
      onClose();
    } catch (err) {
      console.error('Erro ao salvar movimentação:', err);
      setErro('Erro ao registrar movimentação. Verifique a conexão com a internet.');
    } finally {
      setSalvando(false);
    }
  };

  const isOut = tipoMovimentacao === 'OUT';

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/85 backdrop-blur-sm animate-in fade-in">
      <div className="w-full sm:max-w-lg bg-slate-900 border-t sm:border border-slate-700 rounded-t-3xl sm:rounded-3xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden animate-in slide-in-from-bottom-5">

        {/* Header com destaque em Português */}
        <div className={`px-5 py-4 border-b flex items-center justify-between ${isOut
          ? 'bg-red-950/70 border-red-800/80 text-red-100'
          : 'bg-green-950/70 border-green-800/80 text-green-100'
          }`}>
          <div>
            <div className="flex items-center gap-2">
              <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-black uppercase tracking-wider ${isOut ? 'bg-red-600 text-white' : 'bg-green-600 text-white'
                }`}>
                {isOut ? <ArrowUpRight className="w-4 h-4 stroke-[3]" /> : <ArrowDownLeft className="w-4 h-4 stroke-[3]" />}
                {isOut ? 'SAÍDA' : 'ENTRADA'}
              </span>
              <h2 className="text-base sm:text-lg font-black text-white truncate max-w-[200px]">
                {cliente}
              </h2>
            </div>
            <p className="text-xs text-slate-300 mt-0.5">
              {ehEdicao
                ? 'Editar registro de sacarias'
                : isOut
                ? 'Sacarias enviadas ao cliente'
                : 'Sacarias devolvidas pelo cliente'}
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2.5 rounded-xl bg-slate-800/80 text-slate-300 hover:text-white hover:bg-slate-700 touch-btn"
            title="Fechar formulário"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Formulário com Scroll */}
        <form onSubmit={(e) => e.preventDefault()} className="flex-1 overflow-y-auto p-5 space-y-5">

          {/* Alternância Rápida: ENTRADA / SAÍDA (Zero inglês) */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
              Tipo de Movimentação
            </label>
            <div className="grid grid-cols-2 gap-2 p-1.5 bg-slate-950 rounded-2xl border border-slate-800">
              <button
                type="button"
                onClick={() => setTipoMovimentacao('IN')}
                className={`h-13 rounded-xl font-black text-sm sm:text-base flex items-center justify-center gap-2 transition-all touch-btn ${!isOut
                  ? 'bg-green-600 text-white shadow-lg shadow-green-900/50 border border-green-400/40'
                  : 'text-slate-400 hover:text-slate-200'
                  }`}
              >
                <ArrowDownLeft className="w-5 h-5 stroke-[2.5]" />
                <span>ENTRADA</span>
              </button>

              <button
                type="button"
                onClick={() => setTipoMovimentacao('OUT')}
                className={`h-13 rounded-xl font-black text-sm sm:text-base flex items-center justify-center gap-2 transition-all touch-btn ${isOut
                  ? 'bg-red-600 text-white shadow-lg shadow-red-900/50 border border-red-400/40'
                  : 'text-slate-400 hover:text-slate-200'
                  }`}
              >
                <ArrowUpRight className="w-5 h-5 stroke-[2.5]" />
                <span>SAÍDA</span>
              </button>
            </div>
          </div>

          {/* Seleção do Tipo de Sacaria (Normal x Pequena) */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
              Tipo de Sacaria
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setTipoSacaria('normal')}
                className={`h-16 rounded-2xl border-2 flex flex-col items-center justify-center font-bold transition-all touch-btn ${tipoSacaria === 'normal'
                  ? 'border-green-500 bg-green-500/15 text-white shadow-lg shadow-green-950/50'
                  : 'border-slate-700 bg-slate-800/80 text-slate-300 hover:border-slate-600'
                  }`}
              >
                <span className="text-base font-black tracking-wide">NORMAL</span>
                <span className="text-xs text-slate-400">50 kg</span>
              </button>

              <button
                type="button"
                onClick={() => setTipoSacaria('pequena')}
                className={`h-16 rounded-2xl border-2 flex flex-col items-center justify-center font-bold transition-all touch-btn ${tipoSacaria === 'pequena'
                  ? 'border-green-500 bg-green-500/15 text-white shadow-lg shadow-green-950/50'
                  : 'border-slate-700 bg-slate-800/80 text-slate-300 hover:border-slate-600'
                  }`}
              >
                <span className="text-base font-black tracking-wide">PEQUENA</span>
                <span className="text-xs text-slate-400">25 kg</span>
              </button>
            </div>
          </div>

          {/* Quantidade com interceptação do Enter e botões ampliados */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
              Quantidade de Sacarias
            </label>
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
                    e.currentTarget.blur(); // Apenas fecha/recolhe o teclado virtual
                  }
                }}
                placeholder="0"
                className="w-full h-20 text-center text-4xl font-black rounded-2xl bg-slate-950 border-2 border-slate-700 text-white placeholder-slate-600 focus:outline-none focus:border-green-500 focus:ring-4 focus:ring-green-500/20"
              />
              {quantidade && (
                <button
                  type="button"
                  onClick={() => setQuantidade('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 px-3.5 py-2 rounded-xl bg-slate-800 text-xs font-bold text-slate-300 hover:text-white border border-slate-700"
                >
                  Limpar
                </button>
              )}
            </div>

            {/* Botões de incremento rápido com área ampliada (+10, +50, +100, +500) */}
            <div className="grid grid-cols-4 gap-2.5 mt-3">
              {[10, 50, 100, 500].map(val => (
                <button
                  key={val}
                  type="button"
                  onClick={() => adicionarQtd(val)}
                  className="h-14 sm:h-16 rounded-2xl bg-slate-800 hover:bg-slate-700 active:bg-slate-600 border-2 border-slate-700 text-white text-base sm:text-lg font-black flex items-center justify-center gap-1 touch-btn shadow-sm"
                >
                  <Plus className="w-4 h-4 text-green-400 stroke-[3]" />
                  <span>{val}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Campo de Data */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
              Data da Movimentação
            </label>
            <div className="relative">
              <input
                type="date"
                required
                value={dataMovimentacao}
                onChange={(e) => setDataMovimentacao(e.target.value)}
                className="w-full h-14 px-4 pl-12 text-base font-bold rounded-xl bg-slate-800 border-2 border-slate-700 text-white focus:outline-none focus:border-green-500"
              />
              <Calendar className="w-5 h-5 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>

          {/* Gerenciamento de Documentos e Comprovantes */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-400">
                Comprovantes Anexados ({documentosUrls.length + arquivosParaUpload.length})
              </label>
              <span className="text-xs text-slate-500">Opcional</span>
            </div>

            {/* Botões de Ação para Fotos */}
            <div className="grid grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={() => cameraInputRef.current?.click()}
                className="h-14 rounded-2xl bg-slate-800 hover:bg-slate-700 active:bg-slate-600 border border-slate-700 flex items-center justify-center gap-2 text-white font-bold text-sm sm:text-base touch-btn"
              >
                <Camera className="w-5 h-5 text-green-400" />
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
                className="h-14 rounded-2xl bg-slate-800 hover:bg-slate-700 active:bg-slate-600 border border-slate-700 flex items-center justify-center gap-2 text-white font-bold text-sm sm:text-base touch-btn"
              >
                <Upload className="w-5 h-5 text-amber-400" />
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

            {/* Miniaturas de Documentos com Botão Vermelho de 'X' para remoção individual */}
            {(documentosUrls.length > 0 || arquivosParaUpload.length > 0) && (
              <div className="flex gap-3 mt-3 overflow-x-auto pb-2 pt-1">
                {documentosUrls.map((url, index) => {
                  const isPdf = url.toLowerCase().includes('.pdf');
                  return (
                    <div
                      key={url + index}
                      className="relative w-20 h-20 rounded-2xl overflow-hidden border-2 border-slate-700 bg-slate-950 flex-shrink-0 flex items-center justify-center shadow-md"
                    >
                      {isPdf ? (
                        <div className="flex flex-col items-center justify-center text-red-400 p-1">
                          <FileText className="w-7 h-7" />
                          <span className="text-[10px] font-black text-slate-300">PDF</span>
                        </div>
                      ) : (
                        <img
                          src={url}
                          alt="Comprovante"
                          className="w-full h-full object-cover"
                        />
                      )}

                      {/* Botão Vermelho 'X' sobreposto */}
                      <button
                        type="button"
                        onClick={() => removerDocumentoUrl(url)}
                        title="Remover anexo"
                        className="absolute top-1 right-1 w-6 h-6 rounded-full bg-red-600 hover:bg-red-500 text-white flex items-center justify-center shadow-md active:scale-95 touch-btn"
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
                    className="relative w-20 h-20 rounded-2xl overflow-hidden border-2 border-amber-500/50 bg-slate-950 flex-shrink-0 flex flex-col items-center justify-center p-1 text-center"
                  >
                    <Loader2 className="w-5 h-5 text-amber-400 animate-spin mb-1" />
                    <span className="text-[9px] font-black text-amber-300">Enviando</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Mensagem de Erro */}
          {erro && (
            <div className="p-3.5 rounded-2xl bg-red-950/90 border border-red-800 text-red-200 text-sm font-bold">
              {erro}
            </div>
          )}

          <div className="h-4" />
        </form>

        {/* Botão de Confirmação em Destaque (type="button", onClick consciente) */}
        <div className="p-4 bg-slate-950 border-t border-slate-800 pb-safe">
          <button
            type="button"
            disabled={salvando}
            onClick={handleSalvar}
            className={`w-full h-16 sm:h-18 rounded-2xl font-black text-lg sm:text-xl uppercase tracking-wide flex items-center justify-center gap-3 shadow-2xl transition-all touch-btn ${
              ehEdicao
                ? 'bg-amber-500 hover:bg-amber-400 active:bg-amber-600 text-slate-950 shadow-amber-950/60'
                : isOut
                ? 'bg-red-600 hover:bg-red-500 active:bg-red-700 text-white shadow-red-950/70 border-2 border-red-400/30'
                : 'bg-green-600 hover:bg-green-500 active:bg-green-700 text-white shadow-green-950/70 border-2 border-green-400/30'
            } ${salvando ? 'opacity-70 cursor-not-allowed' : ''}`}
          >
            {salvando ? (
              <>
                <Loader2 className="w-7 h-7 animate-spin" />
                <span>{ehEdicao ? 'Salvando Alterações...' : 'Gravando Movimentação...'}</span>
              </>
            ) : (
              <>
                <CheckCircle2 className="w-7 h-7 stroke-[2.5]" />
                <span>
                  {ehEdicao
                    ? 'SALVAR ALTERAÇÕES'
                    : isOut
                    ? 'CONFIRMAR SAÍDA'
                    : 'CONFIRMAR ENTRADA'}
                </span>
              </>
            )}
          </button>
        </div>

      </div>
    </div>
  );
}
