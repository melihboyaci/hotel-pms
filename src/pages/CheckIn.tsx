import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import {
  UserPlus,
  CalendarCheck,
  ArrowLeft,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Users,
  Plus,
  Trash2,
} from 'lucide-react'
import { supabase } from '../lib/supabase'
import type { Database } from '../types/database.types'

// --- Veritabanı tipleri ---
type Room = Database['public']['Tables']['rooms']['Row']
type RoomType = Database['public']['Enums']['room_type']

const ROOM_TYPE_LABEL: Record<RoomType, string> = {
  STANDARD: 'Standart',
  SUITE: 'Suit',
  FAMILY: 'Aile',
}

// --- Misafir form verisi ---
interface GuestFormData {
  firstName: string
  lastName: string
  identityNumber: string
  phone: string
}

const emptyGuest = (): GuestFormData => ({
  firstName: '',
  lastName: '',
  identityNumber: '',
  phone: '',
})

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

// --- Akıllı Arama Bileşeni ---
type GuestRow = Database['public']['Tables']['guests']['Row']

function GuestAutocompleteInput({
  id,
  value,
  onChange,
  onSelectGuest,
  disabled,
  placeholder,
}: {
  id: string
  value: string
  onChange: (val: string) => void
  onSelectGuest: (guest: GuestRow) => void
  disabled: boolean
  placeholder?: string
}) {
  const [results, setResults] = useState<GuestRow[]>([])
  const [showDropdown, setShowDropdown] = useState(false)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (value.trim().length < 2) {
      setResults([])
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
    }, 300)

    return () => clearTimeout(timer)
  }, [value])

  return (
    <div className="relative">
      <input
        id={id}
        type="text"
        required
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
      {showDropdown && (results.length > 0 || loading) && (
        <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg max-h-60 overflow-y-auto">
          {loading ? (
             <div className="p-3 flex items-center justify-center">
               <Loader2 size={16} className="animate-spin text-gold-500" />
             </div>
          ) : (
            results.map(guest => (
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
            ))
          )}
        </div>
      )}
    </div>
  )
}

// --- Ana Bileşen ---

