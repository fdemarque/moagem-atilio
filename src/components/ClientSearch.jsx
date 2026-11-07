import React, { useId, useState } from 'react';
import { ChevronRight } from 'lucide-react';
import { MODULES, TITLES } from '../lib/document.js';
import { formatAmount, normalize } from '../lib/format.js';

// Shortcut from the home screen straight to a client, opening the product
// of its latest record; the product tabs take it from there.
export default function ClientSearch({ clients, limit = 8 }) {
  const [search, setSearch] = useState('');
  const resultsId = useId();
  const term = normalize(search);
  const found = term ? clients.filter(c => normalize(c.name).includes(term)) : [];
  return <section className="card stack" aria-labelledby={`${resultsId}-title`}>
    <h2 id={`${resultsId}-title`}>Ir direto ao cliente</h2>
    <label>Nome do cliente<input type="search" placeholder="Digite parte do nome" value={search} onChange={e => setSearch(e.target.value)} aria-controls={resultsId} autoComplete="off" /></label>
    <ul id={resultsId} className="client-list" aria-live="polite">
      {found.slice(0, limit).map(c => <li key={c.name}>
        <a className="client-card" href={`#/${c.module}/${encodeURIComponent(c.name)}`}>
          <span><strong>{c.name}</strong>
            <small>{MODULES.filter(m => c.credits[m] !== 0).map(m => `${TITLES[m]}: ${formatAmount(c.credits[m], m)}`).join(' · ') || 'Sem crédito'}</small>
          </span>
          <ChevronRight aria-hidden="true" />
        </a>
      </li>)}
    </ul>
    {term && !found.length && <p className="muted">Nenhum cliente com “{search}”.</p>}
    {found.length > limit && <p className="muted">Mostrando {limit} de {found.length}. Digite mais letras do nome.</p>}
  </section>;
}
