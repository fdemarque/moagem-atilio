import React, { useState } from 'react';
import { ChevronRight, UserPlus, ArrowLeft } from 'lucide-react';
import { TITLES } from '../lib/document.js';
import { formatAmount, normalize } from '../lib/format.js';
import Button from '../components/ui/Button.jsx';
import ModuleTabs from '../components/ModuleTabs.jsx';
import ReportButtons from '../components/ui/ReportButtons.jsx';
import MonthNav from '../components/ui/MonthNav.jsx';
import Banner from '../components/ui/Banner.jsx';

export default function ClientListScreen({ module, clients, go, onNewClient, month, setMonth, onReport, busy }) {
  const [search, setSearch] = useState('');
  const term = normalize(search);
  const visible = clients.filter(c => normalize(c.name).includes(term));
  return <>
    <Button variant="back" icon={ArrowLeft} onClick={() => go({})}>Produtos</Button>
    <div><p className="eyebrow">Clientes</p><h1>{TITLES[module]}</h1></div>
    <ModuleTabs current={module} onSelect={key => go({ module: key }, { replace: true })} />
    <Button variant="primary" icon={UserPlus} onClick={onNewClient}>Novo cliente</Button>
    {clients.length > 0 && <label>Buscar cliente<input type="search" placeholder="Digite parte do nome" value={search} onChange={e => setSearch(e.target.value)} /></label>}
    <ul className="client-list" aria-label={`Clientes com crédito em ${TITLES[module]}`}>
      {visible.map(({ name, credit }) => <li key={name}>
        <a className="client-card" href={`#/${module}/${encodeURIComponent(name)}`}>
          <span><strong>{name}</strong><small>Crédito: <b className={credit < 0 ? 'negative' : ''}>{formatAmount(credit, module)}</b></small></span>
          <ChevronRight aria-hidden="true" />
        </a>
      </li>)}
    </ul>
    {!clients.length && <Banner>Nenhum cliente cadastrado. Use Novo cliente para adicionar.</Banner>}
    {clients.length > 0 && !visible.length && <Banner>Nenhum cliente com “{search}”.</Banner>}
    <section className="card stack" aria-labelledby="module-report">
      <h2 id="module-report">Relatório de {TITLES[module]}</h2>
      <MonthNav month={month} onChange={setMonth} label="Mês do relatório" />
      <ReportButtons label="relatório" busy={busy} onReport={share => onReport(module, null, share)} />
    </section>
  </>;
}
