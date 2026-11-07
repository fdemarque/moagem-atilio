import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { MODULES, monthlyBalance, amount, TITLES, UNITS } from '../lib/document.js';
import { formatDate, formatMonth, formatNumber, movementQuantity } from '../lib/format.js';

const GREEN = [23, 95, 50];
const n = value => formatNumber(value);

// Report content, independent of the PDF library (tested in tests/reports.test.js).
// Client report: all products of one client. Otherwise: one or all products, every client.
export function reportSections(state, month, module = null, client = null) {
  const active = state.payload.movimentacoes.filter(r => !r.deleted_at && (!client || r.cliente === client));
  const names = client ? [client] : [...new Set([...state.payload.clientes.filter(c => !c.deleted_at).map(c => c.nome), ...active.map(r => r.cliente)])].sort((a, b) => a.localeCompare(b, 'pt-BR'));
  return (module ? [module] : MODULES).map(key => {
    const rows = active.filter(r => r.modulo === key);
    const balances = names.map(name => [name, monthlyBalance(rows.filter(r => r.cliente === name), key, month)]);
    const movements = monthlyBalance(rows, key, month).movements.slice().sort((a, b) => a.data_movimentacao.localeCompare(b.data_movimentacao) || a.cliente.localeCompare(b.cliente, 'pt-BR'));
    return {
      module: key,
      title: `${TITLES[key]} (${UNITS[key]})`,
      summaryHead: [...(client ? [] : ['Cliente']), 'Crédito anterior', 'Entradas', 'Saídas', 'Crédito final'],
      summary: balances.filter(([, b]) => client || b.opening || b.input || b.output || b.closing)
        .map(([name, b]) => [...(client ? [] : [name]), n(b.opening), n(b.input), n(b.output), n(b.closing)]),
      movementsHead: ['Data', ...(client ? [] : ['Cliente']), 'Operação', 'Registrado', `Movimento (${UNITS[key]})`],
      movements: movements.map(r => [formatDate(r.data_movimentacao), ...(client ? [] : [r.cliente]), r.tipo_movimentacao === 'IN' ? 'Entrada' : 'Saída', movementQuantity(r), `${r.tipo_movimentacao === 'IN' ? '+' : '-'}${n(amount(r))}`]),
    };
  });
}

export function reportDocument(state, month, module = null, client = null) {
  const pdf = new jsPDF();
  const subject = client ? `Cliente: ${client}` : module ? `${TITLES[module]} · todos os clientes` : 'Todos os produtos e clientes';
  pdf.setFont('helvetica', 'bold'); pdf.setFontSize(20); pdf.text('Moagem Atílio', 14, 18);
  pdf.setFontSize(14); pdf.text(subject, 14, 27);
  pdf.setFont('helvetica', 'normal'); pdf.text(`Mês: ${formatMonth(month)}`, 14, 35);
  let y = 44;
  const table = (head, body) => {
    autoTable(pdf, { startY: y, head: [head], body, theme: 'grid', headStyles: { fillColor: GREEN, fontSize: 12 }, styles: { fontSize: 12, cellPadding: 2.5, overflow: 'linebreak' }, margin: { left: 14, right: 14 } });
    y = pdf.lastAutoTable.finalY + 8;
  };
  const heading = text => {
    if (y > 260) { pdf.addPage(); y = 20; }
    pdf.setFont('helvetica', 'bold'); pdf.setFontSize(15); pdf.text(text, 14, y); y += 5;
  };
  const note = text => { pdf.setFont('helvetica', 'normal'); pdf.setFontSize(12); pdf.text(text, 14, y + 3); y += 12; };
  for (const section of reportSections(state, month, module, client)) {
    heading(section.title);
    if (!section.movements.length && section.summary.every(row => row.every(cell => cell === '0' || cell === client))) { note('Sem crédito e sem movimentação no mês.'); continue; }
    if (section.summary.length) table(section.summaryHead, section.summary); else note('Nenhum cliente com crédito ou movimentação.');
    if (section.movements.length) table(section.movementsHead, section.movements); else note('Nenhuma movimentação no mês.');
    y += 4;
  }
  const pages = pdf.getNumberOfPages(), height = pdf.internal.pageSize.getHeight();
  for (let i = 1; i <= pages; i++) {
    pdf.setPage(i); pdf.setFont('helvetica', 'normal'); pdf.setFontSize(10);
    pdf.text(`Emitido em ${new Date().toLocaleString('pt-BR')} · Página ${i} de ${pages}`, 14, height - 8);
  }
  return pdf;
}

const slug = text => text.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^\w]+/g, '-').replace(/^-|-$/g, '').toLowerCase();
export function reportFile(state, month, module, client) {
  const name = client ? `moagem-cliente-${slug(client)}-${month}.pdf` : `moagem-${module || 'geral'}-${month}.pdf`;
  return new File([reportDocument(state, month, module, client).output('blob')], name, { type: 'application/pdf' });
}
