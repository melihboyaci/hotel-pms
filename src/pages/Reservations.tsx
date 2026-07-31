import { useEffect, useState } from 'react'
import { Search, Loader2, CalendarDays, ExternalLink, Plus, X, Pencil, XCircle, AlertTriangle, UserPlus } from 'lucide-react'
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
  'w-full px-4 py-2.5 rounded-xl border border-gray-300 bg-white text-gray-800 focus:outline-none focus:ring-2 focus:ring-gold-500/50 focus:border-gold-500 transition-colors text-sm'

// --- Akıllı Misafir Arama Bileşeni ---
function GuestAutocompleteInput({
  id,
  value,
  onChange,
  onSelectGuest,
  onCreateNew,
  disabled,
  placeholder,
}: {
  id: string
  value: string
  onChange: (val: string) => void
  onSelectGuest: (guest: Guest) => void
  onCreateNew: () => void
  disabled: boolean
  placeholder?: string
}) {
  const [results, setResults] = useState<Guest[]>([])
  const [showDropdown, setShowDropdown] = useState(false)
  const [loading, setLoading] = useState(false)
  const [searched, setSearched] = useState(false)

  useEffect(() => {
    if (value.trim().length < 2) {
      setResults([])
      setSearched(false)
      return
    }

    const timer = setTimeout(async () => {
      setLoading(true)
      const { data, error } = await supabase
        .from('guests')
        .select('*')
        .or(`first_name.ilike.%${value}%,last_name.ilike.%${value}%`)
        .limit(5)

      if (!error && data) {
        setResults(data)
      }
      setLoading(false)
      setSearched(true)
    }, 300)

    return () => clearTimeout(timer)
  }, [value])

  const showDrop = showDropdown && (results.length > 0 || loading || (searched && results.length === 0 && value.trim().length >= 2))

  return (
    <div className="relative">
      <input
        id={id}
        type="text"
        value={value}
        onChange={(e) => {
          onChange(e.target.value)
          setShowDropdown(true)
        }}
        onBlur={() => setTimeout(() => setShowDropdown(false), 200)}
        onFocus={() => { if (value.trim().length >= 2) setShowDropdown(true) }}
        className={inputClass}
        placeholder={placeholder}
        disabled={disabled}
        autoComplete="off"
      />
      {showDrop && (
        <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg max-h-60 overflow-y-auto">
          {loading ? (
            <div className="p-3 flex items-center justify-center">
              <Loader2 size={16} className="animate-spin text-gold-500" />
            </div>
          ) : (
            <>
              {results.map(guest => (
                <div
                  key={guest.id}
                  className="px-4 py-2 hover:bg-gray-50 cursor-pointer border-b border-gray-100 last:border-0 transition-colors"
                  onClick={() => {
                    onSelectGuest(guest)
                    setShowDropdown(false)
                  }}
                >
                  <div className="text-sm font-bold text-gray-800">{guest.first_name} {guest.last_name}</div>
                  <div className="text-xs text-gray-500">{guest.identity_number} {guest.phone ? `• ${guest.phone}` : ''}</div>
                </div>
              ))}
              {/* Yeni Misafir Oluştur butonu */}
              <div
                className="px-4 py-2.5 hover:bg-gold-50 cursor-pointer border-t border-gray-200 transition-colors flex items-center gap-2 text-gold-700 font-semibold text-sm"
                onClick={() => {
                  onCreateNew()
                  setShowDropdown(false)
                }}
              >
                <UserPlus size={15} />
                Yeni Misafir Oluştur
              </div>
            </>
          )}
        </div>
      )}
    </div>
  )
}

