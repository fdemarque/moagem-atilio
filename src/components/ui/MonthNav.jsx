import React, { useId } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { shiftMonth } from '../../lib/format.js';

export default function MonthNav({ month, onChange, label = 'Mês' }) {
  const id = useId();
  return <div className="month-nav">
    <label htmlFor={id}>{label}</label>
    <div className="month-controls">
      <button type="button" className="secondary" aria-label="Mês anterior" onClick={() => onChange(shiftMonth(month, -1))}><ChevronLeft aria-hidden="true" size={30} /></button>
      <input id={id} type="month" value={month} onChange={e => { if (e.target.value) onChange(e.target.value); }} />
      <button type="button" className="secondary" aria-label="Próximo mês" onClick={() => onChange(shiftMonth(month, 1))}><ChevronRight aria-hidden="true" size={30} /></button>
    </div>
  </div>;
}
