import { useEffect, useMemo, useState } from 'react'
import {
  ArrowLeftRight,
  RefreshCw,
  Banknote,
  ShoppingBag,
  BedDouble,
  ArrowDownCircle,
  ArrowUpCircle,
  Minus,
  Search,
  Filter,
  Percent,
} from 'lucide-react'
import { supabase } from '../lib/supabase'
import type { Database } from '../types/database.types'

// --- Veritabanı tipleri ---
type TransactionType = Database['public']['Enums']['transaction_type']
type PaymentMethod = Database['public']['Enums']['payment_method']

// Derin join sonucu dönen satır tipi
interface TransactionRow {
  id: string
  amount: number
  transaction_type: TransactionType
  payment_method: PaymentMethod | null
  description: string | null
  created_at: string | null
  folios: {
    id: string
    reservations: {
      id: string
      rooms: { room_number: string } | null
      guests: { first_name: string; last_name: string } | null
    } | null
  } | null
}

// --- Sabitler ---

const TRANSACTION_TYPE_LABEL: Record<TransactionType, string> = {
  ROOM_CHARGE: 'Oda Ücreti',
  EXTRA: 'Ekstra',
  PAYMENT: 'Tahsilat',
  DISCOUNT: 'İskonto',
}

const TRANSACTION_TYPE_ICON: Record<TransactionType, React.ReactNode> = {
  ROOM_CHARGE: <BedDouble size={14} />,
  EXTRA: <ShoppingBag size={14} />,
  PAYMENT: <Banknote size={14} />,
  DISCOUNT: <Percent size={14} />,
}

const PAYMENT_METHOD_LABEL: Record<PaymentMethod, string> = {
  CASH: 'Nakit',
  CREDIT_CARD: 'Kredi Kartı',
  BANK_TRANSFER: 'EFT / Havale',
  CITY_LEDGER: 'Cari Hesap',
}

// --- Yardımcı fonksiyonlar ---

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('tr-TR', {
    style: 'currency',
    currency: 'TRY',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount)
}

