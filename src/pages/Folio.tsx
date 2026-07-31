import { useEffect, useState, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  ArrowLeft,
  RefreshCw,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Receipt,
  PlusCircle,
  Wallet,
  CreditCard,
  Banknote,
  Building2,
  TrendingUp,
  TrendingDown,
  Scale,
  BedDouble,
  Coffee,
} from 'lucide-react'
import { supabase } from '../lib/supabase'
import type { Database } from '../types/database.types'

// --- Veritabanı tipleri (database.types.ts'den referansla) ---
type Transaction = Database['public']['Tables']['transactions']['Row']
type TransactionInsert = Database['public']['Tables']['transactions']['Insert']
type TransactionType = Database['public']['Enums']['transaction_type']
type PaymentMethod = Database['public']['Enums']['payment_method']
type Folio = Database['public']['Tables']['folios']['Row']

type FolioWithReservation = Folio & {
  reservations: {
    id: string
    check_in_date: string
    check_out_date: string
    status: string | null
    room_id: string
    rooms: { room_number: string } | null
    reservation_guests: {
      is_primary_guest: boolean
      guests: { first_name: string; last_name: string } | null
    }[]
  } | null
}

// --- Sabit eşleşme tabloları ---

const TRANSACTION_TYPE_CONFIG: Record<
  TransactionType,
  { label: string; colorClass: string; icon: React.ReactNode }
> = {
  ROOM_CHARGE: {
    label: 'Oda Ücreti',
    colorClass: 'text-amber-700 bg-amber-50 border-amber-200',
    icon: <BedDouble size={13} className="text-amber-600" />,
  },
  EXTRA: {
    label: 'Ekstra',
    colorClass: 'text-rose-700 bg-rose-50 border-rose-200',
    icon: <Coffee size={13} className="text-rose-600" />,
  },
  PAYMENT: {
    label: 'Tahsilat',
    colorClass: 'text-emerald-700 bg-emerald-50 border-emerald-200',
    icon: <Wallet size={13} className="text-emerald-600" />,
  },
}

const PAYMENT_METHOD_LABEL: Record<PaymentMethod, { label: string; icon: React.ReactNode }> = {
  CASH: { label: 'Nakit', icon: <Banknote size={13} className="text-emerald-600" /> },
  CREDIT_CARD: { label: 'Kredi Kartı', icon: <CreditCard size={13} className="text-blue-600" /> },
  BANK_TRANSFER: {
    label: 'Havale/EFT',
    icon: <Building2 size={13} className="text-indigo-600" />,
  },
  CITY_LEDGER: { label: 'Cari Hesap', icon: <Receipt size={13} className="text-purple-600" /> },
}

