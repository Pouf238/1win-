-- ============================================================================
-- Assur Chap — Schéma de base de données (PostgreSQL / Supabase)
-- Migration 0001 : types, tables, index
-- ============================================================================

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------- ENUM types
do $$ begin
  create type user_role        as enum ('client', 'agent', 'admin');
  create type vehicle_usage    as enum ('personnel', 'professionnel');
  create type fuel_type        as enum ('essence', 'diesel', 'hybride', 'electrique');
  create type coverage_type    as enum ('tiers', 'tiers_plus', 'tous_risques');
  create type quote_status     as enum ('draft', 'compared', 'selected', 'converted', 'expired');
  create type contract_status  as enum ('pending', 'active', 'expired', 'cancelled');
  create type payment_provider as enum ('cinetpay', 'paydunya', 'orange', 'mtn', 'moov', 'wave', 'visa', 'mastercard');
  create type payment_status   as enum ('pending', 'success', 'failed', 'refunded');
  create type claim_status     as enum ('received', 'reviewing', 'expert_assigned', 'approved', 'rejected', 'paid', 'closed');
  create type referral_status  as enum ('pending', 'joined', 'rewarded');
  create type notif_channel    as enum ('push', 'email', 'sms', 'whatsapp');
exception when duplicate_object then null; end $$;

