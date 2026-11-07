import React from 'react';
import { ChevronRight } from 'lucide-react';
import { MODULES, TITLES } from '../lib/document.js';
import { MODULE_ICONS, MODULE_HINTS } from '../components/modules.js';
import MonthNav from '../components/ui/MonthNav.jsx';
import ReportButtons from '../components/ui/ReportButtons.jsx';

export default function HomeScreen({ month, setMonth, onReport, busy, summary }) {
  return <>
    <div><h1>Produtos</h1><p className="muted">Escolha o produto para ver os clientes e o crédito de cada um.</p></div>
    <div className="module-list">
      {MODULES.map(key => {
        const Icon = MODULE_ICONS[key];
        return <a className={`module-card ${key}`} key={key} href={`#/${key}`}>
          <span className="module-icon"><Icon aria-hidden="true" size={38} /></span>
          <span><strong>{TITLES[key]}</strong><small>{MODULE_HINTS[key]}</small></span>
          <ChevronRight aria-hidden="true" />
        </a>;
      })}
    </div>
    <section className="card stack" aria-labelledby="general-report">
      <h2 id="general-report">Relatório geral</h2>
      <p className="muted">Milho, sacarias e soja de todos os clientes em um PDF.</p>
      <MonthNav month={month} onChange={setMonth} label="Mês do relatório" />
      <ReportButtons label="relatório geral" busy={busy} onReport={share => onReport(null, null, share)} />
    </section>
    <p className="muted">{summary}</p>
  </>;
}
