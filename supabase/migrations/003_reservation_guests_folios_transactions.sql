-- ============================================================
-- Faz 3 Migration: Çoklu Misafir, Folyo ve İşlem Tabloları
-- Supabase SQL Editor'de çalıştırılacak eksiksiz script
-- ============================================================

-- ────────────────────────────────────────────────────────────
-- 1. ENUM TİPLERİ
-- ────────────────────────────────────────────────────────────

-- Folyo durumu
CREATE TYPE public.folio_status AS ENUM ('OPEN', 'CLOSED', 'SETTLED');

-- İşlem türü
CREATE TYPE public.transaction_type AS ENUM (
  'ROOM_CHARGE',
  'EXTRA',
  'PAYMENT'
);

-- Ödeme yöntemi
CREATE TYPE public.payment_method AS ENUM (
  'CASH',
  'CREDIT_CARD',
  'BANK_TRANSFER',
  'CITY_LEDGER'
);


-- ────────────────────────────────────────────────────────────
-- 2. reservation_guests TABLOSU
--    Bir rezervasyona birden fazla misafir bağlar (M:N).
--    is_primary_guest: Oda sorumlusu olan ana misafiri işaretler.
-- ────────────────────────────────────────────────────────────

CREATE TABLE public.reservation_guests (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reservation_id UUID NOT NULL REFERENCES public.reservations(id) ON DELETE CASCADE,
  guest_id       UUID NOT NULL REFERENCES public.guests(id) ON DELETE CASCADE,
  is_primary_guest BOOLEAN NOT NULL DEFAULT false,
  created_at     TIMESTAMPTZ DEFAULT now(),

  -- Aynı misafir aynı rezervasyona iki kez eklenemez
  CONSTRAINT uq_reservation_guest UNIQUE (reservation_id, guest_id)
);

-- Her rezervasyonda en fazla 1 ana misafir olmasını garanti eden partial unique index
CREATE UNIQUE INDEX idx_one_primary_per_reservation
  ON public.reservation_guests (reservation_id)
  WHERE is_primary_guest = true;

COMMENT ON TABLE  public.reservation_guests IS 'Rezervasyon–Misafir çoka-çok ilişki tablosu';
COMMENT ON COLUMN public.reservation_guests.is_primary_guest IS 'True ise bu misafir rezervasyonun ana (sorumlu) misafiridir';


-- ────────────────────────────────────────────────────────────
-- 3. folios TABLOSU
--    Her rezervasyonun bir "hesap dosyası" (folyo).
-- ────────────────────────────────────────────────────────────

CREATE TABLE public.folios (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reservation_id UUID NOT NULL REFERENCES public.reservations(id) ON DELETE CASCADE,
  status         public.folio_status NOT NULL DEFAULT 'OPEN',
  created_at     TIMESTAMPTZ DEFAULT now(),
  closed_at      TIMESTAMPTZ,

  -- Her rezervasyonun yalnızca bir folyosu olabilir
  CONSTRAINT uq_folio_reservation UNIQUE (reservation_id)
);

COMMENT ON TABLE  public.folios IS 'Rezervasyona bağlı hesap dosyası (folyo)';
COMMENT ON COLUMN public.folios.status IS 'OPEN: aktif, CLOSED: kapatılmış, SETTLED: tamamen tahsil edilmiş';


-- ────────────────────────────────────────────────────────────
-- 4. transactions TABLOSU
--    Folyoya bağlı borç/alacak hareketleri.
--    Borç (ROOM_CHARGE, EXTRA) → pozitif amount
--    Alacak (PAYMENT)          → negatif amount
-- ────────────────────────────────────────────────────────────

CREATE TABLE public.transactions (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  folio_id         UUID NOT NULL REFERENCES public.folios(id) ON DELETE CASCADE,
  transaction_type public.transaction_type NOT NULL,
  description      TEXT,
  amount           NUMERIC(12, 2) NOT NULL CHECK (amount <> 0),
  payment_method   public.payment_method,
  created_at       TIMESTAMPTZ DEFAULT now(),
  created_by       UUID REFERENCES auth.users(id)
);

-- payment_method yalnızca PAYMENT türünde zorunlu olsun
ALTER TABLE public.transactions
  ADD CONSTRAINT chk_payment_method_required
  CHECK (
    (transaction_type = 'PAYMENT' AND payment_method IS NOT NULL)
    OR
    (transaction_type <> 'PAYMENT')
  );

COMMENT ON TABLE  public.transactions IS 'Folyo hareketleri: oda ücreti, ekstra harcama ve tahsilatlar';
COMMENT ON COLUMN public.transactions.amount IS 'Borç hareketleri pozitif, ödeme (alacak) hareketleri negatif tutulur';
COMMENT ON COLUMN public.transactions.payment_method IS 'Yalnızca transaction_type = PAYMENT ise doldurulur';


-- ────────────────────────────────────────────────────────────
-- 5. PERFORMANS İNDEKSLERİ
-- ────────────────────────────────────────────────────────────

CREATE INDEX idx_reservation_guests_reservation ON public.reservation_guests(reservation_id);
CREATE INDEX idx_reservation_guests_guest       ON public.reservation_guests(guest_id);
CREATE INDEX idx_folios_reservation              ON public.folios(reservation_id);
CREATE INDEX idx_transactions_folio              ON public.transactions(folio_id);
CREATE INDEX idx_transactions_type               ON public.transactions(transaction_type);
CREATE INDEX idx_transactions_created_at         ON public.transactions(created_at);


-- ════════════════════════════════════════════════════════════
-- 6. ROW LEVEL SECURITY (RLS)
--    Tüm tablolarda RLS aktif, authenticated kullanıcılar
--    için tam CRUD izni (mevcut tabloların politikasıyla tutarlı).
-- ════════════════════════════════════════════════════════════

-- ── reservation_guests ──────────────────────────────────────

ALTER TABLE public.reservation_guests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view reservation_guests"
  ON public.reservation_guests FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert reservation_guests"
  ON public.reservation_guests FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update reservation_guests"
  ON public.reservation_guests FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete reservation_guests"
  ON public.reservation_guests FOR DELETE
  TO authenticated
  USING (true);


-- ── folios ──────────────────────────────────────────────────

ALTER TABLE public.folios ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view folios"
  ON public.folios FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert folios"
  ON public.folios FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update folios"
  ON public.folios FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete folios"
  ON public.folios FOR DELETE
  TO authenticated
  USING (true);


-- ── transactions ────────────────────────────────────────────

ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view transactions"
  ON public.transactions FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert transactions"
  ON public.transactions FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update transactions"
  ON public.transactions FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete transactions"
  ON public.transactions FOR DELETE
  TO authenticated
  USING (true);


-- ════════════════════════════════════════════════════════════
-- ✅ Migration tamamlandı.
-- Oluşturulan tablolar : reservation_guests, folios, transactions
-- Oluşturulan enum'lar : folio_status, transaction_type, payment_method
-- ════════════════════════════════════════════════════════════