-- ------------------------------------------------------------------- USERS
-- Profil applicatif, en relation 1-1 avec auth.users (Supabase Auth).
create table if not exists public.users (
  id            uuid primary key references auth.users (id) on delete cascade,
  full_name     text,
  email         text unique,
  phone         text,
  avatar_url    text,
  locale        text not null default 'fr',
  role          user_role not null default 'client',
  referral_code text unique,
  referred_by   uuid references public.users (id) on delete set null,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- ------------------------------------------------------------- ADMIN_USERS
-- Données spécifiques aux administrateurs (permissions fines).
create table if not exists public.admin_users (
  id          uuid primary key references public.users (id) on delete cascade,
  permissions text[] not null default array['contracts','clients','insurers','payments','claims','commissions','stats'],
  created_at  timestamptz not null default now()
);

-- ----------------------------------------------------- INSURANCE_COMPANIES
create table if not exists public.insurance_companies (
  id              uuid primary key default gen_random_uuid(),
  name            text not null,
  slug            text unique not null,
  logo_url        text,
  brand_color     text default '#1F7A8C',
  rating          numeric(2,1) default 4.5,
  claim_days      int default 7,
  commission_rate numeric(4,3) default 0.100,
  description     text,
  -- Intégration API-first (multi-compagnies)
  api_endpoint    text,
  api_config      jsonb not null default '{}'::jsonb,  -- clés/headers chiffrés côté Vault en prod
  is_active       boolean not null default true,
  created_at      timestamptz not null default now()
);

-- ------------------------------------------------------ INSURANCE_PLANS
create table if not exists public.insurance_plans (
  id             uuid primary key default gen_random_uuid(),
  company_id     uuid not null references public.insurance_companies (id) on delete cascade,
  code           coverage_type not null,
  name           text not null,
  guarantees     jsonb not null default '[]'::jsonb,
  -- Paramètres du moteur de tarification (base, coefficients…)
  rating_config  jsonb not null default '{}'::jsonb,
  franchise_rule jsonb not null default '{}'::jsonb,
  price_multiplier numeric(4,2) not null default 1.00,
  is_active      boolean not null default true,
  created_at     timestamptz not null default now(),
  unique (company_id, code)
);

-- --------------------------------------------------------------- VEHICLES
create table if not exists public.vehicles (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null references public.users (id) on delete cascade,
  brand             text not null,
  model             text not null,
  year              int  not null check (year between 1950 and extract(year from now())::int + 1),
  plate             text not null,
  vin               text,
  fiscal_power      int  not null check (fiscal_power between 1 and 60),
  fuel              fuel_type not null default 'essence',
  value             numeric(12,0) not null check (value >= 0),
  usage             vehicle_usage not null default 'personnel',
  registration_doc_url text,    -- carte grise (Storage)
  ocr_data          jsonb,      -- données extraites par l'OCR/IA
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);
create index if not exists idx_vehicles_user on public.vehicles (user_id);

-- ----------------------------------------------------------------- QUOTES
create table if not exists public.quotes (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references public.users (id) on delete cascade,
  vehicle_id    uuid not null references public.vehicles (id) on delete cascade,
  coverage      coverage_type not null,
  duration_months int not null check (duration_months in (1,3,6,12)),
  offers        jsonb not null default '[]'::jsonb,  -- snapshot du comparateur multi-assureurs
  selected_company_id uuid references public.insurance_companies (id),
  premium       numeric(12,0),
  status        quote_status not null default 'draft',
  created_at    timestamptz not null default now(),
  expires_at    timestamptz not null default now() + interval '7 days'
);
create index if not exists idx_quotes_user on public.quotes (user_id);

-- -------------------------------------------------------------- CONTRACTS
create table if not exists public.contracts (
  id              uuid primary key default gen_random_uuid(),
  contract_number text unique not null default 'AC-' || to_char(now(),'YYYY') || '-' || lpad((floor(random()*900000)+100000)::text, 6, '0'),
  user_id         uuid not null references public.users (id) on delete cascade,
  vehicle_id      uuid not null references public.vehicles (id) on delete restrict,
  company_id      uuid not null references public.insurance_companies (id),
  plan_id         uuid references public.insurance_plans (id),
  quote_id        uuid references public.quotes (id),
  coverage        coverage_type not null,
  coverage_name   text,
  premium         numeric(12,0) not null,
  franchise       numeric(12,0) not null default 0,
  duration_months int not null,
  start_date      date not null default current_date,
  end_date        date not null,
  status          contract_status not null default 'pending',
  verify_token    text not null default upper(substr(encode(gen_random_bytes(6),'hex'),1,8)),
  pdf_url         text,
  -- référence du contrat côté API assureur (multi-compagnies)
  insurer_policy_ref text,
  signed_at       timestamptz,
  created_at      timestamptz not null default now()
);
create index if not exists idx_contracts_user on public.contracts (user_id);
create index if not exists idx_contracts_number on public.contracts (contract_number);
create index if not exists idx_contracts_status_end on public.contracts (status, end_date);

-- --------------------------------------------------------------- PAYMENTS
create table if not exists public.payments (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references public.users (id) on delete cascade,
  quote_id        uuid references public.quotes (id),
  contract_id     uuid references public.contracts (id) on delete set null,
  provider        payment_provider not null,
  method          text,
  amount          numeric(12,0) not null,
  currency        text not null default 'XOF',
  transaction_id  text,                 -- référence prestataire (CinetPay/PayDunya)
  status          payment_status not null default 'pending',
  raw_payload     jsonb,                -- réponse/webhook brut du prestataire
  created_at      timestamptz not null default now(),
  paid_at         timestamptz
);
create index if not exists idx_payments_user on public.payments (user_id);
create index if not exists idx_payments_tx on public.payments (transaction_id);

-- ----------------------------------------------------------------- CLAIMS
create table if not exists public.claims (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references public.users (id) on delete cascade,
  contract_id    uuid not null references public.contracts (id) on delete cascade,
  vehicle_id     uuid references public.vehicles (id) on delete set null,
  type           text not null,
  description    text,
  location       text,
  latitude       numeric(9,6),
  longitude      numeric(9,6),
  media_urls     jsonb not null default '[]'::jsonb,  -- photos/vidéos (Storage)
  ai_fraud_score numeric(4,3),                        -- score anti-fraude (0..1)
  status         claim_status not null default 'received',
  updates        jsonb not null default '[]'::jsonb,  -- timeline de suivi
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);
create index if not exists idx_claims_user on public.claims (user_id);

-- -------------------------------------------------------------- REFERRALS
create table if not exists public.referrals (
  id            uuid primary key default gen_random_uuid(),
  referrer_id   uuid not null references public.users (id) on delete cascade,
  referred_id   uuid references public.users (id) on delete set null,
  code          text not null,
  status        referral_status not null default 'pending',
  reward_amount numeric(12,0) not null default 0,
  created_at    timestamptz not null default now()
);
create index if not exists idx_referrals_referrer on public.referrals (referrer_id);

-- ----------------------------------------------------------- NOTIFICATIONS
create table if not exists public.notifications (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.users (id) on delete cascade,
  title      text not null,
  body       text,
  channel    notif_channel not null default 'push',
  category   text,
  icon       text default 'bell',
  data       jsonb not null default '{}'::jsonb,
  read       boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists idx_notifications_user on public.notifications (user_id, read);
