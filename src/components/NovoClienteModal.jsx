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
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
      <div className="w-full sm:max-w-md bg-white border-t-2 sm:border-2 border-slate-400 rounded-t-2xl sm:rounded-2xl overflow-hidden shadow-2xl p-5 sm:p-6 pb-safe animate-in slide-in-from-bottom-5">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b-2 border-slate-300">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-emerald-100 border-2 border-emerald-700 text-emerald-800 flex items-center justify-center">
              <UserPlus className="w-6 h-6 stroke-[2.5]" />
            </div>
            <h2 className="text-xl font-black text-black">Novo Cliente</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 border-2 border-slate-300 text-black touch-btn shadow-sm"
          >
            <X className="w-5 h-5 stroke-[2.5]" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          <div>
            <label className="block text-sm font-black text-black mb-1.5 uppercase tracking-wide">
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
              className="w-full h-14 px-4 text-base font-bold rounded-xl bg-white border-2 border-slate-400 focus:border-black text-black placeholder-slate-500 focus:outline-none shadow-sm"
            />
            {erro && <p className="text-red-700 text-xs font-black mt-1.5">{erro}</p>}
          </div>

          <p className="text-xs font-bold text-slate-700 leading-relaxed">
            Após cadastrar o nome, você registrará a primeira movimentação de sacaria.
          </p>

          <div className="pt-2 flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 h-14 rounded-xl bg-slate-200 hover:bg-slate-300 active:bg-slate-400 border-2 border-slate-400 text-black font-black text-base touch-btn transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="flex-1 h-14 rounded-xl bg-[#15803D] hover:bg-emerald-800 active:bg-emerald-900 border-2 border-emerald-950 text-white font-black text-base flex items-center justify-center gap-2 shadow-md touch-btn transition-colors"
            >
              <span>Continuar</span>
              <ArrowRight className="w-5 h-5 stroke-[3]" />
            </button>
          </div>
        </form>

      </div>
    </div>
  );
}
