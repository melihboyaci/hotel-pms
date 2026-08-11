import { useEffect, useState, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  ArrowLeft,
  RefreshCw,
  Loader2,
  AlertCircle,
  User,
  CalendarCheck,
  CalendarX,
  BedDouble,
  Phone,
  CreditCard,
  Building,
  Coffee,
  Wallet,
  Receipt,
  PlusCircle,
  Building2,
  CheckCircle2,
  FolderOpen,
  LogOut,
  Banknote
} from 'lucide-react'
import { supabase } from '../lib/supabase'
import type { Database } from '../types/database.types'

// --- Veritabanı Tipleri ---
type Reservation = Database['public']['Tables']['reservations']['Row']
type Room = Database['public']['Tables']['rooms']['Row']
type Guest = Database['public']['Tables']['guests']['Row']
type Folio = Database['public']['Tables']['folios']['Row']
type Transaction = Database['public']['Tables']['transactions']['Row']
type TransactionInsert = Database['public']['Tables']['transactions']['Insert']
type PaymentMethod = Database['public']['Enums']['payment_method']

type ReservationData = Reservation & {
  rooms: Pick<Room, 'room_number' | 'type'> | null
  reservation_guests: {
    is_primary_guest: boolean
    guests: Pick<Guest, 'first_name' | 'last_name' | 'identity_number' | 'phone'> | null
  }[]
  folios: (Pick<Folio, 'id' | 'status'> & {
    transactions: Pick<Transaction, 'id' | 'amount' | 'transaction_type' | 'description' | 'payment_method' | 'created_at'>[]
  }) | (Pick<Folio, 'id' | 'status'> & {
    transactions: Pick<Transaction, 'id' | 'amount' | 'transaction_type' | 'description' | 'payment_method' | 'created_at'>[]
  })[] | null
}

const ROOM_TYPE_LABEL: Record<string, string> = {
  STANDARD: 'Standart Oda',
  SUITE: 'Suit Oda',
  FAMILY: 'Aile Odası',
}

const RESERVATION_STATUS_LABEL: Record<string, { label: string; bg: string; text: string }> = {
  PENDING: { label: 'Bekliyor', bg: 'bg-amber-100', text: 'text-amber-700' },
  CHECKED_IN: { label: 'Giriş Yaptı (In-House)', bg: 'bg-emerald-100', text: 'text-emerald-700' },
  CHECKED_OUT: { label: 'Çıkış Yaptı', bg: 'bg-gray-200', text: 'text-gray-700' },
  CANCELLED: { label: 'İptal Edildi', bg: 'bg-rose-100', text: 'text-rose-700' },
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

type TabType = 'DETAILS' | 'ROOM_CHARGE' | 'EXTRA' | 'PAYMENT'

// --- Yardımcı Fonksiyonlar ---
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
    month: 'long',
    year: 'numeric',
  })
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('tr-TR', {
    style: 'currency',
    currency: 'TRY',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount)
}

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

