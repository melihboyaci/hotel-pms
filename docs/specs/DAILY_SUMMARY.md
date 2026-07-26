# Spec: Günlük Özet Raporu

## Amaç
Patronun tek sayfada görmek istediği: günlük toplam gelir, gider, ciro.

## Veri Kaynağı
- Gelir: HMS'in günlük/gece denetimi rapor ekranından.
- Gider: Excel + HMS karışık.

## Yaklaşım
Her işlemi tekrar girmek YOK (çifte veri girişi riski). Vardiya sonunda sadece birkaç toplam sayı manuel girilir. Sistem bu günlük özetleri biriktirir, kümülatif/aylık görünüm üretir.

## Kabul Kriterleri
- [ ] Vardiya sonunda 3-4 sayı girme formu (30 saniyeden az sürmeli).
- [ ] Tek sayfa dashboard: bugünün toplamı + son 7/30 gün trendi.
- [ ] Girilen veri sonradan güncellenebilir/düzeltilebilir olmalı.

## Test Edilmesi Gereken Riskli Noktalar
- Aynı gün için ikinci kez özet girilirse üzerine mi yazar, hata mı verir? (UPSERT mantığı çalışmalı).
- Negatif veya boş değer girişi veritabanı/form seviyesinde engellenmeli.

## Veri Şeması (Beklenen DTO / Supabase Tablo Yapısı)
Ajan, bu formun backend'ini/veritabanını kurarken şu şemaya sadık kalacaktır:
- `report_date`: DATE (Primary Key veya Unique - aynı güne iki kayıt açılmasını engeller)
- `total_room_revenue`: NUMERIC (Min: 0)
- `total_extra_revenue`: NUMERIC (Min: 0)
- `total_expenses`: NUMERIC (Min: 0)
- `submitted_by`: UUID (O anki vardiyadaki personelin profil ID'si)