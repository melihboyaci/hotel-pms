import { useEffect, useState } from 'react'
import { Search, Loader2, Users, Plus, X, Pencil, Trash2, AlertTriangle } from 'lucide-react'
import { supabase } from '../lib/supabase'
import type { Database } from '../types/database.types'

type Guest = Database['public']['Tables']['guests']['Row']

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '—'
  return new Date(dateStr).toLocaleDateString('tr-TR', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

export default function Guests() {
  const [guests, setGuests] = useState<Guest[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingGuest, setEditingGuest] = useState<Guest | null>(null)
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    identity_number: '',
    phone: '',
  })
  const [formLoading, setFormLoading] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  // Delete Confirm State
  const [deleteConfirm, setDeleteConfirm] = useState<Guest | null>(null)
  const [deleteLoading, setDeleteLoading] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  const fetchGuests = async () => {
    try {
      const { data, error } = await supabase
        .from('guests')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error
      setGuests(data as Guest[])
    } catch (err) {
      console.error('Misafirler yüklenirken hata oluştu:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchGuests()
  }, [])

  // --- Modal Helpers ---
  const openCreateModal = () => {
    setEditingGuest(null)
    setFormData({ first_name: '', last_name: '', identity_number: '', phone: '' })
    setFormError(null)
    setIsModalOpen(true)
  }

  const openEditModal = (guest: Guest) => {
    setEditingGuest(guest)
    setFormData({
      first_name: guest.first_name,
      last_name: guest.last_name,
      identity_number: guest.identity_number,
      phone: guest.phone || '',
    })
    setFormError(null)
    setIsModalOpen(true)
  }

  const closeModal = () => {
    setIsModalOpen(false)
    setEditingGuest(null)
    setFormError(null)
  }

  // --- Save (Create or Update) ---
  const handleSaveGuest = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormLoading(true)
    setFormError(null)

    try {
      if (editingGuest) {
        // UPDATE
        const { error } = await supabase
          .from('guests')
          .update({
            first_name: formData.first_name,
            last_name: formData.last_name,
            identity_number: formData.identity_number,
            phone: formData.phone || null,
          })
          .eq('id', editingGuest.id)

        if (error) throw error
      } else {
        // INSERT (upsert on identity_number conflict)
        const { error } = await supabase.from('guests').upsert(
          {
            identity_number: formData.identity_number,
            first_name: formData.first_name,
            last_name: formData.last_name,
            phone: formData.phone || null,
          },
          { onConflict: 'identity_number' }
        )

        if (error) throw error
      }

      closeModal()
      await fetchGuests()
    } catch (err: any) {
      setFormError(err?.message || 'Misafir kaydedilirken hata oluştu.')
    } finally {
      setFormLoading(false)
    }
  }

  // --- Delete ---
  const openDeleteConfirm = (guest: Guest) => {
    setDeleteConfirm(guest)
    setDeleteError(null)
  }

  const closeDeleteConfirm = () => {
    setDeleteConfirm(null)
    setDeleteError(null)
  }

  const handleDeleteGuest = async () => {
    if (!deleteConfirm) return
    setDeleteLoading(true)
    setDeleteError(null)

    try {
      // Check if guest has any reservations
      const { data: reservations, error: checkError } = await supabase
        .from('reservations')
        .select('id')
        .eq('guest_id', deleteConfirm.id)
        .limit(1)

      if (checkError) throw checkError

      if (reservations && reservations.length > 0) {
        setDeleteError(
          'Bu misafirin geçmiş veya gelecek rezervasyonları olduğu için sistemden silinemez!'
        )
        setDeleteLoading(false)
        return
      }

      // Safe to delete
      const { error: deleteErr } = await supabase
        .from('guests')
        .delete()
        .eq('id', deleteConfirm.id)

      if (deleteErr) {
        // Catch FK violations from Supabase as a safety net
        if (
          deleteErr.code === '23503' ||
          deleteErr.message?.toLowerCase().includes('foreign key')
        ) {
          setDeleteError(
            'Bu misafirin geçmiş veya gelecek rezervasyonları olduğu için sistemden silinemez!'
          )
          setDeleteLoading(false)
          return
        }
        throw deleteErr
      }

      closeDeleteConfirm()
      await fetchGuests()
    } catch (err: any) {
      setDeleteError(err?.message || 'Silme işlemi sırasında bir hata oluştu.')
    } finally {
      setDeleteLoading(false)
    }
  }

  // --- Filter ---
  const filteredGuests = guests.filter((guest) => {
    const fullName = `${guest.first_name} ${guest.last_name}`.toLowerCase()
    const searchLower = search.toLowerCase()
    return (
      fullName.includes(searchLower) ||
      guest.identity_number.toLowerCase().includes(searchLower) ||
      (guest.phone && guest.phone.toLowerCase().includes(searchLower))
    )
  })

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center bg-gray-50/60">
        <div className="flex flex-col items-center gap-3">
          <Loader2 size={24} className="animate-spin text-gold-500" />
          <span className="text-sm text-gray-500 font-medium">Misafirler yükleniyor...</span>
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
              <Users className="text-gold-500" size={28} />
              Misafirler
            </h1>
            <p className="text-sm text-gray-500 mt-1">Otelinizde konaklamış veya konaklayan tüm misafirlerin kaydı.</p>
          </div>
          <div className="flex flex-col md:flex-row items-center gap-4 w-full md:w-auto">
            <div className="relative w-full md:w-80">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
              <input
                type="text"
                placeholder="İsim, TC veya telefon ile ara..."
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
              Yeni Misafir
            </button>
          </div>
        </div>

        {/* Table */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50/80 border-b border-gray-200">
                  <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-widest">Ad Soyad</th>
                  <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-widest">TC / Pasaport No</th>
                  <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-widest">Telefon</th>
                  <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-widest">E-posta</th>
                  <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-widest">Kayıt Tarihi</th>
                  <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-widest text-right">İşlemler</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredGuests.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-gray-400 font-medium">
                      Eşleşen kayıt bulunamadı.
                    </td>
                  </tr>
                ) : (
                  filteredGuests.map((guest) => (
                    <tr key={guest.id} className="hover:bg-gray-50/50 transition-colors group">
                      <td className="px-6 py-4">
                        <span className="text-sm font-bold text-gray-900">{guest.first_name} {guest.last_name}</span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-sm text-gray-600 font-medium">{guest.identity_number}</span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-sm text-gray-600">{guest.phone || '—'}</span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-sm text-gray-400 italic">—</span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-sm text-gray-500">{formatDate(guest.created_at)}</span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-end gap-1">
                          {/* Edit */}
                          <button
                            onClick={() => openEditModal(guest)}
                            title="Misafiri Düzenle"
                            className="p-2 rounded-lg text-gray-400 hover:text-gold-600 hover:bg-gold-50 transition-all cursor-pointer"
                          >
                            <Pencil size={16} />
                          </button>
                          {/* Delete */}
                          <button
                            onClick={() => openDeleteConfirm(guest)}
                            title="Misafiri Sil"
                            className="p-2 rounded-lg text-gray-400 hover:text-rose-600 hover:bg-rose-50 transition-all cursor-pointer"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Create / Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-xl border border-gray-200 w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gray-50/50">
              <h2 className="text-lg font-bold text-gray-800 font-cinzel">
                {editingGuest ? 'Misafiri Düzenle' : 'Yeni Misafir Kaydı'}
              </h2>
              <button
                onClick={closeModal}
                className="text-gray-400 hover:text-gray-600 hover:bg-gray-100 p-1.5 rounded-lg transition-colors cursor-pointer"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSaveGuest} className="p-6">
              {formError && (
                <div className="mb-6 p-4 rounded-xl bg-rose-50 text-rose-700 text-sm border border-rose-200 font-medium">
                  {formError}
                </div>
              )}

              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 mb-1.5 uppercase tracking-wider">Ad</label>
                    <input
                      type="text"
                      required
                      value={formData.first_name}
                      onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                      className="w-full px-4 py-2.5 rounded-xl border border-gray-300 focus:ring-2 focus:ring-gold-500/50 focus:border-gold-500 transition-all text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 mb-1.5 uppercase tracking-wider">Soyad</label>
                    <input
                      type="text"
                      required
                      value={formData.last_name}
                      onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                      className="w-full px-4 py-2.5 rounded-xl border border-gray-300 focus:ring-2 focus:ring-gold-500/50 focus:border-gold-500 transition-all text-sm"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1.5 uppercase tracking-wider">TC / Pasaport No</label>
                  <input
                    type="text"
                    required
                    value={formData.identity_number}
                    onChange={(e) => setFormData({ ...formData, identity_number: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-300 focus:ring-2 focus:ring-gold-500/50 focus:border-gold-500 transition-all text-sm font-medium"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1.5 uppercase tracking-wider">Telefon</label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-300 focus:ring-2 focus:ring-gold-500/50 focus:border-gold-500 transition-all text-sm"
                  />
                </div>
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
                  className="flex items-center justify-center min-w-[120px] px-5 py-2.5 rounded-xl bg-gold-500 text-white text-sm font-bold tracking-wide uppercase hover:bg-gold-600 transition-colors shadow-sm disabled:opacity-50 cursor-pointer"
                >
                  {formLoading ? <Loader2 size={16} className="animate-spin" /> : 'Kaydet'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-xl border border-gray-200 w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-6">
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 flex items-center justify-center w-12 h-12 rounded-full bg-rose-100">
                  <AlertTriangle className="text-rose-600" size={24} />
                </div>
                <div className="flex-1">
                  <h3 className="text-base font-bold text-gray-900 mb-1">Misafiri Sil</h3>
                  <p className="text-sm text-gray-500">
                    <span className="font-semibold text-gray-700">{deleteConfirm.first_name} {deleteConfirm.last_name}</span> adlı misafiri sistemden kalıcı olarak silmek istediğinize emin misiniz?
                  </p>
                </div>
              </div>

              {deleteError && (
                <div className="mt-5 p-4 rounded-xl bg-rose-50 text-rose-700 text-sm border border-rose-200 font-medium flex items-start gap-2">
                  <AlertTriangle size={16} className="flex-shrink-0 mt-0.5" />
                  <span>{deleteError}</span>
                </div>
              )}

              <div className="mt-6 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={closeDeleteConfirm}
                  disabled={deleteLoading}
                  className="px-5 py-2.5 rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-100 transition-colors cursor-pointer disabled:opacity-50"
                >
                  İptal
                </button>
                <button
                  type="button"
                  onClick={handleDeleteGuest}
                  disabled={deleteLoading}
                  className="flex items-center justify-center min-w-[120px] px-5 py-2.5 rounded-xl bg-rose-600 text-white text-sm font-bold tracking-wide uppercase hover:bg-rose-700 transition-colors shadow-sm disabled:opacity-50 cursor-pointer"
                >
                  {deleteLoading ? <Loader2 size={16} className="animate-spin" /> : 'Evet, Sil'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
