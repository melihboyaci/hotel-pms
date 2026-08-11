# Sistem Mimarisi — Hera City Hotel PMS

## Teknoloji Yığını

| Katman | Teknoloji |
|--------|-----------|
| **Frontend** | React 19 + Vite 8 + TypeScript 6 |
| **Stil** | Tailwind CSS v4 (özel `gold-*`, `dark-950` tema) |
| **Routing** | React Router v7 |
| **Backend/DB** | Supabase (PostgreSQL) |
| **Auth** | Supabase Auth (e-posta/şifre) |
| **İkonlar** | Lucide React |
| **Lint** | Oxlint |

---

## Dizin Yapısı

```
hotel-pms/
├── public/
│   └── logo.png                     # Hera City Hotel logosu
├── src/
│   ├── App.tsx                      # Router, AppLayout (Sidebar + Outlet), ProtectedRoute
│   ├── main.tsx                     # React DOM render
│   ├── index.css                    # Tailwind direktifleri, global font ayarları
│   ├── contexts/
│   │   └── AuthContext.tsx          # Supabase session yönetimi, useAuth() hook
│   ├── lib/
│   │   └── supabase.ts              # Supabase istemcisi (Database tipi ile createClient)
│   ├── types/
│   │   └── database.types.ts        # `npx supabase gen types` ile üretilen otomatik tipler
│   └── pages/
│       ├── Login.tsx                # Giriş ekranı (Auth dışı, sidebar yok)
│       ├── Dashboard.tsx            # Resepsiyon panosu — oda grid, HK özeti, QuickActionModal
│       ├── CheckIn.tsx              # Check-in formu — misafir arama (autocomplete), refakatçi
│       ├── Rooms.tsx                # Oda yönetimi — listeleme, ekleme, düzenleme, silme
│       ├── Guests.tsx               # Misafir yönetimi — listeleme, ekleme modalı
│       ├── Reservations.tsx         # Tüm rezervasyonların listelenmesi ve filtrelenmesi
│       ├── ReservationDetail.tsx    # Birleşik profil: rezervasyon + misafirler + folyo
│       ├── Folio.tsx                # Folyo (hesap): tahsilat, EXTRA, tarih değiştirme, check-out
│       ├── Transactions.tsx         # Tüm finansal hareketler — filtreleme
│       ├── CityLedger.tsx           # Cari hesap yönetimi
│       └── NightAudit.tsx           # Gün sonu: terminal log, tahakkuk algoritması, Z-Raporu
└── docs/
    ├── ARCHITECTURE.md              # (Bu dosya) Mimari belgesi
    ├── PROJECT_PLAN.md              # Faz bazlı yol haritası
    ├── STATE.md                     # Anlık proje durumu ve çalışma belleği
    └── specs/                       # (Boş — gelecek spesifikasyonlar için)
```

---

## Rota Haritası

| Yol | Bileşen | Açıklama |
|-----|---------|----------|
| `/login` | `Login` | Auth dışı, sidebar yok |
| `/` | `Dashboard` | Oda kartları grid'i |
| `/check-in` | `CheckIn` | Yeni rezervasyon ve check-in formu |
| `/rooms` | `Rooms` | Oda listesi ve yönetimi |
| `/guests` | `Guests` | Misafir listesi ve yönetimi |
| `/reservations` | `Reservations` | Tüm rezervasyonlar |
| `/reservation/:id` | `ReservationDetail` | Tekil rezervasyon + folyo profili |
| `/folio/:id` | `Folio` | Folyo işlemleri (`:id` = `reservation.id`) |
| `/city-ledger` | `CityLedger` | Cari hesaplar |
| `/transactions` | `Transactions` | Tüm finansal hareketler |
| `/night-audit` | `NightAudit` | Gün sonu (Night Audit) modülü |

---

## Veritabanı Şeması (Supabase / PostgreSQL)

### Tablolar

#### `rooms`
| Sütun | Tip | Not |
|-------|-----|-----|
| `id` | uuid (PK) | |
| `room_number` | text | Benzersiz |
| `type` | enum `room_type` | STANDARD \| SUITE \| FAMILY |
| `bed_config` | enum `bed_config_type` | SINGLE \| DOUBLE \| TWIN \| DOUBLE_SINGLE \| DOUBLE_TWIN \| TRIPLE |
| `hk_status` | enum `hk_status` | CLEAN \| DIRTY \| INSPECTED |

#### `guests`
| Sütun | Tip | Not |
|-------|-----|-----|
| `id` | uuid (PK) | |
| `first_name` | text | |
| `last_name` | text | |
| `identity_number` | text | TC/Pasaport No |
| `phone` | text \| null | |
| `created_at` | timestamptz | |

