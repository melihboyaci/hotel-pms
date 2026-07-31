import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  BedDouble,
  Sparkles,
  AlertTriangle,
  RefreshCw,
  User,
  CalendarX,
  Receipt,
  CircleAlert,
  MoreVertical,
  FolderOpen,
  CheckCircle2,
} from 'lucide-react'
import { supabase } from '../lib/supabase'
import type { Database } from '../types/database.types'

// Veritabanından gelen gerçek tipler — manuel interface yasak
type Room = Database['public']['Tables']['rooms']['Row']
type Guest = Database['public']['Tables']['guests']['Row']
type Reservation = Database['public']['Tables']['reservations']['Row']
type HkStatus = Database['public']['Enums']['hk_status']
type RoomType = Database['public']['Enums']['room_type']

// Join sorgusundan dönen veri tipi (folios → transactions dahil)
type ReservationWithGuests = Pick<Reservation, 'id' | 'check_in_date' | 'check_out_date' | 'status'> & {
  reservation_guests: {
    is_primary_guest: boolean
    guests: Pick<Guest, 'first_name' | 'last_name'> | null
  }[]
  folios: {
    id: string
    transactions: { amount: number }[]
  } | {
    id: string
    transactions: { amount: number }[]
  }[] | null
}

type RoomWithReservations = Room & {
  reservations: ReservationWithGuests[]
}

// --- Yardımcı sabitler ---

const HK_CONFIG: Record<
  HkStatus,
  { label: string; bgClass: string; textClass: string; borderClass: string; icon: React.ReactNode }
> = {
  CLEAN: {
    label: 'Temiz',
    bgClass: 'bg-emerald-50/80',
    textClass: 'text-emerald-700',
    borderClass: 'border-emerald-300',
    icon: <Sparkles size={14} className="text-emerald-600" />,
  },
  DIRTY: {
    label: 'Kirli',
    bgClass: 'bg-rose-50/80',
    textClass: 'text-rose-700',
    borderClass: 'border-rose-300',
    icon: <AlertTriangle size={14} className="text-rose-600" />,
  },
  INSPECTED: {
    label: 'Kontrol Edildi',
    bgClass: 'bg-amber-50/80',
    textClass: 'text-amber-800',
    borderClass: 'border-amber-300',
    icon: <BedDouble size={14} className="text-amber-600" />,
  },
}

const ROOM_TYPE_LABEL: Record<RoomType, string> = {
  STANDARD: 'Standart',
  SUITE: 'Suit',
  FAMILY: 'Aile',
}

const BED_CONFIG_LABEL: Record<string, string> = {
  SINGLE: '1 Tek',
  DOUBLE: '1 Çift',
  TWIN: '2 Tek',
  DOUBLE_SINGLE: '1 Çift + 1 Tek',
  DOUBLE_TWIN: '1 Çift + 2 Tek',
  TRIPLE: '3 Tek'
}

// --- Para formatlayıcı ---
function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('tr-TR', {
    style: 'currency',
    currency: 'TRY',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}

// --- Tarih formatlayıcı ---
function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('tr-TR', {
    day: 'numeric',
    month: 'short',
  })
}

// --- Bakiye hesaplayıcı ---
function calculateBalance(reservation: ReservationWithGuests): number {
  const folios = Array.isArray(reservation.folios)
    ? reservation.folios
    : reservation.folios
      ? [reservation.folios]
      : []

  return folios.reduce((folioSum, folio) => {
    const txSum = folio.transactions?.reduce((sum, tx) => sum + tx.amount, 0) ?? 0
    return folioSum + txSum
  }, 0)
}

// --- Bileşenler ---

function BalanceBadge({ balance }: { balance: number }) {
  if (balance <= 0) {
    return (
      <div className="flex items-center gap-1 rounded-lg bg-emerald-50 border border-emerald-200 px-2 py-1">
        <CheckCircle2 size={12} className="text-emerald-500" />
        <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider">
          Ödendi
        </span>
      </div>
    )
  }

  return (
    <div className="flex items-center gap-1 rounded-lg bg-rose-50 border border-rose-200 px-2 py-1">
      <CircleAlert size={12} className="text-rose-500" />
      <span className="text-[10px] font-bold text-rose-700 tracking-wide">
        {formatCurrency(balance)}
      </span>
    </div>
  )
}