export default function CheckIn() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()

  // Oda verileri
  const [rooms, setRooms] = useState<Room[]>([])
  const [roomsLoading, setRoomsLoading] = useState(true)

  // Ana misafir
  const [primaryGuest, setPrimaryGuest] = useState<GuestFormData>(emptyGuest())

  // Ek misafirler
  const [companions, setCompanions] = useState<GuestFormData[]>([])

  // Rezervasyon bilgileri
  const [roomId, setRoomId] = useState(searchParams.get('roomId') || '')
  const [checkInDate, setCheckInDate] = useState('')
  const [checkOutDate, setCheckOutDate] = useState('')
  const [nightlyPrice, setNightlyPrice] = useState('')
  const [channel, setChannel] = useState<'DIRECT' | 'AGENCY'>('DIRECT')
  const [agencyName, setAgencyName] = useState('')

  // UI durumu
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [currentStep, setCurrentStep] = useState<string | null>(null)

  const today = new Date().toISOString().split('T')[0]

  // --- Odaları çek ---
  useEffect(() => {
    const fetchRooms = async () => {
      const { data } = await supabase
        .from('rooms')
        .select('*')
        .order('room_number', { ascending: true })
      setRooms(data ?? [])
      setRoomsLoading(false)
    }
    fetchRooms()
  }, [])

  // --- Ek misafir yönetimi ---
  const addCompanion = () => {
    setCompanions((prev) => [...prev, emptyGuest()])
  }

  const removeCompanion = (index: number) => {
    setCompanions((prev) => prev.filter((_, i) => i !== index))
  }

  const updateCompanion = (index: number, field: keyof GuestFormData, value: string) => {
    setCompanions((prev) =>
      prev.map((c, i) => (i === index ? { ...c, [field]: value } : c))
    )
  }

  const resetForm = () => {
    setPrimaryGuest(emptyGuest())
    setCompanions([])
    setRoomId('')
    setCheckInDate('')
    setCheckOutDate('')
    setNightlyPrice('')
    setChannel('DIRECT')
    setAgencyName('')
    setError(null)
    setSuccess(false)
    setCurrentStep(null)
  }

  // --- Form gönderimi: 4 aşamalı sıralı Supabase işlemleri ---
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    setError(null)
    setSuccess(false)

    try {
      // ═══════════════════════════════════════════════════
      // AŞAMA 1: Tüm misafirleri guests tablosuna UPSERT
      // ═══════════════════════════════════════════════════
      setCurrentStep('Misafir kayıtları oluşturuluyor…')

      const allGuests = [primaryGuest, ...companions]
      
      // Benzersiz misafirleri TC Kimlik Numarasına göre filtrele (Aynı kayıt birden fazla eklenirse hatayı önlemek için)
      const uniqueGuestsMap = new Map()
      allGuests.forEach((g) => {
        const idNum = g.identityNumber.trim()
        if (idNum && !uniqueGuestsMap.has(idNum)) {
          uniqueGuestsMap.set(idNum, {
            first_name: g.firstName.trim(),
            last_name: g.lastName.trim(),
            identity_number: idNum,
            phone: g.phone.trim() || null,
          })
        }
      })
      
      const guestPayloads = Array.from(uniqueGuestsMap.values())

      const { data: upsertedGuests, error: guestError } = await supabase
        .from('guests')
        .upsert(guestPayloads, { onConflict: 'identity_number' })
        .select('id, identity_number')

      if (guestError) {
        throw new Error(`Misafir kaydı oluşturulamadı: ${guestError.message}`)
      }

      if (!upsertedGuests || upsertedGuests.length === 0) {
        throw new Error('Misafir kayıtları döndürülemedi.')
      }

      // identity_number → id eşleşme haritası
      const guestIdMap = new Map(
        upsertedGuests.map((g) => [g.identity_number, g.id])
      )

      const primaryGuestId = guestIdMap.get(primaryGuest.identityNumber.trim())
      if (!primaryGuestId) {
        throw new Error('Ana misafir ID\'si bulunamadı.')
      }

      // ═══════════════════════════════════════════════════
      // AŞAMA 2: Rezervasyon kaydı oluştur
      // ═══════════════════════════════════════════════════
      setCurrentStep('Rezervasyon oluşturuluyor…')

      const isFutureCheckIn = new Date(checkInDate) > new Date(today)
      const finalStatus = isFutureCheckIn ? 'PENDING' : 'CHECKED_IN'
      
      // Toplam fiyatı hesapla
      let totalAmount = 0
      const pricePerNight = parseFloat(nightlyPrice)
      if (pricePerNight && pricePerNight > 0) {
        const checkInTime = new Date(checkInDate).getTime()
        const checkOutTime = new Date(checkOutDate).getTime()
        const diffDays = Math.ceil((checkOutTime - checkInTime) / (1000 * 60 * 60 * 24))
        const totalNights = Math.max(1, diffDays)
        totalAmount = pricePerNight * totalNights
      }

      const { data: reservationData, error: reservationError } = await supabase
        .from('reservations')
        .insert({
          guest_id: primaryGuestId,
          room_id: roomId,
          check_in_date: checkInDate,
          check_out_date: checkOutDate,
          status: finalStatus,
          channel: channel,
          agency_name: channel === 'AGENCY' ? agencyName.trim() || null : null,
          total_price: totalAmount > 0 ? totalAmount : null,
        })
        .select('id')
        .single()

      if (reservationError) {
        // Overbooking kısıtlaması (exclusion constraint) hatası kontrolü
        if (
          reservationError.message.includes('no_overlapping_reservations') ||
          reservationError.message.includes('exclusion') ||
          reservationError.code === '23P01'
        ) {
          throw new Error(
            'OVERBOOKING: Bu oda için seçtiğiniz tarihlerde zaten bir rezervasyon bulunmaktadır. Lütfen farklı tarih veya oda seçiniz.'
          )
        }
        throw new Error(`Rezervasyon oluşturulamadı: ${reservationError.message}`)
      }

      const reservationId = reservationData.id

      // ═══════════════════════════════════════════════════
      // AŞAMA 3: reservation_guests eşleştirmeleri
      // ═══════════════════════════════════════════════════
      setCurrentStep('Misafir eşleştirmeleri yapılıyor…')

      // Benzersiz misafir eşleştirmeleri (Aynı kişi hem ana misafir hem refakatçi eklenirse çakışmayı önle)
      const uniqueReservationGuestsMap = new Map()
      allGuests.forEach((g) => {
        const guestId = guestIdMap.get(g.identityNumber.trim())
        if (guestId && !uniqueReservationGuestsMap.has(guestId)) {
          uniqueReservationGuestsMap.set(guestId, {
            reservation_id: reservationId,
            guest_id: guestId,
            is_primary_guest: g.identityNumber.trim() === primaryGuest.identityNumber.trim(),
          })
        }
      })
      const reservationGuestPayloads = Array.from(uniqueReservationGuestsMap.values())

      const { error: linkError } = await supabase
        .from('reservation_guests')
        .insert(reservationGuestPayloads)

      if (linkError) {
        throw new Error(`Misafir eşleştirmesi yapılamadı: ${linkError.message}`)
      }

      // ═══════════════════════════════════════════════════
      // AŞAMA 4 & 5: Sadece giriş yapıldıysa (CHECKED_IN) Folyo ve Oda Ücreti işle
      // ═══════════════════════════════════════════════════
      if (finalStatus === 'CHECKED_IN') {
        setCurrentStep('Folyo hesabı açılıyor…')

        const { error: folioError } = await supabase
          .from('folios')
          .insert({
            reservation_id: reservationId,
            status: 'OPEN',
          })
          .select('id')
          .single()

        if (folioError) {
          throw new Error(`Folyo oluşturulamadı: ${folioError.message}`)
        }

        if (totalAmount > 0) {
          setCurrentStep('Oda ücreti folyoya işleniyor…')
          // Oda ücreti check-in'de basılmaz.
          // Gece bazlı tahakkuk: Her gün sonu (Night Audit) çalıştığında,
          // o geceye ait gecelik ücret ROOM_CHARGE olarak folyoya eklenir.
        }
      }

      // Başarılı
      setSuccess(true)
      setCurrentStep(null)
    } catch (err: any) {
      setError(err?.message || 'Beklenmeyen bir hata oluştu.')
      setCurrentStep(null)
    } finally {
      setSubmitting(false)
    }
  }

  // --- Seçili odanın numarası (başarı mesajı için) ---
  const selectedRoom = rooms.find((r) => r.id === roomId)

  return (
    <div className="min-h-screen bg-gray-50/60 text-gray-800 font-sans">
      {/* ─── Üst Bar ─── */}
      <div className="bg-white border-b border-gray-200 px-6 py-4 shadow-sm">
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
            <h1 className="text-xl font-bold tracking-tight text-gray-800 font-cinzel">
              Yeni Check-In
            </h1>
          </div>
          <img
            src="/logo.png"
            alt="Hera City Hotel"
            className="h-10 w-auto object-contain rounded-lg bg-black p-0.5 border border-gold-500/20"
          />
        </div>
      </div>

      {/* ─── İçerik ─── */}
      <div className="max-w-6xl mx-auto px-6 py-8">
        {/* Başarı Mesajı */}
        {success && (
          <div className="mb-6 flex items-center gap-3 rounded-xl border-2 border-emerald-300 bg-emerald-50 px-5 py-4 text-emerald-800 animate-in fade-in">
            <CheckCircle2 size={22} className="shrink-0 text-emerald-600" />
            <div className="flex-1">
              <p className="font-semibold">Check-In Başarılı!</p>
              <p className="text-sm mt-0.5">
                <strong>{primaryGuest.firstName} {primaryGuest.lastName}</strong>
                {companions.length > 0 && ` ve ${companions.length} ek misafir`}
                {selectedRoom && ` — Oda #${selectedRoom.room_number}`} için
                kayıt tamamlandı. Folyo hesabı açıldı.
              </p>
            </div>
            <button
              onClick={resetForm}
              className="ml-auto text-sm font-semibold text-emerald-700 underline underline-offset-2 hover:text-emerald-900 cursor-pointer whitespace-nowrap"
            >
              Yeni Kayıt
            </button>
          </div>
        )}

        {/* Hata Mesajı */}
        {error && (
          <div
            className={`mb-6 flex items-start gap-3 rounded-xl border-2 px-5 py-4 ${
              error.startsWith('OVERBOOKING')
                ? 'border-red-500 bg-red-100 text-red-900'
                : 'border-rose-300 bg-rose-50 text-rose-800'
            }`}
          >
            <AlertCircle
              size={22}
              className={`shrink-0 mt-0.5 ${
                error.startsWith('OVERBOOKING') ? 'text-red-600' : 'text-rose-600'
              }`}
            />
            <div>
              <p className="font-semibold">
                {error.startsWith('OVERBOOKING')
                  ? '⚠️ Overbooking Uyarısı'
                  : 'İşlem Başarısız'}
              </p>
              <p className="text-sm mt-0.5">
                {error.startsWith('OVERBOOKING')
                  ? error.replace('OVERBOOKING: ', '')
                  : error}
              </p>
            </div>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
            {/* ═══ Sol Sütun: Misafir Bilgileri (3/5) ═══ */}
            <div className="lg:col-span-3 space-y-6">
              {/* Ana Misafir Kartı */}
              <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
                <div className="flex items-center gap-2 mb-6 pb-4 border-b border-gray-100">
                  <UserPlus size={18} className="text-gold-500" />
                  <h2 className="text-sm font-bold text-gray-700 uppercase tracking-wider">
                    Ana Misafir Bilgileri
                  </h2>
                  <span className="ml-auto text-[10px] font-semibold text-gold-600 bg-gold-500/10 px-2 py-0.5 rounded-full uppercase tracking-widest">
                    Sorumlu
                  </span>
                </div>

                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="primary-firstName">Ad</Label>
                      <GuestAutocompleteInput
                        id="primary-firstName"
                        value={primaryGuest.firstName}
                        onChange={(val) =>
                          setPrimaryGuest((p) => ({ ...p, firstName: val }))
                        }
                        onSelectGuest={(guest) => {
                          setPrimaryGuest({
                            firstName: guest.first_name,
                            lastName: guest.last_name,
                            identityNumber: guest.identity_number,
                            phone: guest.phone || '',
                          })
                        }}
                        placeholder="Ahmet (Aramak için yazın...)"
                        disabled={success}
                      />
                    </div>
                    <div>
                      <Label htmlFor="primary-lastName">Soyad</Label>
                      <input
                        id="primary-lastName"
                        type="text"
                        required
                        value={primaryGuest.lastName}
                        onChange={(e) =>
                          setPrimaryGuest((p) => ({ ...p, lastName: e.target.value }))
                        }
                        className={inputClass}
                        placeholder="Yılmaz"
                        disabled={success}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="primary-identityNumber">TC Kimlik No</Label>
                      <input
                        id="primary-identityNumber"
                        type="text"
                        required
                        inputMode="numeric"
                        maxLength={11}
                        value={primaryGuest.identityNumber}
                        onChange={(e) =>
                          setPrimaryGuest((p) => ({
                            ...p,
                            identityNumber: e.target.value.replace(/\D/g, ''),
                          }))
                        }
                        className={inputClass}
                        placeholder="12345678901"
                        disabled={success}
                      />
                    </div>
                    <div>
                      <Label htmlFor="primary-phone">Telefon</Label>
                      <input
                        id="primary-phone"
                        type="tel"
                        value={primaryGuest.phone}
                        onChange={(e) =>
                          setPrimaryGuest((p) => ({ ...p, phone: e.target.value }))
                        }
                        className={inputClass}
                        placeholder="0532 123 45 67"
                        disabled={success}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Ek Misafirler */}
              {companions.map((companion, index) => (
                <div
                  key={index}
                  className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm relative group"
                >
                  <div className="flex items-center gap-2 mb-6 pb-4 border-b border-gray-100">
                    <Users size={18} className="text-gold-400" />
                    <h2 className="text-sm font-bold text-gray-700 uppercase tracking-wider">
                      Misafir {index + 2}
                    </h2>
                    {!success && (
                      <button
                        type="button"
                        onClick={() => removeCompanion(index)}
                        className="ml-auto flex items-center gap-1 text-xs font-medium text-rose-500 hover:text-rose-700 transition-colors cursor-pointer opacity-0 group-hover:opacity-100"
                        title="Misafiri kaldır"
                      >
                        <Trash2 size={13} />
                        Kaldır
                      </button>
                    )}
                  </div>

                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor={`companion-${index}-firstName`}>Ad</Label>
                        <GuestAutocompleteInput
                          id={`companion-${index}-firstName`}
                          value={companion.firstName}
                          onChange={(val) =>
                            updateCompanion(index, 'firstName', val)
                          }
                          onSelectGuest={(guest) => {
                            const newCompanions = [...companions]
                            newCompanions[index] = {
                              firstName: guest.first_name,
                              lastName: guest.last_name,
                              identityNumber: guest.identity_number,
                              phone: guest.phone || '',
                            }
                            setCompanions(newCompanions)
                          }}
                          placeholder="Ad (Aramak için yazın...)"
                          disabled={success}
                        />
                      </div>
                      <div>
                        <Label htmlFor={`companion-${index}-lastName`}>Soyad</Label>
                        <input
                          id={`companion-${index}-lastName`}
                          type="text"
                          required
                          value={companion.lastName}
                          onChange={(e) =>
                            updateCompanion(index, 'lastName', e.target.value)
                          }
                          className={inputClass}
                          placeholder="Soyad"
                          disabled={success}
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor={`companion-${index}-identityNumber`}>
                          TC Kimlik No
                        </Label>
                        <input
                          id={`companion-${index}-identityNumber`}
                          type="text"
                          required
                          inputMode="numeric"
                          maxLength={11}
                          value={companion.identityNumber}
                          onChange={(e) =>
                            updateCompanion(
                              index,
                              'identityNumber',
                              e.target.value.replace(/\D/g, '')
                            )
                          }
                          className={inputClass}
                          placeholder="12345678901"
                          disabled={success}
                        />
                      </div>
                      <div>
                        <Label htmlFor={`companion-${index}-phone`}>Telefon</Label>
                        <input
                          id={`companion-${index}-phone`}
                          type="tel"
                          value={companion.phone}
                          onChange={(e) =>
                            updateCompanion(index, 'phone', e.target.value)
                          }
                          className={inputClass}
                          placeholder="0532 123 45 67"
                          disabled={success}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              ))}

              {/* Misafir Ekle Butonu */}
              {!success && (
                <button
                  type="button"
                  onClick={addCompanion}
                  className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl border-2 border-dashed border-gray-300 text-sm font-semibold text-gray-500 hover:border-gold-400 hover:text-gold-600 hover:bg-gold-500/5 transition-all cursor-pointer"
                >
                  <Plus size={16} />
                  Misafir Ekle
                </button>
              )}
            </div>

            {/* ═══ Sağ Sütun: Rezervasyon Detayları (2/5) ═══ */}
            <div className="lg:col-span-2">
              <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm lg:sticky lg:top-8">
                <div className="flex items-center gap-2 mb-6 pb-4 border-b border-gray-100">
                  <CalendarCheck size={18} className="text-gold-500" />
                  <h2 className="text-sm font-bold text-gray-700 uppercase tracking-wider">
                    Rezervasyon Detayları
                  </h2>
                </div>

                <div className="space-y-4">
                  {/* Oda seçimi */}
                  <div>
                    <Label htmlFor="roomId">Oda Seçimi</Label>
                    {roomsLoading ? (
                      <div className="flex items-center gap-2 text-sm text-gray-400 py-2.5">
                        <Loader2 size={14} className="animate-spin" />
                        Odalar yükleniyor…
                      </div>
                    ) : (
                      <select
                        id="roomId"
                        required
                        value={roomId}
                        onChange={(e) => setRoomId(e.target.value)}
                        className={`${inputClass} cursor-pointer`}
                        disabled={success}
                      >
                        <option value="">Oda seçiniz…</option>
                        {rooms.map((room) => (
                          <option key={room.id} value={room.id}>
                            #{room.room_number} — {ROOM_TYPE_LABEL[room.type]}
                          </option>
                        ))}
                      </select>
                    )}
                  </div>

                  {/* Tarihler */}
                  <div>
                    <Label htmlFor="checkInDate">Giriş Tarihi</Label>
                    <input
                      id="checkInDate"
                      type="date"
                      required
                      min={today}
                      value={checkInDate}
                      onChange={(e) => setCheckInDate(e.target.value)}
                      className={`${inputClass} cursor-pointer`}
                      disabled={success}
                    />
                  </div>
                  <div>
                    <Label htmlFor="checkOutDate">Çıkış Tarihi</Label>
                    <input
                      id="checkOutDate"
                      type="date"
                      required
                      min={checkInDate || today}
                      value={checkOutDate}
                      onChange={(e) => setCheckOutDate(e.target.value)}
                      className={`${inputClass} cursor-pointer`}
                      disabled={success}
                    />
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
                        required
                        min="0"
                        step="0.01"
                        value={nightlyPrice}
                        onChange={(e) => setNightlyPrice(e.target.value)}
                        className={`${inputClass} pl-8 cursor-text`}
                        disabled={success}
                        placeholder="Örn: 5000"
                      />
                    </div>
                  </div>

                  {/* Rezervasyon Kaynağı */}
                  <div>
                    <Label htmlFor="channel">Rezervasyon Kaynağı</Label>
                    <div className="flex gap-4 mt-1">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          name="channel"
                          value="DIRECT"
                          checked={channel === 'DIRECT'}
                          onChange={() => { setChannel('DIRECT'); setAgencyName('') }}
                          disabled={success}
                          className="accent-gold-500"
                        />
                        <span className="text-sm font-medium text-gray-700">Direkt</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          name="channel"
                          value="AGENCY"
                          checked={channel === 'AGENCY'}
                          onChange={() => setChannel('AGENCY')}
                          disabled={success}
                          className="accent-gold-500"
                        />
                        <span className="text-sm font-medium text-gray-700">Acente (OTA)</span>
                      </label>
                    </div>
                  </div>

                  {channel === 'AGENCY' && (
                    <div>
                      <Label htmlFor="agencyName">Acente Adı</Label>
                      <input
                        id="agencyName"
                        type="text"
                        required
                        value={agencyName}
                        onChange={(e) => setAgencyName(e.target.value)}
                        className={inputClass}
                        placeholder="Örn: ETS Tur, TatilBudur, Booking…"
                        disabled={success}
                      />
                    </div>
                  )}

                  {/* Konaklama özeti */}
                  {checkInDate && checkOutDate && (
                    <div className="rounded-lg bg-gray-50 border border-gray-200 px-4 py-3 mt-2">
                      <div className="flex items-center justify-between text-xs text-gray-500">
                        <span>Toplam Gece</span>
                        <span className="font-bold text-gray-800 text-sm">
                          {Math.max(
                            0,
                            Math.ceil(
                              (new Date(checkOutDate).getTime() -
                                new Date(checkInDate).getTime()) /
                                (1000 * 60 * 60 * 24)
                            )
                          )}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-xs text-gray-500 mt-1.5">
                        <span>Toplam Misafir</span>
                        <span className="font-bold text-gray-800 text-sm">
                          {1 + companions.length}
                        </span>
                      </div>
                    </div>
                  )}
                </div>

                {/* İşlem Adımı Göstergesi */}
                {submitting && currentStep && (
                  <div className="mt-6 flex items-center gap-2 text-xs font-medium text-gold-600 bg-gold-500/10 px-3 py-2 rounded-lg">
                    <Loader2 size={13} className="animate-spin" />
                    {currentStep}
                  </div>
                )}

                {/* Gönder Butonu */}
                {!success && (
                  <div className="mt-6">
                    <button
                      type="submit"
                      disabled={submitting}
                      className="w-full flex items-center justify-center gap-2.5 bg-black text-gold-400 font-bold tracking-widest uppercase px-8 py-3.5 rounded-xl border border-gold-500/30 hover:bg-gray-900 hover:text-gold-300 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gold-500 disabled:opacity-50 shadow-md cursor-pointer"
                    >
                      {submitting ? (
                        <>
                          <Loader2 size={18} className="animate-spin text-gold-500" />
                          Kaydediliyor...
                        </>
                      ) : (
                        <>
                          <CheckCircle2 size={18} />
                          Check-In Yap
                        </>
                      )}
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}
