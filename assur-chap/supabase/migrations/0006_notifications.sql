-- ============================================================================
-- Assur Chap — Migration 0006 : préférences de notification & triggers sinistres
-- ============================================================================

-- ------------------------------------------------ Préférences par canal
alter table public.users
  add column if not exists notify_whatsapp boolean not null default true,
  add column if not exists notify_email    boolean not null default true,
  add column if not exists notify_sms       boolean not null default false,
  add column if not exists notify_push      boolean not null default true;

-- ------------------------------------------------ Notifications de sinistre (in-app)
-- À la déclaration et à chaque changement de statut, on crée une notification.
create or replace function public.notify_claim_change()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if (TG_OP = 'INSERT') then
    insert into public.notifications (user_id, title, body, icon, category, data)
    values (new.user_id, 'Sinistre déclaré',
            'Votre dossier de sinistre a bien été enregistré.', 'warning', 'claim_created',
            jsonb_build_object('claimId', new.id));
  elsif (TG_OP = 'UPDATE' and new.status is distinct from old.status) then
    insert into public.notifications (user_id, title, body, icon, category, data)
    values (new.user_id, 'Sinistre mis à jour',
            'Statut : ' || new.status || '.', 'warning', 'claim_update',
            jsonb_build_object('claimId', new.id, 'status', new.status));
  end if;
  return new;
end $$;

drop trigger if exists trg_claim_notify_ins on public.claims;
create trigger trg_claim_notify_ins after insert on public.claims
  for each row execute function public.notify_claim_change();

drop trigger if exists trg_claim_notify_upd on public.claims;
create trigger trg_claim_notify_upd after update on public.claims
  for each row execute function public.notify_claim_change();

-- ------------------------------------------------ Rappels d'expiration (in-app, fiable)
-- Crée des rappels in-app aux seuils 30/15/7/1 jours, sans doublon.
-- Le multicanal (WhatsApp/email) est géré par l'Edge Function expiry-reminders.
create or replace function public.notify_expiring()
returns int language plpgsql security definer set search_path = public as $$
declare r record; thr int; cat text; n int := 0;
begin
  for r in
    select id, user_id, contract_number, (end_date - current_date) as days
    from public.contracts
    where status = 'active' and end_date >= current_date and end_date <= current_date + 30
  loop
    thr := case when r.days <= 1 then 1 when r.days <= 7 then 7 when r.days <= 15 then 15 else 30 end;
    cat := 'expiring_' || thr;
    if not exists (
      select 1 from public.notifications
      where user_id = r.user_id and category = cat and (data->>'contractId') = r.id::text
    ) then
      insert into public.notifications (user_id, title, body, icon, category, data)
      values (r.user_id, 'Contrat bientôt expiré',
              'Votre contrat ' || r.contract_number || ' expire dans ' || r.days || ' jours.',
              'clock', cat, jsonb_build_object('contractId', r.id, 'days', r.days));
      n := n + 1;
    end if;
  end loop;
  return n;
end $$;

-- Planification recommandée : l'Edge Function `expiry-reminders` (in-app + WhatsApp
-- + email, idempotente) via Supabase Scheduled Functions (cron quotidien).
-- `notify_expiring()` ci-dessus est un repli SQL pur (in-app uniquement) que l'on
-- peut planifier avec pg_cron si l'edge scheduling n'est pas utilisé :
--   select cron.schedule('assurchap-expiry','0 8 * * *','select public.notify_expiring()');
-- (Ne PAS activer les deux en même temps pour éviter les doublons.)
