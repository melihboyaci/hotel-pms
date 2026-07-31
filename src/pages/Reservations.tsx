import { useEffect, useState } from 'react'
import { Search, Loader2, CalendarDays, ExternalLink } from 'lucide-react'
import { supabase } from '../lib/supabase'
import type { Database } from '../types/database.types'
import { useNavigate } from 'react-router-dom'

type Reservation = Database['public']['Tables']['reservations']['Row']
type Room = Database['public']['Tables']['rooms']['Row']
type Guest = Database['public']['Tables']['guests']['Row']

type ReservationWithDetails = Reservation & {
  guests: Pick<Guest, 'first_name' | 'last_name'> | null
  rooms: Pick<Room, 'room_number'> | null
}

const RESERVATION_STATUS_CONFIG: Record<string, { label: string; bg: string; text: string }> = {
  PENDING: { label: 'Bekliyor', bg: 'bg-amber-100', text: 'text-amber-700' },
  CHECKED_IN: { label: 'Giriş Yaptı', bg: 'bg-emerald-100', text: 'text-emerald-700' },
  CHECKED_OUT: { label: 'Çıkış Yaptı', bg: 'bg-gray-200', text: 'text-gray-700' },
  CANCELLED: { label: 'İptal Edildi', bg: 'bg-rose-100', text: 'text-rose-700' },
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '—'
  return new Date(dateStr).toLocaleDateString('tr-TR', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

export default function Reservations() {
  const [reservations, setReservations] = useState<ReservationWithDetails[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const navigate = useNavigate()

  useEffect(() => {
    const fetchReservations = async () => {
      try {
        const { data, error } = await supabase
          .from('reservations')
          .select(`
            *,
            guests ( first_name, last_name ),
            rooms ( room_number )
          `)
          .order('created_at', { ascending: false })
        
        if (error) throw error
        setReservations(data as ReservationWithDetails[])
      } catch (err) {
        console.error('Rezervasyonlar yüklenirken hata oluştu:', err)
      } finally {
        setLoading(false)
      }
    }
    
    fetchReservations()
  }, [])

  const filteredReservations = reservations.filter(res => {
    const guestName = res.guests ? `${res.guests.first_name} ${res.guests.last_name}`.toLowerCase() : ''
    const shortId = res.id.split('-')[0].toLowerCase()
    const searchLower = search.toLowerCase()
    
    return (
      guestName.includes(searchLower) ||
      shortId.includes(searchLower) ||
      (res.rooms && res.rooms.room_number.toLowerCase().includes(searchLower))
    )
  })

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center bg-gray-50/60">
        <div className="flex flex-col items-center gap-3">
          <Loader2 size={24} className="animate-spin text-gold-500" />
          <span className="text-sm text-gray-500 font-medium">Rezervasyonlar yükleniyor...</span>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 flex flex-col bg-gray-50/60 font-sans min-h-screen">
      <div className="px-8 py-8 max-w-7xl mx-auto w-full">
        {/* Header & Search */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-gray-900 font-cinzel flex items-center gap-3">
              <CalendarDays className="text-gold-500" size={28} />
              Rezervasyonlar
            </h1>
            <p className="text-sm text-gray-500 mt-1">Tüm rezervasyonların listesi ve güncel durumları.</p>
          </div>
          <div className="relative w-full md:w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input
              type="text"
              placeholder="Misafir, oda veya rezervasyon no..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-300 bg-white text-gray-800 focus:outline-none focus:ring-2 focus:ring-gold-500/50 focus:border-gold-500 transition-colors text-sm shadow-sm"
            />
          </div>
        </div>

        {/* Table */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50/80 border-b border-gray-200">
                  <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-widest">Rez. No</th>
                  <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-widest">Misafir Adı</th>
                  <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-widest">Oda No</th>
                  <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-widest">Giriş Tarihi</th>
                  <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-widest">Çıkış Tarihi</th>
                  <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-widest">Durum</th>
                  <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-widest text-right">İşlem</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredReservations.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-12 text-center text-gray-400 font-medium">
                      Eşleşen kayıt bulunamadı.
                    </td>
                  </tr>
                ) : (
                  filteredReservations.map((res) => {
                    const statusConfig = RESERVATION_STATUS_CONFIG[res.status ?? 'PENDING']
                    const shortId = res.id.split('-')[0].toUpperCase()
                    
                    return (
                      <tr key={res.id} className="hover:bg-gray-50/50 transition-colors group">
                        <td className="px-6 py-4">
                          <span className="text-xs font-bold text-gray-500 font-mono bg-gray-100 px-2 py-1 rounded-md">{shortId}</span>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-sm font-bold text-gray-900">
                            {res.guests ? `${res.guests.first_name} ${res.guests.last_name}` : '—'}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-sm font-bold text-gold-700 font-cinzel">
                            {res.rooms ? `#${res.rooms.room_number}` : '—'}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-sm text-gray-600 font-medium">{formatDate(res.check_in_date)}</span>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-sm text-gray-600 font-medium">{formatDate(res.check_out_date)}</span>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest ${statusConfig.bg} ${statusConfig.text}`}>
                            {statusConfig.label}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <button
                            onClick={() => navigate(`/reservation/${res.id}`)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-gray-500 hover:text-gold-600 hover:bg-gold-50 transition-colors"
                          >
                            <span>Detay</span>
                            <ExternalLink size={14} />
                          </button>
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}
