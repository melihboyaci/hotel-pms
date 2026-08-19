/**
 * Z-Raporu PDF — Ortak veri tipleri
 *
 * Bu dosya, PDF üretim modülüne beslenecek veri yapılarını tanımlar.
 * NightAudit.tsx veriyi Supabase'den çeker ve bu tiplere dönüştürür,
 * pdf-generator.ts bu tipleri alıp PDF belgesini oluşturur.
 */

// ─── Oda Bazlı Detay Satırı ─────────────────────────────────
export interface RoomBreakdownItem {
  roomNumber: string
  guestName: string
  nights: number
  nightlyRate: number
  totalPayments: number
  balance: number
}

// ─── İşlem Detayı Satırı ────────────────────────────────────
export interface TransactionItem {
  time: string // HH:mm
  roomNumber: string
  type: 'ROOM_CHARGE' | 'EXTRA' | 'PAYMENT'
  description: string
  amount: number
}

// ─── Tam Z-Raporu Verisi ────────────────────────────────────
export interface ZReportData {
  // daily_reports tablosundan gelen özet
  auditDate: string
  totalRoomsSold: number
  totalRoomRevenue: number
  totalExtraRevenue: number
  totalPayments: number
  performedAt: string | null

  // Ek sorgulardan gelen detaylar
  roomBreakdown: RoomBreakdownItem[]
  transactions: TransactionItem[]

  // Raporu oluşturan kullanıcı
  generatedBy: {
    name: string
    role: string
  }
}

// ─── Main Courante Raporu ───────────────────────────────────
export interface MainCouranteRow {
  roomNumber: string
  guestName: string
  checkInDate: string
  checkOutDate: string
  dailyRate: number        // O günkü ROOM_CHARGE
  roomService: number      // O günkü EXTRA (ROOM_SERVICE)
  laundry: number          // O günkü EXTRA (LAUNDRY)
  restaurant: number       // O günkü EXTRA (RESTAURANT)
  dailyTotal: number       // dailyRate + roomService + laundry + restaurant
  carriedBalance: number   // Önceki günlerden kalan net bakiye
  grandTotal: number       // Tüm borçlar toplamı (check-in'den beri)
  discount: number         // O günkü DISCOUNT toplamı
  cashPayment: number      // O günkü CASH tahsilat
  cardPayment: number      // O günkü CREDIT_CARD tahsilat
  transferPayment: number  // O günkü BANK_TRANSFER tahsilat
  cityLedger: number       // O günkü CITY_LEDGER tahsilat
}

export interface MainCouranteData {
  reportDate: string
  rows: MainCouranteRow[]
  generatedBy: {
    name: string
    role: string
  }
}
