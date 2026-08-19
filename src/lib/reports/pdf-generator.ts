/**
 * Z-Raporu PDF Generator — pdfmake ile profesyonel otel raporu
 *
 * Gold-temalı kurumsal tasarım:
 * - Otel logosu + başlık
 * - 4'lü özet kutusu
 * - Oda bazlı detay tablosu (koşullu renklendirme)
 * - İşlem detayları tablosu
 * - Footer: oluşturan kullanıcı + sayfa numarası
 */

import pdfMake from 'pdfmake/build/pdfmake'
import pdfFonts from 'pdfmake/build/vfs_fonts'
import type { TDocumentDefinitions, Content, TableCell } from 'pdfmake/interfaces'
import type { ZReportData } from './report-types'
import { getLogoBase64 } from './logo-helper'

// pdfmake font kaydı
const pdfFontsAny = pdfFonts as Record<string, unknown>
const vfs = (pdfFontsAny.pdfMake as Record<string, unknown>)?.vfs ?? pdfFontsAny.vfs
;(pdfMake as unknown as Record<string, unknown>).vfs = vfs

// ─── Tema Sabitleri ──────────────────────────────────────────
const COLORS = {
  gold: '#B8860B',
  goldLight: '#FFF8E7',
  goldBorder: '#D4A843',
  text: '#1F2937',
  textLight: '#6B7280',
  green: '#059669',
  red: '#DC2626',
  blue: '#2563EB',
  white: '#FFFFFF',
  headerBg: '#1C1917',
  rowAlt: '#FEFCF3',
}

