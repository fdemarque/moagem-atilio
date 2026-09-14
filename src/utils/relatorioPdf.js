import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { extrairPesoKg } from '../lib/supabase.js';

const MESES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
];

function formatarData(dataStr) {
  if (!dataStr) return '-';
  const partes = dataStr.split('-');
  if (partes.length === 3) {
    return `${partes[2]}/${partes[1]}/${partes[0]}`;
  }
  return dataStr;
}

/**
 * Gera um documento PDF estruturado com tabelas de entradas, saídas e resumo de crédito.
 */
export function gerarRelatorioMensalPdf({ cliente, mes, ano, movimentacoes, totaisMes, saldoMesKg }) {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  const mesNome = MESES[mes - 1] || `Mês ${mes}`;
  const dataHoraEmissao = new Date().toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });

  // 1. Cabeçalho Institucional
  doc.setFillColor(21, 128, 61); // Verde Moagem Atílio (#15803D)
  doc.rect(0, 0, 210, 24, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(15);
  doc.setTextColor(255, 255, 255);
  doc.text('MOAGEM ATÍLIO - RELATÓRIO MENSAL', 14, 15);

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text('Controle de Movimentação e Estoque', 210 - 14, 15, { align: 'right' });

  // 2. Informações do Cliente e Emissão
  let yPos = 32;
  doc.setTextColor(30, 41, 59); // slate-800
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text(`Cliente: ${cliente}`, 14, yPos);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.text(`Período de Referência: ${mesNome} / ${ano}`, 14, yPos + 6);
  doc.text(`Emissão: ${dataHoraEmissao}`, 210 - 14, yPos + 6, { align: 'right' });

  yPos += 14;

  // Filtragem e ordenação cronológica das movimentações
  const entradas = movimentacoes
    .filter(m => m.tipo_movimentacao === 'IN')
    .sort((a, b) => a.data_movimentacao.localeCompare(b.data_movimentacao));

  const saidas = movimentacoes
    .filter(m => m.tipo_movimentacao === 'OUT')
    .sort((a, b) => a.data_movimentacao.localeCompare(b.data_movimentacao));

  // 3. Tabela 1: ENTRADAS (Milho a Granel)
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(21, 128, 61);
  doc.text('1. ENTRADAS (Milho a Granel)', 14, yPos);
  yPos += 3;

  const entradasLinhas = entradas.length > 0
    ? entradas.map(m => [
        formatarData(m.data_movimentacao),
        `${extrairPesoKg(m).toLocaleString('pt-BR')} kg`
      ])
    : [['-', 'Nenhuma entrada registrada neste mês.']];

  autoTable(doc, {
    startY: yPos,
    head: [['Data', 'Quantidade Recebida (kg)']],
    body: entradasLinhas,
    foot: entradas.length > 0
      ? [['TOTAL DE ENTRADAS', `${totaisMes.entradasKg.toLocaleString('pt-BR')} kg`]]
      : undefined,
    theme: 'striped',
    headStyles: {
      fillColor: [21, 128, 61],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 9
    },
    bodyStyles: {
      textColor: [15, 23, 42],
      fontSize: 9
    },
    footStyles: {
      fillColor: [240, 253, 244],
      textColor: [21, 128, 61],
      fontStyle: 'bold',
      fontSize: 9.5
    },
    columnStyles: {
      0: { cellWidth: 60, halign: 'left' },
      1: { cellWidth: 122, halign: 'left' }
    },
    margin: { left: 14, right: 14 }
  });

  yPos = doc.lastAutoTable.finalY + 12;

  // 4. Tabela 2: SAÍDAS (Sacarias)
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(185, 28, 28); // Vermelho Moagem Atílio (#B91C1C)
  doc.text('2. SAÍDAS (Sacarias Retiradas)', 14, yPos);
  yPos += 3;

  const saidasLinhas = saidas.length > 0
    ? saidas.map(m => {
        const peso = extrairPesoKg(m);
        const normais = m.tipo_sacaria === 'normal' ? m.quantidade : 0;
        const pequenas = m.tipo_sacaria === 'pequena' ? m.quantidade : 0;
        return [
          formatarData(m.data_movimentacao),
          normais > 0 ? `${normais} un` : '-',
          pequenas > 0 ? `${pequenas} un` : '-',
          `${peso.toLocaleString('pt-BR')} kg`
        ];
      })
    : [['-', '-', '-', 'Nenhuma saída registrada neste mês.']];

  autoTable(doc, {
    startY: yPos,
    head: [['Data', 'Sacos Normais (50kg)', 'Sacos Pequenos (25kg)', 'Peso Total Abatido (kg)']],
    body: saidasLinhas,
    foot: saidas.length > 0
      ? [[
          'TOTAIS',
          `${totaisMes.sacasNormais} un`,
          `${totaisMes.sacasPequenas} un`,
          `${totaisMes.saidasKg.toLocaleString('pt-BR')} kg`
        ]]
      : undefined,
    theme: 'striped',
    headStyles: {
      fillColor: [185, 28, 28],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 9
    },
    bodyStyles: {
      textColor: [15, 23, 42],
      fontSize: 9
    },
    footStyles: {
      fillColor: [254, 242, 242],
      textColor: [185, 28, 28],
      fontStyle: 'bold',
      fontSize: 9.5
    },
    columnStyles: {
      0: { cellWidth: 42, halign: 'left' },
      1: { cellWidth: 46, halign: 'left' },
      2: { cellWidth: 46, halign: 'left' },
      3: { cellWidth: 48, halign: 'left' }
    },
    margin: { left: 14, right: 14 }
  });

  yPos = doc.lastAutoTable.finalY + 12;

  // Verifica se precisa de nova página para o quadro de fechamento
  if (yPos > 240) {
    doc.addPage();
    yPos = 20;
  }

  // 5. Quadro de Fechamento (Resumo do Crédito)
  const estimativaSacas = Math.floor(saldoMesKg / 50);

  // Fundo do box de fechamento
  doc.setFillColor(254, 249, 195); // Amarelo suave pastel (#FEF9C3 / amber-100)
  doc.setDrawColor(217, 119, 6); // amber-600 borda
  doc.setLineWidth(0.6);
  doc.roundedRect(14, yPos, 210 - 28, 38, 3, 3, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(120, 53, 15); // amber-900
  doc.text('RESUMO DO CRÉDITO DO CLIENTE (FECHAMENTO DO MÊS)', 20, yPos + 7);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9.5);
  doc.setTextColor(51, 65, 85);
  doc.text(`Total Entradas: ${totaisMes.entradasKg.toLocaleString('pt-BR')} kg`, 20, yPos + 15);
  doc.text(`Total Saídas: ${totaisMes.saidasKg.toLocaleString('pt-BR')} kg (${totaisMes.totalSacas} sacas)`, 20, yPos + 21);

  // Valor em destaque
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(15, 23, 42);
  doc.text('CRÉDITO DISPONÍVEL (kg):', 20, yPos + 30);

  doc.setFontSize(14);
  if (saldoMesKg >= 0) {
    doc.setTextColor(21, 128, 61); // verde
    doc.text(`${saldoMesKg.toLocaleString('pt-BR')} kg`, 82, yPos + 30);
  } else {
    doc.setTextColor(185, 28, 28); // vermelho
    doc.text(`${saldoMesKg.toLocaleString('pt-BR')} kg`, 82, yPos + 30);
  }

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(71, 85, 105);
  doc.text(`(Equivalente a cerca de ${estimativaSacas} sacas de 50kg)`, 135, yPos + 30);

  // Rodapé da página
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(148, 163, 184);
    doc.text(
      `Moagem Atílio - Relatório Mensal de Estoque | Página ${i} de ${totalPages}`,
      105,
      290,
      { align: 'center' }
    );
  }

  return doc;
}