// --- İşlem Tablosu Bileşeni ---
function TransactionTable({ transactions, type }: { transactions: Pick<Transaction, 'id' | 'amount' | 'transaction_type' | 'description' | 'payment_method' | 'created_at'>[], type: TabType }) {
  if (transactions.length === 0) {
    return (
      <div className="px-6 py-12 text-center bg-gray-50/50 border border-dashed border-gray-200 rounded-2xl">
        <Receipt size={28} className="text-gray-300 mx-auto mb-2" />
        <p className="text-sm text-gray-500 font-medium">Bu kategoride henüz işlem yok.</p>
      </div>
    )
  }

  const isPayment = type === 'PAYMENT'
  const textColorClass = isPayment ? 'text-emerald-600' : type === 'EXTRA' ? 'text-rose-600' : 'text-amber-600'

  return (
    <div className="overflow-x-auto rounded-2xl border border-gray-200 bg-white shadow-sm">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-gray-50/80 border-b border-gray-100">
            <th className="text-left px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">
              Tarih
            </th>
            <th className="text-left px-4 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">
              Açıklama
            </th>
            <th className="text-right px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">
              Tutar
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-50">
          {transactions.map((tx) => (
            <tr key={tx.id} className="hover:bg-gray-50/50 transition-colors">
              <td className="px-6 py-3 text-xs text-gray-500 whitespace-nowrap">
                {formatDateTime(tx.created_at)}
              </td>
              <td className="px-4 py-3 text-gray-700 font-medium">
                <div className="flex flex-col gap-0.5">
                  <span>{tx.description || (type === 'ROOM_CHARGE' ? 'Oda Ücreti' : type === 'EXTRA' ? 'Ekstra Harcama' : 'Tahsilat')}</span>
                  {isPayment && tx.payment_method && (
                    <span className="flex items-center gap-1 text-[10px] text-gray-400 font-semibold mt-0.5">
                      {PAYMENT_METHOD_LABEL[tx.payment_method].icon}
                      {PAYMENT_METHOD_LABEL[tx.payment_method].label}
                    </span>
                  )}
                </div>
              </td>
              <td className={`px-6 py-3 text-right font-bold whitespace-nowrap ${textColorClass}`}>
                {isPayment ? '−' : '+'} {formatCurrency(Math.abs(tx.amount))}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export default function ReservationDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()

  const [reservation, setReservation] = useState<ReservationData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<TabType>('DETAILS')

  // Form States
  const [amount, setAmount] = useState('')
  const [description, setDescription] = useState('')
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('CASH')
  const [submitting, setSubmitting] = useState(false)
  const [submitSuccess, setSubmitSuccess] = useState(false)

  const fetchReservation = useCallback(async () => {
    if (!id) return
    setLoading(true)
    setError(null)

    try {
      const { data, error: sbError } = await supabase
        .from('reservations')
        .select(`
          *,
          rooms ( room_number, type ),
          reservation_guests (
            is_primary_guest,
            guests ( first_name, last_name, identity_number, phone )
          ),
          folios (
            id,
            status,
            transactions ( id, amount, transaction_type, description, payment_method, created_at )
          )
        `)
        .eq('id', id)
        .single()

      if (sbError) {
        throw new Error(`Rezervasyon bulunamadı: ${sbError.message}`)
      }

      setReservation(data as unknown as ReservationData)
    } catch (err: any) {
      setError(err?.message || 'Veri çekilirken bir hata oluştu.')
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => {
    fetchReservation()
  }, [fetchReservation])

  const handleSubmitTransaction = async (e: React.FormEvent, type: 'EXTRA' | 'PAYMENT') => {
    e.preventDefault()
    
    // Folyoyu bul
    const folioId = Array.isArray(reservation?.folios) ? reservation?.folios[0]?.id : reservation?.folios?.id
    if (!folioId) {
      setError('Açık bir folyo hesabı bulunamadı.')
      return
    }

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
        folio_id: folioId,
        transaction_type: type,
        amount: type === 'PAYMENT' ? -numericAmount : numericAmount,
        description: description.trim() || null,
        payment_method: type === 'PAYMENT' ? paymentMethod : null,
      }

      const { error: insertError } = await supabase.from('transactions').insert(payload)

      if (insertError) {
        throw new Error(`İşlem kaydedilemedi: ${insertError.message}`)
      }

      setAmount('')
      setDescription('')
      setPaymentMethod('CASH')
      setSubmitSuccess(true)
      setTimeout(() => setSubmitSuccess(false), 3000)
      
      await fetchReservation()
    } catch (err: any) {
      setError(err?.message || 'Beklenmeyen bir hata oluştu.')
    } finally {
      setSubmitting(false)
    }
  }

  const handleCheckOut = async () => {
    if (balance > 0) {
      setError('Önce bakiyeyi sıfırlamalısınız.')
      return
    }

    if (!window.confirm('Bu rezervasyondan çıkış yapmak (Check-Out) istediğinize emin misiniz?')) {
      return
    }

    setSubmitting(true)
    setError(null)

    try {
      // 1. reservations tablosunda durumu güncelleyelim
      const { error: resError } = await supabase
        .from('reservations')
        .update({ status: 'CHECKED_OUT' })
        .eq('id', reservation!.id)
      if (resError) throw new Error(`Rezervasyon durumu güncellenemedi: ${resError.message}`)

      // 2. folios tablosunda durumu SETTLED yapıp kapatma zamanını atalım
      const folioId = Array.isArray(reservation!.folios) ? reservation!.folios[0]?.id : reservation!.folios?.id
      if (folioId) {
        const { error: folioError } = await supabase
          .from('folios')
          .update({ status: 'SETTLED', closed_at: new Date().toISOString() })
          .eq('id', folioId)
        if (folioError) throw new Error(`Folyo durumu güncellenemedi: ${folioError.message}`)
      }

      // 3. rooms tablosunda odanın temizlik durumunu DIRTY (Kirli) yapalım
      if (reservation!.room_id) {
        const { error: roomError } = await supabase
          .from('rooms')
          .update({ hk_status: 'DIRTY' })
          .eq('id', reservation!.room_id)
        if (roomError) throw new Error(`Oda durumu güncellenemedi: ${roomError.message}`)
      }

      navigate('/')
    } catch (err: any) {
      setError(err?.message || 'Check-Out işlemi sırasında bir hata oluştu.')
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center bg-gray-50/60">
        <div className="flex flex-col items-center gap-3">
          <Loader2 size={24} className="animate-spin text-gold-500" />
          <span className="text-sm text-gray-500 font-medium">Dosya yükleniyor...</span>
        </div>
      </div>
    )
  }

  if (error || !reservation) {
    return (
      <div className="flex-1 flex items-center justify-center bg-gray-50/60 p-6">
        <div className="max-w-md w-full rounded-2xl border-2 border-rose-300 bg-rose-50 p-6 text-center shadow-sm">
          <AlertCircle size={28} className="text-rose-500 mx-auto mb-3" />
          <p className="font-semibold text-rose-800 mb-1">Rezervasyon Bulunamadı</p>
          <p className="text-sm text-rose-600 mb-6">{error}</p>
          <button
            onClick={() => navigate('/')}
            className="inline-flex items-center justify-center px-5 py-2.5 rounded-lg bg-black text-gold-400 text-sm font-bold tracking-wide uppercase hover:bg-gray-900 transition-colors cursor-pointer"
          >
            Panoya Dön
          </button>
        </div>
      </div>
    )
  }

  // --- Veri Hazırlığı ---
  const primaryGuest = reservation.reservation_guests.find(rg => rg.is_primary_guest)?.guests
  const companions = reservation.reservation_guests.filter(rg => !rg.is_primary_guest).map(rg => rg.guests).filter(Boolean)
  const statusConfig = RESERVATION_STATUS_LABEL[reservation.status ?? 'PENDING']

  // Transactions extraction
  const folioArray = reservation.folios ? (Array.isArray(reservation.folios) ? reservation.folios : [reservation.folios]) : []
  const allTransactions = folioArray.flatMap(f => f.transactions || [])
  
  const roomCharges = allTransactions.filter(t => t.transaction_type === 'ROOM_CHARGE')
  const extraCharges = allTransactions.filter(t => t.transaction_type === 'EXTRA')
  const payments = allTransactions.filter(t => t.transaction_type === 'PAYMENT')

  const balance = allTransactions.reduce((sum, tx) => sum + tx.amount, 0)
  
  const balanceColor = balance > 0 ? 'text-rose-600 bg-rose-50 border-rose-200' : balance === 0 ? 'text-emerald-600 bg-emerald-50 border-emerald-200' : 'text-blue-600 bg-blue-50 border-blue-200'

  return (
    <div className="flex-1 flex flex-col bg-gray-50/60 font-sans min-h-screen">
      {/* ─── Üst Bar ─── */}
      <div className="bg-white border-b border-gray-200 px-6 py-4 shadow-sm sticky top-0 z-20">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/')}
              className="flex items-center gap-1.5 text-sm font-medium text-gray-500 hover:text-gold-600 transition-colors cursor-pointer"
            >
              <ArrowLeft size={16} />
              Panoya Dön
            </button>
            <div className="h-6 w-px bg-gray-200" />
            <div className="flex items-center gap-2 text-gray-800">
              <FolderOpen size={18} className="text-gold-500" />
              <h1 className="text-xl font-bold tracking-tight font-cinzel">
                Detay Görüntüle
              </h1>
            </div>
          </div>
          <button
            onClick={fetchReservation}
            className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-600 hover:border-gold-400 hover:text-gold-600 shadow-sm transition-colors cursor-pointer"
          >
            <RefreshCw size={14} />
            Yenile
          </button>
        </div>
      </div>

      {/* ─── Ana İçerik ─── */}
      <div className="max-w-6xl mx-auto w-full px-6 py-8">
        
        {/* Sabit Header Kartı */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 mb-8 relative overflow-hidden">
          {/* Süsleme çizgisi */}
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-gold-300 via-gold-500 to-gold-300"></div>
          
          <div className="flex flex-wrap items-center justify-between gap-6">
            <div className="flex items-center gap-5">
              <div className="w-16 h-16 rounded-2xl bg-gold-50 border border-gold-200 flex items-center justify-center shrink-0">
                <span className="text-xl font-bold text-gold-700 font-cinzel">#{reservation.rooms?.room_number}</span>
              </div>
              <div>
                <h2 className="text-2xl font-bold text-gray-900 font-cinzel tracking-wide mb-1">
                  {primaryGuest?.first_name} {primaryGuest?.last_name}
                </h2>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm font-medium text-gray-500">
                  <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-widest ${statusConfig.bg} ${statusConfig.text}`}>
                    {statusConfig.label}
                  </span>
                  <span className="flex items-center gap-1.5"><CalendarCheck size={14} className="text-gray-400" /> {formatDate(reservation.check_in_date)}</span>
                  <span className="text-gray-300">→</span>
                  <span className="flex items-center gap-1.5"><CalendarX size={14} className="text-gray-400" /> {formatDate(reservation.check_out_date)}</span>
                </div>
              </div>
            </div>
            
            {/* Sağ Taraf: Check-Out Butonu ve Bakiye Rozeti */}
            <div className="flex items-center gap-4 shrink-0">
              <button
                type="button"
                onClick={handleCheckOut}
                disabled={balance > 0 || submitting}
                title={balance > 0 ? 'Önce bakiyeyi sıfırlamalısınız.' : 'Oda Check-out'}
                className={`flex items-center gap-2 px-6 py-3.5 rounded-xl text-sm font-bold tracking-wide uppercase transition-all shadow-sm ${
                  balance > 0
                    ? 'bg-gray-100 text-gray-400 border border-gray-200 cursor-not-allowed'
                    : 'bg-black text-gold-400 border border-gold-500/30 hover:bg-gray-900 cursor-pointer hover:shadow-md'
                }`}
              >
                {submitting ? <Loader2 size={18} className="animate-spin" /> : <LogOut size={18} />}
                {balance > 0 ? 'Bakiye Kapatılmalı' : 'Oda Check-out'}
              </button>
              
              {/* Güncel Bakiye Rozeti */}
              <div className={`px-5 py-3 rounded-xl border-2 flex flex-col items-end ${balanceColor}`}>
                <span className="text-[10px] font-bold uppercase tracking-widest opacity-80 mb-0.5">Güncel Bakiye</span>
                <span className="text-2xl font-extrabold font-cinzel tracking-tight">{formatCurrency(balance)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Başarı Mesajı */}
        {submitSuccess && (
          <div className="mb-6 flex items-center gap-3 rounded-xl border-2 border-emerald-300 bg-emerald-50 px-5 py-4 text-emerald-800 animate-in fade-in">
            <CheckCircle2 size={20} className="shrink-0 text-emerald-600" />
            <p className="font-semibold text-sm">İşlem başarıyla kaydedildi!</p>
          </div>
        )}

        {/* Sekme Menüsü */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden mb-6">
          <div className="flex border-b border-gray-100 overflow-x-auto hide-scrollbar">
            {(
              [
                { key: 'DETAILS', label: 'Ayrıntı', icon: <User size={15} /> },
                { key: 'ROOM_CHARGE', label: 'Konaklama', count: roomCharges.length, icon: <BedDouble size={15} /> },
                { key: 'EXTRA', label: 'Ekstralar', count: extraCharges.length, icon: <Coffee size={15} /> },
                { key: 'PAYMENT', label: 'Tahsilat', count: payments.length, icon: <Wallet size={15} /> },
              ] as { key: TabType; label: string; count?: number; icon: React.ReactNode }[]
            ).map((tab) => (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActiveTab(tab.key)}
                className={`flex items-center gap-2 px-6 py-4 text-sm font-semibold transition-all cursor-pointer border-b-2 -mb-px whitespace-nowrap ${
                  activeTab === tab.key
                    ? 'border-gold-500 text-gold-700 bg-gold-50/40'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                }`}
              >
                {tab.icon}
                <span>{tab.label}</span>
                {tab.count !== undefined && (
                  <span className={`ml-1.5 text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    activeTab === tab.key ? 'bg-gold-100 text-gold-700' : 'bg-gray-100 text-gray-500'
                  }`}>
                    {tab.count}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* ─── Sekme İçerikleri ─── */}
        
        {/* TAB 1: AYRINTI */}
        {activeTab === 'DETAILS' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-in fade-in zoom-in-95 duration-200">
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
              <h3 className="text-sm font-bold text-gray-800 uppercase tracking-widest mb-6 flex items-center gap-2">
                <User size={16} className="text-gold-500" />
                Ana Misafir
              </h3>
              <div className="space-y-4">
                <div className="p-4 rounded-xl border border-gold-200 bg-gold-50/30">
                  <div className="text-lg font-bold text-gray-900 mb-4">{primaryGuest?.first_name} {primaryGuest?.last_name}</div>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <div className="text-xs text-gray-400 font-semibold mb-1 uppercase tracking-wider">TC Kimlik No</div>
                      <div className="flex items-center gap-2 text-gray-700 font-medium"><CreditCard size={14} className="text-gray-400" /> {primaryGuest?.identity_number}</div>
                    </div>
                    <div>
                      <div className="text-xs text-gray-400 font-semibold mb-1 uppercase tracking-wider">Telefon</div>
                      <div className="flex items-center gap-2 text-gray-700 font-medium"><Phone size={14} className="text-gray-400" /> {primaryGuest?.phone || '—'}</div>
                    </div>
                  </div>
                </div>
                
                <div className="pt-4 border-t border-gray-100">
                  <div className="flex items-center gap-2 text-gray-500 mb-1">
                    <Building size={14} className="text-gray-400" />
                    <span className="text-xs font-bold uppercase tracking-wider">Oda Tipi</span>
                  </div>
                  <p className="font-semibold text-gray-800">{ROOM_TYPE_LABEL[reservation.rooms?.type ?? '']}</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
              <h3 className="text-sm font-bold text-gray-800 uppercase tracking-widest mb-6 flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <User size={16} className="text-gray-400" />
                  Misafirler
                </span>
                <span className="bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full text-xs">{companions.length} Kişi</span>
              </h3>
              
              {companions.length === 0 ? (
                <div className="py-8 text-center border-2 border-dashed border-gray-100 rounded-xl">
                  <p className="text-sm text-gray-400 font-medium">Bu rezervasyonda ek misafir bulunmuyor.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {companions.map((comp, idx) => (
                    <div key={idx} className="p-4 rounded-xl border border-gray-100 bg-gray-50/80">
                      <div className="font-semibold text-gray-800 mb-3">{comp?.first_name} {comp?.last_name}</div>
                      <div className="flex flex-wrap gap-4 text-xs">
                        <div className="flex items-center gap-1.5 text-gray-600"><CreditCard size={13} className="text-gray-400" /> {comp?.identity_number}</div>
                        {comp?.phone && <div className="flex items-center gap-1.5 text-gray-600"><Phone size={13} className="text-gray-400" /> {comp?.phone}</div>}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 2: KONAKLAMA */}
        {activeTab === 'ROOM_CHARGE' && (
          <div className="animate-in fade-in zoom-in-95 duration-200 space-y-6">
            <TransactionTable transactions={roomCharges} type="ROOM_CHARGE" />
          </div>
        )}

        {/* TAB 3: EKSTRALAR */}
        {activeTab === 'EXTRA' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-in fade-in zoom-in-95 duration-200">
            <div className="lg:col-span-2">
              <TransactionTable transactions={extraCharges} type="EXTRA" />
            </div>
            <div>
              <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm sticky top-24">
                <div className="flex items-center gap-2 mb-6 pb-4 border-b border-gray-100">
                  <PlusCircle size={18} className="text-rose-500" />
                  <h2 className="text-sm font-bold text-gray-800 uppercase tracking-wider">Yeni Ekstra Ekle</h2>
                </div>
                <form onSubmit={(e) => handleSubmitTransaction(e, 'EXTRA')} className="space-y-4">
                  <div>
                    <Label htmlFor="extra-amount">Tutar (₺)</Label>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 text-sm font-medium">₺</span>
                      <input
                        id="extra-amount"
                        type="number"
                        required
                        min="0.01"
                        step="0.01"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        className={`${inputClass} pl-8 border-rose-200 focus:ring-rose-500/50 focus:border-rose-500`}
                        placeholder="250.00"
                        disabled={submitting}
                      />
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="extra-description">Açıklama</Label>
                    <input
                      id="extra-description"
                      type="text"
                      required
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      className={`${inputClass} border-rose-200 focus:ring-rose-500/50 focus:border-rose-500`}
                      placeholder="Örn: Minibar, Restoran, Spa..."
                      disabled={submitting}
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="w-full flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-rose-600 text-white text-sm font-bold tracking-wide uppercase hover:bg-rose-700 transition-colors shadow-md disabled:opacity-50 mt-2 cursor-pointer"
                  >
                    {submitting ? <Loader2 size={16} className="animate-spin" /> : <PlusCircle size={16} />}
                    Ekstra Borçlandır
                  </button>
                </form>
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: TAHSİLAT */}
        {activeTab === 'PAYMENT' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-in fade-in zoom-in-95 duration-200">
            <div className="lg:col-span-2">
              <TransactionTable transactions={payments} type="PAYMENT" />
            </div>
            <div>
              <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm sticky top-24">
                <div className="flex items-center justify-between mb-6 pb-4 border-b border-gray-100">
                  <div className="flex items-center gap-2">
                    <Wallet size={18} className="text-emerald-500" />
                    <h2 className="text-sm font-bold text-gray-800 uppercase tracking-wider">Tahsilat Al</h2>
                  </div>
                  {balance > 0 && (
                    <button
                      type="button"
                      onClick={() => setAmount(balance.toString())}
                      className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-md hover:bg-emerald-100 transition-colors cursor-pointer"
                    >
                      Kalanı Seç
                    </button>
                  )}
                </div>
                <form onSubmit={(e) => handleSubmitTransaction(e, 'PAYMENT')} className="space-y-4">
                  <div>
                    <Label htmlFor="payment-amount">Tutar (₺)</Label>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 text-sm font-medium">₺</span>
                      <input
                        id="payment-amount"
                        type="number"
                        required
                        min="0.01"
                        step="0.01"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        className={`${inputClass} pl-8 border-emerald-200 focus:ring-emerald-500/50 focus:border-emerald-500 font-bold text-emerald-700`}
                        placeholder="1500.00"
                        disabled={submitting}
                      />
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="payment-method">Ödeme Yöntemi</Label>
                    <select
                      id="payment-method"
                      required
                      value={paymentMethod}
                      onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
                      className={`${inputClass} border-emerald-200 focus:ring-emerald-500/50 focus:border-emerald-500 cursor-pointer`}
                      disabled={submitting}
                    >
                      <option value="CASH">Nakit</option>
                      <option value="CREDIT_CARD">Kredi Kartı</option>
                      <option value="BANK_TRANSFER">Havale / EFT</option>
                      <option value="CITY_LEDGER">Cari Hesap</option>
                    </select>
                  </div>
                  <div>
                    <Label htmlFor="payment-description">Açıklama (Opsiyonel)</Label>
                    <input
                      id="payment-description"
                      type="text"
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      className={`${inputClass} border-emerald-200 focus:ring-emerald-500/50 focus:border-emerald-500`}
                      placeholder="Örn: Kapora tahsilatı..."
                      disabled={submitting}
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="w-full flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-emerald-600 text-white text-sm font-bold tracking-wide uppercase hover:bg-emerald-700 transition-colors shadow-md disabled:opacity-50 mt-2 cursor-pointer"
                  >
                    {submitting ? <Loader2 size={16} className="animate-spin" /> : <Wallet size={16} />}
                    Tahsilatı Kaydet
                  </button>
                </form>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  )
}