#### `reservations`
| Sütun | Tip | Not |
|-------|-----|-----|
| `id` | uuid (PK) | |
| `room_id` | uuid (FK → rooms) | |
| `guest_id` | uuid (FK → guests) | Ana misafir |
| `check_in_date` | date | |
| `check_out_date` | date | |
| `total_price` | numeric | Konaklamanın toplam bedeli |
| `status` | enum `reservation_status` | PENDING \| CHECKED_IN \| CHECKED_OUT \| CANCELLED |
| `channel` | text \| null | DIRECT \| AGENCY vb. |
| `agency_name` | text \| null | |

#### `reservation_guests` (çoka-çok köprü tablosu)
| Sütun | Tip | Not |
|-------|-----|-----|
| `id` | uuid (PK) | |
| `reservation_id` | uuid (FK → reservations) | |
| `guest_id` | uuid (FK → guests) | |
| `is_primary_guest` | boolean | Ana misafir işareti |

#### `folios`
| Sütun | Tip | Not |
|-------|-----|-----|
| `id` | uuid (PK) | |
| `reservation_id` | uuid (FK → reservations) | **1:1 ilişki** |
| `status` | enum `folio_status` | OPEN \| CLOSED \| SETTLED |
| `created_at` | timestamptz | |
| `closed_at` | timestamptz \| null | |

#### `transactions`
| Sütun | Tip | Not |
|-------|-----|-----|
| `id` | uuid (PK) | |
| `folio_id` | uuid (FK → folios) | |
| `transaction_type` | enum `transaction_type` | ROOM_CHARGE \| EXTRA \| PAYMENT |
| `amount` | numeric | **Borçlar (+), tahsilatlar (−)** |
| `description` | text \| null | Night Audit: "Gün Sonu Oda Ücreti" |
| `payment_method` | enum `payment_method` \| null | CASH \| CREDIT_CARD \| BANK_TRANSFER \| CITY_LEDGER |
| `created_by` | uuid \| null | Supabase auth.uid() |
| `is_cleared` | boolean \| null | Cari hesap takas işareti |
| `created_at` | timestamptz | |

#### `daily_reports` (Z-Raporları)
| Sütun | Tip | Not |
|-------|-----|-----|
| `id` | uuid (PK) | |
| `audit_date` | date | Gün sonu tarihi (benzersiz) |
| `total_rooms_sold` | numeric \| null | O gün check-in'de olan oda sayısı |
| `total_room_revenue` | numeric \| null | Toplam oda geliri |
| `total_extra_revenue` | numeric \| null | Toplam ekstra gelir |
| `total_payments` | numeric \| null | Toplam tahsilat |
| `performed_at` | timestamptz \| null | İşlemin yapıldığı zaman |

#### `profiles`
| Sütun | Tip | Not |
|-------|-----|-----|
| `id` | uuid (PK = auth.uid()) | |
| `role` | enum `user_role` | ADMIN \| RECEPTIONIST \| HOUSEKEEPER |
| `created_at` | timestamptz | |

---

## Mimari Kurallar ve Kararlar

1. **Tip güvenliği:** Supabase sorguları her zaman `Database['public']['Tables'][...]` üzerinden tiplenir. Manuel interface tanımı yasaktır.
2. **Supabase tipleri güncelleme:** `npx supabase gen types typescript --project-id swmdrxnerzvyhudmdsrv > src/types/database.types.ts`
3. **Finansal işaret kuralı:** Borçlar `amount > 0` (pozitif), tahsilatlar `amount < 0` (negatif). Bakiye = `SUM(transactions.amount)` → 0 veya negatif ise hesap kapalıdır.
4. **Gece Bazlı Tahakkuk (Night Audit):** Check-in esnasında folyoya `ROOM_CHARGE` **basılmaz**. Her gece sonu `NightAudit` çalıştırıldığında, `CHECKED_IN` tüm foliyolara o geceye ait tek gecelik ücret eklenir. Gecelik ücret = `total_price ÷ toplam_gece_sayısı`.
5. **Idempotency:** Night Audit, `daily_reports.audit_date` ve folyo başına günlük `ROOM_CHARGE` kontrolü ile çift yazımı engeller.
6. **UI Mimarisi:** `App.tsx` → `AppLayout` (Sidebar + `<Outlet />`). Login hariç tüm sayfalar sidebar ile render edilir. Folio rotası `reservation.id` alır (`/folio/:id`).
7. **Kimlik doğrulama:** Supabase Auth. `AuthContext.tsx` session'ı yönetir; `ProtectedRoute` korumasız erişimleri `/login`'e yönlendirir.
8. **Tasarım Dili:** `gold-500/600/700` ana vurgu rengi, `dark-950` sidebar arka planı, `font-cinzel` (Google Fonts) başlık fontu, `tabular-nums` rakam dizilimi.