// --- Tarih formatlayıcılar ---
function formatDateTime(dateStr: string | null): string {
  if (!dateStr) return '—'
  return new Date(dateStr).toLocaleDateString('tr-TR', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('tr-TR', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('tr-TR', {
    style: 'currency',
    currency: 'TRY',
    minimumFractionDigits: 2,
  }).format(amount)
}

// --- Yardımcı bileşenler ---

function Label({ htmlFor, children }: { htmlFor: string; children: React.ReactNode }) {
  return (
    <label
      htmlFor={htmlFor}
      className="block text-xs font-semibold text-gray-500 mb-1.5 uppercase tracking-wider"
    >
      {children}
    </label>
  )
}

const inputClass =
  'w-full px-4 py-2.5 rounded-lg border border-gray-300 bg-white text-gray-800 focus:outline-none focus:ring-2 focus:ring-gold-500/50 focus:border-gold-500 transition-colors text-sm'

// --- Tab tipi ---
type FolioTab = 'ROOM_CHARGE' | 'EXTRA' | 'ALL'

// --- İşlem tablosu alt bileşeni ---
function TransactionTable({ transactions }: { transactions: Transaction[] }) {
  if (transactions.length === 0) {
    return (
      <div className="px-6 py-10 text-center">
        <Receipt size={28} className="text-gray-200 mx-auto mb-2" />
        <p className="text-sm text-gray-400">Bu kategoride henüz işlem yok.</p>
      </div>
    )
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-gray-50/80 border-b border-gray-100">
            <th className="text-left px-6 py-3 text-[10px] font-bold text-gray-400 uppercase tracking-widest">
              Tarih
            </th>
            <th className="text-left px-4 py-3 text-[10px] font-bold text-gray-400 uppercase tracking-widest">
              Açıklama
            </th>
            <th className="text-left px-4 py-3 text-[10px] font-bold text-gray-400 uppercase tracking-widest">
              Tip
            </th>
            <th className="text-right px-6 py-3 text-[10px] font-bold text-gray-400 uppercase tracking-widest">
              Tutar
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-50">
          {transactions.map((tx) => {
            const config = TRANSACTION_TYPE_CONFIG[tx.transaction_type]
            const isPayment = tx.amount < 0
            return (
              <tr key={tx.id} className="hover:bg-gold-50/30 transition-colors">
                <td className="px-6 py-3 text-xs text-gray-500 whitespace-nowrap">
                  {formatDateTime(tx.created_at)}
                </td>
                <td className="px-4 py-3 text-gray-700 font-medium">
                  <div className="flex flex-col gap-0.5">
                    <span>{tx.description || '—'}</span>
                    {isPayment && tx.payment_method && (
                      <span className="flex items-center gap-1 text-[10px] text-gray-400">
                        {PAYMENT_METHOD_LABEL[tx.payment_method].icon}
                        {PAYMENT_METHOD_LABEL[tx.payment_method].label}
                      </span>
                    )}
                  </div>
                </td>
                <td className="px-4 py-3">
                  <span
                    className={`inline-flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1 rounded-full border ${config.colorClass}`}
                  >
                    {config.icon}
                    {config.label}
                  </span>
                </td>
                <td
                  className={`px-6 py-3 text-right font-bold whitespace-nowrap ${
                    isPayment ? 'text-emerald-600' : 'text-rose-600'
                  }`}
                >
                  {isPayment ? '−' : '+'} {formatCurrency(Math.abs(tx.amount))}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

// --- Ana Bileşen ---

export default function FolioPage() {
  const { id: reservationId } = useParams<{ id: string }>()
  const navigate = useNavigate()

  // Folio ve transaction state'leri
  const [folio, setFolio] = useState<FolioWithReservation | null>(null)
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Aktif sekme
  const [activeTab, setActiveTab] = useState<FolioTab>('ALL')

  // Form state'leri
  const [formMode, setFormMode] = useState<'CHARGE' | 'PAYMENT'>('CHARGE')
  const [txType, setTxType] = useState<TransactionType>('ROOM_CHARGE')
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('CASH')
  const [amount, setAmount] = useState('')
  const [description, setDescription] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [submitSuccess, setSubmitSuccess] = useState(false)

  // --- Veri çekme ---
  const fetchFolioData = useCallback(async () => {
    if (!reservationId) return
    setLoading(true)
    setError(null)

    try {
      // 1. Folyo'yu bul (reservation_id ile)
      const { data: folioData, error: folioError } = await supabase
        .from('folios')
        .select(
          `
          *,
          reservations (
            id,
            check_in_date,
            check_out_date,
            status,
            room_id,
            rooms ( room_number ),
            reservation_guests (
              is_primary_guest,
              guests ( first_name, last_name )
            )
          )
        `
        )
        .eq('reservation_id', reservationId)
        .single()

      if (folioError) {
        throw new Error(`Folyo bulunamadı: ${folioError.message}`)
      }

      setFolio(folioData as FolioWithReservation)

      // 2. İşlemleri çek
      const { data: txData, error: txError } = await supabase
        .from('transactions')
        .select('*')
        .eq('folio_id', folioData.id)
        .order('created_at', { ascending: true })

      if (txError) {
        throw new Error(`İşlemler yüklenemedi: ${txError.message}`)
      }

      setTransactions(txData ?? [])
    } catch (err: any) {
      setError(err?.message || 'Veri çekilemedi.')
    } finally {
      setLoading(false)
    }
  }, [reservationId])

  useEffect(() => {
    fetchFolioData()
  }, [fetchFolioData])

  // --- Kategorik hesaplama ---
  const roomCharges = transactions.filter((t) => t.transaction_type === 'ROOM_CHARGE')
  const extraCharges = transactions.filter((t) => t.transaction_type === 'EXTRA')
  const payments = transactions.filter((t) => t.transaction_type === 'PAYMENT')

  const totalRoomCharge = roomCharges.reduce((sum, t) => sum + t.amount, 0)
  const totalExtra = extraCharges.reduce((sum, t) => sum + t.amount, 0)
  const totalPayments = payments.reduce((sum, t) => sum + Math.abs(t.amount), 0)
  const totalCharges = totalRoomCharge + totalExtra
  const balance = totalCharges - totalPayments

  // Aktif sekmeye göre filtreleme
  const filteredTransactions =
    activeTab === 'ROOM_CHARGE'
      ? roomCharges
      : activeTab === 'EXTRA'
        ? extraCharges
        : transactions

  // --- İşlem ekleme ---
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!folio) return

    setSubmitting(true)
    setSubmitSuccess(false)
    setError(null)

    const numericAmount = parseFloat(amount)
    if (isNaN(numericAmount) || numericAmount <= 0) {
      setError('Lütfen geçerli bir tutar giriniz.')
      setSubmitting(false)
      return
    }

    try {
      const payload: TransactionInsert = {
        folio_id: folio.id,
        transaction_type: formMode === 'PAYMENT' ? 'PAYMENT' : txType,
        // Borçlar pozitif, tahsilatlar negatif olarak kaydedilir
        amount: formMode === 'PAYMENT' ? -numericAmount : numericAmount,
        description: description.trim() || null,
        payment_method: formMode === 'PAYMENT' ? paymentMethod : null,
      }

      const { error: insertError } = await supabase.from('transactions').insert(payload)

      if (insertError) {
        throw new Error(`İşlem kaydedilemedi: ${insertError.message}`)
      }

      // Başarılı — formu sıfırla ve verileri yenile
      setAmount('')
      setDescription('')
      setSubmitSuccess(true)
      setTimeout(() => setSubmitSuccess(false), 3000)
      await fetchFolioData()
    } catch (err: any) {
      setError(err?.message || 'Beklenmeyen bir hata oluştu.')
    } finally {
      setSubmitting(false)
    }
  }

  // --- Misafir bilgisi ---
  const reservation = folio?.reservations
  const primaryGuest = reservation?.reservation_guests?.find((rg) => rg.is_primary_guest)?.guests
  const roomNumber = reservation?.rooms?.room_number

  // --- RENDER ---

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <RefreshCw size={24} className="animate-spin text-gold-500" />
          <span className="text-sm text-gray-500 font-medium">Folyo yükleniyor…</span>
        </div>
      </div>
    )
  }

  if (error && !folio) {
    return (
      <div className="flex-1 flex items-center justify-center px-6">
        <div className="max-w-md w-full rounded-2xl border-2 border-rose-300 bg-rose-50 p-6 text-center">
          <AlertCircle size={28} className="text-rose-500 mx-auto mb-3" />
          <p className="font-semibold text-rose-800 mb-1">Folyo Bulunamadı</p>
          <p className="text-sm text-rose-600 mb-4">{error}</p>
          <button
            onClick={() => navigate('/')}
            className="text-sm font-medium text-gold-600 hover:text-gold-800 underline underline-offset-2 cursor-pointer"
          >
            Panoya Dön
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 text-gray-800 font-sans">
      {/* ─── Üst Bar ─── */}
      <div className="bg-white border-b border-gray-200 px-6 py-4 shadow-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/')}
              className="flex items-center gap-1.5 text-sm font-medium text-gray-500 hover:text-gold-600 transition-colors cursor-pointer"
            >
              <ArrowLeft size={16} />
              Panoya Dön
            </button>
            <div className="h-6 w-px bg-gray-200" />
            <h1 className="text-xl font-bold tracking-tight text-gray-800 font-cinzel">
              Folyo Hesabı
            </h1>
          </div>
          <button
            onClick={fetchFolioData}
            className="flex items-center gap-2 rounded-lg border border-gold-500/40 bg-white px-4 py-2 text-sm font-semibold text-gold-600 hover:bg-gold-50 shadow-sm transition-colors cursor-pointer"
          >
            <RefreshCw size={14} />
            Yenile
          </button>
        </div>
      </div>

      {/* ─── Misafir / Oda Özet Şeridi ─── */}
      {reservation && (
        <div className="bg-white border-b border-gray-100 px-6 py-3">
          <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm">
            {roomNumber && (
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                  Oda
                </span>
                <span className="font-bold text-gold-700 font-cinzel text-lg">#{roomNumber}</span>
              </div>
            )}
            {primaryGuest && (
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                  Misafir
                </span>
                <span className="font-semibold text-gray-800">
                  {primaryGuest.first_name} {primaryGuest.last_name}
                </span>
              </div>
            )}
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                Giriş
              </span>
              <span className="font-medium text-gray-600">
                {formatDate(reservation.check_in_date)}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                Çıkış
              </span>
              <span className="font-medium text-gray-600">
                {formatDate(reservation.check_out_date)}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                Durum
              </span>
              <span
                className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                  folio?.status === 'OPEN'
                    ? 'bg-emerald-100 text-emerald-700'
                    : folio?.status === 'SETTLED'
                      ? 'bg-blue-100 text-blue-700'
                      : 'bg-gray-100 text-gray-600'
                }`}
              >
                {folio?.status === 'OPEN'
                  ? 'Açık'
                  : folio?.status === 'SETTLED'
                    ? 'Kapandı'
                    : 'Kapatıldı'}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* ─── Ana İçerik: İki Sütun ─── */}
      <div className="px-6 py-8">
        {/* Hata mesajı (global) */}
        {error && (
          <div className="mb-6 flex items-start gap-3 rounded-xl border-2 border-rose-300 bg-rose-50 px-5 py-4 text-rose-800">
            <AlertCircle size={20} className="shrink-0 mt-0.5 text-rose-600" />
            <div>
              <p className="font-semibold">Hata</p>
              <p className="text-sm mt-0.5">{error}</p>
            </div>
          </div>
        )}

        {/* Başarı mesajı */}
        {submitSuccess && (
          <div className="mb-6 flex items-center gap-3 rounded-xl border-2 border-emerald-300 bg-emerald-50 px-5 py-4 text-emerald-800 animate-in fade-in">
            <CheckCircle2 size={20} className="shrink-0 text-emerald-600" />
            <p className="font-semibold text-sm">İşlem başarıyla kaydedildi!</p>
          </div>
        )}

        {/* ═══ Özet Kartları (4'lü) ═══ */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {/* Konaklama */}
          <div className="rounded-xl border border-amber-200 bg-gradient-to-br from-amber-50 to-white p-4 shadow-sm">
            <div className="flex items-center gap-2 mb-2">
              <BedDouble size={15} className="text-amber-500" />
              <span className="text-[10px] font-bold text-amber-600 uppercase tracking-widest">
                Konaklama
              </span>
            </div>
            <p className="text-xl font-bold text-amber-800 font-cinzel">
              {formatCurrency(totalRoomCharge)}
            </p>
            <p className="text-[10px] text-amber-500 mt-1">{roomCharges.length} işlem</p>
          </div>

          {/* Ekstra Harcamalar */}
          <div className="rounded-xl border border-rose-200 bg-gradient-to-br from-rose-50 to-white p-4 shadow-sm">
            <div className="flex items-center gap-2 mb-2">
              <Coffee size={15} className="text-rose-500" />
              <span className="text-[10px] font-bold text-rose-600 uppercase tracking-widest">
                Ekstra
              </span>
            </div>
            <p className="text-xl font-bold text-rose-800 font-cinzel">
              {formatCurrency(totalExtra)}
            </p>
            <p className="text-[10px] text-rose-500 mt-1">{extraCharges.length} işlem</p>
          </div>

          {/* Toplam Tahsilat */}
          <div className="rounded-xl border border-emerald-200 bg-gradient-to-br from-emerald-50 to-white p-4 shadow-sm">
            <div className="flex items-center gap-2 mb-2">
              <TrendingDown size={15} className="text-emerald-500" />
              <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest">
                Tahsilat
              </span>
            </div>
            <p className="text-xl font-bold text-emerald-800 font-cinzel">
              {formatCurrency(totalPayments)}
            </p>
            <p className="text-[10px] text-emerald-500 mt-1">{payments.length} işlem</p>
          </div>

          {/* Kalan Bakiye */}
          <div
            className={`rounded-xl border-2 p-4 shadow-sm ${
              balance > 0
                ? 'border-rose-300 bg-gradient-to-br from-rose-50 to-white'
                : balance === 0
                  ? 'border-emerald-300 bg-gradient-to-br from-emerald-50 to-white'
                  : 'border-blue-300 bg-gradient-to-br from-blue-50 to-white'
            }`}
          >
            <div className="flex items-center gap-2 mb-2">
              <Scale
                size={15}
                className={
                  balance > 0
                    ? 'text-rose-500'
                    : balance === 0
                      ? 'text-emerald-500'
                      : 'text-blue-500'
                }
              />
              <span
                className={`text-[10px] font-bold uppercase tracking-widest ${
                  balance > 0
                    ? 'text-rose-600'
                    : balance === 0
                      ? 'text-emerald-600'
                      : 'text-blue-600'
                }`}
              >
                Net Bakiye
              </span>
            </div>
            <p
              className={`text-2xl font-extrabold font-cinzel ${
                balance > 0
                  ? 'text-rose-700'
                  : balance === 0
                    ? 'text-emerald-700'
                    : 'text-blue-700'
              }`}
            >
              {formatCurrency(balance)}
            </p>
            <p
              className={`text-[10px] mt-1 font-semibold ${
                balance > 0 ? 'text-rose-500' : balance === 0 ? 'text-emerald-500' : 'text-blue-500'
              }`}
            >
              {balance > 0 ? 'Borç kalan' : balance === 0 ? 'Tamamen ödendi' : 'Fazla ödeme'}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          {/* ═══ Sol Sütun: Hesap Dökümü (3/5) ═══ */}
          <div className="lg:col-span-3 space-y-0">
            {/* Sekmeler */}
            <div className="bg-white rounded-t-2xl border border-b-0 border-gray-200 shadow-sm overflow-hidden">
              <div className="flex border-b border-gray-100">
                {(
                  [
                    {
                      key: 'ALL' as FolioTab,
                      label: 'Tüm İşlemler',
                      count: transactions.length,
                      icon: <Receipt size={14} />,
                    },
                    {
                      key: 'ROOM_CHARGE' as FolioTab,
                      label: 'Konaklama',
                      count: roomCharges.length,
                      icon: <BedDouble size={14} />,
                    },
                    {
                      key: 'EXTRA' as FolioTab,
                      label: 'Ekstra Harcamalar',
                      count: extraCharges.length,
                      icon: <Coffee size={14} />,
                    },
                  ] as const
                ).map((tab) => (
                  <button
                    key={tab.key}
                    type="button"
                    onClick={() => setActiveTab(tab.key)}
                    className={`flex items-center gap-2 px-5 py-3.5 text-sm font-semibold transition-all cursor-pointer border-b-2 -mb-px ${
                      activeTab === tab.key
                        ? 'border-gold-500 text-gold-700 bg-gold-50/40'
                        : 'border-transparent text-gray-400 hover:text-gray-600 hover:bg-gray-50/50'
                    }`}
                  >
                    {tab.icon}
                    <span>{tab.label}</span>
                    <span
                      className={`ml-1 text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                        activeTab === tab.key
                          ? 'bg-gold-100 text-gold-700'
                          : 'bg-gray-100 text-gray-500'
                      }`}
                    >
                      {tab.count}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Tablo İçeriği */}
            <div className="bg-white rounded-b-2xl border border-t-0 border-gray-200 shadow-sm overflow-hidden">
              <TransactionTable transactions={filteredTransactions} />
            </div>

            {/* Sekme altı özet (konaklama ve ekstra sekmelerinde) */}
            {activeTab === 'ROOM_CHARGE' && roomCharges.length > 0 && (
              <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50/70 px-5 py-3 flex items-center justify-between">
                <span className="text-sm font-semibold text-amber-700 flex items-center gap-2">
                  <BedDouble size={15} />
                  Konaklama Toplamı
                </span>
                <span className="text-lg font-bold text-amber-800 font-cinzel">
                  {formatCurrency(totalRoomCharge)}
                </span>
              </div>
            )}

            {activeTab === 'EXTRA' && extraCharges.length > 0 && (
              <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50/70 px-5 py-3 flex items-center justify-between">
                <span className="text-sm font-semibold text-rose-700 flex items-center gap-2">
                  <Coffee size={15} />
                  Ekstra Harcama Toplamı
                </span>
                <span className="text-lg font-bold text-rose-800 font-cinzel">
                  {formatCurrency(totalExtra)}
                </span>
              </div>
            )}
          </div>

          {/* ═══ Sağ Sütun: İşlem Ekle (2/5) ═══ */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm lg:sticky lg:top-8">
              <div className="flex items-center gap-2 mb-6 pb-4 border-b border-gray-100">
                <PlusCircle size={18} className="text-gold-500" />
                <h2 className="text-sm font-bold text-gray-700 uppercase tracking-wider">
                  İşlem Ekle
                </h2>
              </div>

              {/* Mod Seçici */}
              <div className="flex rounded-xl bg-gray-100 p-1 mb-6">
                <button
                  type="button"
                  onClick={() => {
                    setFormMode('CHARGE')
                    setTxType('ROOM_CHARGE')
                  }}
                  className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-semibold transition-all cursor-pointer ${
                    formMode === 'CHARGE'
                      ? 'bg-white text-gray-800 shadow-sm border border-gray-200'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  <TrendingUp size={15} />
                  Borç Ekle
                </button>
                <button
                  type="button"
                  onClick={() => setFormMode('PAYMENT')}
                  className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-semibold transition-all cursor-pointer ${
                    formMode === 'PAYMENT'
                      ? 'bg-white text-gray-800 shadow-sm border border-gray-200'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  <TrendingDown size={15} />
                  Tahsilat
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                {/* İşlem Tipi (Borç modunda) */}
                {formMode === 'CHARGE' && (
                  <div>
                    <Label htmlFor="folio-txType">İşlem Tipi</Label>
                    <select
                      id="folio-txType"
                      required
                      value={txType}
                      onChange={(e) => setTxType(e.target.value as TransactionType)}
                      className={`${inputClass} cursor-pointer`}
                    >
                      <option value="ROOM_CHARGE">Oda Ücreti</option>
                      <option value="EXTRA">Ekstra Harcama (Minibar, Restoran vb.)</option>
                    </select>
                  </div>
                )}

                {/* Ödeme Yöntemi (Tahsilat modunda) */}
                {formMode === 'PAYMENT' && (
                  <div>
                    <Label htmlFor="folio-paymentMethod">Ödeme Yöntemi</Label>
                    <select
                      id="folio-paymentMethod"
                      required
                      value={paymentMethod}
                      onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
                      className={`${inputClass} cursor-pointer`}
                    >
                      <option value="CASH">Nakit</option>
                      <option value="CREDIT_CARD">Kredi Kartı</option>
                      <option value="BANK_TRANSFER">Havale / EFT</option>
                      <option value="CITY_LEDGER">Cari Hesap</option>
                    </select>
                  </div>
                )}

                {/* Tutar */}
                <div>
                  <Label htmlFor="folio-amount">Tutar (₺)</Label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 text-sm font-medium">
                      ₺
                    </span>
                    <input
                      id="folio-amount"
                      type="number"
                      required
                      min="0.01"
                      step="0.01"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      className={`${inputClass} pl-8`}
                      placeholder="0.00"
                    />
                  </div>
                </div>

                {/* Açıklama */}
                <div>
                  <Label htmlFor="folio-description">Açıklama</Label>
                  <input
                    id="folio-description"
                    type="text"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className={inputClass}
                    placeholder={
                      formMode === 'CHARGE'
                        ? 'Örn: Minibar, Oda servisi…'
                        : 'Örn: Nakit tahsilat…'
                    }
                  />
                </div>

                {/* Özet kutusu */}
                {amount && parseFloat(amount) > 0 && (
                  <div
                    className={`rounded-lg border px-4 py-3 ${
                      formMode === 'PAYMENT'
                        ? 'bg-emerald-50/70 border-emerald-200'
                        : 'bg-amber-50/70 border-amber-200'
                    }`}
                  >
                    <div className="flex items-center justify-between text-xs">
                      <span
                        className={formMode === 'PAYMENT' ? 'text-emerald-600' : 'text-amber-600'}
                      >
                        {formMode === 'PAYMENT' ? 'Tahsil edilecek' : 'Borçlandırılacak'}
                      </span>
                      <span
                        className={`font-bold text-sm ${
                          formMode === 'PAYMENT' ? 'text-emerald-700' : 'text-amber-700'
                        }`}
                      >
                        {formMode === 'PAYMENT' ? '−' : '+'}{' '}
                        {formatCurrency(parseFloat(amount))}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-xs mt-1.5 pt-1.5 border-t border-gray-200/50">
                      <span className="text-gray-500">İşlem sonrası bakiye</span>
                      <span className="font-bold text-sm text-gray-800">
                        {formatCurrency(
                          formMode === 'PAYMENT'
                            ? balance - parseFloat(amount)
                            : balance + parseFloat(amount)
                        )}
                      </span>
                    </div>
                  </div>
                )}

                {/* Kaydet Butonu */}
                <button
                  type="submit"
                  disabled={submitting}
                  className={`w-full flex items-center justify-center gap-2.5 font-bold tracking-widest uppercase px-8 py-3.5 rounded-xl border shadow-md transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 cursor-pointer ${
                    formMode === 'PAYMENT'
                      ? 'bg-emerald-700 text-white border-emerald-600 hover:bg-emerald-800 focus:ring-emerald-500'
                      : 'bg-black text-gold-400 border-gold-500/30 hover:bg-gray-900 hover:text-gold-300 focus:ring-gold-500'
                  }`}
                >
                  {submitting ? (
                    <>
                      <Loader2 size={18} className="animate-spin" />
                      Kaydediliyor…
                    </>
                  ) : (
                    <>
                      <CheckCircle2 size={18} />
                      {formMode === 'PAYMENT' ? 'Tahsilat Kaydet' : 'Borç Ekle'}
                    </>
                  )}
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
