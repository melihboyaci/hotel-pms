/**
 * Main Courante PDF Generator — Günlük otel muhasebe defteri
 *
 * Sade, okunabilir tasarım. Siyah-beyaz-gri renk paleti.
 * Landscape A4, 16 sütunlu profesyonel tablo.
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

// ─── Renk Paleti (Sade: siyah, koyu gri, açık gri, beyaz) ──
const C = {
  black: '#000000',
  dark: '#333333',
  mid: '#666666',
  light: '#999999',
  line: '#CCCCCC',
  rowAlt: '#F5F5F5',
  headerBg: '#333333',
  totalBg: '#EEEEEE',
  white: '#FFFFFF',
}

// ─── Para Formatlayıcı ──────────────────────────────────────
function fmt(amount: number): string {
  if (amount === 0) return '–'
  return new Intl.NumberFormat('tr-TR', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}

function fmtFull(amount: number): string {
  if (amount === 0) return '–'
  return new Intl.NumberFormat('tr-TR', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount) + ' ₺'
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
  'GİRİŞ',
  'ÇIKIŞ',
  'GÜNLÜK\nÜCRET',
  'ODA\nSERVİSİ',
  'ÇMŞR.',
  'REST.',
  'GÜNLÜK\nTOPLAM',
  'DEVR.\nBAKİYE',
  'GENEL\nTOPLAM',
  'İSK.',
  'NAKİT',
  'KREDİ\nKARTI',
  'HAVALE',
  'CARİ',
]

// Sütun genişlikleri (landscape A4 ≈ 760pt)
const COL_W = [
  26,   // ODA
  82,   // MİSAFİR
  30,   // GİRİŞ
  30,   // ÇIKIŞ
  46,   // GÜNLÜK ÜCRET
  40,   // ODA SERVİSİ
  34,   // ÇMŞR
  34,   // REST
  48,   // GÜNLÜK TOPLAM
  48,   // DEVR BAKİYE
  48,   // GENEL TOPLAM
  32,   // İSK
  44,   // NAKİT
  44,   // KREDİ KARTI
  44,   // HAVALE
  44,   // CARİ
]

// ─── Başlık satırı ──────────────────────────────────────────
function buildHeaderRow(): TableCell[] {
  return COLUMN_HEADERS.map((header, idx) => ({
    text: header,
    bold: true,
    fontSize: 6.5,
    color: C.white,
    fillColor: C.headerBg,
    alignment: (idx <= 1 ? 'left' : 'center') as 'left' | 'center' | 'right',
    margin: [3, 4, 3, 4] as [number, number, number, number],
  }))
}

// ─── Veri satırı ────────────────────────────────────────────
function buildDataRow(row: MainCouranteRow, idx: number): TableCell[] {
  const bg = idx % 2 === 1 ? C.rowAlt : C.white
  const fs = 7
  const m = [3, 3, 3, 3] as [number, number, number, number]
  const color = C.dark

  return [
    { text: row.roomNumber, fontSize: fs, bold: true, color: C.black, fillColor: bg, margin: m },
    { text: row.guestName, fontSize: fs, color, fillColor: bg, margin: m },
    { text: formatDateShort(row.checkInDate), fontSize: fs, alignment: 'center' as const, color, fillColor: bg, margin: m },
    { text: formatDateShort(row.checkOutDate), fontSize: fs, alignment: 'center' as const, color, fillColor: bg, margin: m },
    { text: fmt(row.dailyRate), fontSize: fs, alignment: 'right' as const, color, fillColor: bg, margin: m },
    { text: fmt(row.roomService), fontSize: fs, alignment: 'right' as const, color, fillColor: bg, margin: m },
    { text: fmt(row.laundry), fontSize: fs, alignment: 'right' as const, color, fillColor: bg, margin: m },
    { text: fmt(row.restaurant), fontSize: fs, alignment: 'right' as const, color, fillColor: bg, margin: m },
    { text: fmt(row.dailyTotal), fontSize: fs, bold: true, alignment: 'right' as const, color: C.black, fillColor: bg, margin: m },
    { text: fmt(row.carriedBalance), fontSize: fs, alignment: 'right' as const, color, fillColor: bg, margin: m },
    { text: fmt(row.grandTotal), fontSize: fs, bold: true, alignment: 'right' as const, color: C.black, fillColor: bg, margin: m },
    { text: fmt(row.discount), fontSize: fs, alignment: 'right' as const, color, fillColor: bg, margin: m },
    { text: fmt(row.cashPayment), fontSize: fs, alignment: 'right' as const, color, fillColor: bg, margin: m },
    { text: fmt(row.cardPayment), fontSize: fs, alignment: 'right' as const, color, fillColor: bg, margin: m },
    { text: fmt(row.transferPayment), fontSize: fs, alignment: 'right' as const, color, fillColor: bg, margin: m },
    { text: fmt(row.cityLedger), fontSize: fs, alignment: 'right' as const, color, fillColor: bg, margin: m },
  ]
}

// ─── Toplam satırı ──────────────────────────────────────────
function buildTotalRow(rows: MainCouranteRow[]): TableCell[] {
  const sum = (fn: (r: MainCouranteRow) => number) => rows.reduce((s, r) => s + fn(r), 0)
  const fs = 7
  const m = [3, 5, 3, 5] as [number, number, number, number]
  const bg = C.totalBg

  return [
    { text: 'TOPLAM', bold: true, fontSize: fs, colSpan: 4, fillColor: bg, color: C.black, margin: m },
    {}, {}, {},
    { text: fmtFull(sum(r => r.dailyRate)), bold: true, fontSize: fs, alignment: 'right' as const, fillColor: bg, color: C.black, margin: m },
    { text: fmtFull(sum(r => r.roomService)), bold: true, fontSize: fs, alignment: 'right' as const, fillColor: bg, color: C.black, margin: m },
    { text: fmtFull(sum(r => r.laundry)), bold: true, fontSize: fs, alignment: 'right' as const, fillColor: bg, color: C.black, margin: m },
    { text: fmtFull(sum(r => r.restaurant)), bold: true, fontSize: fs, alignment: 'right' as const, fillColor: bg, color: C.black, margin: m },
    { text: fmtFull(sum(r => r.dailyTotal)), bold: true, fontSize: fs, alignment: 'right' as const, fillColor: bg, color: C.black, margin: m },
    { text: fmtFull(sum(r => r.carriedBalance)), bold: true, fontSize: fs, alignment: 'right' as const, fillColor: bg, color: C.black, margin: m },
    { text: fmtFull(sum(r => r.grandTotal)), bold: true, fontSize: fs, alignment: 'right' as const, fillColor: bg, color: C.black, margin: m },
    { text: fmtFull(sum(r => r.discount)), bold: true, fontSize: fs, alignment: 'right' as const, fillColor: bg, color: C.black, margin: m },
    { text: fmtFull(sum(r => r.cashPayment)), bold: true, fontSize: fs, alignment: 'right' as const, fillColor: bg, color: C.black, margin: m },
    { text: fmtFull(sum(r => r.cardPayment)), bold: true, fontSize: fs, alignment: 'right' as const, fillColor: bg, color: C.black, margin: m },
    { text: fmtFull(sum(r => r.transferPayment)), bold: true, fontSize: fs, alignment: 'right' as const, fillColor: bg, color: C.black, margin: m },
    { text: fmtFull(sum(r => r.cityLedger)), bold: true, fontSize: fs, alignment: 'right' as const, fillColor: bg, color: C.black, margin: m },
  ]
}

// ─── Boş tablo mesajı ───────────────────────────────────────
function buildEmptyMessage(): Content {
  return {
    text: 'Bu tarihte kayıtlı konaklama bulunmamaktadır.',
    fontSize: 10,
    color: C.mid,
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
    margin: [0, 8, 0, 0] as [number, number, number, number],
    table: {
      headerRows: 1,
      widths: COL_W,
      body: [headerRow, ...dataRows, totalRow],
    },
    layout: {
      hLineWidth: (i: number, _node: unknown) => {
        const node = _node as { table: { body: TableCell[][] } }
        // Üst çizgi, başlık altı ve toplam altı kalın
        if (i === 0 || i === 1 || i === node.table.body.length) return 0.8
        // Toplam satırı üstü orta kalınlık
        if (i === node.table.body.length - 1) return 0.5
        return 0.3
      },
      vLineWidth: () => 0.3,
      hLineColor: (i: number) => (i <= 1 ? C.dark : C.line),
      vLineColor: () => C.line,
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
    margin: [0, 10, 0, 0] as [number, number, number, number],
    columns: [
      {
        text: `Toplam Oda: ${totalRooms}`,
        fontSize: 8,
        bold: true,
        color: C.dark,
      },
      {
        text: `Günlük Gelir: ${fmtFull(totalDailyRevenue)}`,
        fontSize: 8,
        bold: true,
        color: C.dark,
        alignment: 'center' as const,
      },
      {
        text: `Günlük Tahsilat: ${fmtFull(totalPayments)}`,
        fontSize: 8,
        bold: true,
        color: C.dark,
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
    pageMargins: [25, 75, 25, 45] as [number, number, number, number],

    // ─── Header ─────────────────────────────────────────
    header: {
      margin: [25, 15, 25, 0] as [number, number, number, number],
      columns: [
        {
          image: logoBase64,
          width: 36,
          margin: [0, 2, 8, 0] as [number, number, number, number],
        },
        {
          stack: [
            {
              text: 'HERA CITY HOTEL',
              fontSize: 13,
              bold: true,
              color: C.black,
              characterSpacing: 1.5,
            },
            {
              text: 'Main Courante — Günlük Hesap Defteri',
              fontSize: 8,
              color: C.mid,
              margin: [0, 2, 0, 0] as [number, number, number, number],
            },
          ],
          width: '*',
          margin: [0, 5, 0, 0] as [number, number, number, number],
        },
        {
          text: dateFormatted,
          fontSize: 10,
          bold: true,
          color: C.dark,
          alignment: 'right' as const,
          margin: [0, 10, 0, 0] as [number, number, number, number],
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
          color: C.light,
        },
        {
          text: `Sayfa ${currentPage} / ${pageCount}`,
          fontSize: 6,
          color: C.light,
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
