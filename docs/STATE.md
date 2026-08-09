# STATE.md

_Bu dosya projenin anlık durumunu ve çalışma belleğini tutar._

## Şu Anki Görev (Current Task)

- **Hedef:** Faz 3.6.1 (Cari Hesaplar - Acente Filtreleme ve Fatura Özeti).
- **Detay:** `src/pages/CityLedger.tsx` sayfasına muhasebe standartlarında gelişmiş filtreleme eklenecek.
- **Kritik:**
  1. Tablonun üstüne "Acente Adına Göre Ara" (Text/Select) ve "Durum" (Açık/Kapalı) filtreleri eklenecek.
  2. Filtrelenen sonuçların toplam tutarını gösteren "Kesilecek Fatura Toplamı" isimli bir özet kartı olacak.
  3. Tabloda acente adı (`folios.reservations.agency_name`) net bir şekilde gösterilecek.

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
- Supabase TypeScript veri tipleri (`database.types.ts`) `npx supabase gen types` ile başarıyla güncellendi ve derleme doğrulandı.