function formatDateTime(dateStr: string | null): string {
  if (!dateStr) return '—'
  return new Date(dateStr).toLocaleDateString('tr-TR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function formatDateShort(dateStr: string | null): string {
  if (!dateStr) return '—'
  return new Date(dateStr).toLocaleDateString('tr-TR', {
    day: '2-digit',
    month: 'short',
  })
}

function formatTime(dateStr: string | null): string {
  if (!dateStr) return ''
  return new Date(dateStr).toLocaleTimeString('tr-TR', {
    hour: '2-digit',
    minute: '2-digit',
  })
}

// --- Özet Kartı bileşeni ---

function SummaryCard({
  title,
  amount,
  icon,
  colorClass,
  borderClass,
  bgClass,
}: {
  title: string
  amount: number
  icon: React.ReactNode
  colorClass: string
  borderClass: string
  bgClass: string
}) {
  return (
    <div
      className={`flex items-center gap-4 rounded-xl border-2 px-5 py-4 shadow-sm transition-all hover:shadow-md ${borderClass} ${bgClass}`}
    >
      <div
        className={`flex items-center justify-center w-11 h-11 rounded-xl ${colorClass} bg-white/80 shadow-sm`}
      >
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[10px] font-bold uppercase tracking-widest text-gray-500 mb-0.5">
          {title}
        </p>
        <p className={`text-lg font-extrabold tracking-tight ${colorClass}`}>
          {formatCurrency(Math.abs(amount))}
        </p>
      </div>
    </div>
  )
}

// --- Ana Bileşen ---

export default function Transactions() {
  const [transactions, setTransactions] = useState<TransactionRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // --- Filtre state'leri ---
  const [filterRoom, setFilterRoom] = useState('')
  const [filterGuest, setFilterGuest] = useState('')
  const [filterType, setFilterType] = useState<TransactionType | ''>('')

  const fetchTransactions = async () => {
    setLoading(true)
    setError(null)

    try {
      const { data, error: sbError } = await supabase
        .from('transactions')
        .select(`
          id,
          amount,
          transaction_type,
          payment_method,
          description,
          created_at,
          folios!inner (
            id,
            reservations!inner (
              id,
              rooms ( room_number ),
              guests ( first_name, last_name )
            )
          )
        `)
        .order('created_at', { ascending: false })

      if (sbError) {
        setError(sbError.message)
      } else {
        setTransactions((data as unknown as TransactionRow[]) ?? [])
      }
    } catch (err: any) {
      setError(err?.message || 'Veriler yüklenemedi.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchTransactions()
  }, [])

  // --- Bugünün özet hesaplamaları ---
  const todayStr = new Date().toISOString().split('T')[0]

  const todayTransactions = transactions.filter((tx) => {
    if (!tx.created_at) return false
    return tx.created_at.startsWith(todayStr)
  })

  const todayPayments = todayTransactions
    .filter((tx) => tx.transaction_type === 'PAYMENT')
    .reduce((sum, tx) => sum + tx.amount, 0)

  const todayExtras = todayTransactions
    .filter((tx) => tx.transaction_type === 'EXTRA')
    .reduce((sum, tx) => sum + tx.amount, 0)

  const todayRoomCharges = todayTransactions
    .filter((tx) => tx.transaction_type === 'ROOM_CHARGE')
    .reduce((sum, tx) => sum + tx.amount, 0)

  // --- Yardımcılar ---
  function getRoomAndGuest(tx: TransactionRow): { room: string; guest: string } {
    const reservation = tx.folios?.reservations
    const room = reservation?.rooms?.room_number ?? '—'
    const guest = reservation?.guests
      ? `${reservation.guests.first_name} ${reservation.guests.last_name}`
      : '—'
    return { room, guest }
  }

  // --- Client-side filtreleme (useMemo ile performanslı) ---
  const filteredTransactions = useMemo(() => {
    return transactions.filter((tx) => {
      const { room, guest } = getRoomAndGuest(tx)

      // Oda No filtresi
      if (filterRoom.trim() && !room.toLowerCase().includes(filterRoom.trim().toLowerCase())) {
        return false
      }

      // Misafir Adı filtresi
      if (filterGuest.trim() && !guest.toLowerCase().includes(filterGuest.trim().toLowerCase())) {
        return false
      }

      // İşlem Türü filtresi
      if (filterType && tx.transaction_type !== filterType) {
        return false
      }

      return true
    })
  }, [transactions, filterRoom, filterGuest, filterType])

  const hasActiveFilter = filterRoom.trim() !== '' || filterGuest.trim() !== '' || filterType !== ''

  const clearFilters = () => {
    setFilterRoom('')
    setFilterGuest('')
    setFilterType('')
  }

  return (
    <div className="flex-1 text-gray-800 px-6 py-8 font-sans">
      {/* ═══ Başlık ═══ */}
      <div className="mb-8 flex items-center justify-between border-b border-gray-200 pb-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-[0.18em] text-gold-600 font-cinzel">
            KASA DEFTERİ
          </h1>
          <p className="mt-1 text-xs md:text-sm font-semibold tracking-widest text-gray-400 uppercase">
            Hera City Hotel — Tüm Finansal Hareketler
          </p>
        </div>
        <button
          onClick={fetchTransactions}
          disabled={loading}
          className="flex items-center gap-2 rounded-lg border border-gold-500/40 bg-white px-4 py-2.5 text-sm font-semibold text-gold-600 hover:bg-gold-50 shadow-sm disabled:opacity-50 transition-colors cursor-pointer"
        >
          <RefreshCw
            size={15}
            className={loading ? 'animate-spin text-gold-500' : 'text-gold-500'}
          />
          Yenile
        </button>
      </div>

      {/* ═══ Bugünkü Özet Kartları ═══ */}
      <div className="mb-8">
        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.2em] mb-3">
          Bugünün Özeti — {new Date().toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' })}
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <SummaryCard
            title="Toplam Tahsilat"
            amount={todayPayments}
            icon={<Banknote size={22} className="text-emerald-600" />}
            colorClass="text-emerald-700"
            borderClass="border-emerald-200"
            bgClass="bg-emerald-50/60"
          />
          <SummaryCard
            title="Toplam Ekstra Satış"
            amount={todayExtras}
            icon={<ShoppingBag size={22} className="text-violet-600" />}
            colorClass="text-violet-700"
            borderClass="border-violet-200"
            bgClass="bg-violet-50/60"
          />
          <SummaryCard
            title="Toplam Oda Satışı"
            amount={todayRoomCharges}
            icon={<BedDouble size={22} className="text-gold-600" />}
            colorClass="text-gold-700"
            borderClass="border-gold-200"
            bgClass="bg-gold-50/60"
          />
        </div>
      </div>

      {/* ═══ Filtreleme Çubuğu ═══ */}
      {!loading && !error && transactions.length > 0 && (
        <div className="mb-6 bg-white rounded-xl border border-gray-200 shadow-sm px-5 py-4">
          <div className="flex items-center gap-2 mb-3">
            <Filter size={14} className="text-gold-500" />
            <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Filtrele</span>
            {hasActiveFilter && (
              <button
                onClick={clearFilters}
                className="ml-auto text-[10px] font-semibold text-rose-500 hover:text-rose-700 transition-colors cursor-pointer underline underline-offset-2"
              >
                Filtreleri Temizle
              </button>
            )}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* Oda No */}
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Oda No ile ara…"
                value={filterRoom}
                onChange={(e) => setFilterRoom(e.target.value)}
                className="w-full pl-9 pr-3 py-2 rounded-lg border border-gray-200 bg-gray-50/60 text-sm text-gray-700 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-gold-500/40 focus:border-gold-400 transition-colors"
              />
            </div>
            {/* Misafir Adı */}
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Misafir adı ile ara…"
                value={filterGuest}
                onChange={(e) => setFilterGuest(e.target.value)}
                className="w-full pl-9 pr-3 py-2 rounded-lg border border-gray-200 bg-gray-50/60 text-sm text-gray-700 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-gold-500/40 focus:border-gold-400 transition-colors"
              />
            </div>
            {/* İşlem Türü */}
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value as TransactionType | '')}
              className="w-full px-3 py-2 rounded-lg border border-gray-200 bg-gray-50/60 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-gold-500/40 focus:border-gold-400 transition-colors cursor-pointer"
            >
              <option value="">Tüm İşlem Türleri</option>
              <option value="ROOM_CHARGE">Sadece Oda Ücretleri</option>
              <option value="EXTRA">Sadece Ekstralar</option>
              <option value="PAYMENT">Sadece Tahsilatlar</option>
              <option value="DISCOUNT">Sadece İskontolar</option>
            </select>
          </div>
        </div>
      )}

      {/* ═══ Durum Mesajları ═══ */}
      {loading && (
        <div className="flex items-center justify-center py-24 text-gray-500">
          <RefreshCw size={20} className="animate-spin mr-3 text-gold-500" />
          Hareketler yükleniyor…
        </div>
      )}

      {error && !loading && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-red-700">
          <p className="font-semibold">Hata:</p>
          <p className="text-sm mt-1">{error}</p>
        </div>
      )}

      {!loading && !error && transactions.length === 0 && (
        <div className="flex flex-col items-center justify-center py-24 text-gray-400">
          <ArrowLeftRight size={40} className="mb-4 text-gray-300" />
          <p className="font-medium">Henüz finansal hareket bulunmuyor.</p>
        </div>
      )}

      {/* ═══ Hareket Tablosu ═══ */}
      {!loading && !error && transactions.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          {/* Tablo başlık şeridi */}
          <div className="px-5 py-3 border-b border-gray-100 bg-gray-50/60 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ArrowLeftRight size={15} className="text-gold-500" />
              <span className="text-xs font-bold text-gray-600 uppercase tracking-wider">
                Tüm Hareketler
              </span>
            </div>
            <span className="text-[10px] font-bold text-gray-400 bg-gray-100 px-2.5 py-1 rounded-full">
              {hasActiveFilter ? `${filteredTransactions.length} / ${transactions.length}` : transactions.length} kayıt
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left px-5 py-3 text-[10px] font-bold text-gray-400 uppercase tracking-wider whitespace-nowrap">
                    Tarih / Saat
                  </th>
                  <th className="text-left px-5 py-3 text-[10px] font-bold text-gray-400 uppercase tracking-wider whitespace-nowrap">
                    Oda & Misafir
                  </th>
                  <th className="text-left px-5 py-3 text-[10px] font-bold text-gray-400 uppercase tracking-wider whitespace-nowrap">
                    İşlem Türü
                  </th>
                  <th className="text-left px-5 py-3 text-[10px] font-bold text-gray-400 uppercase tracking-wider whitespace-nowrap">
                    Açıklama
                  </th>
                  <th className="text-left px-5 py-3 text-[10px] font-bold text-gray-400 uppercase tracking-wider whitespace-nowrap">
                    Ödeme Yöntemi
                  </th>
                  <th className="text-right px-5 py-3 text-[10px] font-bold text-gray-400 uppercase tracking-wider whitespace-nowrap">
                    Tutar
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredTransactions.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-5 py-12 text-center">
                      <div className="flex flex-col items-center gap-2 text-gray-400">
                        <Search size={28} className="text-gray-300" />
                        <p className="text-sm font-medium">Filtreye uygun hareket bulunamadı.</p>
                        <button onClick={clearFilters} className="text-xs font-semibold text-gold-600 hover:text-gold-700 underline underline-offset-2 cursor-pointer">Filtreleri temizle</button>
                      </div>
                    </td>
                  </tr>
                )}
                {filteredTransactions.map((tx, idx) => {
                  const { room, guest } = getRoomAndGuest(tx)
                  const isPayment = tx.transaction_type === 'PAYMENT'
                  const isDebit = tx.amount > 0 && !isPayment
                  const amountColor = isPayment
                    ? 'text-emerald-700'
                    : tx.amount > 0
                      ? 'text-rose-600'
                      : 'text-gray-700'
                  const amountIcon = isPayment ? (
                    <ArrowDownCircle size={13} className="text-emerald-500 shrink-0" />
                  ) : isDebit ? (
                    <ArrowUpCircle size={13} className="text-rose-400 shrink-0" />
                  ) : null

                  const typeConfig = {
                    ROOM_CHARGE: { bg: 'bg-gold-50', text: 'text-gold-700', border: 'border-gold-200' },
                    EXTRA: { bg: 'bg-violet-50', text: 'text-violet-700', border: 'border-violet-200' },
                    PAYMENT: { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200' },
                    DISCOUNT: { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200' },
                  }[tx.transaction_type] || { bg: 'bg-gray-50', text: 'text-gray-700', border: 'border-gray-200' }

                  return (
                    <tr
                      key={tx.id}
                      className={`border-b border-gray-50 transition-colors hover:bg-gray-50/70 ${
                        idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/30'
                      }`}
                    >
                      {/* Tarih / Saat */}
                      <td className="px-5 py-3 whitespace-nowrap">
                        <div className="text-xs font-semibold text-gray-700">
                          {formatDateShort(tx.created_at)}
                        </div>
                        <div className="text-[10px] text-gray-400 font-medium mt-0.5">
                          {formatTime(tx.created_at)}
                        </div>
                      </td>

                      {/* Oda & Misafir */}
                      <td className="px-5 py-3 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-bold text-gray-800 font-cinzel">
                            #{room}
                          </span>
                          <span className="text-gray-300">—</span>
                          <span className="text-xs font-medium text-gray-600 truncate max-w-[160px]" title={guest}>
                            {guest}
                          </span>
                        </div>
                      </td>

                      {/* İşlem Türü */}
                      <td className="px-5 py-3 whitespace-nowrap">
                        <div
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-[11px] font-semibold ${typeConfig.bg} ${typeConfig.text} ${typeConfig.border}`}
                        >
                          {TRANSACTION_TYPE_ICON[tx.transaction_type]}
                          {TRANSACTION_TYPE_LABEL[tx.transaction_type]}
                        </div>
                      </td>

                      {/* Açıklama */}
                      <td className="px-5 py-3">
                        <span className="text-xs text-gray-500 font-medium truncate block max-w-[220px]" title={tx.description ?? ''}>
                          {tx.description || '—'}
                        </span>
                      </td>

                      {/* Ödeme Yöntemi */}
                      <td className="px-5 py-3 whitespace-nowrap">
                        {isPayment && tx.payment_method ? (
                          <span className="text-xs font-medium text-gray-600">
                            {PAYMENT_METHOD_LABEL[tx.payment_method]}
                          </span>
                        ) : (
                          <Minus size={14} className="text-gray-300" />
                        )}
                      </td>

                      {/* Tutar */}
                      <td className="px-5 py-3 text-right whitespace-nowrap">
                        <div className={`flex items-center justify-end gap-1.5 ${amountColor}`}>
                          {amountIcon}
                          <span className="text-sm font-bold tracking-tight tabular-nums">
                            {formatCurrency(tx.amount)}
                          </span>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {/* Tablo alt bilgi */}
          <div className="px-5 py-3 border-t border-gray-100 bg-gray-50/40 flex items-center justify-between">
            <span className="text-[10px] font-medium text-gray-400">
              {hasActiveFilter
                ? `${filteredTransactions.length} / ${transactions.length} hareket gösteriliyor`
                : `Toplam ${transactions.length} hareket listeleniyor`}
            </span>
            <span className="text-[10px] font-medium text-gray-400">
              Son güncelleme: {formatDateTime(new Date().toISOString())}
            </span>
          </div>
        </div>
      )}
    </div>
  )
}
