import React from 'react';
import { formatAmount, formatMonth, formatNumber } from '../lib/format.js';

export default function BalanceCard({ balance, module, month }) {
  return <section className="card stack" aria-labelledby="balance-title">
    <h2 id="balance-title">Balanço de {formatMonth(month)}</h2>
    <dl className="balance-grid">
      <div><dt>Crédito anterior</dt><dd>{formatAmount(balance.opening, module)}</dd></div>
      <div><dt>Entradas</dt><dd>{formatAmount(balance.input, module)}</dd></div>
      <div><dt>Saídas</dt><dd>{formatAmount(balance.output, module)}</dd></div>
    </dl>
    <div className="credit">
      <span>Crédito ao final do mês</span>
      <strong className={balance.closing < 0 ? 'negative' : ''}>{formatAmount(balance.closing, module)}</strong>
      {module === 'milho' && <small>Equivale a {formatNumber(Math.floor(balance.closing / 50))} sacos de 50 kg</small>}
    </div>
  </section>;
}
