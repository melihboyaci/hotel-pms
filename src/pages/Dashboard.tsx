import { useEffect, useState } from 'react'
import { BedDouble, Sparkles, AlertTriangle, RefreshCw } from 'lucide-react'
import { supabase } from '../lib/supabase'
import type { Database } from '../types/database.types'

// Veritabanından gelen gerçek tipler — manuel interface yasak
type Room = Database['public']['Tables']['rooms']['Row']
type HkStatus = Database['public']['Enums']['hk_status']
type RoomType = Database['public']['Enums']['room_type']

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

// --- Bileşenler ---

function RoomCard({ room }: { room: Room }) {
  const hk = HK_CONFIG[room.hk_status ?? 'DIRTY']

  return (
    <div
      className={`flex flex-col gap-3 rounded-xl border-2 bg-white p-4 transition-all duration-200 hover:scale-[1.02] hover:shadow-md hover:border-gold-400 ${hk.borderClass}`}
    >
      {/* Oda numarası */}
      <div className="flex items-center justify-between">
        <span className="text-2xl font-bold text-gray-900 tracking-wide font-cinzel">
          #{room.room_number}
        </span>
        <BedDouble size={20} className="text-gold-500" />
      </div>

      {/* Oda tipi */}
      <span className="text-xs font-semibold text-gold-600 uppercase tracking-widest">
        {ROOM_TYPE_LABEL[room.type]}
      </span>

      {/* HK durum rozeti */}
      <div className={`flex items-center gap-1.5 mt-auto rounded-lg px-2.5 py-1 ${hk.bgClass}`}>
        {hk.icon}
        <span className={`text-xs font-semibold ${hk.textClass}`}>{hk.label}</span>
      </div>
    </div>
  )
}

function StatusBadge({ status, count }: { status: HkStatus; count: number }) {
  const hk = HK_CONFIG[status]
  return (
    <div className={`flex items-center gap-2 rounded-lg border bg-white px-3 py-1.5 shadow-sm ${hk.borderClass}`}>
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
  const [rooms, setRooms] = useState<Room[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchRooms = async () => {
    setLoading(true)
    setError(null)

    try {
      const { data, error: sbError } = await supabase
        .from('rooms')
        .select('*')
        .order('room_number', { ascending: true })

      if (sbError) {
        setError(sbError.message)
      } else {
        setRooms(data ?? [])
      }
    } catch (err: any) {
      setError(err?.message || 'Veritabanı bağlantısı sağlanamadı. Lütfen .env dosyanızdaki VITE_SUPABASE_URL ve VITE_SUPABASE_ANON_KEY değerlerini kontrol edin.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchRooms()
  }, [])

  // Özet sayaçları
  const counts = (['CLEAN', 'DIRTY', 'INSPECTED'] as HkStatus[]).reduce(
    (acc, status) => {
      acc[status] = rooms.filter((r) => r.hk_status === status).length
      return acc
    },
    {} as Record<HkStatus, number>
  )

  return (
    <div className="min-h-screen bg-gray-50/60 text-gray-800 px-6 py-8 font-sans">
      {/* Başlık */}
      <div className="mb-8 flex items-center justify-between border-b border-gray-200 pb-6">
        <div className="flex items-center gap-5">
          <img
            src="/logo.png"
            alt="Hera City Hotel Logo"
            className="h-20 w-auto object-contain rounded-xl shadow-md border border-gold-500/20 bg-black p-1"
          />
          <div>
            <h1 className="text-2xl md:text-3xl font-extrabold tracking-[0.18em] text-gold-600 font-cinzel">
              HERA CITY HOTEL
            </h1>
            <p className="mt-1 text-xs md:text-sm font-semibold tracking-widest text-gray-500 uppercase">
              Resepsiyon Panosu — Housekeeping Durumu
            </p>
          </div>
        </div>
        <button
          onClick={fetchRooms}
          disabled={loading}
          className="flex items-center gap-2 rounded-lg border border-gold-500/40 bg-white px-4 py-2.5 text-sm font-semibold text-gold-600 hover:bg-gold-50 shadow-sm disabled:opacity-50 transition-colors cursor-pointer"
        >
          <RefreshCw size={15} className={loading ? 'animate-spin text-gold-500' : 'text-gold-500'} />
          Yenile
        </button>
      </div>

      {/* Özet şerit */}
      <div className="mb-8 flex flex-wrap gap-3">
        {(['CLEAN', 'DIRTY', 'INSPECTED'] as HkStatus[]).map((s) => (
          <StatusBadge key={s} status={s} count={counts[s] ?? 0} />
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
            <RoomCard key={room.id} room={room} />
          ))}
        </div>
      )}
    </div>
  )
}
