-- ============================================================================
-- Assur Chap — Migration 0003 : Row Level Security (RLS)
-- Principe : chaque utilisateur n'accède qu'à SES données ; les admins voient tout ;
-- les catalogues assureurs/plans sont en lecture publique.
-- ============================================================================

alter table public.users               enable row level security;
alter table public.admin_users         enable row level security;
alter table public.insurance_companies enable row level security;
alter table public.insurance_plans     enable row level security;
alter table public.vehicles            enable row level security;
alter table public.quotes              enable row level security;
alter table public.contracts           enable row level security;
alter table public.payments            enable row level security;
alter table public.claims              enable row level security;
alter table public.referrals           enable row level security;
alter table public.notifications       enable row level security;

-- ----------------------------------------------------------------- USERS
drop policy if exists users_select_self on public.users;
create policy users_select_self on public.users for select
  using (id = auth.uid() or public.is_admin());
drop policy if exists users_update_self on public.users;
create policy users_update_self on public.users for update
  using (id = auth.uid() or public.is_admin()) with check (id = auth.uid() or public.is_admin());
-- (l'insertion est gérée par le trigger handle_new_user via security definer)

-- ------------------------------------------------------------- ADMIN_USERS
drop policy if exists admin_users_select on public.admin_users;
create policy admin_users_select on public.admin_users for select using (public.is_admin());
drop policy if exists admin_users_all on public.admin_users;
create policy admin_users_all on public.admin_users for all using (public.is_admin()) with check (public.is_admin());

-- ------------------------------------- INSURANCE_COMPANIES / PLANS (read-all)
drop policy if exists companies_read on public.insurance_companies;
create policy companies_read on public.insurance_companies for select
  using (is_active or public.is_admin());
drop policy if exists companies_admin on public.insurance_companies;
create policy companies_admin on public.insurance_companies for all
  using (public.is_admin()) with check (public.is_admin());

drop policy if exists plans_read on public.insurance_plans;
create policy plans_read on public.insurance_plans for select
  using (is_active or public.is_admin());
drop policy if exists plans_admin on public.insurance_plans;
create policy plans_admin on public.insurance_plans for all
  using (public.is_admin()) with check (public.is_admin());

-- ----------------------------------------- Helper macro for owner-scoped tables
-- VEHICLES
drop policy if exists vehicles_owner on public.vehicles;
create policy vehicles_owner on public.vehicles for all
  using (user_id = auth.uid() or public.is_admin())
  with check (user_id = auth.uid());

-- QUOTES
drop policy if exists quotes_owner on public.quotes;
create policy quotes_owner on public.quotes for all
  using (user_id = auth.uid() or public.is_admin())
  with check (user_id = auth.uid());

-- CONTRACTS (insertion serveur via service_role / Edge Function après paiement)
drop policy if exists contracts_select on public.contracts;
create policy contracts_select on public.contracts for select
  using (user_id = auth.uid() or public.is_admin());
drop policy if exists contracts_update_admin on public.contracts;
create policy contracts_update_admin on public.contracts for update
  using (public.is_admin()) with check (public.is_admin());

-- PAYMENTS (création/maj par Edge Function service_role ; client lecture seule)
drop policy if exists payments_select on public.payments;
create policy payments_select on public.payments for select
  using (user_id = auth.uid() or public.is_admin());
drop policy if exists payments_insert_self on public.payments;
create policy payments_insert_self on public.payments for insert
  with check (user_id = auth.uid());

-- CLAIMS
drop policy if exists claims_owner on public.claims;
create policy claims_owner on public.claims for all
  using (user_id = auth.uid() or public.is_admin())
  with check (user_id = auth.uid());

-- REFERRALS
drop policy if exists referrals_select on public.referrals;
create policy referrals_select on public.referrals for select
  using (referrer_id = auth.uid() or referred_id = auth.uid() or public.is_admin());

-- NOTIFICATIONS
drop policy if exists notifications_owner on public.notifications;
create policy notifications_owner on public.notifications for select
  using (user_id = auth.uid() or public.is_admin());
drop policy if exists notifications_update_self on public.notifications;
create policy notifications_update_self on public.notifications for update
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ============================================================================
-- STORAGE buckets (à créer côté dashboard ou via storage API) :
--   documents  (privé)  : cartes grises, permis, pièces d'identité
--   claims     (privé)  : photos/vidéos de sinistres
--   contracts  (privé)  : PDF de contrats signés
-- Policies storage : accès limité au préfixe = auth.uid()/...
-- ============================================================================
-- Exemple de policy storage (à exécuter après création des buckets) :
-- create policy "own files" on storage.objects for all to authenticated
--   using ( bucket_id in ('documents','claims','contracts') and (storage.foldername(name))[1] = auth.uid()::text )
--   with check ( bucket_id in ('documents','claims','contracts') and (storage.foldername(name))[1] = auth.uid()::text );
