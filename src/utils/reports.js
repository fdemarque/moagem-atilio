import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { MODULES, monthlyBalance, amount } from '../lib/document.js';
import { downloadFile } from '../lib/storage.js';
export const titles = { milho: 'Milho', sacarias: 'Sacarias vazias', soja: 'Soja' };
export const units = { milho: 'kg', sacarias: 'unidades', soja: 'sacos' };
export function reportDocument(state, month, module = null, client = null) {
  const pdf = new jsPDF();
  const modules = module ? [module] : MODULES;
  for (const [i,key] of modules.entries()) {
    if(i) pdf.addPage();
    pdf.setFont('helvetica','bold'); pdf.setFontSize(17);
    pdf.text('Moagem Atílio',14,18); pdf.setFontSize(12);
    pdf.text(`${titles[key]} · ${month.split('-').reverse().join('/')} · ${client || 'Todos os clientes'}`,14,27);
    const rows = state.payload.movimentacoes.filter(r => !r.deleted_at && r.modulo === key && (!client || r.cliente === client));
    const clients = [...new Set([...state.payload.clientes.filter(c => !c.deleted_at && (!client || c.nome === client)).map(c => c.nome), ...rows.map(r => r.cliente)])].sort((a,b) => a.localeCompare(b,'pt-BR'));
    autoTable(pdf,{startY:34,head:[['Cliente',`Anterior (${units[key]})`,'Entradas','Saídas','Crédito final']],body:clients.map(name => { const b = monthlyBalance(rows.filter(r => r.cliente === name),key,month); return [name,...[b.opening,b.input,b.output,b.closing].map(n => n.toLocaleString('pt-BR'))]; }),headStyles:{fillColor:[21,128,61]},styles:{fontSize:10,overflow:'linebreak'}});
    const balance = monthlyBalance(rows,key,month);
    autoTable(pdf,{startY:pdf.lastAutoTable.finalY+10,head:[['Data','Cliente','Operação','Quantidade',`Movimento (${units[key]})`]],body:balance.movements.map(r => [r.data_movimentacao.split('-').reverse().join('/'),r.cliente,r.tipo_movimentacao === 'IN' ? 'Entrada' : 'Saída',key === 'milho' && r.tipo_movimentacao === 'OUT' ? `${r.quantidade} sacos (${r.tipo_sacaria === 'pequena' ? 25 : 50} kg)` : `${r.quantidade} ${units[key]}`,amount(r).toLocaleString('pt-BR')]),headStyles:{fillColor:[21,128,61]},styles:{fontSize:10,overflow:'linebreak'}});
  }
  const pages=pdf.getNumberOfPages();
  for(let i=1;i<=pages;i++){pdf.setPage(i);pdf.setFontSize(9);pdf.setFont('helvetica','normal');pdf.text(`Emitido em ${new Date().toLocaleString('pt-BR')} · Página ${i}/${pages}`,14,290);}
  return pdf;
}
export async function exportReport(state,month,module,client,share=false) {
  const pdf = reportDocument(state,month,module,client);
  const file = new File([pdf.output('blob')],`moagem-${module || 'geral'}-${month}.pdf`,{type:'application/pdf'});
  if(share && navigator.canShare?.({files:[file]})) {
    try { await navigator.share({files:[file],title:'Relatório Moagem Atílio'}); return; }
    catch(err){if(err.name === 'AbortError') return;}
  }
  downloadFile(file,file.name);
}
