import { useEffect, useRef, useState } from 'react'
import {
  Moon,
  Play,
  Loader2,
  RefreshCw,
  CalendarDays,
  BedDouble,
  Banknote,
  Receipt,
  Wallet,
  Terminal,
  FileText,
} from 'lucide-react'
import { supabase } from '../lib/supabase'
import type { Database } from '../types/database.types'

// --- Veritabanı tipi ---
type DailyReport = Database['public']['Tables']['daily_reports']['Row']

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
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  })
}

function formatDateTime(dateStr: string): string {
  return new Date(dateStr).toLocaleString('tr-TR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

// --- Terminal Log Bileşeni ---

function AuditTerminal({ logs }: { logs: string[] }) {
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [logs])

  return (
    <div className="flex flex-col rounded-xl border border-gray-700/50 bg-gray-950 shadow-xl overflow-hidden">
      {/* Terminal başlık çubuğu */}
      <div className="flex items-center gap-2 px-4 py-2.5 bg-gray-900 border-b border-gray-800">
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-full bg-red-500/80" />
          <div className="w-3 h-3 rounded-full bg-amber-500/80" />
          <div className="w-3 h-3 rounded-full bg-emerald-500/80" />
        </div>
        <div className="flex items-center gap-1.5 ml-3">
          <Terminal size={13} className="text-gray-500" />
          <span className="text-[11px] font-medium text-gray-500 tracking-wide">
            night-audit.log
          </span>
        </div>
      </div>

      {/* Terminal içerik */}
      <div
        ref={scrollRef}
        className="p-4 h-[320px] overflow-y-auto font-mono text-sm leading-relaxed custom-scrollbar"
      >
        {logs.length === 0 ? (
          <div className="flex items-center gap-2 text-gray-600">
            <span className="text-gray-700">{'>'}</span>
            <span className="animate-pulse">[Sistem] Gün sonu işlemi bekleniyor...</span>
          </div>
        ) : (
          logs.map((line, idx) => (
            <div
              key={idx}
              className={`flex items-start gap-2 py-0.5 animate-in fade-in slide-in-from-bottom-1 duration-300 ${
                line.includes('[HATA]') || line.includes('[UYARI]')
                  ? 'text-rose-400'
                  : line.includes('[OK]') || line.includes('[TAMAM]')
                    ? 'text-emerald-400'
                    : line.includes('[BİLGİ]')
                      ? 'text-cyan-400'
                      : 'text-gray-300'
              }`}
            >
              <span className="text-gray-600 select-none shrink-0">{'>'}</span>
              <span>{line}</span>
            </div>
          ))
        )}
      </div>
    </div>
  )
}

// --- Geçmiş Raporlar Tablosu ---

function ReportsTable({
  reports,
  loading,
}: {
  reports: DailyReport[]
  loading: boolean
}) {
  if (loading) {
    return (
      <div className="flex items-center justify-center py-16 text-gray-400">
        <RefreshCw size={18} className="animate-spin mr-2 text-gold-500" />
        Raporlar yükleniyor…
      </div>
    )
  }

  if (reports.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-gray-400">
        <FileText size={32} className="mb-3 text-gray-300" />
        <p className="font-medium">Henüz gün sonu raporu bulunmuyor.</p>
        <p className="text-xs mt-1">İlk gün sonu işleminizi başlatarak bir rapor oluşturun.</p>
      </div>
    )
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b-2 border-gray-100">
            <th className="text-left py-3 px-4 font-bold text-gray-600 uppercase tracking-wider text-xs">
              <div className="flex items-center gap-1.5">
                <CalendarDays size={13} />
                Tarih
              </div>
            </th>
            <th className="text-center py-3 px-4 font-bold text-gray-600 uppercase tracking-wider text-xs">
              <div className="flex items-center justify-center gap-1.5">
                <BedDouble size={13} />
                Satılan Oda
              </div>
            </th>
            <th className="text-right py-3 px-4 font-bold text-gray-600 uppercase tracking-wider text-xs">
              <div className="flex items-center justify-end gap-1.5">
                <Banknote size={13} />
                Oda Geliri
              </div>
            </th>
            <th className="text-right py-3 px-4 font-bold text-gray-600 uppercase tracking-wider text-xs">
              <div className="flex items-center justify-end gap-1.5">
                <Receipt size={13} />
                Ekstra Gelir
              </div>
            </th>
            <th className="text-right py-3 px-4 font-bold text-gray-600 uppercase tracking-wider text-xs">
              <div className="flex items-center justify-end gap-1.5">
                <Wallet size={13} />
                Toplam Tahsilat
              </div>
            </th>
            <th className="text-right py-3 px-4 font-bold text-gray-600 uppercase tracking-wider text-xs">
              İşlem Zamanı
            </th>
          </tr>
        </thead>
        <tbody>
          {reports.map((report, idx) => (
            <tr
              key={report.id}
              className={`border-b border-gray-50 transition-colors hover:bg-gold-50/40 ${
                idx === 0 ? 'bg-emerald-50/30' : ''
              }`}
            >
              <td className="py-3 px-4 font-semibold text-gray-800">
                {formatDate(report.audit_date)}
              </td>
              <td className="py-3 px-4 text-center">
                <span className="inline-flex items-center justify-center min-w-[2rem] bg-gold-50 border border-gold-200 rounded-lg px-2 py-0.5 font-bold text-gold-700 text-xs">
                  {report.total_rooms_sold ?? 0}
                </span>
              </td>
              <td className="py-3 px-4 text-right font-semibold text-gray-700">
                {formatCurrency(report.total_room_revenue ?? 0)}
              </td>
              <td className="py-3 px-4 text-right font-medium text-gray-600">
                {formatCurrency(report.total_extra_revenue ?? 0)}
              </td>
              <td className="py-3 px-4 text-right font-bold text-emerald-700">
                {formatCurrency(report.total_payments ?? 0)}
              </td>
              <td className="py-3 px-4 text-right text-xs text-gray-400">
                {report.performed_at ? formatDateTime(report.performed_at) : '—'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// --- Ana Sayfa ---

export default function NightAudit() {
  // UI state'leri
  const [logs, setLogs] = useState<string[]>([])
  const [isAuditing, setIsAuditing] = useState(false)

  // Geçmiş raporlar
  const [reports, setReports] = useState<DailyReport[]>([])
  const [reportsLoading, setReportsLoading] = useState(true)

  // Geçmiş raporları çek
  const fetchReports = async () => {
    setReportsLoading(true)
    try {
      const { data, error } = await supabase
        .from('daily_reports')
        .select('*')
        .order('audit_date', { ascending: false })

      if (error) throw error
      setReports(data ?? [])
    } catch (err: any) {
      console.error('Raporlar çekilemedi:', err.message)
    } finally {
      setReportsLoading(false)
    }
  }

  useEffect(() => {
    fetchReports()
  }, [])

  // Gün Sonu Başlat — placeholder (asıl algoritma bir sonraki fazda)
  const handleStartAudit = () => {
    // Henüz gerçek işlem yapılmıyor, sadece UI davranışı test ediliyor
    setIsAuditing(true)
    setLogs([
      `[${new Date().toLocaleTimeString('tr-TR')}] [BİLGİ] Gün sonu işlemi başlatıldı...`,
    ])

    // Simülasyon — ileride gerçek algoritma ile değiştirilecek
    setTimeout(() => {
      setLogs((prev) => [
        ...prev,
        `[${new Date().toLocaleTimeString('tr-TR')}] [BİLGİ] Bu bir test çıktısıdır. Gerçek algoritma henüz bağlanmadı.`,
      ])
      setIsAuditing(false)
    }, 2000)
  }

  return (
    <div className="flex-1 text-gray-800 px-6 py-8 font-sans">
      {/* ═══ Başlık ═══ */}
      <div className="mb-8 flex items-center justify-between border-b border-gray-200 pb-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-[0.18em] text-gold-600 font-cinzel flex items-center gap-3">
            <Moon className="text-amber-300" size={28} />
            GÜN SONU İŞLEMLERİ
          </h1>
          <p className="mt-1 text-xs md:text-sm font-semibold tracking-widest text-gray-400 uppercase">
            Night Audit &bull; Hera City Hotel
          </p>
        </div>
      </div>

      {/* ═══ ÜST BÖLÜM — Aktif İşlem ═══ */}
      <section className="mb-10">
        <div className="flex items-center gap-2 mb-4">
          <div className="h-5 w-1 rounded-full bg-gold-500" />
          <h2 className="text-lg font-bold text-gray-800 tracking-wide">Aktif İşlem</h2>
          {isAuditing && (
            <span className="ml-2 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-50 border border-amber-200 text-amber-700 text-[10px] font-bold uppercase tracking-wider animate-pulse">
              <Loader2 size={11} className="animate-spin" />
              Devam Ediyor
            </span>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-5">
          {/* Sol — Başlat Butonu */}
          <div className="flex flex-col gap-4">
            <button
              onClick={handleStartAudit}
              disabled={isAuditing}
              className={`group flex items-center justify-center gap-3 py-5 px-6 rounded-xl font-bold text-base transition-all duration-300 shadow-lg cursor-pointer ${
                isAuditing
                  ? 'bg-gray-200 text-gray-400 shadow-none cursor-not-allowed'
                  : 'bg-gradient-to-br from-indigo-950 via-indigo-900 to-indigo-950 text-white hover:shadow-xl hover:shadow-indigo-900/30 hover:-translate-y-0.5 active:translate-y-0'
              }`}
            >
              {isAuditing ? (
                <>
                  <Loader2 size={22} className="animate-spin" />
                  İşlem Sürüyor...
                </>
              ) : (
                <>
                  <Play size={20} className="transition-transform group-hover:scale-110" />
                  <span className="flex flex-col items-start leading-tight">
                    <span className="text-sm font-cinzel tracking-wider">Gün Sonunu Başlat</span>
                    <span className="text-[10px] font-normal opacity-70 tracking-wide">Night Audit</span>
                  </span>
                  <Moon size={16} className="ml-1 text-amber-300 opacity-80" />
                </>
              )}
            </button>

            {/* Durum bilgisi kartı */}
            <div className="bg-gray-50 rounded-xl border border-gray-100 p-4 text-xs text-gray-500 space-y-2">
              <p className="font-semibold text-gray-600 text-[11px] uppercase tracking-wider mb-2">
                İşlem Bilgisi
              </p>
              <div className="flex justify-between">
                <span>Durum</span>
                <span className={`font-bold ${isAuditing ? 'text-amber-600' : 'text-emerald-600'}`}>
                  {isAuditing ? 'İşleniyor' : 'Hazır'}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Son Log</span>
                <span className="font-medium text-gray-600">
                  {logs.length > 0 ? `${logs.length} satır` : '—'}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Bugünün Tarihi</span>
                <span className="font-medium text-gray-600">
                  {new Date().toLocaleDateString('tr-TR')}
                </span>
              </div>
            </div>
          </div>

          {/* Sağ — Terminal */}
          <AuditTerminal logs={logs} />
        </div>
      </section>

      {/* ═══ ALT BÖLÜM — Geçmiş Raporlar (Z-Raporları) ═══ */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="h-5 w-1 rounded-full bg-gold-500" />
            <h2 className="text-lg font-bold text-gray-800 tracking-wide">
              Geçmiş Raporlar
            </h2>
            <span className="text-xs text-gray-400 font-medium ml-1">(Z-Raporu)</span>
          </div>
          <button
            onClick={fetchReports}
            disabled={reportsLoading}
            className="flex items-center gap-1.5 text-xs font-semibold text-gold-600 hover:text-gold-700 transition-colors cursor-pointer disabled:opacity-50"
          >
            <RefreshCw size={13} className={reportsLoading ? 'animate-spin' : ''} />
            Yenile
          </button>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <ReportsTable reports={reports} loading={reportsLoading} />
        </div>
      </section>
    </div>
  )
}