function RoomCard({
  room,
  onNavigateDetail,
}: {
  room: RoomWithReservations
  onNavigateDetail: (reservationId: string) => void
}) {
  const [menuOpen, setMenuOpen] = useState(false)
  const hk = HK_CONFIG[room.hk_status ?? 'DIRTY']
  const activeReservation = room.reservations[0] ?? null
  const isOccupied = activeReservation !== null
  const guestsList =
    activeReservation?.reservation_guests?.map((rg) => rg.guests).filter(Boolean) || []

  // Bakiye hesapla
  const balance = activeReservation ? calculateBalance(activeReservation) : 0

  return (
    <div
      className={`flex flex-col gap-2.5 rounded-xl border-2 bg-white p-4 transition-all duration-200 hover:scale-[1.02] hover:shadow-md hover:border-gold-400 ${isOccupied ? 'border-gold-400/70' : hk.borderClass}`}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-baseline gap-2">
          <span className="text-2xl font-bold text-gray-900 tracking-wide font-cinzel">
            #{room.room_number}
          </span>
          <span className="text-xs font-semibold text-gray-500 bg-gray-100/80 px-1.5 py-0.5 rounded-md whitespace-nowrap">
            {BED_CONFIG_LABEL[room.bed_config]}
          </span>
        </div>
        {isOccupied && activeReservation ? (
          <div className="relative" onBlur={(e) => {
            if (!e.currentTarget.contains(e.relatedTarget as Node)) {
              setMenuOpen(false);
            }
          }}>
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className="p-1 rounded-lg text-gray-400 hover:text-gold-600 hover:bg-gold-50 transition-colors cursor-pointer focus:outline-none"
            >
              <MoreVertical size={18} />
            </button>
            {menuOpen && (
              <div className="absolute right-0 top-8 w-52 bg-white border border-gray-200 rounded-xl shadow-xl z-50 py-1.5 overflow-hidden">
                <button
                  onMouseDown={() => onNavigateDetail(activeReservation.id)}
                  className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-gray-700 font-medium hover:bg-gold-50 hover:text-gold-700 w-full text-left cursor-pointer transition-colors"
                >
                  <FolderOpen size={15} className="text-gold-500" />
                  Detay Görüntüle
                </button>
              </div>
            )}
          </div>
        ) : (
          <BedDouble size={18} className="text-gray-300" />
        )}
      </div>

      {/* Oda tipi */}
      <span className="text-[10px] font-semibold text-gold-600 uppercase tracking-widest">
        {ROOM_TYPE_LABEL[room.type]}
      </span>

      {/* Doluluk Bilgisi */}
      <div className="flex-1 flex flex-col justify-center py-1">
        {isOccupied && guestsList.length > 0 ? (
          <div className="flex flex-col gap-2.5">
            <div className="flex flex-col gap-1.5">
              {guestsList.map((g, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <User size={13} className="text-gold-500 shrink-0" />
                  <span className="text-xs font-semibold text-gray-700 leading-none truncate" title={`${g?.first_name} ${g?.last_name}`}>
                    {g?.first_name} {g?.last_name}
                  </span>
                </div>
              ))}
            </div>
            <div className="flex items-center gap-2">
              <CalendarX size={13} className="text-gray-400" />
              <span className="text-[10px] font-medium text-gray-500">
                Çıkış: {formatDate(activeReservation.check_out_date)}
              </span>
            </div>
          </div>
        ) : (
          <p className="text-xs text-gray-400 font-medium italic">Oda boş</p>
        )}
      </div>

      {/* HK durum rozeti + Bakiye rozeti */}
      <div className="flex items-center gap-2 flex-wrap">
        <div className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1 ${hk.bgClass}`}>
          {hk.icon}
          <span className={`text-xs font-semibold ${hk.textClass}`}>{hk.label}</span>
        </div>
        {isOccupied && <BalanceBadge balance={balance} />}
      </div>
    </div>
  )
}

function StatusBadge({ status, count }: { status: HkStatus; count: number }) {
  const hk = HK_CONFIG[status]
  return (
    <div
      className={`flex items-center gap-2 rounded-lg border bg-white px-3 py-1.5 shadow-sm ${hk.borderClass}`}
    >
      {hk.icon}
      <span className={`text-sm font-medium ${hk.textClass}`}>{hk.label}</span>
      <span className="ml-1 rounded-full bg-gray-100 px-2 py-0.5 text-xs font-bold text-gray-700">
        {count}
      </span>
    </div>
  )
}

// --- Ana Sayfa ---

export default function Dashboard() {
  const navigate = useNavigate()
  const [rooms, setRooms] = useState<RoomWithReservations[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchRooms = async () => {
    setLoading(true)
    setError(null)

    const today = new Date().toISOString().split('T')[0]

    try {
      const { data, error: sbError } = await supabase
        .from('rooms')
        .select(`
          *,
          reservations!left (
            id,
            check_in_date,
            check_out_date,
            status,
            reservation_guests!inner (
              is_primary_guest,
              guests!inner ( first_name, last_name )
            ),
            folios (
              id,
              transactions ( amount )
            )
          )
        `)
        .in('reservations.status', ['CHECKED_IN', 'PENDING'])
        .lte('reservations.check_in_date', today)
        .gte('reservations.check_out_date', today)
        .order('room_number', { ascending: true })

      if (sbError) {
        setError(sbError.message)
      } else {
        setRooms((data as RoomWithReservations[]) ?? [])
      }
    } catch (err: any) {
      setError(err?.message || 'Veritabanı bağlantısı sağlanamadı.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchRooms()
  }, [])

  // Özet sayaçları
  const hkCounts = (['CLEAN', 'DIRTY', 'INSPECTED'] as HkStatus[]).reduce(
    (acc, status) => {
      acc[status] = rooms.filter((r) => r.hk_status === status).length
      return acc
    },
    {} as Record<HkStatus, number>
  )

  const occupiedCount = rooms.filter((r) => r.reservations.length > 0).length
  const vacantCount = rooms.length - occupiedCount

  return (
    <div className="flex-1 text-gray-800 px-6 py-8 font-sans">
      {/* Başlık */}
      <div className="mb-8 flex items-center justify-between border-b border-gray-200 pb-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-[0.18em] text-gold-600 font-cinzel">
            RESEPSIYON PANOSU
          </h1>
          <p className="mt-1 text-xs md:text-sm font-semibold tracking-widest text-gray-400 uppercase">
            Hera City Hotel
          </p>
        </div>
        <button
          onClick={fetchRooms}
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

      {/* Özet şerit */}
      <div className="mb-8 flex flex-wrap gap-3">
        {/* Doluluk özeti */}
        <div className="flex items-center gap-2 rounded-lg border border-gold-300 bg-gold-50 px-3 py-1.5 shadow-sm">
          <User size={14} className="text-gold-600" />
          <span className="text-sm font-medium text-gold-700">Dolu</span>
          <span className="ml-1 rounded-full bg-gold-200/60 px-2 py-0.5 text-xs font-bold text-gold-800">
            {occupiedCount}
          </span>
        </div>
        <div className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-1.5 shadow-sm">
          <BedDouble size={14} className="text-gray-400" />
          <span className="text-sm font-medium text-gray-500">Boş</span>
          <span className="ml-1 rounded-full bg-gray-100 px-2 py-0.5 text-xs font-bold text-gray-600">
            {vacantCount}
          </span>
        </div>

        <div className="w-px bg-gray-200 mx-1" />

        {/* HK sayaçları */}
        {(['CLEAN', 'DIRTY', 'INSPECTED'] as HkStatus[]).map((s) => (
          <StatusBadge key={s} status={s} count={hkCounts[s] ?? 0} />
        ))}

        <div className="ml-auto flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3.5 py-1.5 shadow-sm">
          <BedDouble size={14} className="text-gold-500" />
          <span className="text-sm font-medium text-gray-600">Toplam</span>
          <span className="ml-1 rounded-full bg-gold-50 px-2 py-0.5 text-xs font-bold text-gold-700 border border-gold-200">
            {rooms.length}
          </span>
        </div>
      </div>

      {/* Durum */}
      {loading && (
        <div className="flex items-center justify-center py-24 text-gray-500">
          <RefreshCw size={20} className="animate-spin mr-3 text-gold-500" />
          Odalar yükleniyor…
        </div>
      )}

      {error && !loading && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-red-700">
          <p className="font-semibold">Hata:</p>
          <p className="text-sm mt-1">{error}</p>
        </div>
      )}

      {/* Oda grid */}
      {!loading && !error && rooms.length === 0 && (
        <p className="text-center text-gray-400 py-24">Henüz oda kaydı yok.</p>
      )}

      {!loading && !error && rooms.length > 0 && (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
          {rooms.map((room) => (
            <RoomCard
              key={room.id}
              room={room}
              onNavigateDetail={(resId) => navigate(`/reservation/${resId}`)}
            />
          ))}
        </div>
      )}
    </div>
  )
}