export default function Reservations() {
  const [reservations, setReservations] = useState<ReservationWithDetails[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const navigate = useNavigate()

  // Rooms for modal select
  const [rooms, setRooms] = useState<Room[]>([])

  // Create/Edit modal state
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingReservation, setEditingReservation] = useState<ReservationWithDetails | null>(null)
  const [guestSearchText, setGuestSearchText] = useState('')
  const [selectedGuestId, setSelectedGuestId] = useState('')
  const [selectedRoomId, setSelectedRoomId] = useState('')
  const [checkInDate, setCheckInDate] = useState('')
  const [checkOutDate, setCheckOutDate] = useState('')
  const [nightlyPrice, setNightlyPrice] = useState('')
  const [formLoading, setFormLoading] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  // Inline new guest creation state
  const [isCreatingNewGuest, setIsCreatingNewGuest] = useState(false)
  const [newGuest, setNewGuest] = useState({
    first_name: '',
    last_name: '',
    identity_number: '',
    phone: '',
  })

  // Cancel modal state
  const [cancelConfirm, setCancelConfirm] = useState<ReservationWithDetails | null>(null)
  const [cancelLoading, setCancelLoading] = useState(false)

  const today = new Date().toISOString().split('T')[0]

  const fetchReservations = async () => {
    try {
      const { data, error } = await supabase
        .from('reservations')
        .select(`
          *,
          guests ( first_name, last_name ),
          rooms ( room_number )
        `)
        .order('check_in_date', { ascending: true })

      if (error) throw error
      setReservations(data as ReservationWithDetails[])
    } catch (err) {
      console.error('Rezervasyonlar yüklenirken hata oluştu:', err)
    } finally {
      setLoading(false)
    }
  }

  const fetchRooms = async () => {
    const { data } = await supabase
      .from('rooms')
      .select('*')
      .order('room_number', { ascending: true })
    if (data) setRooms(data as Room[])
  }

  useEffect(() => {
    fetchReservations()
    fetchRooms()
  }, [])

  // --- Modal Helpers ---
  const openCreateModal = () => {
    setEditingReservation(null)
    setGuestSearchText('')
    setSelectedGuestId('')
    setSelectedRoomId('')
    setCheckInDate('')
    setCheckOutDate('')
    setNightlyPrice('')
    setIsCreatingNewGuest(false)
    setNewGuest({ first_name: '', last_name: '', identity_number: '', phone: '' })
    setFormError(null)
    setIsModalOpen(true)
  }

  const openEditModal = (res: ReservationWithDetails) => {
    setEditingReservation(res)
    setGuestSearchText(
      res.guests ? `${res.guests.first_name} ${res.guests.last_name}` : ''
    )
    setSelectedGuestId(res.guest_id)
    setSelectedRoomId(res.room_id)
    setCheckInDate(res.check_in_date)
    setCheckOutDate(res.check_out_date)
    setNightlyPrice(res.total_price?.toString() || '')
    setFormError(null)
    setIsModalOpen(true)
  }

  const closeModal = () => {
    setIsModalOpen(false)
    setEditingReservation(null)
    setIsCreatingNewGuest(false)
    setNewGuest({ first_name: '', last_name: '', identity_number: '', phone: '' })
    setFormError(null)
  }

  // --- Save (Create or Update) ---
  const handleSaveReservation = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormLoading(true)
    setFormError(null)

    try {
      let guestId = selectedGuestId

      // If creating a new guest inline, insert first
      if (!editingReservation && isCreatingNewGuest) {
        if (!newGuest.first_name.trim() || !newGuest.last_name.trim() || !newGuest.identity_number.trim()) {
          setFormError('Yeni misafir için Ad, Soyad ve TC/Pasaport No zorunludur.')
          setFormLoading(false)
          return
        }

        const { data: guestData, error: guestError } = await supabase
          .from('guests')
          .upsert(
            {
              first_name: newGuest.first_name.trim(),
              last_name: newGuest.last_name.trim(),
              identity_number: newGuest.identity_number.trim(),
              phone: newGuest.phone.trim() || null,
            },
            { onConflict: 'identity_number' }
          )
          .select('id')
          .single()

        if (guestError) throw guestError
        guestId = guestData.id
      }

      if (!guestId) {
        setFormError('Lütfen mevcut bir misafir seçin veya yeni misafir oluşturun.')
        setFormLoading(false)
        return
      }

      const price = nightlyPrice ? parseFloat(nightlyPrice) : null

      if (editingReservation) {
        // UPDATE
        const { error } = await supabase
          .from('reservations')
          .update({
            room_id: selectedRoomId,
            check_in_date: checkInDate,
            check_out_date: checkOutDate,
            total_price: price,
          })
          .eq('id', editingReservation.id)

        if (error) throw error
      } else {
        // INSERT with PENDING status
        const { error } = await supabase
          .from('reservations')
          .insert({
            guest_id: guestId,
            room_id: selectedRoomId,
            check_in_date: checkInDate,
            check_out_date: checkOutDate,
            status: 'PENDING',
            total_price: price,
          })

        if (error) throw error
      }

      closeModal()
      await fetchReservations()
    } catch (err: any) {
      if (err?.code === '23505' || err?.message?.toLowerCase().includes('overlap')) {
        setFormError('Bu oda seçilen tarihlerde zaten rezerve edilmiş. Lütfen başka bir oda veya tarih seçin.')
      } else {
        setFormError(err?.message || 'Rezervasyon kaydedilirken hata oluştu.')
      }
    } finally {
      setFormLoading(false)
    }
  }

  // --- Cancel ---
  const handleCancelReservation = async () => {
    if (!cancelConfirm) return
    setCancelLoading(true)

    try {
      const { error } = await supabase
        .from('reservations')
        .update({ status: 'CANCELLED' })
        .eq('id', cancelConfirm.id)

      if (error) throw error

      setCancelConfirm(null)
      await fetchReservations()
    } catch (err: any) {
      console.error('Rezervasyon iptal edilirken hata:', err)
    } finally {
      setCancelLoading(false)
    }
  }

  // --- Filter ---
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
          <div className="flex flex-col md:flex-row items-center gap-4 w-full md:w-auto">
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
            <button
              onClick={openCreateModal}
              className="flex items-center justify-center gap-2 w-full md:w-auto bg-black text-gold-400 hover:bg-gray-900 px-6 py-2.5 rounded-xl text-sm font-bold tracking-wide uppercase shadow-sm transition-all cursor-pointer border border-gold-500/30"
            >
              <Plus size={18} />
              Yeni Rezervasyon
            </button>
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
                  <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-widest text-right">İşlemler</th>
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
                    const isPending = res.status === 'PENDING'

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
                        <td className="px-6 py-4">
                          <div className="flex items-center justify-end gap-1">
                            {/* Detay */}
                            <button
                              onClick={() => navigate(`/reservation/${res.id}`)}
                              title="Detay Görüntüle"
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-gray-500 hover:text-gold-600 hover:bg-gold-50 transition-colors cursor-pointer"
                            >
                              <span>Detay</span>
                              <ExternalLink size={14} />
                            </button>
                            {/* Edit — only for PENDING */}
                            {isPending && (
                              <button
                                onClick={() => openEditModal(res)}
                                title="Rezervasyonu Düzenle"
                                className="p-2 rounded-lg text-gray-400 hover:text-gold-600 hover:bg-gold-50 transition-all cursor-pointer"
                              >
                                <Pencil size={16} />
                              </button>
                            )}
                            {/* Cancel — only for PENDING */}
                            {isPending && (
                              <button
                                onClick={() => setCancelConfirm(res)}
                                title="Rezervasyonu İptal Et"
                                className="p-2 rounded-lg text-gray-400 hover:text-rose-600 hover:bg-rose-50 transition-all cursor-pointer"
                              >
                                <XCircle size={16} />
                              </button>
                            )}
                          </div>
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

      {/* ═══════════════════════════════════════════════════ */}
      {/* Create / Edit Reservation Modal */}
      {/* ═══════════════════════════════════════════════════ */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-xl border border-gray-200 w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gray-50/50">
              <h2 className="text-lg font-bold text-gray-800 font-cinzel">
                {editingReservation ? 'Rezervasyonu Düzenle' : 'Yeni Rezervasyon'}
              </h2>
              <button
                onClick={closeModal}
                className="text-gray-400 hover:text-gray-600 hover:bg-gray-100 p-1.5 rounded-lg transition-colors cursor-pointer"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSaveReservation} className="p-6">
              {formError && (
                <div className="mb-6 p-4 rounded-xl bg-rose-50 text-rose-700 text-sm border border-rose-200 font-medium">
                  {formError}
                </div>
              )}

              <div className="space-y-4">
                {/* Misafir Seçimi */}
                <div>
                  <Label htmlFor="guestSearch">Misafir</Label>
                  {editingReservation ? (
                    // Editing mode: show guest name read-only
                    <input
                      id="guestSearch"
                      type="text"
                      value={guestSearchText}
                      disabled
                      className={`${inputClass} bg-gray-50 cursor-not-allowed`}
                    />
                  ) : isCreatingNewGuest ? (
                    // Inline new guest form
                    <div className="space-y-3 mt-2 p-4 rounded-xl border border-gold-200 bg-gold-50/30">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-bold text-gold-700 uppercase tracking-wider flex items-center gap-1.5">
                          <UserPlus size={14} />
                          Yeni Misafir Bilgileri
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            setIsCreatingNewGuest(false)
                            setNewGuest({ first_name: '', last_name: '', identity_number: '', phone: '' })
                          }}
                          className="text-xs text-gray-500 hover:text-gray-700 font-medium cursor-pointer"
                        >
                          ← Mevcut misafir ara
                        </button>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-semibold text-gray-500 mb-1 uppercase tracking-wider">Ad</label>
                          <input
                            type="text"
                            required
                            value={newGuest.first_name}
                            onChange={(e) => setNewGuest({ ...newGuest, first_name: e.target.value })}
                            className={inputClass}
                            placeholder="Ad"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-gray-500 mb-1 uppercase tracking-wider">Soyad</label>
                          <input
                            type="text"
                            required
                            value={newGuest.last_name}
                            onChange={(e) => setNewGuest({ ...newGuest, last_name: e.target.value })}
                            className={inputClass}
                            placeholder="Soyad"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-gray-500 mb-1 uppercase tracking-wider">TC / Pasaport No</label>
                        <input
                          type="text"
                          required
                          value={newGuest.identity_number}
                          onChange={(e) => setNewGuest({ ...newGuest, identity_number: e.target.value })}
                          className={`${inputClass} font-medium`}
                          placeholder="TC veya Pasaport No"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-gray-500 mb-1 uppercase tracking-wider">Telefon</label>
                        <input
                          type="tel"
                          value={newGuest.phone}
                          onChange={(e) => setNewGuest({ ...newGuest, phone: e.target.value })}
                          className={inputClass}
                          placeholder="İsteğe bağlı"
                        />
                      </div>
                    </div>
                  ) : (
                    // Autocomplete search
                    <GuestAutocompleteInput
                      id="guestSearch"
                      value={guestSearchText}
                      onChange={(val) => {
                        setGuestSearchText(val)
                        setSelectedGuestId('')
                      }}
                      onSelectGuest={(guest) => {
                        setGuestSearchText(`${guest.first_name} ${guest.last_name}`)
                        setSelectedGuestId(guest.id)
                      }}
                      onCreateNew={() => {
                        setIsCreatingNewGuest(true)
                        setSelectedGuestId('')
                        setGuestSearchText('')
                      }}
                      disabled={false}
                      placeholder="Misafir adı ile ara..."
                    />
                  )}
                  {!editingReservation && !isCreatingNewGuest && selectedGuestId && (
                    <p className="text-xs text-emerald-600 mt-1 font-medium">✓ Misafir seçildi</p>
                  )}
                </div>

                {/* Oda Seçimi */}
                <div>
                  <Label htmlFor="roomSelect">Oda</Label>
                  <select
                    id="roomSelect"
                    required
                    value={selectedRoomId}
                    onChange={(e) => setSelectedRoomId(e.target.value)}
                    className={`${inputClass} cursor-pointer`}
                  >
                    <option value="">Oda seçiniz…</option>
                    {rooms.map((room) => (
                      <option key={room.id} value={room.id}>
                        #{room.room_number}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Tarihler */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="resCheckIn">Giriş Tarihi</Label>
                    <input
                      id="resCheckIn"
                      type="date"
                      required
                      min={today}
                      value={checkInDate}
                      onChange={(e) => setCheckInDate(e.target.value)}
                      className={`${inputClass} cursor-pointer`}
                    />
                  </div>
                  <div>
                    <Label htmlFor="resCheckOut">Çıkış Tarihi</Label>
                    <input
                      id="resCheckOut"
                      type="date"
                      required
                      min={checkInDate || today}
                      value={checkOutDate}
                      onChange={(e) => setCheckOutDate(e.target.value)}
                      className={`${inputClass} cursor-pointer`}
                    />
                  </div>
                </div>

                {/* Gecelik Fiyat */}
                <div>
                  <Label htmlFor="nightlyPrice">Gecelik Fiyat (TL)</Label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 text-sm font-medium">
                      ₺
                    </span>
                    <input
                      id="nightlyPrice"
                      type="number"
                      min="0"
                      step="0.01"
                      value={nightlyPrice}
                      onChange={(e) => setNightlyPrice(e.target.value)}
                      className={`${inputClass} pl-8 cursor-text`}
                      placeholder="Örn: 5000"
                    />
                  </div>
                </div>

                {/* Konaklama özeti */}
                {checkInDate && checkOutDate && (
                  <div className="rounded-lg bg-gray-50 border border-gray-200 px-4 py-3 mt-1">
                    <div className="flex items-center justify-between text-xs text-gray-500">
                      <span>Toplam Gece</span>
                      <span className="font-bold text-gray-800 text-sm">
                        {Math.max(
                          1,
                          Math.ceil(
                            (new Date(checkOutDate).getTime() -
                              new Date(checkInDate).getTime()) /
                              (1000 * 60 * 60 * 24)
                          )
                        )}
                      </span>
                    </div>
                    {nightlyPrice && parseFloat(nightlyPrice) > 0 && (
                      <div className="flex items-center justify-between text-xs text-gray-500 mt-1.5">
                        <span>Tahmini Toplam</span>
                        <span className="font-bold text-gold-700 text-sm">
                          ₺{(
                            parseFloat(nightlyPrice) *
                            Math.max(
                              1,
                              Math.ceil(
                                (new Date(checkOutDate).getTime() -
                                  new Date(checkInDate).getTime()) /
                                  (1000 * 60 * 60 * 24)
                              )
                            )
                          ).toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
                        </span>
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="mt-8 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={closeModal}
                  className="px-5 py-2.5 rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-100 transition-colors cursor-pointer"
                >
                  İptal
                </button>
                <button
                  type="submit"
                  disabled={formLoading}
                  className="flex items-center justify-center min-w-[140px] px-5 py-2.5 rounded-xl bg-gold-500 text-white text-sm font-bold tracking-wide uppercase hover:bg-gold-600 transition-colors shadow-sm disabled:opacity-50 cursor-pointer"
                >
                  {formLoading ? <Loader2 size={16} className="animate-spin" /> : 'Kaydet'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════ */}
      {/* Cancel Confirmation Modal */}
      {/* ═══════════════════════════════════════════════════ */}
      {cancelConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-xl border border-gray-200 w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-6">
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 flex items-center justify-center w-12 h-12 rounded-full bg-rose-100">
                  <AlertTriangle className="text-rose-600" size={24} />
                </div>
                <div className="flex-1">
                  <h3 className="text-base font-bold text-gray-900 mb-1">Rezervasyonu İptal Et</h3>
                  <p className="text-sm text-gray-500">
                    <span className="font-semibold text-gray-700">
                      {cancelConfirm.guests
                        ? `${cancelConfirm.guests.first_name} ${cancelConfirm.guests.last_name}`
                        : cancelConfirm.id.split('-')[0].toUpperCase()}
                    </span>{' '}
                    adlı misafirin{' '}
                    <span className="font-semibold text-gray-700">
                      {cancelConfirm.rooms ? `#${cancelConfirm.rooms.room_number}` : ''}{' '}
                    </span>
                    numaralı odadaki rezervasyonunu iptal etmek istediğinize emin misiniz?
                  </p>
                </div>
              </div>

              <div className="mt-6 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setCancelConfirm(null)}
                  disabled={cancelLoading}
                  className="px-5 py-2.5 rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-100 transition-colors cursor-pointer disabled:opacity-50"
                >
                  Vazgeç
                </button>
                <button
                  type="button"
                  onClick={handleCancelReservation}
                  disabled={cancelLoading}
                  className="flex items-center justify-center min-w-[120px] px-5 py-2.5 rounded-xl bg-rose-600 text-white text-sm font-bold tracking-wide uppercase hover:bg-rose-700 transition-colors shadow-sm disabled:opacity-50 cursor-pointer"
                >
                  {cancelLoading ? <Loader2 size={16} className="animate-spin" /> : 'Evet, İptal Et'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
