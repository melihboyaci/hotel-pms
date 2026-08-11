# STATE.md

_Bu dosya projenin anlık durumunu ve çalışma belleğini tutar. Bir yapay zeka ajanına gönderilecektir._

## Şu Anki Görev (Current Task)

- **Hedef:** Faz 5 — AI ve RAG Katmanı hazırlığı. Sonraki adım NestJS backend iskeleti.
- **Mevcut Durum:** Faz 4 (Night Audit Modülü) tamamen tamamlandı ve `main` dalına push edildi.

## Alınan Kararlar (Değiştirilemez)

- **Backend:** NestJS (TypeScript) — henüz kurulmadı, Faz 5'te başlanacak.
- **Frontend:** React 19 + Vite 8 (mevcut `hotel-pms/` klasöründe).
- **Veritabanı:** Supabase (PostgreSQL). Proje ID: `swmdrxnerzvyhudmdsrv`.
- **LLM:** DeepSeek V4 Flash (Faz 5'te entegre edilecek).
- **RAG:** Ayrı Python mikroservisi olarak konumlandırılacak (Faz 5).
- **Sistem-of-Record:** Check-in/out ve gelir/gider verilerinin ana kaynağı HMS (Otel Yönetim Sistemi) olarak kalacak. Bu uygulama sadece operasyonel yansıma ve özet sunar.
- **Folyo Finansal Kurallar:** Borçlar pozitif (+), tahsilatlar negatif (−) `amount` olarak kaydedilir. `transaction_type`: ROOM_CHARGE \| EXTRA \| PAYMENT. Tahsilatlarda `payment_method` zorunludur.
- **UI Mimarisi:** Sidebar-layout (`App.tsx`) + Outlet pattern. Login hariç tüm sayfalar sidebar ile birlikte render edilir. Folio ve ReservationDetail sayfaları `reservation.id` üzerinden erişilir.
- **Gece Bazlı Tahakkuk (Opsiyon A — KESİN):** Check-in'de folyoya oda ücreti basılmaz. Her gün sonu çalıştırıldığında, `CHECKED_IN` tüm foliyolara o geceye ait tek gecelik ücret `ROOM_CHARGE` olarak eklenir. Gecelik ücret = `total_price / toplam_gece_sayısı`.
- **Supabase Tip Güncelleme Komutu:** `npx supabase gen types typescript --project-id swmdrxnerzvyhudmdsrv > src/types/database.types.ts`

## Tamamlanan Özellikler (Özet)

### Faz 1–2 (Altyapı + İskelet)
- Supabase tablo şeması (8 tablo: rooms, guests, reservations, reservation_guests, profiles, folios, transactions, daily_reports).
- React Router v7 + Supabase Auth + Sidebar layout.

### Faz 3 (Konaklama Modülleri)
- `CheckIn.tsx`: Akıllı misafir arama (autocomplete), çoklu misafir desteği. (**ROOM_CHARGE basılmaz — gece bazlı tahakkuk kararı**).
- `ReservationDetail.tsx`: Rezervasyon + misafirler + folyo birleşik profili.
- `Folio.tsx`: Tahsilat (nakit/kredi/EFT/cari), EXTRA ücret, "Tarih Değiştir" modalı (dinamik fiyatlandırma, erken çıkış/uzatma), bakiyesiz check-out zorunluluğu.
- `Rooms.tsx`, `Guests.tsx`, `Reservations.tsx`, `Transactions.tsx`, `CityLedger.tsx`: CRUD sayfaları.

### Faz 3.5 (Dashboard)
- `Dashboard.tsx`: Oda kartları grid'i, HK durumu özeti, QuickActionModal.

### Faz 4 (Night Audit — TAMAMLANDI)
- `NightAudit.tsx`: Terminal log ekranı + çekirdek algoritma:
  1. `daily_reports` tarih kontrolü (gün bazlı idempotency).
  2. `CHECKED_IN` rezervasyonları + folyo çekimi.
  3. Folyo başına bugünkü `ROOM_CHARGE` kontrolü (çift yazım önleme).
  4. Gecelik ücret hesaplama + bulk insert.
  5. Ekstra gelir + tahsilat aggregation.
  6. `daily_reports` Z-Raporu snapshot kaydı.
- Geçmiş Z-Raporları tablosu (`daily_reports`).

## Bekleyen Sorular / Riskler

- HMS'in özel bir dışa aktarma API'si var mı? (Patron HMS support ile görüşecek).
- HMS günlük rapor ekranından tam olarak hangi veriler çekilebiliyor? (Bir sonraki vardiyada netleşecek).

## Son Git Commit Özeti

```
commit 1c8c761  refactor: Night Audit gece bazli tahakkuk mimarisi,
               Folio tarih degistirme ve font/UI revizyonlari
Değişen dosyalar: App.tsx, index.css, CheckIn.tsx, Dashboard.tsx,
                  Folio.tsx, NightAudit.tsx, ReservationDetail.tsx, STATE.md
Branch: main → origin/main (github.com/melihboyaci/hotel-pms)
```