/**
 * Encapsula o documento jsPDF em um objeto File e compartilha via Web Share API
 * ou faz download direto como fallback.
 */
export async function exportarOuCompartilharPdf({
  cliente,
  mes,
  ano,
  movimentacoes,
  totaisMes,
  saldoMesKg,
  forcarDownload = false
}) {
  const doc = gerarRelatorioMensalPdf({
    cliente,
    mes,
    ano,
    movimentacoes,
    totaisMes,
    saldoMesKg
  });

  const mesNome = MESES[mes - 1] || `Mes_${mes}`;
  const nomeLimpoCliente = cliente.replace(/[^a-zA-Z0-9_-]/g, '_');
  const nomeArquivo = `relatorio_${nomeLimpoCliente}_${mesNome}_${ano}.pdf`;

  if (forcarDownload) {
    doc.save(nomeArquivo);
    return { success: true, method: 'download' };
  }

  const pdfBlob = doc.output('blob');
  const pdfFile = new File([pdfBlob], nomeArquivo, { type: 'application/pdf' });

  if (
    typeof navigator !== 'undefined' &&
    navigator.canShare &&
    navigator.canShare({ files: [pdfFile] })
  ) {
    try {
      await navigator.share({
        files: [pdfFile],
        title: `Relatório Mensal - ${cliente}`,
        text: `Segue o relatório de movimentação de ${cliente} referente a ${mesNome}/${ano}.`
      });
      return { success: true, method: 'share' };
    } catch (err) {
      if (err.name === 'AbortError') {
        return { success: false, method: 'cancelled' };
      }
      console.warn('Falha no Web Share API, recorrendo a download:', err);
      doc.save(nomeArquivo);
      return { success: true, method: 'download_fallback' };
    }
  } else {
    // Fallback: download direto do PDF
    doc.save(nomeArquivo);
    return { success: true, method: 'download' };
  }
}
