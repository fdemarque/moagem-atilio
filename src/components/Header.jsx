import React from 'react';
import { LogOut, User, PackageCheck } from 'lucide-react';

export default function Header({ usuario, onLogout }) {
  return (
    <header className="no-print bg-slate-950 border-b border-slate-800 sticky top-0 z-30 pt-safe px-4 py-3 shadow-md">
      <div className="max-w-2xl mx-auto flex items-center justify-between">
        
        {/* Brand Logo & Name */}
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-green-600 to-green-800 flex items-center justify-center shadow-lg shadow-green-900/40">
            <PackageCheck className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-base font-bold text-white leading-tight tracking-tight">
              Moagem Atílio
            </h1>
            <p className="text-xs text-green-400 font-medium tracking-wide">
              Controle de Sacarias
            </p>
          </div>
        </div>

        {/* User Badge & Logout */}
        {usuario && (
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 bg-slate-800/90 border border-slate-700/80 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-slate-200">
              <User className="w-3.5 h-3.5 text-green-400" />
              <span className="capitalize">{usuario}</span>
            </div>

            <button
              onClick={onLogout}
              title="Sair do aplicativo"
              className="touch-btn p-2 rounded-lg bg-slate-800/80 hover:bg-red-900/40 text-slate-400 hover:text-red-400 border border-slate-700/60 transition-colors"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        )}

      </div>
    </header>
  );
}