// ─── Para Formatlayıcı ──────────────────────────────────────
function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('tr-TR', {
    style: 'currency',
    currency: 'TRY',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}

// ─── Tarih Formatlayıcı ─────────────────────────────────────
function formatDateLong(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('tr-TR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  })
}

function formatDateTimeLong(dateStr: string): string {
  return new Date(dateStr).toLocaleString('tr-TR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

// ─── İşlem Türü Çevirisi ───────────────────────────────────
function translateTransactionType(type: string): string {
  switch (type) {
    case 'ROOM_CHARGE':
      return 'Konaklama'
    case 'EXTRA':
      return 'Ekstra'
    case 'PAYMENT':
      return 'Tahsilat'
    default:
      return type
  }
}

// ─── Özet Kutusu (4'lü grid) ────────────────────────────────
function buildSummarySection(data: ZReportData): Content {
  const items = [
    { label: 'Satılan Oda', value: String(data.totalRoomsSold) },
    { label: 'Oda Geliri', value: formatCurrency(data.totalRoomRevenue) },
    { label: 'Ekstra Gelir', value: formatCurrency(data.totalExtraRevenue) },
    { label: 'Toplam Tahsilat', value: formatCurrency(data.totalPayments) },
  ]

  return {
    margin: [0, 15, 0, 20] as [number, number, number, number],
    table: {
      widths: ['*', '*', '*', '*'],
      body: [
        items.map(
          (item) =>
            ({
              stack: [
                {
                  text: item.label,
                  fontSize: 8,
                  color: COLORS.gold,
                  bold: true,
                  margin: [0, 0, 0, 4] as [number, number, number, number],
                },
                {
                  text: item.value,
                  fontSize: 14,
                  bold: true,
                  color: COLORS.text,
                },
              ],
              fillColor: COLORS.goldLight,
              margin: [10, 8, 10, 8] as [number, number, number, number],
              alignment: 'center' as const,
            }) as TableCell
        ),
      ],
    },
    layout: {
      hLineWidth: () => 1,
      vLineWidth: () => 1,
      hLineColor: () => COLORS.goldBorder,
      vLineColor: () => COLORS.goldBorder,
      paddingLeft: () => 0,
      paddingRight: () => 0,
      paddingTop: () => 0,
      paddingBottom: () => 0,
    },
  }
}

// ─── Oda Bazlı Detay Tablosu ────────────────────────────────
function buildRoomBreakdownTable(data: ZReportData): Content {
  if (data.roomBreakdown.length === 0) {
    return {
      text: 'Bu tarihte oda bazlı detay bulunmamaktadır.',
      fontSize: 9,
      color: COLORS.textLight,
      italics: true,
      margin: [0, 5, 0, 15] as [number, number, number, number],
    }
  }

  const headerRow: TableCell[] = [
    { text: 'Oda No', bold: true, fontSize: 8, color: COLORS.white, fillColor: COLORS.headerBg, margin: [6, 6, 6, 6] as [number, number, number, number] },
    { text: 'Misafir', bold: true, fontSize: 8, color: COLORS.white, fillColor: COLORS.headerBg, margin: [6, 6, 6, 6] as [number, number, number, number] },
    { text: 'Gece', bold: true, fontSize: 8, color: COLORS.white, fillColor: COLORS.headerBg, alignment: 'center' as const, margin: [6, 6, 6, 6] as [number, number, number, number] },
    { text: 'Gecelik Ücret', bold: true, fontSize: 8, color: COLORS.white, fillColor: COLORS.headerBg, alignment: 'right' as const, margin: [6, 6, 6, 6] as [number, number, number, number] },
    { text: 'Tahsilat', bold: true, fontSize: 8, color: COLORS.white, fillColor: COLORS.headerBg, alignment: 'right' as const, margin: [6, 6, 6, 6] as [number, number, number, number] },
    { text: 'Bakiye', bold: true, fontSize: 8, color: COLORS.white, fillColor: COLORS.headerBg, alignment: 'right' as const, margin: [6, 6, 6, 6] as [number, number, number, number] },
  ]

  const dataRows = data.roomBreakdown.map((room, idx) => {
    const bgColor = idx % 2 === 1 ? COLORS.rowAlt : COLORS.white
    const balanceColor =
      room.balance === 0 ? COLORS.green : room.balance > 0 ? COLORS.red : COLORS.text

    return [
      { text: `#${room.roomNumber}`, fontSize: 9, bold: true, fillColor: bgColor, margin: [6, 5, 6, 5] as [number, number, number, number] },
      { text: room.guestName, fontSize: 9, fillColor: bgColor, margin: [6, 5, 6, 5] as [number, number, number, number] },
      { text: String(room.nights), fontSize: 9, alignment: 'center' as const, fillColor: bgColor, margin: [6, 5, 6, 5] as [number, number, number, number] },
      { text: formatCurrency(room.nightlyRate), fontSize: 9, alignment: 'right' as const, fillColor: bgColor, margin: [6, 5, 6, 5] as [number, number, number, number] },
      { text: formatCurrency(room.totalPayments), fontSize: 9, alignment: 'right' as const, color: COLORS.green, fillColor: bgColor, margin: [6, 5, 6, 5] as [number, number, number, number] },
      { text: formatCurrency(room.balance), fontSize: 9, alignment: 'right' as const, bold: true, color: balanceColor, fillColor: bgColor, margin: [6, 5, 6, 5] as [number, number, number, number] },
    ] as TableCell[]
  })

  // Toplam satırı
  const totalPayments = data.roomBreakdown.reduce((s, r) => s + r.totalPayments, 0)
  const totalBalance = data.roomBreakdown.reduce((s, r) => s + r.balance, 0)
  const totalBalanceColor = totalBalance === 0 ? COLORS.green : totalBalance > 0 ? COLORS.red : COLORS.text

  const totalRow: TableCell[] = [
    { text: 'TOPLAM', bold: true, fontSize: 9, colSpan: 4, fillColor: COLORS.goldLight, margin: [6, 6, 6, 6] as [number, number, number, number] },
    {}, {}, {},
    { text: formatCurrency(totalPayments), bold: true, fontSize: 9, alignment: 'right' as const, color: COLORS.green, fillColor: COLORS.goldLight, margin: [6, 6, 6, 6] as [number, number, number, number] },
    { text: formatCurrency(totalBalance), bold: true, fontSize: 9, alignment: 'right' as const, color: totalBalanceColor, fillColor: COLORS.goldLight, margin: [6, 6, 6, 6] as [number, number, number, number] },
  ]

  return {
    margin: [0, 5, 0, 20] as [number, number, number, number],
    table: {
      headerRows: 1,
      widths: [55, '*', 40, 80, 80, 80],
      body: [headerRow, ...dataRows, totalRow],
    },
    layout: {
      hLineWidth: (i: number, _node: unknown) => {
        const node = _node as { table: { body: TableCell[][] } }
        return i === 0 || i === 1 || i === node.table.body.length ? 1 : 0.5
      },
      vLineWidth: () => 0.5,
      hLineColor: (i: number) => (i <= 1 ? COLORS.headerBg : '#E5E7EB'),
      vLineColor: () => '#E5E7EB',
    },
  }
}

// ─── İşlem Detayları Tablosu ────────────────────────────────
function buildTransactionsTable(data: ZReportData): Content {
  if (data.transactions.length === 0) {
    return {
      text: 'Bu tarihte işlem detayı bulunmamaktadır.',
      fontSize: 9,
      color: COLORS.textLight,
      italics: true,
      margin: [0, 5, 0, 15] as [number, number, number, number],
    }
  }

  const headerRow: TableCell[] = [
    { text: 'Saat', bold: true, fontSize: 8, color: COLORS.white, fillColor: COLORS.headerBg, margin: [6, 6, 6, 6] as [number, number, number, number] },
    { text: 'Oda', bold: true, fontSize: 8, color: COLORS.white, fillColor: COLORS.headerBg, margin: [6, 6, 6, 6] as [number, number, number, number] },
    { text: 'Tür', bold: true, fontSize: 8, color: COLORS.white, fillColor: COLORS.headerBg, margin: [6, 6, 6, 6] as [number, number, number, number] },
    { text: 'Açıklama', bold: true, fontSize: 8, color: COLORS.white, fillColor: COLORS.headerBg, margin: [6, 6, 6, 6] as [number, number, number, number] },
    { text: 'Tutar', bold: true, fontSize: 8, color: COLORS.white, fillColor: COLORS.headerBg, alignment: 'right' as const, margin: [6, 6, 6, 6] as [number, number, number, number] },
  ]

  const dataRows = data.transactions.map((tx, idx) => {
    const bgColor = idx % 2 === 1 ? COLORS.rowAlt : COLORS.white
    let amountColor = COLORS.text
    if (tx.type === 'PAYMENT') amountColor = COLORS.green
    else if (tx.type === 'EXTRA') amountColor = COLORS.blue

    return [
      { text: tx.time, fontSize: 9, fillColor: bgColor, margin: [6, 4, 6, 4] as [number, number, number, number] },
      { text: `#${tx.roomNumber}`, fontSize: 9, bold: true, fillColor: bgColor, margin: [6, 4, 6, 4] as [number, number, number, number] },
      { text: translateTransactionType(tx.type), fontSize: 9, fillColor: bgColor, margin: [6, 4, 6, 4] as [number, number, number, number] },
      { text: tx.description || '—', fontSize: 9, fillColor: bgColor, margin: [6, 4, 6, 4] as [number, number, number, number] },
      { text: formatCurrency(tx.amount), fontSize: 9, alignment: 'right' as const, bold: true, color: amountColor, fillColor: bgColor, margin: [6, 4, 6, 4] as [number, number, number, number] },
    ] as TableCell[]
  })

  return {
    margin: [0, 5, 0, 0] as [number, number, number, number],
    table: {
      headerRows: 1,
      widths: [45, 50, 65, '*', 80],
      body: [headerRow, ...dataRows],
    },
    layout: {
      hLineWidth: (i: number, _node: unknown) => {
        const node = _node as { table: { body: TableCell[][] } }
        return i === 0 || i === 1 || i === node.table.body.length ? 1 : 0.5
      },
      vLineWidth: () => 0.5,
      hLineColor: (i: number) => (i <= 1 ? COLORS.headerBg : '#E5E7EB'),
      vLineColor: () => '#E5E7EB',
    },
  }
}

// ─── Section Başlığı ────────────────────────────────────────
function sectionTitle(title: string): Content {
  return {
    columns: [
      {
        canvas: [
          { type: 'rect', x: 0, y: 0, w: 3, h: 14, color: COLORS.gold },
        ],
        width: 8,
      },
      {
        text: title,
        fontSize: 12,
        bold: true,
        color: COLORS.text,
        margin: [0, 0, 0, 0] as [number, number, number, number],
      },
    ],
    columnGap: 4,
    margin: [0, 0, 0, 8] as [number, number, number, number],
  }
}

// ─── Ana PDF Üretim Fonksiyonu ──────────────────────────────
export async function generateZReportPDF(data: ZReportData): Promise<void> {
  const logoBase64 = await getLogoBase64()
  const dateFormatted = formatDateLong(data.auditDate)
  const performedAtFormatted = data.performedAt
    ? formatDateTimeLong(data.performedAt)
    : '—'

  const docDefinition: TDocumentDefinitions = {
    pageSize: 'A4',
    pageMargins: [40, 100, 40, 60] as [number, number, number, number],

    // ─── Header ─────────────────────────────────────────
    header: {
      margin: [40, 20, 40, 0] as [number, number, number, number],
      stack: [
        {
          columns: [
            {
              image: logoBase64,
              width: 50,
              margin: [0, 0, 12, 0] as [number, number, number, number],
            },
            {
              stack: [
                {
                  text: 'HERA CITY HOTEL',
                  fontSize: 16,
                  bold: true,
                  color: COLORS.gold,
                  characterSpacing: 3,
                },
                {
                  text: 'Günlük Kapanış Raporu',
                  fontSize: 9,
                  color: COLORS.textLight,
                  margin: [0, 2, 0, 0] as [number, number, number, number],
                },
              ],
              width: '*',
              margin: [0, 5, 0, 0] as [number, number, number, number],
            },
            {
              stack: [
                {
                  text: dateFormatted,
                  fontSize: 11,
                  bold: true,
                  color: COLORS.text,
                  alignment: 'right' as const,
                },
                {
                  text: `İşlem: ${performedAtFormatted}`,
                  fontSize: 8,
                  color: COLORS.textLight,
                  alignment: 'right' as const,
                  margin: [0, 2, 0, 0] as [number, number, number, number],
                },
              ],
              width: 'auto',
              margin: [0, 5, 0, 0] as [number, number, number, number],
            },
          ],
        },
        {
          canvas: [
            {
              type: 'line',
              x1: 0,
              y1: 10,
              x2: 515,
              y2: 10,
              lineWidth: 1.5,
              lineColor: COLORS.gold,
            },
          ],
        },
      ],
    },

    // ─── Footer ─────────────────────────────────────────
    footer: (currentPage: number, pageCount: number) => ({
      margin: [40, 10, 40, 0] as [number, number, number, number],
      stack: [
        {
          canvas: [
            {
              type: 'line',
              x1: 0,
              y1: 0,
              x2: 515,
              y2: 0,
              lineWidth: 0.75,
              lineColor: COLORS.gold,
            },
          ],
        },
        {
          columns: [
            {
              text: `Oluşturan: ${data.generatedBy.name} (${data.generatedBy.role})`,
              fontSize: 7,
              color: COLORS.textLight,
              margin: [0, 6, 0, 0] as [number, number, number, number],
            },
            {
              text: `Sayfa ${currentPage} / ${pageCount}`,
              fontSize: 7,
              color: COLORS.textLight,
              alignment: 'right' as const,
              margin: [0, 6, 0, 0] as [number, number, number, number],
            },
          ],
        },
      ],
    }),

    // ─── İçerik ─────────────────────────────────────────
    content: [
      // Özet kutuları
      buildSummarySection(data),

      // Oda Bazlı Detay
      sectionTitle('ODA BAZLI DETAY'),
      buildRoomBreakdownTable(data),

      // İşlem Detayları
      sectionTitle('İŞLEM DETAYLARI'),
      buildTransactionsTable(data),
    ],

    // ─── Varsayılan stiller ─────────────────────────────
    defaultStyle: {
      font: 'Roboto',
    },
  }

  const fileName = `Gun-Sonu-Raporu_${data.auditDate}.pdf`
  pdfMake.createPdf(docDefinition).download(fileName)
}
