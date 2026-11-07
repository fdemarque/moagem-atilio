import React from 'react';
import { ArrowDown, ArrowUp, ArrowLeft } from 'lucide-react';
import { TITLES } from '../lib/document.js';
import { formatMonth } from '../lib/format.js';
import Button from '../components/ui/Button.jsx';
import Banner from '../components/ui/Banner.jsx';
import MonthNav from '../components/ui/MonthNav.jsx';
import ReportButtons from '../components/ui/ReportButtons.jsx';
import ModuleTabs from '../components/ModuleTabs.jsx';
import BalanceCard from '../components/BalanceCard.jsx';
import MovementItem from '../components/MovementItem.jsx';

export default function ClientScreen({ module, client, credits, balance, month, setMonth, go, openDialog, onReport, busy }) {
  return <>
    <Button variant="back" icon={ArrowLeft} onClick={() => go({ module })}>Clientes de {TITLES[module]}</Button>
    <div><p className="eyebrow">Cliente</p><h1>{client}</h1></div>
    <ModuleTabs current={module} credits={credits} label={`Produto e crédito ao final de ${formatMonth(month)}`} onSelect={key => go({ module: key, client }, { replace: true })} />
    <div className="two-buttons">
      <Button variant="primary" icon={ArrowDown} onClick={() => openDialog({ kind: 'movement', type: 'IN' })}>Entrada</Button>
      <Button variant="danger" icon={ArrowUp} onClick={() => openDialog({ kind: 'movement', type: 'OUT' })}>Saída</Button>
    </div>
    <MonthNav month={month} onChange={setMonth} label="Mês do balanço" />
    <BalanceCard balance={balance} module={module} month={month} />
    <section className="stack" aria-labelledby="movements-title">
      <h2 id="movements-title">Movimentações do mês ({balance.movements.length})</h2>
      {balance.movements.length > 0 && <p className="muted">Toque no registro para editar.</p>}
      {balance.movements.map(row => <MovementItem key={row.uuid} row={row}
        onEdit={() => openDialog({ kind: 'movement', row })}
        onDelete={() => openDialog({ kind: 'delete', row })}
        onPhotos={() => openDialog({ kind: 'photos', row })} />)}
      {!balance.movements.length && <Banner>Nenhum registro neste mês. Use Entrada ou Saída para registrar.</Banner>}
    </section>
    <ReportButtons label="PDF do cliente" busy={busy} onReport={share => onReport(module, client, share)} />
  </>;
}
