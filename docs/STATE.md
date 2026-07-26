# STATE.md

_Bu dosya projenin anlık durumunu ve çalışma belleğini tutar._

## Şu Anki Görev (Current Task)

- **Hedef:** Faz 3: Temel Operasyonel Modüller
- **Detay:** Resepsiyon Dashboard'un geliştirilmesi (gerçek verilerin tam bağlanması), Günlük Özet Raporu ve Housekeeping panosunun detaylandırılması.

## Alınan Kararlar (Değiştirilemez)

- **Backend:** NestJS (TypeScript).
- **Frontend:** React + Vite.
- **Veritabanı:** Supabase (PostgreSQL - SQLite fikrinden vazgeçildi).
- **LLM:** DeepSeek V4 Flash.
- **RAG:** Ayrı Python mikroservisi olarak konumlandırılacak.
- **Sistem-of-Record:** Check-in/out ve gelir/gider verilerinin ana kaynağı HMS olarak kalacak. Bu sistem sadece operasyonel yansıma ve özet sunacak.

## Bekleyen Sorular / Riskler

- HMS'in özel bir dışa aktarma API'si var mı? (Patron HMS support ile görüşecek).
- HMS günlük rapor ekranından tam olarak hangi veriler çekilebiliyor? (Bir sonraki vardiyada netleşecek).

## Son Güncelleme

Faz 2 tamamen tamamlandı. React Router kurularak sayfa yönlendirmeleri eklendi. Supabase Auth kullanılarak Hera City Hotel temalı 'Kullanıcı Adı' odaklı (e-posta türeten) Login sayfası oluşturuldu. Oturum kontrolü için ProtectedRoute eklendi. Artık Faz 3 (Operasyonel Modüller) aşamasına geçiliyor.
