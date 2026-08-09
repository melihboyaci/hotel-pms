# STATE.md

_Bu dosya projenin anlık durumunu ve çalışma belleğini tutar._

## Şu Anki Görev (Current Task)

- **Hedef:** Faz 4.2 (Gün Sonu - Canlı Log Terminali ve Geçmiş Raporlar UI).
- **Detay:** `NightAudit.tsx` sayfasına terminal benzeri bir log ekranı ve geçmiş gün sonlarını gösteren bir tablo eklenecek.
- **Kritik:** Şimdilik asıl tahakkuk algoritması (Supabase insert vb.) yazılmayacak. Sadece UI (Arayüz) state'leri (`logs`, `isAuditing`) ve geçmiş raporları (`daily_reports`) çeken iskelet kurulacak.

## Alınan Kararlar (Değiştirilemez)

- **Backend:** NestJS (TypeScript).
- **Frontend:** React + Vite.
- **Veritabanı:** Supabase (PostgreSQL - SQLite fikrinden vazgeçildi).
- **LLM:** DeepSeek V4 Flash.
- **RAG:** Ayrı Python mikroservisi olarak konumlandırılacak.
- **Sistem-of-Record:** Check-in/out ve gelir/gider verilerinin ana kaynağı HMS olarak kalacak. Bu sistem sadece operasyonel yansıma ve özet sunacak.
- **Folyo Finansal Kurallar:** Borçlar pozitif (+), tahsilatlar negatif (−) amount olarak kaydedilir. transaction_type: ROOM_CHARGE | EXTRA | PAYMENT. Tahsilatlarda payment_method zorunludur.
- **UI Mimarisi:** Sidebar-layout (App.tsx) + Outlet pattern. Login hariç tüm sayfalar sidebar ile birlikte render edilir. Tekil Rezervasyon ve Folyo profili `ReservationDetail.tsx` (Detay Görüntüle) üzerinde birleştirilmiştir.

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
