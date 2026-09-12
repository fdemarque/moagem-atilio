import React, { useState, useRef } from 'react';
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
import { uploadComprovante, registrarMovimentacao } from '../lib/supabase';

export default function MovimentacaoModal({
  isOpen,
  onClose,
  cliente,
  tipoInicial = 'OUT',
  onSucesso
}) {
  if (!isOpen) return null;

  const [tipoMovimentacao, setTipoMovimentacao] = useState(tipoInicial); // 'IN' ou 'OUT'
  const [tipoSacaria, setTipoSacaria] = useState('normal'); // 'normal' ou 'pequena'
  const [quantidade, setQuantidade] = useState('');

  // Data atual no formato YYYY-MM-DD
  const hoje = new Date().toISOString().split('T')[0];
  const [dataMovimentacao, setDataMovimentacao] = useState(hoje);

  // Lista de arquivos anexados e upload
  const [arquivosParaUpload, setArquivosParaUpload] = useState([]); // { file, previewUrl, isUploading }
  const [documentosUrls, setDocumentosUrls] = useState([]); // URLs já enviadas
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState('');

  const cameraInputRef = useRef(null);
  const galleryInputRef = useRef(null);

  // Adicionar quantidade rápida com botões
  const adicionarQtd = (valor) => {
    const atual = parseInt(quantidade || '0', 10);
    setQuantidade(String(atual + valor));
    if (erro) setErro('');
  };

  // Processa seleção de arquivos
  const handleFilesSelected = async (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;

    setErro('');
    for (const file of files) {
      const isPdf = file.type === 'application/pdf';
      const previewUrl = isPdf ? null : URL.createObjectURL(file);

      const novoItem = {
        file,
        previewUrl,
        isPdf,
        nome: file.name,
        isUploading: true
      };

      setArquivosParaUpload(prev => [...prev, novoItem]);

      try {
        const urlPublica = await uploadComprovante(file);
        setDocumentosUrls(prev => [...prev, urlPublica]);
        setArquivosParaUpload(prev =>
          prev.map(item => item.file === file ? { ...item, isUploading: false, uploadedUrl: urlPublica } : item)
        );
      } catch (err) {
        console.error('Erro no upload do arquivo:', err);
        setErro(`Falha ao subir arquivo ${file.name}. Verifique a conexão.`);
        setArquivosParaUpload(prev => prev.filter(item => item.file !== file));
      }
    }
    // Reseta inputs
    if (e.target) e.target.value = '';
  };

  // Remover documento anexado
  const removerArquivo = (index) => {
    const item = arquivosParaUpload[index];
    if (item && item.uploadedUrl) {
      setDocumentosUrls(prev => prev.filter(url => url !== item.uploadedUrl));
    }
    setArquivosParaUpload(prev => prev.filter((_, i) => i !== index));
  };

  // Submissão do formulário
  const handleSubmit = async (e) => {
    e.preventDefault();
    const qtdNum = parseInt(quantidade, 10);

    if (!qtdNum || qtdNum <= 0) {
      setErro('Informe uma quantidade válida (maior que 0).');
      return;
    }

    if (!dataMovimentacao) {
      setErro('Selecione a data da movimentação.');
      return;
    }

    // Verifica se há uploads pendentes
    const temUploadPendente = arquivosParaUpload.some(item => item.isUploading);
    if (temUploadPendente) {
      setErro('Aguarde o término do envio dos comprovantes.');
      return;
    }

    setSalvando(true);
    setErro('');

    try {
      await registrarMovimentacao({
        cliente,
        tipo_movimentacao: tipoMovimentacao,
        tipo_sacaria: tipoSacaria,
        quantidade: qtdNum,
        data_movimentacao: dataMovimentacao,
        documentos: documentosUrls
      });

      onSucesso({
        cliente,
        tipo_movimentacao: tipoMovimentacao,
        tipo_sacaria: tipoSacaria,
        quantidade: qtdNum
      });
      onClose();
    } catch (err) {
      console.error('Erro ao salvar movimentação:', err);
      setErro('Erro ao registrar movimentação. Verifique se o banco de dados está online.');
    } finally {
      setSalvando(false);
    }
  };

  const isOut = tipoMovimentacao === 'OUT';

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/85 backdrop-blur-sm animate-in fade-in">
      <div className="w-full sm:max-w-lg bg-slate-900 border-t sm:border border-slate-700 rounded-t-3xl sm:rounded-2xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden animate-in slide-in-from-bottom-5">

        {/* Header com destaque no tipo */}
        <div className={`px-5 py-4 border-b flex items-center justify-between ${isOut
          ? 'bg-red-950/70 border-red-800/80 text-red-100'
          : 'bg-green-950/70 border-green-800/80 text-green-100'
          }`}>
          <div>
            <div className="flex items-center gap-2">
              <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-black uppercase tracking-wider ${isOut ? 'bg-red-600 text-white' : 'bg-green-600 text-white'
                }`}>
                {isOut ? <ArrowUpRight className="w-3.5 h-3.5 stroke-[3]" /> : <ArrowDownLeft className="w-3.5 h-3.5 stroke-[3]" />}
                {isOut ? 'Saída' : 'Entrada'}
              </span>
              <h2 className="text-base font-bold text-white truncate max-w-[200px]">
                {cliente}
              </h2>
            </div>
            <p className="text-xs text-slate-300 mt-0.5">
              {isOut ? 'Sacarias enviadas ao cliente' : 'Sacarias recebidas do cliente'}
            </p>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-slate-800/80 text-slate-300 hover:text-white hover:bg-slate-700 touch-btn"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Formulário com Scroll */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 space-y-5">

          {/* Alternância Rápida IN / OUT */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
              Operação
            </label>
            <div className="grid grid-cols-2 gap-2 p-1 bg-slate-950 rounded-2xl border border-slate-800">
              <button
                type="button"
                onClick={() => setTipoMovimentacao('OUT')}
                className={`h-12 rounded-xl font-black text-sm flex items-center justify-center gap-2 transition-all touch-btn ${isOut
                  ? 'bg-red-600 text-white shadow-lg shadow-red-900/50'
                  : 'text-slate-400 hover:text-slate-200'
                  }`}
              >
                <ArrowUpRight className="w-4 h-4" />
                <span>SAÍDA</span>
              </button>

              <button
                type="button"
                onClick={() => setTipoMovimentacao('IN')}
                className={`h-12 rounded-xl font-black text-sm flex items-center justify-center gap-2 transition-all touch-btn ${!isOut
                  ? 'bg-green-600 text-white shadow-lg shadow-green-900/50'
                  : 'text-slate-400 hover:text-slate-200'
                  }`}
              >
                <ArrowDownLeft className="w-4 h-4" />
                <span>ENTRADA</span>
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
                <span className="text-base font-black">NORMAL</span>
                <span className="text-xs text-slate-400">50kg</span>
              </button>

              <button
                type="button"
                onClick={() => setTipoSacaria('pequena')}
                className={`h-16 rounded-2xl border-2 flex flex-col items-center justify-center font-bold transition-all touch-btn ${tipoSacaria === 'pequena'
                  ? 'border-green-500 bg-green-500/15 text-white shadow-lg shadow-green-950/50'
                  : 'border-slate-700 bg-slate-800/80 text-slate-300 hover:border-slate-600'
                  }`}
              >
                <span className="text-base font-black">PEQUENA</span>
                <span className="text-xs text-slate-400">25kg</span>
              </button>
            </div>
          </div>

          {/* Quantidade com Teclado Numérico e Atalhos Rápidos */}
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
                placeholder="0"
                className="w-full h-18 text-center text-3xl font-black rounded-2xl bg-slate-950 border-2 border-slate-700 text-white placeholder-slate-600 focus:outline-none focus:border-green-500 focus:ring-4 focus:ring-green-500/20"
              />
              {quantidade && (
                <button
                  type="button"
                  onClick={() => setQuantidade('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 px-3 py-1.5 rounded-lg bg-slate-800 text-xs font-bold text-slate-400 hover:text-white"
                >
                  Limpar
                </button>
              )}
            </div>

            {/* Botões de incremento rápido (+10, +50, +100, +500) */}
            <div className="grid grid-cols-4 gap-2 mt-2">
              {[10, 50, 100, 500].map(val => (
                <button
                  key={val}
                  type="button"
                  onClick={() => adicionarQtd(val)}
                  className="h-11 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-sm font-black flex items-center justify-center gap-1 touch-btn"
                >
                  <Plus className="w-3.5 h-3.5 text-green-400" />
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

          {/* Upload de Comprovantes */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-400">
                Fotos e Comprovantes ({arquivosParaUpload.length})
              </label>
              <span className="text-xs text-slate-500">Opcional</span>
            </div>

            {/* Botões de Ação para Fotos */}
            <div className="grid grid-cols-2 gap-2.5">

              {/* Botão Câmera Direta */}
              <button
                type="button"
                onClick={() => cameraInputRef.current?.click()}
                className="h-14 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 flex items-center justify-center gap-2 text-white font-bold text-sm touch-btn"
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

              {/* Botão Galeria / Arquivos */}
              <button
                type="button"
                onClick={() => galleryInputRef.current?.click()}
                className="h-14 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 flex items-center justify-center gap-2 text-white font-bold text-sm touch-btn"
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

            {/* Miniaturas de Fotos Anexadas */}
            {arquivosParaUpload.length > 0 && (
              <div className="flex gap-2.5 mt-3 overflow-x-auto pb-2">
                {arquivosParaUpload.map((item, index) => (
                  <div
                    key={index}
                    className="relative w-20 h-20 rounded-xl overflow-hidden border border-slate-700 bg-slate-950 flex-shrink-0 flex items-center justify-center"
                  >
                    {item.isUploading ? (
                      <div className="flex flex-col items-center justify-center p-1 text-center">
                        <Loader2 className="w-5 h-5 text-green-400 animate-spin mb-1" />
                        <span className="text-[10px] text-slate-400">Enviando</span>
                      </div>
                    ) : item.isPdf ? (
                      <div className="flex flex-col items-center justify-center text-red-400 p-1">
                        <FileText className="w-6 h-6" />
                        <span className="text-[10px] font-bold text-slate-300 truncate w-16 text-center">PDF</span>
                      </div>
                    ) : (
                      <img
                        src={item.previewUrl}
                        alt="Comprovante"
                        className="w-full h-full object-cover"
                      />
                    )}

                    {/* Botão Excluir */}
                    {!item.isUploading && (
                      <button
                        type="button"
                        onClick={() => removerArquivo(index)}
                        className="absolute top-1 right-1 p-1 rounded-md bg-black/75 text-red-400 hover:text-white"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Mensagem de Erro */}
          {erro && (
            <div className="p-3 rounded-xl bg-red-950/80 border border-red-800 text-red-200 text-xs font-semibold">
              {erro}
            </div>
          )}

          {/* Espaço extra para não sobrepor o botão fixo */}
          <div className="h-6" />

        </form>

        {/* Botão de Confirmação Fixo no Rodapé */}
        <div className="p-4 bg-slate-950 border-t border-slate-800 pb-safe">
          <button
            type="button"
            disabled={salvando}
            onClick={handleSubmit}
            className={`w-full h-15 rounded-2xl font-black text-base flex items-center justify-center gap-2.5 shadow-xl transition-all touch-btn ${isOut
              ? 'bg-red-600 hover:bg-red-500 text-white shadow-red-950/60'
              : 'bg-green-600 hover:bg-green-500 text-white shadow-green-950/60'
              } ${salvando ? 'opacity-70 cursor-not-allowed' : ''}`}
          >
            {salvando ? (
              <>
                <Loader2 className="w-6 h-6 animate-spin" />
                <span>Gravando Movimentação...</span>
              </>
            ) : (
              <>
                <CheckCircle2 className="w-6 h-6" />
                <span>CONFIRMAR ({isOut ? 'SAÍDA' : 'ENTRADA'})</span>
              </>
            )}
          </button>
        </div>

      </div>
    </div>
  );
}
