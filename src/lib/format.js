import { TITLES, UNITS, amount } from './document.js';

export const formatNumber = n => Number(n).toLocaleString('pt-BR', { maximumFractionDigits: 3 });
export const formatAmount = (n, module) => `${formatNumber(n)} ${UNITS[module]}`;
export const formatDate = iso => iso.split('-').reverse().join('/');
export const formatMonth = month => new Date(`${month}-15T12:00:00`).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
export const localToday = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
export function shiftMonth(month, delta) {
  const [year, m] = month.split('-').map(Number);
  const date = new Date(year, m - 1 + delta, 1);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}
export const sackKg = row => row.tipo_sacaria === 'pequena' ? 25 : 50;
// What the operator registered, in the module's own words.
export function movementQuantity(row) {
  if (row.modulo !== 'milho') return formatAmount(row.quantidade, row.modulo);
  if (row.tipo_movimentacao === 'IN') return `${formatNumber(amount(row))} kg`;
  return `${formatNumber(row.quantidade)} ${row.quantidade === 1 ? 'saco' : 'sacos'} de ${sackKg(row)} kg`;
}
export const normalize = text => text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('pt-BR').trim();
export { TITLES, UNITS };
