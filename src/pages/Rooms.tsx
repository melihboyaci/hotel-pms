import { useEffect, useState } from 'react'
import { Search, Loader2, BedDouble, Plus, X, Edit2, Trash2 } from 'lucide-react'
import { supabase } from '../lib/supabase'
import type { Database } from '../types/database.types'

type Room = Database['public']['Tables']['rooms']['Row'] & { base_price?: number, status?: string, bed_config?: string }
type RoomWithStatus = Room & {
  reservations: { status: string | null }[]
}

const ROOM_TYPE_LABEL: Record<string, string> = {
  STANDARD: 'Standart Oda',
  SUITE: 'Suit Oda',
  FAMILY: 'Aile Odası',
}

const BED_CONFIG_LABEL: Record<string, string> = {
  SINGLE: '1 Tek Kişilik',
  DOUBLE: '1 Çift Kişilik',
  TWIN: '2 Tek Kişilik',
  DOUBLE_SINGLE: '1 Çift + 1 Tek',
  DOUBLE_TWIN: '1 Çift + 2 Tek',
  TRIPLE: '3 Tek Kişilik'
}

const HK_STATUS_CONFIG: Record<string, { label: string; bg: string; text: string }> = {
  CLEAN: { label: 'Temiz', bg: 'bg-emerald-100', text: 'text-emerald-700' },
  DIRTY: { label: 'Kirli', bg: 'bg-rose-100', text: 'text-rose-700' },
  INSPECTED: { label: 'Kontrol Edildi', bg: 'bg-blue-100', text: 'text-blue-700' },
}

const ROOM_STATUS_CONFIG: Record<string, { label: string; bg: string; text: string }> = {
  AVAILABLE: { label: 'Kullanılabilir', bg: 'bg-emerald-100', text: 'text-emerald-700' },
  OUT_OF_ORDER: { label: 'Arızalı', bg: 'bg-rose-100', text: 'text-rose-700' },
  MAINTENANCE: { label: 'Bakımda', bg: 'bg-amber-100', text: 'text-amber-700' },
}

