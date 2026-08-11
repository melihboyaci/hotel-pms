# STATE.md

_Bu dosya projenin anlık durumunu ve çalışma belleğini tutar._

## Şu Anki Görev (Current Task)

- **Hedef:** Night Audit Mimari Yeniden Tasarım (Opsiyon A: Gece Bazlı Tahakkuk) — TAMAMLANDI.
- **Detay:**
  1. `CheckIn.tsx` — ROOM_CHARGE transaction kaldırıldı. Check-in’de folyo açılır ama oda ücreti basılmaz.
  2. `NightAudit.tsx` — Folyo bazlı double-post guard eklendi (aynı gün için çift yazım önlenir).
  3. `Dashboard.tsx` — Ölü NightAuditModal, NightAuditToast, state’ler ve buton temizlendi.
- **Sonraki Adım:** Test ve doğrulama.

## Alınan Kararlar (Değiştirilemez)

- **Backend:** NestJS (TypeScript).
- **Frontend:** React + Vite.
- **Veritabanı:** Supabase (PostgreSQL - SQLite fikrinden vazgeçildi).
- **LLM:** DeepSeek V4 Flash.
- **RAG:** Ayrı Python mikroservisi olarak konumlandırılacak.
- **Sistem-of-Record:** Check-in/out ve gelir/gider verilerinin ana kaynağı HMS olarak kalacak. Bu sistem sadece operasyonel yansıma ve özet sunacak.
- **Folyo Finansal Kurallar:** Borçlar pozitif (+), tahsilatlar negatif (−) amount olarak kaydedilir. transaction_type: ROOM_CHARGE | EXTRA | PAYMENT. Tahsilatlarda payment_method zorunludur.
- **UI Mimarisi:** Sidebar-layout (App.tsx) + Outlet pattern. Login hariç tüm sayfalar sidebar ile birlikte render edilir. Tekil Rezervasyon ve Folyo profili `ReservationDetail.tsx` (Detay Görüntüle) üzerinde birleştirilmiştir.
- **Gece Bazlı Tahakkuk (Opsiyon A):** Check-in’de folyoya oda ücreti basılmaz. Her gün sonu (Night Audit) çalıştığında, `CHECKED_IN` odaların folyolarına o geceye ait tek gecelik ücret `ROOM_CHARGE` olarak eklenir. Gecelik ücret = `total_price / toplam_gece_sayısı`.

## Bekleyen Sorular / Riskler

- HMS'in özel bir dışa aktarma API'si var mı? (Patron HMS support ile görüşecek).
- HMS günlük rapor ekranından tam olarak hangi veriler çekilebiliyor? (Bir sonraki vardiyada netleşecek).

## Son Güncelleme

- `ReservationDetail.tsx` ekranında "Detay Görüntüle" (Rezervasyon & Folyo birleşik profili) tamamlandı.
- Header kısmına "Oda Check-out" butonu ve bakiye validasyonu eklendi.
- `CheckIn.tsx` formuna Akıllı Misafir Arama (Autocomplete) bileşeni entegre edildi.
- `Guests.tsx` sayfasına "Yeni Misafir" ekleme modalı eklendi.
- `Folio.tsx` ekranına "Check-Out Yap" butonu, bakiyeli çıkış güvenlik engeli (toast hata), Supabase statü güncellemeleri (`CHECKED_OUT` ve `DIRTY`) ve Cari Hesap desteği eklendi.
- Supabase TypeScript veri tipleri (`database.types.ts`), `swmdrxnerzvyhudmdsrv` proje ID'si kullanılarak (`npx supabase gen types typescript --project-id ...`) başarıyla güncellendi ve derleme doğrulandı.
- `Dashboard.tsx` panosuna Gün Sonu (Night Audit) butonu, onay modalı, idempotency kontrolü ve toplu (bulk) ROOM_CHARGE tahakkuk mantığı entegre edildi.
- `src/pages/NightAudit.tsx` sayfası (Gün Sonu İşlemleri) boş iskelet olarak oluşturuldu, `App.tsx` üzerinden yönlendirmesi yapıldı ve sol menüye eklendi.
- `NightAudit.tsx` sayfasına canlı log terminali (monospace/koyu tema), 'Gün Sonunu Başlat' butonu, `isAuditing`/`logs` state yönetimi ve `daily_reports` tablosundan geçmiş Z-Raporları çeken DataGrid eklendi.
- `NightAudit.tsx` — Çekirdek gün sonu algoritması (`handleStartAudit`) bağlandı: idempotency kontrolü (`daily_reports` tarih çakışması), `CHECKED_IN` odaların folyo/room ilişkili taranması, gecelik ücret hesaplama (`total_price / gece sayısı`) ve `ROOM_CHARGE` bulk insert, günlük ekstra gelir/tahsilat aggregation, Z-Raporu (`daily_reports`) snapshot kaydı, streaming terminal logları ve hata yönetimi.
- `index.css` font ayarları revize edildi (varsayılan Inter/sans-serif, rakamlar için `tabular-nums` ve spesifik class'lara Cinzel) ve `Folio.tsx`'e dinamik fiyat güncelleyen "Tarih Değiştir" modalı ile erken çıkış/uzatma özellikleri eklendi.
- **Night Audit Mimari Yeniden Tasarım:** `CheckIn.tsx`'den ROOM_CHARGE kaldırıldı (gece bazlı tahakkuk). `NightAudit.tsx`'e folio bazlı double-post guard eklendi. `Dashboard.tsx`'den ölü NightAuditModal/Toast kodu (~250 satır) temizlendi.
