# STATE.md

_Bu dosya projenin anlık durumunu ve çalışma belleğini tutar._

## Şu Anki Görev (Current Task)

- **Durum:** Faz 3.1 tamamlandı.
- **Son Yapılanlar:** `Rooms.tsx` sayfasına yapısal yatak konfigürasyonu (`bed_config`) ve güvenlik kontrollü oda silme özelliği eklendi. Supabase DB ve Types güncellendi.

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
- `Rooms.tsx` sayfasına "Yeni Oda Ekle", "Oda Düzenle", yatak konfigürasyonu (`bed_config`) ve güvenlik kontrollü oda silme özellikleri eklendi.
- Supabase veri tipleri (`database.types.ts`) güncellendi.
