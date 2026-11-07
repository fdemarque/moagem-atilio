import React from 'react';
import { Wheat, CloudCheck, CloudUpload, CloudOff, CloudAlert } from 'lucide-react';

const BADGES = {
  saved: [CloudCheck, 'Planilha em dia'],
  sending: [CloudUpload, 'Enviando…'],
  offline: [CloudOff, 'Sem internet'],
  error: [CloudAlert, 'Planilha sem resposta'],
  refused: [CloudAlert, 'Registro recusado'],
  access: [CloudAlert, 'Conectar planilha'],
  setup: [CloudAlert, 'Conectar planilha'],
};

export default function Header({ syncStatus }) {
  const [Icon, label] = BADGES[syncStatus.kind] || BADGES.setup;
  return <header>
    <div className="header-inner">
      <a className="brand" href="#/"><Wheat aria-hidden="true" size={32} /><span>Moagem Atílio<small>Estoque por cliente</small></span></a>
      <a className={`sync-badge ${syncStatus.kind}`} href="#/configuracoes" title={syncStatus.text} aria-label={`${label}. ${syncStatus.text} Abrir configurações.`}>
        <Icon aria-hidden="true" size={22} /><span>{label}</span>
      </a>
    </div>
  </header>;
}
