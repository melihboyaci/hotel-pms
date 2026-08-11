# Proje Yol Haritası (MVP)

## Faz 1: Altyapı ve Veritabanı ✅ TAMAMLANDI

- [x] Supabase SQL tablolarının oluşturulması (rooms, guests, reservations, profiles, folios, transactions, reservation_guests, daily_reports).
- [x] PostgreSQL kısıtlamalarının (Overbooking engeli) test edilmesi.
- [x] TypeScript tiplerinin (`database.types.ts`) `npx supabase gen types typescript --project-id swmdrxnerzvyhudmdsrv` ile projeye çekilmesi.

---

## Faz 2: Frontend İskeleti ✅ TAMAMLANDI

- [x] Vite/React + Tailwind CSS v4 + Oxlint kurulumu (Hera City Hotel teması: `gold-*` renk paleti, `dark-950` sidebar, Cinzel başlık fontu).
- [x] Supabase Auth ile resepsiyonist giriş (Login) ekranı.
- [x] React Router v7 ile yönlendirme: `ProtectedRoute` + `AppLayout` (Sidebar + Outlet pattern).
- [x] Sidebar: daraltılabilir (collapsed), kullanıcı bilgisi, Çıkış Yap butonu.

---

## Faz 3: Gelişmiş Konaklama ve Finans Modülleri ✅ TAMAMLANDI

- [x] **Oda Yönetimi (`Rooms.tsx`):** Oda listeleme, yeni oda ekleme (tip, yatak konfigürasyonu), oda düzenleme, güvenlik kontrollü silme (bağlı rezervasyon varsa engelleme).
- [x] **Misafir Yönetimi (`Guests.tsx`):** Misafir listeleme, yeni misafir ekleme modalı, misafir arama.
- [x] **Rezervasyon Yönetimi (`Reservations.tsx`):** Tüm rezervasyonların listelenmesi ve filtrelenmesi.
- [x] **Çoklu Misafir Altyapısı:** `reservation_guests` tablosu ile bir odaya birden fazla misafir ekleme (ana misafir + refakatçiler).
- [x] **Gelişmiş Check-in Formu (`CheckIn.tsx`):** Ana misafir seçimi, akıllı misafir arama (autocomplete), refakatçi ekleme, oda ve tarih seçimi, toplam fiyat girişi. **NOT:** Check-in sırasında folyoya `ROOM_CHARGE` basılmaz (bkz. Gece Bazlı Tahakkuk kararı).
- [x] **Folyo ve Detay Yönetimi (`ReservationDetail.tsx`):** `folios` + `transactions` tablosuyla birleşik "Detay Görüntüle" profil ekranı. Misafir bilgileri, rezervasyon detayları, folyo hareketleri tek ekranda.
- [x] **Folio İşlemleri (`Folio.tsx`):** Nakit/Kredi Kartı/EFT/Cari tahsilat girişi, ek ücret (EXTRA) ekleme, "Tarih Değiştir" modalı (dinamik yeniden fiyatlandırma ile erken çıkış / uzatma), check-out protokolü (bakiyesiz çıkış zorunluluğu).
- [x] **Check-Out Protokolü:** Bakiyesiz (sıfır bakiye) odaların çıkışının yapılması, folyonun kapatılması, oda durumunun `DIRTY` olarak güncellenmesi.
- [x] **Cari Hesaplar (`CityLedger.tsx`):** Cari hesap (CITY_LEDGER) ödemelerinin yönetimi.
- [x] **Hareketler (`Transactions.tsx`):** Tüm finansal transaction'ların listelenmesi ve filtrelenmesi.

---

## Faz 3.5: Resepsiyon Panosu ✅ TAMAMLANDI

- [x] **Dashboard (`Dashboard.tsx`):** Grid tabanlı oda kartları (hk_status, doluluk, misafir adı, bakiye rozeti). HK durumu özeti (Temiz/Kirli/Kontrol). QuickActionModal (Hızlı Check-in, Folyoya Git, Temiz İşaretle).

---

## Faz 4: Gün Sonu (Night Audit) Modülü ✅ TAMAMLANDI

- [x] **Night Audit Sayfası (`NightAudit.tsx`):** Terminal benzeri canlı log ekranı, "Gün Sonunu Başlat" butonu, `isAuditing` state ile kilitleme.
- [x] **Çekirdek Tahakkuk Algoritması (`handleStartAudit`):**
  - Gün bazlı idempotency koruması: `daily_reports` tablosunda aynı tarih varsa çift işlem engellenir.
  - `CHECKED_IN` rezervasyonların `folios` ile birlikte çekilmesi.
  - Folyo bazlı double-post guard: aynı folyo için bugün zaten `ROOM_CHARGE` yazılmışsa atlanır.
  - Gecelik ücret hesaplama: `total_price / gece_sayısı`.
  - Toplu `ROOM_CHARGE` insert (bulk).
  - Günlük ekstra gelir ve tahsilat aggregation.
  - Z-Raporu snapshot'ı: `daily_reports` tablosuna kayıt.
  - Streaming terminal logları ve hata yönetimi.
- [x] **Geçmiş Raporlar:** `daily_reports` tablosundan Z-Raporlarının tablosal gösterimi (Tarih, Satılan Oda, Oda Geliri, Ekstra Gelir, Toplam Tahsilat).
- [x] **Navigasyon:** Sol menüye "Gün Sonu" sekmesi eklendi (`/night-audit`).

---

## Faz 5: AI ve RAG Katmanı 🔜 BEKLIYOR

- [ ] NestJS (TypeScript) backend iskeletinin kurulması.
- [ ] DeepSeek V4 Flash ile Misafir Mesajı Triyajı entegrasyonu.
- [ ] Vardiya devir özeti NLP modülünün geliştirilmesi ve testleri.
- [ ] Ayrı Python mikroservisi olarak RAG altyapısının konumlandırılması.
