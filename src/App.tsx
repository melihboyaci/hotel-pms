import { BrowserRouter, Routes, Route, Navigate, NavLink, Outlet } from 'react-router-dom'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import { useState } from 'react'
import {
  LayoutDashboard,
  UserPlus,
  BedDouble,
  Users,
  CalendarRange,
  ArrowLeftRight,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Receipt,
  Moon,
} from 'lucide-react'
import { supabase } from './lib/supabase'
import Dashboard from './pages/Dashboard'
import Login from './pages/Login'
import CheckIn from './pages/CheckIn'
import Folio from './pages/Folio'
import ReservationDetail from './pages/ReservationDetail'
import Rooms from './pages/Rooms'
import Guests from './pages/Guests'
import Reservations from './pages/Reservations'
import Transactions from './pages/Transactions'
import CityLedger from './pages/CityLedger'
import NightAudit from './pages/NightAudit'

// --- Korumalı Rota Bileşeni ---

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { session, loading } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-pulse flex flex-col items-center">
          <div className="h-12 w-12 border-4 border-gold-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="mt-4 text-gray-500 font-medium">Yükleniyor...</p>
        </div>
      </div>
    )
  }

  if (!session) {
    return <Navigate to="/login" replace />
  }

  return <>{children}</>
}

// --- Sidebar menü öğeleri ---

interface NavItem {
  label: string
  path: string
  icon: React.ReactNode
}

const NAV_ITEMS: NavItem[] = [
  { label: 'Pano', path: '/', icon: <LayoutDashboard size={20} /> },
  { label: 'Yeni Check-In', path: '/check-in', icon: <UserPlus size={20} /> },
  { label: 'Odalar', path: '/rooms', icon: <BedDouble size={20} /> },
  { label: 'Misafirler', path: '/guests', icon: <Users size={20} /> },
  { label: 'Rezervasyonlar', path: '/reservations', icon: <CalendarRange size={20} /> },
  { label: 'Cari Hesaplar', path: '/city-ledger', icon: <Receipt size={20} /> },
  { label: 'Hareketler', path: '/transactions', icon: <ArrowLeftRight size={20} /> },
  { label: 'Gün Sonu', path: '/night-audit', icon: <Moon size={20} /> },
]

// --- Ana Layout (Sidebar + İçerik) ---

function AppLayout() {
  const { user } = useAuth()
  const [collapsed, setCollapsed] = useState(false)

  const handleLogout = async () => {
    await supabase.auth.signOut()
  }

  // Kullanıcı adını e-postadan çıkar (örn: resepsiyon@heracity.com → resepsiyon)
  const displayName = user?.email?.split('@')[0] ?? 'Kullanıcı'

  return (
    <div className="min-h-screen flex bg-gray-50/60">
      {/* ═══ Sidebar ═══ */}
      <aside
        className={`flex flex-col bg-dark-950 border-r border-gold-500/20 transition-all duration-300 ease-in-out ${
          collapsed ? 'w-[72px]' : 'w-[260px]'
        }`}
      >
        {/* Logo / Marka */}
        <div className="flex items-center gap-3 px-4 py-5 border-b border-gold-500/15">
          <img
            src="/logo.png"
            alt="Hera City Hotel"
            className="h-10 w-10 rounded-lg object-contain shrink-0"
          />
          {!collapsed && (
            <div className="overflow-hidden">
              <h1 className="text-sm font-bold tracking-[0.12em] text-gold-500 font-cinzel truncate leading-tight">
                HERA CITY
              </h1>
              <p className="text-[9px] text-gold-400/60 tracking-[0.2em] uppercase font-semibold">
                Hotel PMS
              </p>
            </div>
          )}
        </div>

        {/* Navigasyon Linkleri */}
        <nav className="flex-1 py-4 px-2 space-y-1 overflow-y-auto">
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.path === '/'}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 group ${
                  isActive
                    ? 'bg-gold-500/15 text-gold-400 shadow-sm shadow-gold-500/5'
                    : 'text-gray-400 hover:text-gold-300 hover:bg-white/5'
                } ${collapsed ? 'justify-center' : ''}`
              }
              title={collapsed ? item.label : undefined}
            >
              <span className="shrink-0">{item.icon}</span>
              {!collapsed && <span className="truncate">{item.label}</span>}
            </NavLink>
          ))}
        </nav>

        {/* Alt kısım — Kullanıcı + Collapse */}
        <div className="border-t border-gold-500/15 p-3 space-y-2">
          {/* Kullanıcı bilgisi */}
          {!collapsed && (
            <div className="flex items-center gap-2.5 px-2 py-2">
              <div className="h-8 w-8 rounded-full bg-gold-500/20 flex items-center justify-center text-gold-400 text-xs font-bold uppercase shrink-0">
                {displayName.charAt(0)}
              </div>
              <div className="overflow-hidden">
                <p className="text-xs font-semibold text-gray-300 truncate capitalize">
                  {displayName}
                </p>
                <p className="text-[10px] text-gray-500 truncate">{user?.email}</p>
              </div>
            </div>
          )}

          {/* Çıkış butonu */}
          <button
            onClick={handleLogout}
            className={`flex items-center gap-2.5 w-full px-3 py-2 rounded-xl text-sm font-medium text-gray-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer ${
              collapsed ? 'justify-center' : ''
            }`}
            title="Çıkış Yap"
          >
            <LogOut size={18} />
            {!collapsed && <span>Çıkış Yap</span>}
          </button>

          {/* Daralt/Genişlet butonu */}
          <button
            onClick={() => setCollapsed((c) => !c)}
            className="flex items-center justify-center w-full py-1.5 rounded-lg text-gray-600 hover:text-gold-400 hover:bg-white/5 transition-colors cursor-pointer"
            title={collapsed ? 'Menüyü Genişlet' : 'Menüyü Daralt'}
          >
            {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
          </button>
        </div>
      </aside>

      {/* ═══ Ana İçerik Alanı ═══ */}
      <main className="flex-1 flex flex-col min-h-screen overflow-y-auto">
        <Outlet />
      </main>
    </div>
  )
}

// --- Uygulama Rotaları ---

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Giriş ekranı — sidebar yok */}
          <Route path="/login" element={<Login />} />

          {/* Korumalı layout (sidebar + içerik) */}
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <AppLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<Dashboard />} />
            <Route path="check-in" element={<CheckIn />} />
            <Route path="folio/:id" element={<Folio />} />
            <Route path="reservation/:id" element={<ReservationDetail />} />
            <Route path="rooms" element={<Rooms />} />
            <Route path="guests" element={<Guests />} />
            <Route path="reservations" element={<Reservations />} />
            <Route path="city-ledger" element={<CityLedger />} />
            <Route path="transactions" element={<Transactions />} />
            <Route path="night-audit" element={<NightAudit />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}

export default App
