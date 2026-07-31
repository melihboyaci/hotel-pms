# Proje Yol Haritası (MVP)

## Faz 1: Altyapı ve Veritabanı (Tamamlandı)

- [x] Supabase SQL tablolarının oluşturulması (Room, Guest, Reservation, Profiles).
- [x] PostgreSQL kısıtlamalarının (Overbooking engeli) test edilmesi.
- [x] TypeScript tiplerinin (`database.types.ts`) projeye çekilmesi.

## Faz 2: Frontend İskeleti (Tamamlandı)

- [x] Vite/React + Tailwind + Oxlint kurulumunun tamamlanması (Hera City Hotel teması ve Cinzel fontu uygulandı).
- [x] Supabase Auth ile basit resepsiyonist giriş (Login) ekranı.
- [x] Yönlendirme (React Router) yapısının kurulması.

## Faz 3: Gelişmiş Konaklama ve Finans Modülleri (Tam Teşekküllü PMS Kapsamı)
- [x] **Çoklu Misafir Altyapısı:** `reservation_guests` tablosu ile bir odaya birden fazla misafir ekleme.
- [x] **Gelişmiş Check-in Formu:** Ana misafir, refakatçiler (akıllı misafir arama / autocomplete) ve oda ücreti borçlandırmasının entegrasyonu (`CheckIn.tsx`).
- [x] **Folyo (Hesap) ve Detay Yönetimi:** `folios` ve `transactions` tablolarıyla birleşik "Detay Görüntüle" profil ekranı (`ReservationDetail.tsx`).
- [x] **Tahsilat ve Kasa:** Nakit, Kredi Kartı, EFT ve Cari tahsilatların sisteme girilmesi ve folyodan düşülmesi.
- [x] **Check-Out Protokolü:** Bakiyesiz (sıfır bakiye) odaların çıkış yapılması, folyonun kapatılması ve oda durumunun kirli (`DIRTY`) olarak güncellenmesi.
- [x] **Dinamik Oda ve Misafir Yönetimi:** Yeni oda/misafir ekleme modalları, yatak konfigürasyonu (`bed_config`), oda düzenleme ve güvenlik kontrollü oda silme (`Rooms.tsx`, `Guests.tsx`).
- [ ] **Z-Raporu (Gece Denetimi):** Manuel veri girişi yerine, gün içindeki tüm tahsilat ve folyo hareketlerinin sistem tarafından otomatik hesaplanıp raporlanması.

## Faz 4: AI ve RAG Katmanı
- [ ] NestJS backend iskeletinin kurulması.
- [ ] DeepSeek V4 Flash ile Misafir Mesajı Triyajı entegrasyonu.
- [ ] Vardiya devir özeti NLP modülünün testleri.
