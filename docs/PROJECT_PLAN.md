# Proje Yol Haritası (MVP)

## Faz 1: Altyapı ve Veritabanı (Tamamlandı)

- [x] Supabase SQL tablolarının oluşturulması (Room, Guest, Reservation, Profiles).
- [x] PostgreSQL kısıtlamalarının (Overbooking engeli) test edilmesi.
- [x] TypeScript tiplerinin (`database.types.ts`) projeye çekilmesi.

## Faz 2: Frontend İskeleti (Şu an buradayız)

- [x] Vite/React + Tailwind + Oxlint kurulumunun tamamlanması (Hera City Hotel teması ve Cinzel fontu uygulandı).
- [ ] Supabase Auth ile basit resepsiyonist giriş (Login) ekranı.
- [ ] Yönlendirme (React Router) yapısının kurulması.

## Faz 3: Temel Operasyonel Modüller

- [ ] Resepsiyon Dashboard (Oda durumları listesi).
- [ ] Günlük Özet Raporu (Ciro girme formu ve grafikler).
- [ ] Housekeeping durum panosu.

## Faz 4: AI ve RAG Katmanı

- [ ] NestJS backend iskeletinin kurulması.
- [ ] DeepSeek V4 Flash ile Misafir Mesajı Triyajı entegrasyonu.
- [ ] Python/FastAPI mikroservisinin RAG için ayağa kaldırılması.
- [ ] Vardiya devir özeti NLP modülünün testleri.