export default function Rooms() {
  const [rooms, setRooms] = useState<RoomWithStatus[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  // Modals state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [selectedRoom, setSelectedRoom] = useState<RoomWithStatus | null>(null)
  const [formLoading, setFormLoading] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  // Add Form State
  const [addForm, setAddForm] = useState({ room_number: '', room_type: 'STANDARD', base_price: '', bed_config: 'DOUBLE' })
  
  // Edit Form State
  const [editForm, setEditForm] = useState({ room_type: 'STANDARD', hk_status: 'CLEAN', status: 'AVAILABLE', bed_config: 'DOUBLE' })

  const fetchRooms = async () => {
    try {
      const { data, error } = await supabase
        .from('rooms')
        .select(`
          *,
          reservations ( status )
        `)
        .order('room_number', { ascending: true })
      
      if (error) throw error
      setRooms(data as RoomWithStatus[])
    } catch (err) {
      console.error('Odalar yüklenirken hata oluştu:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchRooms()
  }, [])

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormLoading(true)
    setFormError(null)
    
    try {
      const payload: Database['public']['Tables']['rooms']['Insert'] = {
        room_number: addForm.room_number,
        type: addForm.room_type as Database['public']['Enums']['room_type'],
        bed_config: (addForm.bed_config || 'DOUBLE') as Database['public']['Enums']['bed_config_type']
      }
      
      const { error } = await supabase.from('rooms').insert(payload)
      if (error) throw error
      
      setIsAddModalOpen(false)
      setAddForm({ room_number: '', room_type: 'STANDARD', base_price: '', bed_config: 'DOUBLE' })
      await fetchRooms()
    } catch (err: any) {
      setFormError(err?.message || 'Oda eklenirken hata oluştu.')
    } finally {
      setFormLoading(false)
    }
  }

  const openEditModal = (room: RoomWithStatus) => {
    setSelectedRoom(room)
    setEditForm({
      room_type: room.type,
      hk_status: room.hk_status || 'CLEAN',
      status: room.status || 'AVAILABLE',
      bed_config: room.bed_config || 'DOUBLE'
    })
    setIsEditModalOpen(true)
  }

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedRoom) return
    setFormLoading(true)
    setFormError(null)

    try {
      const payload: Database['public']['Tables']['rooms']['Update'] = {
        type: editForm.room_type as Database['public']['Enums']['room_type'],
        hk_status: editForm.hk_status as Database['public']['Enums']['hk_status'],
        bed_config: editForm.bed_config as Database['public']['Enums']['bed_config_type']
      }

      const { error } = await supabase.from('rooms').update(payload).eq('id', selectedRoom.id)
      if (error) throw error

      setIsEditModalOpen(false)
      setSelectedRoom(null)
      await fetchRooms()
    } catch (err: any) {
      setFormError(err?.message || 'Oda güncellenirken hata oluştu.')
    } finally {
      setFormLoading(false)
    }
  }

  const handleDeleteRoom = async (room: RoomWithStatus) => {
    if (!window.confirm(`#${room.room_number} numaralı odayı silmek istediğinize emin misiniz?\nBu işlem geri alınamaz.`)) {
      return
    }

    try {
      const { error } = await supabase.from('rooms').delete().eq('id', room.id)
      if (error) {
        if (error.code === '23503') {
          throw new Error('Bu odaya bağlı rezervasyonlar olduğu için oda silinemez.')
        }
        throw error
      }
      await fetchRooms()
    } catch (err: any) {
      alert(err?.message || 'Oda silinirken beklenmeyen bir hata oluştu.')
    }
  }

  const filteredRooms = rooms.filter(room => 
    room.room_number.toLowerCase().includes(search.toLowerCase()) ||
    (ROOM_TYPE_LABEL[room.type] || room.type).toLowerCase().includes(search.toLowerCase())
  )

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center bg-gray-50/60">
        <div className="flex flex-col items-center gap-3">
          <Loader2 size={24} className="animate-spin text-gold-500" />
          <span className="text-sm text-gray-500 font-medium">Odalar yükleniyor...</span>
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
              <BedDouble className="text-gold-500" size={28} />
              Odalar
            </h1>
            <p className="text-sm text-gray-500 mt-1">Oda durumlarını, tiplerini ve yatak düzenlerini görüntüleyin.</p>
          </div>
          <div className="flex flex-col md:flex-row items-center gap-4 w-full md:w-auto">
            <div className="relative w-full md:w-80">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
              <input
                type="text"
                placeholder="Oda no veya tip ara..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-300 bg-white text-gray-800 focus:outline-none focus:ring-2 focus:ring-gold-500/50 focus:border-gold-500 transition-colors text-sm shadow-sm"
              />
            </div>
            <button
              onClick={() => setIsAddModalOpen(true)}
              className="flex items-center justify-center gap-2 w-full md:w-auto bg-black text-gold-400 hover:bg-gray-900 px-6 py-2.5 rounded-xl text-sm font-bold tracking-wide uppercase shadow-sm transition-all cursor-pointer border border-gold-500/30"
            >
              <Plus size={18} />
              Yeni Oda Ekle
            </button>
          </div>
        </div>

        {/* Table */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50/80 border-b border-gray-200">
                  <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-widest">Oda No</th>
                  <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-widest">Tip & Yatak</th>
                  <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-widest">HK Durumu</th>
                  <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-widest">Oda Durumu</th>
                  <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-widest">Doluluk</th>
                  <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-widest text-right">İşlem</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredRooms.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-gray-400 font-medium">
                      Eşleşen kayıt bulunamadı.
                    </td>
                  </tr>
                ) : (
                  filteredRooms.map((room) => {
                    const hk = HK_STATUS_CONFIG[room.hk_status ?? ''] || { label: 'Bilinmiyor', bg: 'bg-gray-100', text: 'text-gray-600' }
                    const opStatus = ROOM_STATUS_CONFIG[room.status ?? 'AVAILABLE'] || ROOM_STATUS_CONFIG['AVAILABLE']
                    const isOccupied = room.reservations?.some(r => r.status === 'CHECKED_IN')
                    const bedConfigLabel = BED_CONFIG_LABEL[room.bed_config ?? ''] || room.bed_config || 'Belirtilmedi'
                    
                    return (
                      <tr key={room.id} className="hover:bg-gray-50/50 transition-colors group">
                        <td className="px-6 py-4">
                          <span className="text-base font-bold text-gray-900 font-cinzel">#{room.room_number}</span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex flex-col">
                            <span className="text-sm font-semibold text-gray-700">{ROOM_TYPE_LABEL[room.type] || room.type}</span>
                            <span className="text-xs text-gray-500 mt-0.5">{bedConfigLabel}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-widest ${hk.bg} ${hk.text}`}>
                            {hk.label}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-widest ${opStatus.bg} ${opStatus.text}`}>
                            {opStatus.label}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-widest ${isOccupied ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'}`}>
                            {isOccupied ? 'Dolu' : 'Boş'}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={() => openEditModal(room)}
                              className="inline-flex items-center justify-center p-2 rounded-lg text-gray-400 hover:text-gold-600 hover:bg-gold-50 transition-colors cursor-pointer"
                              title="Odayı Düzenle"
                            >
                              <Edit2 size={16} />
                            </button>
                            <button
                              onClick={() => handleDeleteRoom(room)}
                              className="inline-flex items-center justify-center p-2 rounded-lg text-gray-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                              title="Odayı Kaldır"
                            >
                              <Trash2 size={16} />
                            </button>
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

      {/* Yeni Oda Ekle Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-xl border border-gray-200 w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gray-50/50">
              <h2 className="text-lg font-bold text-gray-800 font-cinzel">Yeni Oda Ekle</h2>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 hover:bg-gray-100 p-1.5 rounded-lg transition-colors cursor-pointer"
              >
                <X size={20} />
              </button>
            </div>
            
            <form onSubmit={handleAddSubmit} className="p-6 space-y-4">
              {formError && (
                <div className="p-3 rounded-xl bg-rose-50 text-rose-700 text-sm border border-rose-200 font-medium">
                  {formError}
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1.5 uppercase tracking-wider">Oda No</label>
                  <input
                    type="text"
                    required
                    value={addForm.room_number}
                    onChange={e => setAddForm({ ...addForm, room_number: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-300 focus:ring-2 focus:ring-gold-500/50 focus:border-gold-500 transition-all text-sm"
                    placeholder="Örn: 101"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1.5 uppercase tracking-wider">Gecelik Fiyat (₺)</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={addForm.base_price}
                    onChange={e => setAddForm({ ...addForm, base_price: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-300 focus:ring-2 focus:ring-gold-500/50 focus:border-gold-500 transition-all text-sm"
                    placeholder="Örn: 1500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1.5 uppercase tracking-wider">Oda Tipi</label>
                <select
                  value={addForm.room_type}
                  onChange={e => setAddForm({ ...addForm, room_type: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-300 focus:ring-2 focus:ring-gold-500/50 focus:border-gold-500 transition-all text-sm bg-white"
                >
                  <option value="STANDARD">Standart Oda</option>
                  <option value="SUITE">Suit Oda</option>
                  <option value="FAMILY">Aile Odası</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1.5 uppercase tracking-wider">Yatak Düzeni (Opsiyonel)</label>
                <select
                  value={addForm.bed_config}
                  onChange={e => setAddForm({ ...addForm, bed_config: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-300 focus:ring-2 focus:ring-gold-500/50 focus:border-gold-500 transition-all text-sm bg-white"
                >
                  <option value="">Seçiniz...</option>
                  <option value="SINGLE">1 Tek Kişilik</option>
                  <option value="DOUBLE">1 Çift Kişilik</option>
                  <option value="TWIN">2 Tek Kişilik</option>
                  <option value="DOUBLE_SINGLE">1 Çift + 1 Tek Kişilik</option>
                  <option value="DOUBLE_TWIN">1 Çift + 2 Tek Kişilik</option>
                  <option value="TRIPLE">3 Tek Kişilik</option>
                </select>
              </div>

              <div className="mt-8 flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-5 py-2.5 rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-100 transition-colors cursor-pointer"
                >
                  İptal
                </button>
                <button
                  type="submit"
                  disabled={formLoading}
                  className="flex items-center justify-center min-w-[120px] px-5 py-2.5 rounded-xl bg-gold-500 text-white text-sm font-bold tracking-wide uppercase hover:bg-gold-600 transition-colors shadow-sm disabled:opacity-50 cursor-pointer"
                >
                  {formLoading ? <Loader2 size={16} className="animate-spin" /> : 'Kaydet'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Oda Düzenle Modal */}
      {isEditModalOpen && selectedRoom && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-xl border border-gray-200 w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gray-50/50">
              <h2 className="text-lg font-bold text-gray-800 font-cinzel">Oda #{selectedRoom.room_number} Düzenle</h2>
              <button
                onClick={() => setIsEditModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 hover:bg-gray-100 p-1.5 rounded-lg transition-colors cursor-pointer"
              >
                <X size={20} />
              </button>
            </div>
            
            <form onSubmit={handleEditSubmit} className="p-6 space-y-4">
              {formError && (
                <div className="p-3 rounded-xl bg-rose-50 text-rose-700 text-sm border border-rose-200 font-medium">
                  {formError}
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1.5 uppercase tracking-wider">Oda Tipi</label>
                  <select
                    value={editForm.room_type}
                    onChange={e => setEditForm({ ...editForm, room_type: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-300 focus:ring-2 focus:ring-gold-500/50 focus:border-gold-500 transition-all text-sm bg-white"
                  >
                    <option value="STANDARD">Standart Oda</option>
                    <option value="SUITE">Suit Oda</option>
                    <option value="FAMILY">Aile Odası</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1.5 uppercase tracking-wider">Yatak Düzeni</label>
                  <select
                    value={editForm.bed_config}
                    onChange={e => setEditForm({ ...editForm, bed_config: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-300 focus:ring-2 focus:ring-gold-500/50 focus:border-gold-500 transition-all text-sm bg-white"
                  >
                    <option value="">Seçiniz...</option>
                    <option value="SINGLE">1 Tek Kişilik</option>
                    <option value="DOUBLE">1 Çift Kişilik</option>
                    <option value="TWIN">2 Tek Kişilik</option>
                    <option value="DOUBLE_SINGLE">1 Çift + 1 Tek Kişilik</option>
                    <option value="DOUBLE_TWIN">1 Çift + 2 Tek Kişilik</option>
                    <option value="TRIPLE">3 Tek Kişilik</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1.5 uppercase tracking-wider">Housekeeping Durumu</label>
                <select
                  value={editForm.hk_status}
                  onChange={e => setEditForm({ ...editForm, hk_status: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-300 focus:ring-2 focus:ring-gold-500/50 focus:border-gold-500 transition-all text-sm bg-white"
                >
                  <option value="CLEAN">Temiz</option>
                  <option value="DIRTY">Kirli</option>
                  <option value="INSPECTED">Kontrol Edildi</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1.5 uppercase tracking-wider">Operasyonel Durum</label>
                <select
                  value={editForm.status}
                  onChange={e => setEditForm({ ...editForm, status: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-300 focus:ring-2 focus:ring-gold-500/50 focus:border-gold-500 transition-all text-sm bg-white"
                >
                  <option value="AVAILABLE">Kullanılabilir</option>
                  <option value="OUT_OF_ORDER">Arızalı</option>
                  <option value="MAINTENANCE">Bakımda</option>
                </select>
              </div>

              <div className="mt-8 flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="px-5 py-2.5 rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-100 transition-colors cursor-pointer"
                >
                  İptal
                </button>
                <button
                  type="submit"
                  disabled={formLoading}
                  className="flex items-center justify-center min-w-[120px] px-5 py-2.5 rounded-xl bg-gold-500 text-white text-sm font-bold tracking-wide uppercase hover:bg-gold-600 transition-colors shadow-sm disabled:opacity-50 cursor-pointer"
                >
                  {formLoading ? <Loader2 size={16} className="animate-spin" /> : 'Güncelle'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
