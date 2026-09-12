import React from 'react';
import { X, ExternalLink, Download, Image as ImageIcon } from 'lucide-react';

export default function ComprovanteModal({ url, onClose }) {
  if (!url) return null;

  const isPdf = url.toLowerCase().includes('.pdf');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg max-h-[90vh] bg-white border-2 border-slate-400 rounded-2xl overflow-hidden shadow-2xl flex flex-col">
        
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 bg-slate-100 border-b-2 border-slate-300">
          <div className="flex items-center gap-2.5">
            <ImageIcon className="w-6 h-6 text-emerald-800 stroke-[2.5]" />
            <h3 className="font-black text-black text-base">Visualizar Comprovante</h3>
          </div>
          
          <div className="flex items-center gap-2">
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="p-2 rounded-lg bg-white hover:bg-slate-200 border-2 border-slate-300 text-black shadow-sm"
              title="Abrir em nova aba"
            >
              <ExternalLink className="w-5 h-5 stroke-[2.5]" />
            </a>
            <button
              onClick={onClose}
              className="p-2 rounded-lg bg-white hover:bg-slate-200 border-2 border-slate-300 text-black shadow-sm touch-btn"
            >
              <X className="w-5 h-5 stroke-[2.5]" />
            </button>
          </div>
        </div>

        {/* Content Viewer */}
        <div className="p-4 overflow-auto flex-1 flex items-center justify-center bg-slate-50 min-h-[300px]">
          {isPdf ? (
            <div className="text-center p-6 space-y-4">
              <p className="text-slate-800 font-bold text-base">Este comprovante é um documento PDF.</p>
              <a
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2.5 px-6 py-3.5 rounded-xl bg-[#15803D] hover:bg-emerald-800 text-white font-black text-base shadow-md border-2 border-emerald-950"
              >
                <Download className="w-5 h-5 stroke-[2.5]" />
                <span>Baixar / Visualizar PDF</span>
              </a>
            </div>
          ) : (
            <img
              src={url}
              alt="Comprovante de sacaria"
              className="max-w-full max-h-[70vh] object-contain rounded-xl border-2 border-slate-300 shadow-sm"
            />
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-white border-t-2 border-slate-300 text-center">
          <button
            onClick={onClose}
            className="w-full py-3.5 rounded-xl bg-slate-200 hover:bg-slate-300 active:bg-slate-400 border-2 border-slate-400 text-black font-black text-base touch-btn shadow-sm"
          >
            Fechar
          </button>
        </div>

      </div>
    </div>
  );
}
