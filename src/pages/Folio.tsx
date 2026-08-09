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
  X,
  ShoppingBag,
  LogOut,
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
    channel: string | null
    agency_name: string | null
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

  const [submitSuccess, setSubmitSuccess] = useState(false)

  // Check-out state'leri
  const [showCheckoutConfirm, setShowCheckoutConfirm] = useState(false)
  const [checkoutSubmitting, setCheckoutSubmitting] = useState(false)
  const [toastError, setToastError] = useState<string | null>(null)

  // Modal state'leri
  const [showExtraModal, setShowExtraModal] = useState(false)
  const [showPaymentModal, setShowPaymentModal] = useState(false)
  const [modalAmount, setModalAmount] = useState('')
  const [modalDescription, setModalDescription] = useState('')
  const [modalPaymentMethod, setModalPaymentMethod] = useState<PaymentMethod>('CASH')
  const [modalSubmitting, setModalSubmitting] = useState(false)

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
            channel,
            agency_name,
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


  // --- Modal üzerinden işlem ekleme ---
  const handleModalSubmit = async (type: 'EXTRA' | 'PAYMENT') => {
    if (!folio) return

    const numericAmount = parseFloat(modalAmount)
    if (isNaN(numericAmount) || numericAmount <= 0) return

    setModalSubmitting(true)

    try {
      const payload: TransactionInsert = {
        folio_id: folio.id,
        transaction_type: type,
        amount: type === 'PAYMENT' ? -numericAmount : numericAmount,
        description: modalDescription.trim() || null,
        payment_method: type === 'PAYMENT' ? modalPaymentMethod : null,
      }

      const { error: insertError } = await supabase.from('transactions').insert(payload)
      if (insertError) throw new Error(insertError.message)

      // Temizle ve kapat
      setModalAmount('')
      setModalDescription('')
      setModalPaymentMethod('CASH')
      setShowExtraModal(false)
      setShowPaymentModal(false)
      setSubmitSuccess(true)
      setTimeout(() => setSubmitSuccess(false), 3000)
      await fetchFolioData()
    } catch (err: any) {
      setError(err?.message || 'İşlem kaydedilemedi.')
    } finally {
      setModalSubmitting(false)
    }
  }

  // --- Misafir bilgisi ---
  const reservation = folio?.reservations
  const primaryGuest = reservation?.reservation_guests?.find((rg) => rg.is_primary_guest)?.guests
  const roomNumber = reservation?.rooms?.room_number

  // --- Check-Out işlemi ---
  const handleCheckout = async () => {
    if (!folio || !reservation) return

    // Bakiye kontrolü (güvenlik kilidi)
    if (balance > 0) {
      setToastError('Lütfen önce kalan bakiyeyi tahsil edin veya Cari Hesaba aktarın!')
      setTimeout(() => setToastError(null), 5000)
      setShowCheckoutConfirm(false)
      return
    }

    setCheckoutSubmitting(true)
    try {
      // 1. Rezervasyon statüsünü CHECKED_OUT yap
      const { error: resError } = await supabase
        .from('reservations')
        .update({ status: 'CHECKED_OUT' })
        .eq('id', reservation.id)

      if (resError) throw new Error(`Rezervasyon güncellenemedi: ${resError.message}`)

      // 2. Odanın hk_status'unu DIRTY yap
      const { error: roomError } = await supabase
        .from('rooms')
        .update({ hk_status: 'DIRTY' })
        .eq('id', reservation.room_id)

      if (roomError) throw new Error(`Oda durumu güncellenemedi: ${roomError.message}`)

      // 3. Başarılı — Pano'ya yönlendir
      navigate('/')
    } catch (err: any) {
      setError(err?.message || 'Check-out işlemi başarısız.')
      setShowCheckoutConfirm(false)
    } finally {
      setCheckoutSubmitting(false)
    }
  }

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
          <div className="flex items-center gap-3">
            {reservation?.status === 'CHECKED_IN' && (
              <button
                type="button"
                onClick={() => {
                  if (balance > 0) {
                    setToastError('Lütfen önce kalan bakiyeyi tahsil edin veya Cari Hesaba aktarın!')
                    setTimeout(() => setToastError(null), 5000)
                  } else {
                    setShowCheckoutConfirm(true)
                  }
                }}
                className="flex items-center gap-2 rounded-lg bg-rose-600 hover:bg-rose-700 px-5 py-2 text-sm font-bold text-white shadow-sm transition-all hover:shadow-md cursor-pointer"
              >
                <LogOut size={16} />
                Check-Out Yap
              </button>
            )}
            <button
              onClick={fetchFolioData}
              className="flex items-center gap-2 rounded-lg border border-gold-500/40 bg-white px-4 py-2 text-sm font-semibold text-gold-600 hover:bg-gold-50 shadow-sm transition-colors cursor-pointer"
            >
              <RefreshCw size={14} />
              Yenile
            </button>
          </div>
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
                {reservation.channel === 'AGENCY' && reservation.agency_name && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-indigo-50 border border-indigo-200 text-[10px] font-bold text-indigo-700">
                    🌐 {reservation.agency_name}
                  </span>
                )}
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
        {/* Toast hata mesajı (Check-out bakiye uyarısı) */}
        {toastError && (
          <div className="mb-6 flex items-center gap-3 rounded-xl border-2 border-rose-400 bg-rose-100 px-5 py-4 text-rose-900 animate-in fade-in shadow-lg">
            <AlertCircle size={20} className="shrink-0 text-rose-600" />
            <p className="font-bold text-sm">{toastError}</p>
            <button
              onClick={() => setToastError(null)}
              className="ml-auto p-1 rounded-lg text-rose-400 hover:text-rose-700 hover:bg-rose-200 transition-colors cursor-pointer"
            >
              <X size={16} />
            </button>
          </div>
        )}

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

        {/* ═══ Özet Kartları (3'lü) + Aksiyon Butonları ═══ */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          {/* Toplam Harcama */}
          <div className="rounded-xl border border-rose-200 bg-gradient-to-br from-rose-50 to-white p-4 shadow-sm">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp size={15} className="text-rose-500" />
              <span className="text-[10px] font-bold text-rose-600 uppercase tracking-widest">
                Toplam Harcama
              </span>
            </div>
            <p className="text-xl font-bold text-rose-800 font-cinzel">
              {formatCurrency(totalCharges)}
            </p>
            <p className="text-[10px] text-rose-400 mt-1">
              Konaklama: {formatCurrency(totalRoomCharge)} + Ekstra: {formatCurrency(totalExtra)}
            </p>
          </div>

          {/* Toplam Ödenen */}
          <div className="rounded-xl border border-emerald-200 bg-gradient-to-br from-emerald-50 to-white p-4 shadow-sm">
            <div className="flex items-center gap-2 mb-2">
              <TrendingDown size={15} className="text-emerald-500" />
              <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest">
                Toplam Ödenen
              </span>
            </div>
            <p className="text-xl font-bold text-emerald-800 font-cinzel">
              {formatCurrency(totalPayments)}
            </p>
            <p className="text-[10px] text-emerald-400 mt-1">{payments.length} tahsilat işlemi</p>
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
                Kalan Bakiye
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

        {/* Hızlı Aksiyon Butonları */}
        <div className="flex flex-wrap gap-3 mb-8">
          <button
            type="button"
            onClick={() => setShowExtraModal(true)}
            className="flex items-center gap-2.5 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm shadow-sm transition-all hover:shadow-md hover:-translate-y-0.5 cursor-pointer"
          >
            <ShoppingBag size={16} />
            Ekstra Ekle
          </button>
          <button
            type="button"
            onClick={() => setShowPaymentModal(true)}
            className="flex items-center gap-2.5 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-sm shadow-sm transition-all hover:shadow-md hover:-translate-y-0.5 cursor-pointer"
          >
            <Wallet size={16} />
            Tahsilat Al
          </button>
        </div>

        <div className="space-y-0">
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
        </div>
      {/* ═══ Ekstra Ekle Modalı ═══ */}
      {showExtraModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4" onClick={() => setShowExtraModal(false)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-blue-50/50">
              <div className="flex items-center gap-2.5">
                <ShoppingBag size={18} className="text-blue-600" />
                <h2 className="text-lg font-bold text-gray-800 font-cinzel">Ekstra Ekle</h2>
              </div>
              <button onClick={() => setShowExtraModal(false)} className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-200 transition-colors cursor-pointer">
                <X size={18} />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <Label htmlFor="modal-extra-amount">Tutar (₺)</Label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 text-sm font-medium">₺</span>
                  <input
                    id="modal-extra-amount"
                    type="number"
                    required
                    min="0.01"
                    step="0.01"
                    value={modalAmount}
                    onChange={(e) => setModalAmount(e.target.value)}
                    className={`${inputClass} pl-8`}
                    placeholder="0.00"
                    autoFocus
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="modal-extra-desc">Açıklama</Label>
                <input
                  id="modal-extra-desc"
                  type="text"
                  value={modalDescription}
                  onChange={(e) => setModalDescription(e.target.value)}
                  className={inputClass}
                  placeholder="Örn: Minibar, Restoran, Oda Servisi…"
                />
              </div>
              {modalAmount && parseFloat(modalAmount) > 0 && (
                <div className="rounded-lg border border-blue-200 bg-blue-50/70 px-4 py-3">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-blue-600">Borçlandırılacak</span>
                    <span className="font-bold text-sm text-blue-700">+ {formatCurrency(parseFloat(modalAmount))}</span>
                  </div>
                  <div className="flex items-center justify-between text-xs mt-1.5 pt-1.5 border-t border-blue-200/50">
                    <span className="text-gray-500">İşlem sonrası bakiye</span>
                    <span className="font-bold text-sm text-gray-800">{formatCurrency(balance + parseFloat(modalAmount))}</span>
                  </div>
                </div>
              )}
              <button
                type="button"
                disabled={modalSubmitting || !modalAmount || parseFloat(modalAmount) <= 0}
                onClick={() => handleModalSubmit('EXTRA')}
                className="w-full flex items-center justify-center gap-2.5 bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-xl font-semibold transition-all hover:shadow-md disabled:opacity-50 cursor-pointer"
              >
                {modalSubmitting ? <Loader2 size={18} className="animate-spin" /> : <CheckCircle2 size={18} />}
                {modalSubmitting ? 'Kaydediliyor…' : 'Ekstra Kaydet'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═══ Tahsilat Al Modalı ═══ */}
      {showPaymentModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4" onClick={() => setShowPaymentModal(false)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-emerald-50/50">
              <div className="flex items-center gap-2.5">
                <Wallet size={18} className="text-emerald-600" />
                <h2 className="text-lg font-bold text-gray-800 font-cinzel">Tahsilat Al</h2>
              </div>
              <button onClick={() => setShowPaymentModal(false)} className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-200 transition-colors cursor-pointer">
                <X size={18} />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <Label htmlFor="modal-payment-amount">Tutar (₺)</Label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 text-sm font-medium">₺</span>
                  <input
                    id="modal-payment-amount"
                    type="number"
                    required
                    min="0.01"
                    step="0.01"
                    value={modalAmount}
                    onChange={(e) => setModalAmount(e.target.value)}
                    className={`${inputClass} pl-8`}
                    placeholder="0.00"
                    autoFocus
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="modal-payment-method">Ödeme Yöntemi</Label>
                <select
                  id="modal-payment-method"
                  value={modalPaymentMethod}
                  onChange={(e) => setModalPaymentMethod(e.target.value as PaymentMethod)}
                  className={`${inputClass} cursor-pointer`}
                >
                  <option value="CASH">Nakit</option>
                  <option value="CREDIT_CARD">Kredi Kartı</option>
                  <option value="BANK_TRANSFER">Havale / EFT</option>
                  <option value="CITY_LEDGER">Cari Hesap</option>
                </select>
              </div>
              <div>
                <Label htmlFor="modal-payment-desc">Açıklama (Opsiyonel)</Label>
                <input
                  id="modal-payment-desc"
                  type="text"
                  value={modalDescription}
                  onChange={(e) => setModalDescription(e.target.value)}
                  className={inputClass}
                  placeholder="Örn: Nakit tahsilat…"
                />
              </div>
              {modalAmount && parseFloat(modalAmount) > 0 && (
                <div className="rounded-lg border border-emerald-200 bg-emerald-50/70 px-4 py-3">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-emerald-600">Tahsil edilecek</span>
                    <span className="font-bold text-sm text-emerald-700">− {formatCurrency(parseFloat(modalAmount))}</span>
                  </div>
                  <div className="flex items-center justify-between text-xs mt-1.5 pt-1.5 border-t border-emerald-200/50">
                    <span className="text-gray-500">İşlem sonrası bakiye</span>
                    <span className="font-bold text-sm text-gray-800">{formatCurrency(balance - parseFloat(modalAmount))}</span>
                  </div>
                </div>
              )}
              <button
                type="button"
                disabled={modalSubmitting || !modalAmount || parseFloat(modalAmount) <= 0}
                onClick={() => handleModalSubmit('PAYMENT')}
                className="w-full flex items-center justify-center gap-2.5 bg-emerald-600 hover:bg-emerald-700 text-white py-3 rounded-xl font-semibold transition-all hover:shadow-md disabled:opacity-50 cursor-pointer"
              >
                {modalSubmitting ? <Loader2 size={18} className="animate-spin" /> : <CheckCircle2 size={18} />}
                {modalSubmitting ? 'Kaydediliyor…' : 'Tahsilat Kaydet'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═══ Check-Out Onay Modalı ═══ */}
      {showCheckoutConfirm && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4" onClick={() => setShowCheckoutConfirm(false)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="px-6 py-4 border-b border-gray-100 bg-rose-50/50">
              <div className="flex items-center gap-2.5">
                <LogOut size={18} className="text-rose-600" />
                <h2 className="text-lg font-bold text-gray-800 font-cinzel">Check-Out Onayı</h2>
              </div>
            </div>
            <div className="p-6 space-y-4">
              <p className="text-sm text-gray-600">
                <strong className="text-gray-800">
                  {primaryGuest ? `${primaryGuest.first_name} ${primaryGuest.last_name}` : 'Misafir'}
                </strong>
                {roomNumber && <> — Oda <strong className="text-gold-700">#{roomNumber}</strong></>} için
                çıkış işlemi yapılacaktır.
              </p>
              <div className="rounded-lg border border-emerald-200 bg-emerald-50/70 px-4 py-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-emerald-600">Kalan Bakiye</span>
                  <span className="font-bold text-sm text-emerald-700">{formatCurrency(balance)}</span>
                </div>
              </div>
              <p className="text-xs text-gray-400">
                Onayladığınızda rezervasyon <strong>CHECKED_OUT</strong> ve oda <strong>DIRTY</strong> durumuna geçecektir.
              </p>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowCheckoutConfirm(false)}
                  disabled={checkoutSubmitting}
                  className="flex-1 py-2.5 rounded-xl border border-gray-300 text-gray-600 font-semibold text-sm hover:bg-gray-50 transition-colors cursor-pointer disabled:opacity-50"
                >
                  İptal
                </button>
                <button
                  type="button"
                  onClick={handleCheckout}
                  disabled={checkoutSubmitting}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-sm shadow-sm transition-all hover:shadow-md cursor-pointer disabled:opacity-50"
                >
                  {checkoutSubmitting ? <Loader2 size={16} className="animate-spin" /> : <LogOut size={16} />}
                  {checkoutSubmitting ? 'İşleniyor…' : 'Check-Out Yap'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
