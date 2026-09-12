import React from 'react';
import { LogOut, User, PackageCheck } from 'lucide-react';

export default function Header({ usuario, onLogout }) {
  return (
    <header className="no-print bg-white border-b-2 border-slate-300 sticky top-0 z-30 pt-safe px-4 py-3 shadow-sm">
      <div className="max-w-2xl mx-auto flex items-center justify-between">

        {/* Brand Logo & Name */}
        <div className="flex items-center gap-2.5">
          <div className="w-11 h-11 rounded-xl bg-emerald-700 flex items-center justify-center shadow-md border-2 border-emerald-900 text-white">
            <PackageCheck className="w-6 h-6 stroke-[2.5]" />
          </div>
          <div>
            <h1 className="text-lg font-black text-black leading-tight tracking-tight">
              Moagem Atílio
            </h1>
            <p className="text-xs text-slate-800 font-bold uppercase tracking-wider">
              Controle de Estoque
            </p>
          </div>
        </div>

        {/* User Badge & Logout */}
        {usuario && (
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 bg-slate-100 border-2 border-slate-300 px-3 py-1.5 rounded-lg text-xs font-black text-slate-900 shadow-sm">
              <User className="w-4 h-4 text-emerald-700 stroke-[2.5]" />
              <span className="capitalize">{usuario}</span>
            </div>

            <button
              onClick={onLogout}
              title="Sair do aplicativo"
              className="touch-btn p-2 rounded-lg bg-slate-100 hover:bg-red-50 text-slate-800 hover:text-red-700 border-2 border-slate-300 hover:border-red-400 transition-colors shadow-sm"
            >
              <LogOut className="w-4 h-4 stroke-[2.5]" />
            </button>
          </div>
        )}

      </div>
    </header>
  );
}
