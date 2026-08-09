import { useEffect, useState } from 'react'
import {
  RefreshCw,
  Receipt,
  CheckCircle2,
  Check,
  Search,
} from 'lucide-react'
import { supabase } from '../lib/supabase'

interface TransactionRow {
  id: string
  amount: number
  description: string | null
  created_at: string | null
  is_cleared: boolean | null
  folios: {
    reservations: {
      rooms: { room_number: string } | null
      guests: { first_name: string; last_name: string } | null
      channel: string | null
      agency_name: string | null
    } | null
  } | null
}

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
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export default function CityLedger() {
  const [transactions, setTransactions] = useState<TransactionRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [clearingId, setClearingId] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterStatus, setFilterStatus] = useState<'ALL' | 'PENDING' | 'CLEARED'>('ALL')

  const fetchLedger = async () => {
    setLoading(true)
    setError(null)
    try {
      const { data, error: sbError } = await supabase
        .from('transactions')
        .select(`
          id,
          amount,
          description,
          created_at,
          is_cleared,
          folios!inner (
            reservations!inner (
              rooms ( room_number ),
              guests ( first_name, last_name ),
              channel,
              agency_name
            )
          )
        `)
        .eq('payment_method', 'CITY_LEDGER')
        .order('created_at', { ascending: false })

      if (sbError) throw sbError
      setTransactions((data as unknown as TransactionRow[]) ?? [])
    } catch (err: any) {
      setError(err?.message || 'Veriler yüklenemedi.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchLedger()
  }, [])

  const handleClear = async (id: string) => {
    if (!window.confirm('Bu borcu tahsil edildi olarak işaretlemek istediğinize emin misiniz?')) {
      return
    }

    setClearingId(id)
    try {
      const { error: updateError } = await supabase
        .from('transactions')
        .update({ is_cleared: true })
        .eq('id', id)

      if (updateError) throw updateError

      setTransactions((prev) =>
        prev.map((tx) => (tx.id === id ? { ...tx, is_cleared: true } : tx))
      )
    } catch (err: any) {
      alert(`Hata: ${err?.message || 'İşlem güncellenemedi.'}`)
    } finally {
      setClearingId(null)
    }
  }

  function getRoomGuestAndAgency(tx: TransactionRow) {
    const reservation = tx.folios?.reservations
    const room = reservation?.rooms?.room_number ?? '—'
    const guest = reservation?.guests
      ? `${reservation.guests.first_name} ${reservation.guests.last_name}`
      : '—'
    const agency = reservation?.channel === 'AGENCY' && reservation?.agency_name ? reservation.agency_name : 'Direkt'
    return { room, guest, agency }
  }

  const filteredTransactions = transactions.filter((tx) => {
    // Durum Filtresi
    if (filterStatus === 'PENDING' && tx.is_cleared) return false
    if (filterStatus === 'CLEARED' && !tx.is_cleared) return false

    // Metin Arama Filtresi
    if (!searchTerm.trim()) return true
    const { room, guest, agency } = getRoomGuestAndAgency(tx)
    const search = searchTerm.toLowerCase()
    return room.toLowerCase().includes(search) || guest.toLowerCase().includes(search) || agency.toLowerCase().includes(search)
  })

  // Filtrelenmiş Bekleyen Cari Alacak Toplamı / Fatura Tutarı
  const pendingTotal = filteredTransactions
    .filter(tx => !tx.is_cleared)
    .reduce((sum, tx) => sum + Math.abs(tx.amount), 0)

  return (
    <div className="flex-1 text-gray-800 px-6 py-8 font-sans">
      {/* ═══ Başlık ═══ */}
      <div className="mb-8 flex items-center justify-between border-b border-gray-200 pb-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-[0.18em] text-gold-600 font-cinzel">
            CARİ HESAPLAR
          </h1>
          <p className="mt-1 text-xs md:text-sm font-semibold tracking-widest text-gray-400 uppercase">
            Hera City Hotel — Bekleyen ve Tahsil Edilen Firma/Misafir Alacakları
          </p>
        </div>
        <button
          onClick={fetchLedger}
          disabled={loading}
          className="flex items-center gap-2 rounded-lg border border-gold-500/40 bg-white px-4 py-2.5 text-sm font-semibold text-gold-600 hover:bg-gold-50 shadow-sm disabled:opacity-50 transition-colors cursor-pointer"
        >
          <RefreshCw size={15} className={loading ? 'animate-spin text-gold-500' : 'text-gold-500'} />
          Yenile
        </button>
      </div>

      <div className="flex flex-col lg:flex-row gap-6 mb-6 items-start lg:items-center justify-between">
        {/* Filtreler */}
        <div className="flex flex-col sm:flex-row gap-4 w-full lg:w-auto">
          {/* Arama */}
          <div className="relative w-full sm:w-72">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Misafir, Oda veya Acente ara..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-gray-200 bg-white text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-gold-500/40 focus:border-gold-400 transition-colors shadow-sm"
            />
          </div>

          {/* Durum */}
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value as any)}
            className="w-full sm:w-48 px-3 py-2.5 rounded-xl border border-gray-200 bg-white text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-gold-500/40 focus:border-gold-400 transition-colors shadow-sm cursor-pointer"
          >
            <option value="ALL">Tüm Borçlar</option>
            <option value="PENDING">Sadece Bekleyenler</option>
            <option value="CLEARED">Tahsil Edilenler</option>
          </select>
        </div>

        {/* Fatura Toplamı Kartı */}
        <div className="flex items-center gap-4 rounded-xl border-2 border-rose-200 bg-rose-50/50 px-5 py-4 shadow-sm w-full lg:w-auto min-w-[320px]">
          <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-white shadow-sm text-rose-500">
            <Receipt size={24} />
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-gray-500 mb-0.5">
              Bekleyen Cari Toplamı / Fatura Tutarı
            </p>
            <p className="text-2xl font-extrabold tracking-tight text-rose-700">
              {formatCurrency(pendingTotal)}
            </p>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-24 text-gray-500">
          <RefreshCw size={20} className="animate-spin mr-3 text-gold-500" />
          Kayıtlar yükleniyor…
        </div>
      ) : error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-red-700">
          <p className="font-semibold">Hata:</p>
          <p className="text-sm mt-1">{error}</p>
        </div>
      ) : transactions.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-gray-400 bg-white rounded-2xl border border-gray-200 shadow-sm">
          <Receipt size={40} className="mb-4 text-gray-300" />
          <p className="font-medium">Sistemde cari hesap (City Ledger) kaydı bulunmuyor.</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/60">
                  <th className="text-left px-5 py-3 text-[10px] font-bold text-gray-400 uppercase tracking-wider whitespace-nowrap">Tarih</th>
                  <th className="text-left px-5 py-3 text-[10px] font-bold text-gray-400 uppercase tracking-wider whitespace-nowrap">Oda & Misafir</th>
                  <th className="text-left px-5 py-3 text-[10px] font-bold text-gray-400 uppercase tracking-wider whitespace-nowrap">Kanal / Acente</th>
                  <th className="text-left px-5 py-3 text-[10px] font-bold text-gray-400 uppercase tracking-wider whitespace-nowrap">Açıklama</th>
                  <th className="text-left px-5 py-3 text-[10px] font-bold text-gray-400 uppercase tracking-wider whitespace-nowrap">Tutar</th>
                  <th className="text-center px-5 py-3 text-[10px] font-bold text-gray-400 uppercase tracking-wider whitespace-nowrap">Durum</th>
                  <th className="text-right px-5 py-3 text-[10px] font-bold text-gray-400 uppercase tracking-wider whitespace-nowrap">Aksiyon</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filteredTransactions.map((tx) => {
                  const { room, guest, agency } = getRoomGuestAndAgency(tx)
                  const isCleared = tx.is_cleared === true
                  const isClearing = clearingId === tx.id
                  const amount = Math.abs(tx.amount)

                  return (
                    <tr
                      key={tx.id}
                      className={`transition-colors hover:bg-gray-50/70 ${isCleared ? 'bg-gray-50/30' : 'bg-white'}`}
                    >
                      <td className="px-5 py-4 whitespace-nowrap">
                        <span className={`text-xs font-semibold ${isCleared ? 'text-gray-400' : 'text-gray-700'}`}>
                          {formatDateTime(tx.created_at)}
                        </span>
                      </td>
                      
                      <td className="px-5 py-4 whitespace-nowrap">
                        <div className={`flex items-center gap-1.5 ${isCleared ? 'opacity-60' : ''}`}>
                          <span className={`text-xs font-bold font-cinzel ${isCleared ? 'text-gray-500' : 'text-gray-800'}`}>
                            #{room}
                          </span>
                          <span className="text-gray-300">—</span>
                          <span className={`text-xs font-medium truncate max-w-[160px] ${isCleared ? 'text-gray-500' : 'text-gray-700'}`} title={guest}>
                            {guest}
                          </span>
                        </div>
                      </td>

                      <td className="px-5 py-4 whitespace-nowrap">
                        {agency === 'Direkt' ? (
                          <span className={`text-xs font-medium ${isCleared ? 'text-gray-400' : 'text-gray-500'}`}>
                            Direkt
                          </span>
                        ) : (
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${isCleared ? 'bg-gray-100 text-gray-500' : 'bg-indigo-50 border border-indigo-200 text-indigo-700'}`}>
                            🌐 {agency}
                          </span>
                        )}
                      </td>

                      <td className="px-5 py-4">
                        <span className={`text-xs font-medium block max-w-[220px] truncate ${isCleared ? 'text-gray-400' : 'text-gray-500'}`} title={tx.description ?? ''}>
                          {tx.description || '—'}
                        </span>
                      </td>

                      <td className="px-5 py-4 whitespace-nowrap">
                        <span className={`text-sm font-bold tracking-tight tabular-nums ${isCleared ? 'text-gray-400 line-through' : 'text-rose-600'}`}>
                          {formatCurrency(amount)}
                        </span>
                      </td>

                      <td className="px-5 py-4 text-center whitespace-nowrap">
                        {isCleared ? (
                          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-gray-100 text-[10px] font-bold text-gray-500">
                            <Check size={12} />
                            Ödendi
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-1 rounded-md bg-amber-50 text-[10px] font-bold text-amber-600 border border-amber-200">
                            Bekliyor
                          </span>
                        )}
                      </td>

                      <td className="px-5 py-4 text-right whitespace-nowrap">
                        {!isCleared && (
                          <button
                            onClick={() => handleClear(tx.id)}
                            disabled={isClearing}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold transition-all disabled:opacity-50 shadow-sm cursor-pointer"
                          >
                            {isClearing ? <RefreshCw size={12} className="animate-spin" /> : <CheckCircle2 size={12} />}
                            Tahsil Edildi İşaretle
                          </button>
                        )}
                      </td>
                    </tr>
                  )
                })}
                {filteredTransactions.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-5 py-12 text-center text-sm text-gray-400">
                      Aramanızla eşleşen sonuç bulunamadı.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
