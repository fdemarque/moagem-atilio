import React from 'react';
import { MODULES, TITLES } from '../lib/document.js';
import { formatAmount } from '../lib/format.js';
import { MODULE_ICONS } from './modules.js';

// Product switcher. Inside a client it keeps the client and month, and shows
// each product's credit so the three balances can be compared at a glance.
export default function ModuleTabs({ current, credits, label = 'Produto', onSelect }) {
  return <nav className="module-tabs" aria-label={label}>
    {MODULES.map(key => {
      const Icon = MODULE_ICONS[key], active = key === current;
      return <button type="button" key={key} className={`module-tab ${key}${active ? ' active' : ''}`} aria-current={active ? 'page' : undefined} onClick={() => !active && onSelect(key)}>
        <Icon aria-hidden="true" size={26} />
        <span className="tab-name">{TITLES[key]}</span>
        {credits && <span className={`tab-credit${credits[key] < 0 ? ' negative' : ''}`}>{formatAmount(credits[key], key)}</span>}
      </button>;
    })}
  </nav>;
}
