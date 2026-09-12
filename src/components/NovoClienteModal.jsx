import React, { useState } from 'react';
import { UserPlus, X, ArrowRight } from 'lucide-react';

export default function NovoClienteModal({ isOpen, onClose, onConfirm }) {
  const [nome, setNome] = useState('');
  const [erro, setErro] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    const nomeLimpo = nome.trim();
    if (!nomeLimpo) {
      setErro('Informe o nome do cliente.');
      return;
    }
    setErro('');
    onConfirm(nomeLimpo);
    setNome('');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
      <div className="w-full sm:max-w-md bg-slate-900 border-t sm:border border-slate-700 rounded-t-3xl sm:rounded-2xl overflow-hidden shadow-2xl p-5 pb-safe animate-in slide-in-from-bottom-5">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-green-500/20 text-green-400 flex items-center justify-center">
              <UserPlus className="w-5 h-5" />
            </div>
            <h2 className="text-lg font-bold text-white">Novo Cliente</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-slate-800 text-slate-400 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          <div>
            <label className="block text-sm font-semibold text-slate-300 mb-1.5">
              Nome do Cliente / Produtor
            </label>
            <input
              type="text"
              autoFocus
              value={nome}
              onChange={(e) => {
                setNome(e.target.value);
                if (erro) setErro('');
              }}
              placeholder="Ex: Fazenda Santa Maria"
              className="w-full h-14 px-4 text-base font-semibold rounded-xl bg-slate-800 border-2 border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:border-green-500 focus:ring-2 focus:ring-green-500/20"
            />
            {erro && <p className="text-red-400 text-xs font-semibold mt-1.5">{erro}</p>}
          </div>

          <p className="text-xs text-slate-400">
            Após criar o cliente, você será direcionado para registrar a primeira movimentação de sacaria.
          </p>

          <div className="pt-2 flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 h-13 rounded-xl bg-slate-800 text-slate-300 font-bold hover:bg-slate-700 touch-btn"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="flex-1 h-13 rounded-xl bg-green-600 hover:bg-green-500 text-white font-bold flex items-center justify-center gap-2 shadow-lg shadow-green-900/40 touch-btn"
            >
              <span>Continuar</span>
              <ArrowRight className="w-5 h-5" />
            </button>
          </div>
        </form>

      </div>
    </div>
  );
}
