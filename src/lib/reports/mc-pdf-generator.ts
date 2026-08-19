/**
 * Main Courante PDF Generator — Günlük otel muhasebe defteri
 *
 * Landscape A4, 16 sütunlu profesyonel tablo:
 * ODA | MİSAFİR | G.İN | G.ÇIK | GÜNLK.ÜCRET | ODA SRV. | ÇMŞR. | REST. |
 * GÜNLK.TOPLAM | DEVR.BAKİYE | GENEL TOPLAM | İSKONTO | NAKİT | KREDİ K. | HAVALE | CARİ
 */

import pdfMake from 'pdfmake/build/pdfmake'
import pdfFonts from 'pdfmake/build/vfs_fonts'
import type { TDocumentDefinitions, Content, TableCell } from 'pdfmake/interfaces'
import type { MainCouranteData, MainCouranteRow } from './report-types'
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
  violet: '#7C3AED',
  white: '#FFFFFF',
  headerBg: '#1C1917',
  rowAlt: '#FEFCF3',
  totalBg: '#F5F0E0',
}

// ─── Para Formatlayıcı ──────────────────────────────────────
function fmt(amount: number): string {
  if (amount === 0) return '—'
  return new Intl.NumberFormat('tr-TR', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}

function fmtFull(amount: number): string {
  return new Intl.NumberFormat('tr-TR', {
    style: 'currency',
    currency: 'TRY',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}

// ─── Tarih Formatlayıcı ─────────────────────────────────────
function formatDateShort(dateStr: string): string {
  const d = new Date(dateStr)
  return `${String(d.getDate()).padStart(2, '0')}.${String(d.getMonth() + 1).padStart(2, '0')}`
}

function formatDateLong(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('tr-TR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  })
}

// ─── Sütun başlıkları ───────────────────────────────────────
const COLUMN_HEADERS = [
  'ODA',
  'MİSAFİR',
  'G.İN',
  'G.ÇIK',
  'GÜNLK\nÜCRET',
  'ODA\nSRV.',
  'ÇMŞR.',
  'REST.',
  'GÜNLK\nTOPLAM',
  'DEVR.\nBAKİYE',
  'GENEL\nTOPLAM',
  'İSK.',
  'NAKİT',
  'KREDİ\nK.',
  'HAVALE',
  'CARİ',
]

// Sütun genişlikleri (landscape A4 = ~760pt kullanılabilir)
const COLUMN_WIDTHS = [
  28,    // ODA
  80,    // MİSAFİR
  30,    // G.İN
  30,    // G.ÇIK
  48,    // GÜNLK ÜCRET
  40,    // ODA SRV
  36,    // ÇMŞR
  36,    // REST
  48,    // GÜNLK TOPLAM
  48,    // DEVR BAKİYE
  48,    // GENEL TOPLAM
  32,    // İSK
  44,    // NAKİT
  44,    // KREDİ K
  44,    // HAVALE
  44,    // CARİ
]

// ─── Tablo satırı oluştur ───────────────────────────────────
function buildHeaderRow(): TableCell[] {
  return COLUMN_HEADERS.map((header, idx) => ({
    text: header,
    bold: true,
    fontSize: 6,
    color: COLORS.white,
    fillColor: COLORS.headerBg,
    alignment: (idx <= 1 ? 'left' : 'center') as 'left' | 'center' | 'right',
    margin: [2, 4, 2, 4] as [number, number, number, number],
  }))
}

function buildDataRow(row: MainCouranteRow, idx: number): TableCell[] {
  const bgColor = idx % 2 === 1 ? COLORS.rowAlt : COLORS.white
  const fs = 7
  const m = [2, 3, 2, 3] as [number, number, number, number]

  const balanceColor = row.carriedBalance > 0 ? COLORS.red : row.carriedBalance === 0 ? COLORS.textLight : COLORS.green
  const grandColor = row.grandTotal > 0 ? COLORS.red : COLORS.green

  return [
    { text: `${row.roomNumber}`, fontSize: fs, bold: true, fillColor: bgColor, margin: m },
    { text: row.guestName, fontSize: fs, fillColor: bgColor, margin: m },
    { text: formatDateShort(row.checkInDate), fontSize: fs, alignment: 'center' as const, fillColor: bgColor, margin: m },
    { text: formatDateShort(row.checkOutDate), fontSize: fs, alignment: 'center' as const, fillColor: bgColor, margin: m },
    { text: fmt(row.dailyRate), fontSize: fs, alignment: 'right' as const, fillColor: bgColor, margin: m },
    { text: fmt(row.roomService), fontSize: fs, alignment: 'right' as const, fillColor: bgColor, margin: m },
    { text: fmt(row.laundry), fontSize: fs, alignment: 'right' as const, fillColor: bgColor, margin: m },
    { text: fmt(row.restaurant), fontSize: fs, alignment: 'right' as const, fillColor: bgColor, margin: m },
    { text: fmt(row.dailyTotal), fontSize: fs, bold: true, alignment: 'right' as const, fillColor: bgColor, margin: m },
    { text: fmt(row.carriedBalance), fontSize: fs, alignment: 'right' as const, color: balanceColor, fillColor: bgColor, margin: m },
    { text: fmt(row.grandTotal), fontSize: fs, bold: true, alignment: 'right' as const, color: grandColor, fillColor: bgColor, margin: m },
    { text: fmt(row.discount), fontSize: fs, alignment: 'right' as const, color: row.discount > 0 ? COLORS.violet : COLORS.textLight, fillColor: bgColor, margin: m },
    { text: fmt(row.cashPayment), fontSize: fs, alignment: 'right' as const, color: row.cashPayment > 0 ? COLORS.green : COLORS.textLight, fillColor: bgColor, margin: m },
    { text: fmt(row.cardPayment), fontSize: fs, alignment: 'right' as const, color: row.cardPayment > 0 ? COLORS.green : COLORS.textLight, fillColor: bgColor, margin: m },
    { text: fmt(row.transferPayment), fontSize: fs, alignment: 'right' as const, color: row.transferPayment > 0 ? COLORS.green : COLORS.textLight, fillColor: bgColor, margin: m },
    { text: fmt(row.cityLedger), fontSize: fs, alignment: 'right' as const, color: row.cityLedger > 0 ? COLORS.green : COLORS.textLight, fillColor: bgColor, margin: m },
  ]
}

function buildTotalRow(rows: MainCouranteRow[]): TableCell[] {
  const sum = (fn: (r: MainCouranteRow) => number) => rows.reduce((s, r) => s + fn(r), 0)
  const fs = 7
  const m = [2, 4, 2, 4] as [number, number, number, number]
  const bg = COLORS.totalBg

  return [
    { text: 'TOPLAM', bold: true, fontSize: fs, colSpan: 4, fillColor: bg, margin: m },
    {}, {}, {},
    { text: fmtFull(sum(r => r.dailyRate)), bold: true, fontSize: fs, alignment: 'right' as const, fillColor: bg, margin: m },
    { text: fmtFull(sum(r => r.roomService)), bold: true, fontSize: fs, alignment: 'right' as const, fillColor: bg, margin: m },
    { text: fmtFull(sum(r => r.laundry)), bold: true, fontSize: fs, alignment: 'right' as const, fillColor: bg, margin: m },
    { text: fmtFull(sum(r => r.restaurant)), bold: true, fontSize: fs, alignment: 'right' as const, fillColor: bg, margin: m },
    { text: fmtFull(sum(r => r.dailyTotal)), bold: true, fontSize: fs, alignment: 'right' as const, fillColor: bg, margin: m },
    { text: fmtFull(sum(r => r.carriedBalance)), bold: true, fontSize: fs, alignment: 'right' as const, fillColor: bg, margin: m },
    { text: fmtFull(sum(r => r.grandTotal)), bold: true, fontSize: fs, alignment: 'right' as const, color: COLORS.red, fillColor: bg, margin: m },
    { text: fmtFull(sum(r => r.discount)), bold: true, fontSize: fs, alignment: 'right' as const, color: COLORS.violet, fillColor: bg, margin: m },
    { text: fmtFull(sum(r => r.cashPayment)), bold: true, fontSize: fs, alignment: 'right' as const, color: COLORS.green, fillColor: bg, margin: m },
    { text: fmtFull(sum(r => r.cardPayment)), bold: true, fontSize: fs, alignment: 'right' as const, color: COLORS.green, fillColor: bg, margin: m },
    { text: fmtFull(sum(r => r.transferPayment)), bold: true, fontSize: fs, alignment: 'right' as const, color: COLORS.green, fillColor: bg, margin: m },
    { text: fmtFull(sum(r => r.cityLedger)), bold: true, fontSize: fs, alignment: 'right' as const, color: COLORS.green, fillColor: bg, margin: m },
  ]
}

// ─── Boş tablo mesajı ───────────────────────────────────────
function buildEmptyMessage(): Content {
  return {
    text: 'Bu tarihte kayıtlı konaklama bulunmamaktadır.',
    fontSize: 10,
    color: COLORS.textLight,
    italics: true,
    alignment: 'center' as const,
    margin: [0, 40, 0, 40] as [number, number, number, number],
  }
}

// ─── Ana tablo ──────────────────────────────────────────────
function buildMainTable(data: MainCouranteData): Content {
  if (data.rows.length === 0) return buildEmptyMessage()

  const headerRow = buildHeaderRow()
  const dataRows = data.rows.map((row, idx) => buildDataRow(row, idx))
  const totalRow = buildTotalRow(data.rows)

  return {
    margin: [0, 10, 0, 0] as [number, number, number, number],
    table: {
      headerRows: 1,
      widths: COLUMN_WIDTHS,
      body: [headerRow, ...dataRows, totalRow],
    },
    layout: {
      hLineWidth: (i: number, _node: unknown) => {
        const node = _node as { table: { body: TableCell[][] } }
        return i === 0 || i === 1 || i === node.table.body.length ? 1 : 0.3
      },
      vLineWidth: () => 0.3,
      hLineColor: (i: number) => (i <= 1 ? COLORS.headerBg : '#E5E7EB'),
      vLineColor: () => '#E5E7EB',
      paddingLeft: () => 0,
      paddingRight: () => 0,
      paddingTop: () => 0,
      paddingBottom: () => 0,
    },
  }
}

// ─── Özet satırı (tablo altı) ───────────────────────────────
function buildSummaryBar(data: MainCouranteData): Content {
  if (data.rows.length === 0) return { text: '' }

  const totalRooms = data.rows.length
  const totalDailyRevenue = data.rows.reduce((s, r) => s + r.dailyTotal, 0)
  const totalPayments = data.rows.reduce((s, r) => s + r.cashPayment + r.cardPayment + r.transferPayment + r.cityLedger, 0)

  return {
    margin: [0, 12, 0, 0] as [number, number, number, number],
    columns: [
      {
        text: `Toplam Oda: ${totalRooms}`,
        fontSize: 8,
        bold: true,
        color: COLORS.text,
      },
      {
        text: `Günlük Gelir: ${fmtFull(totalDailyRevenue)}`,
        fontSize: 8,
        bold: true,
        color: COLORS.gold,
        alignment: 'center' as const,
      },
      {
        text: `Günlük Tahsilat: ${fmtFull(totalPayments)}`,
        fontSize: 8,
        bold: true,
        color: COLORS.green,
        alignment: 'right' as const,
      },
    ],
  }
}

// ─── Ana PDF Üretim Fonksiyonu ──────────────────────────────
export async function generateMainCourantePDF(data: MainCouranteData): Promise<void> {
  const logoBase64 = await getLogoBase64()
  const dateFormatted = formatDateLong(data.reportDate)

  const docDefinition: TDocumentDefinitions = {
    pageSize: 'A4',
    pageOrientation: 'landscape',
    pageMargins: [25, 80, 25, 50] as [number, number, number, number],

    // ─── Header ─────────────────────────────────────────
    header: {
      margin: [25, 15, 25, 0] as [number, number, number, number],
      columns: [
        {
          image: logoBase64,
          width: 40,
          margin: [0, 0, 10, 0] as [number, number, number, number],
        },
        {
          stack: [
            {
              text: 'HERA CITY HOTEL',
              fontSize: 14,
              bold: true,
              color: COLORS.gold,
              characterSpacing: 2,
            },
            {
              text: 'Main Courante — Günlük Hesap Defteri',
              fontSize: 8,
              color: COLORS.textLight,
              margin: [0, 1, 0, 0] as [number, number, number, number],
            },
          ],
          width: '*',
          margin: [0, 5, 0, 0] as [number, number, number, number],
        },
        {
          text: dateFormatted,
          fontSize: 11,
          bold: true,
          color: COLORS.text,
          alignment: 'right' as const,
          margin: [0, 8, 0, 0] as [number, number, number, number],
        },
      ],
    },

    // ─── Footer ─────────────────────────────────────────
    footer: (currentPage: number, pageCount: number) => ({
      margin: [25, 8, 25, 0] as [number, number, number, number],
      columns: [
        {
          text: `Oluşturan: ${data.generatedBy.name} (${data.generatedBy.role})`,
          fontSize: 6,
          color: COLORS.textLight,
        },
        {
          text: `Sayfa ${currentPage} / ${pageCount}`,
          fontSize: 6,
          color: COLORS.textLight,
          alignment: 'right' as const,
        },
      ],
    }),

    // ─── İçerik ─────────────────────────────────────────
    content: [
      buildMainTable(data),
      buildSummaryBar(data),
    ],

    // ─── Varsayılan stiller ─────────────────────────────
    defaultStyle: {
      font: 'Roboto',
    },
  }

  const fileName = `Main-Courante_${data.reportDate}.pdf`
  pdfMake.createPdf(docDefinition).download(fileName)
}
