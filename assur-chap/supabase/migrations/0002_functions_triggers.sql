-- ============================================================================
-- Assur Chap — Migration 0002 : fonctions, triggers, RPC publiques
-- ============================================================================

-- -------------------------------------------------- helper: is_admin()
create or replace function public.is_admin()
returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.users where id = auth.uid() and role = 'admin');
$$;

-- -------------------------------------------------- helper: generate referral code
create or replace function public.gen_referral_code(name text)
returns text language plpgsql as $$
declare base text; code text;
begin
  base := upper(regexp_replace(coalesce(name,'AC'), '[^A-Za-z]', '', 'g'));
  base := rpad(substr(base || 'AC', 1, 3), 3, 'X');
  loop
    code := base || (floor(random()*9000)+1000)::text;
    exit when not exists (select 1 from public.users where referral_code = code);
  end loop;
  return code;
end $$;

-- -------------------------------------------------- updated_at trigger
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at := now(); return new; end $$;

drop trigger if exists trg_users_updated on public.users;
create trigger trg_users_updated before update on public.users
  for each row execute function public.set_updated_at();
drop trigger if exists trg_vehicles_updated on public.vehicles;
create trigger trg_vehicles_updated before update on public.vehicles
  for each row execute function public.set_updated_at();
drop trigger if exists trg_claims_updated on public.claims;
create trigger trg_claims_updated before update on public.claims
  for each row execute function public.set_updated_at();

-- -------------------------------------------------- new auth user -> profile
-- Crée automatiquement le profil public.users + enregistre le parrainage.
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare ref_code text; referrer uuid;
begin
  ref_code := coalesce(new.raw_user_meta_data->>'referral_code', null);
  if ref_code is not null then
    select id into referrer from public.users where referral_code = ref_code;
  end if;

  insert into public.users (id, full_name, email, phone, role, referral_code, referred_by)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email,'@',1)),
    new.email,
    coalesce(new.raw_user_meta_data->>'phone', new.phone),
    coalesce((new.raw_user_meta_data->>'role')::user_role, 'client'),
    public.gen_referral_code(coalesce(new.raw_user_meta_data->>'full_name','AC')),
    referrer
  );

  if referrer is not null then
    insert into public.referrals (referrer_id, referred_id, code, status)
    values (referrer, new.id, ref_code, 'joined');
  end if;

  insert into public.notifications (user_id, title, body, icon, category)
  values (new.id, 'Bienvenue sur Assur Chap', 'Ajoutez un véhicule pour obtenir votre premier devis.', 'shield', 'welcome');

  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- -------------------------------------------------- contract end_date default
create or replace function public.set_contract_dates()
returns trigger language plpgsql as $$
begin
  if new.end_date is null then
    new.end_date := new.start_date + (new.duration_months || ' months')::interval;
  end if;
  return new;
end $$;

drop trigger if exists trg_contract_dates on public.contracts;
create trigger trg_contract_dates before insert on public.contracts
  for each row execute function public.set_contract_dates();

-- -------------------------------------------------- expire contracts (cron)
-- À planifier via pg_cron : select cron.schedule('expire','0 1 * * *','select public.expire_contracts()');
create or replace function public.expire_contracts()
returns void language sql security definer set search_path = public as $$
  update public.contracts set status = 'expired'
  where status = 'active' and end_date < current_date;
$$;

-- -------------------------------------------------- PUBLIC RPC: verify_contract
-- Vérification publique d'un contrat (sans exposer la table via RLS).
create or replace function public.verify_contract(p_number text, p_token text)
returns table (
  valid boolean, contract_number text, insurer text, coverage_name text,
  insured_name text, vehicle text, plate text, start_date date, end_date date, status contract_status
)
language sql stable security definer set search_path = public as $$
  select
    (c.status = 'active' and c.end_date >= current_date) as valid,
    c.contract_number, ic.name as insurer, c.coverage_name,
    u.full_name as insured_name,
    (v.brand || ' ' || v.model || ' (' || v.year || ')') as vehicle,
    v.plate, c.start_date, c.end_date, c.status
  from public.contracts c
  join public.insurance_companies ic on ic.id = c.company_id
  join public.users u on u.id = c.user_id
  join public.vehicles v on v.id = c.vehicle_id
  where c.contract_number = p_number
    and upper(c.verify_token) = upper(p_token);
$$;

grant execute on function public.verify_contract(text, text) to anon, authenticated;

-- -------------------------------------------------- admin stats RPC
create or replace function public.admin_dashboard_stats()
returns jsonb language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'clients',       (select count(*) from public.users where role = 'client'),
    'contracts',     (select count(*) from public.contracts),
    'active',        (select count(*) from public.contracts where status = 'active'),
    'expiring',      (select count(*) from public.contracts where status = 'active' and end_date <= current_date + 30 and end_date >= current_date),
    'claims',        (select count(*) from public.claims),
    'revenue_all',   (select coalesce(sum(amount),0) from public.payments where status = 'success'),
    'revenue_month', (select coalesce(sum(amount),0) from public.payments where status = 'success' and date_trunc('month', paid_at) = date_trunc('month', now())),
    'revenue_day',   (select coalesce(sum(amount),0) from public.payments where status = 'success' and paid_at::date = current_date)
  ) where public.is_admin();
$$;
