import React from 'react';
import { X, ExternalLink, Download, Image as ImageIcon } from 'lucide-react';

export default function ComprovanteModal({ url, onClose }) {
  if (!url) return null;

  const isPdf = url.toLowerCase().includes('.pdf');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/85 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg max-h-[90vh] bg-slate-900 border border-slate-700 rounded-2xl overflow-hidden shadow-2xl flex flex-col">
        
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 bg-slate-950 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <ImageIcon className="w-5 h-5 text-green-400" />
            <h3 className="font-semibold text-white text-sm">Visualizar Comprovante</h3>
          </div>
          
          <div className="flex items-center gap-2">
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="p-1.5 rounded-lg bg-slate-800 text-slate-300 hover:text-white"
              title="Abrir em nova aba"
            >
              <ExternalLink className="w-4 h-4" />
            </a>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content Viewer */}
        <div className="p-3 overflow-auto flex-1 flex items-center justify-center bg-slate-950/60 min-h-[300px]">
          {isPdf ? (
            <div className="text-center p-6 space-y-4">
              <p className="text-slate-300 text-sm">Este comprovante é um documento PDF.</p>
              <a
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-green-600 text-white font-bold hover:bg-green-500 shadow-lg"
              >
                <Download className="w-5 h-5" />
                Baixar / Visualizar PDF
              </a>
            </div>
          ) : (
            <img
              src={url}
              alt="Comprovante de sacaria"
              className="max-w-full max-h-[70vh] object-contain rounded-lg border border-slate-800"
            />
          )}
        </div>

        {/* Footer */}
        <div className="p-3 bg-slate-950 border-t border-slate-800 text-center">
          <button
            onClick={onClose}
            className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-sm touch-btn"
          >
            Fechar
          </button>
        </div>

      </div>
    </div>
  );
}
