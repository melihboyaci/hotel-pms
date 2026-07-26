# Sistem Mimarisi

## Dizin Yapısı (Frontend - React/Vite)
- `src/lib/`: Dış servis bağlantıları (Supabase istemcisi vb.)
- `src/types/`: SADECE veritabanından üretilen `database.types.ts` ve DTO'lar.
- `src/components/`: Yeniden kullanılabilir arayüz bileşenleri (UI).
- `src/pages/`: Yönlendirme (Router) ile bağlanan ana ekranlar.
- `src/hooks/`: Supabase veri çekme mantığını barındıran custom hook'lar.

## Mimari Kurallar
- Supabase sorguları doğrudan component içine değil, ayrılmış fonksiyonlara yazılacak.
- Veri tipleri manuel uydurulmayacak, her zaman `Database['public']['Tables'][...]` üzerinden referans alınacak.