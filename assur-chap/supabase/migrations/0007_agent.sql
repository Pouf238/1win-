-- ============================================================================
-- Assur Chap — Migration 0007 : espace Agent / Courtier (RPC sécurisée)
-- Un agent voit le portefeuille de ses filleuls (clients parrainés), ses ventes
-- et ses commissions, sans exposer les contrats via RLS.
-- ============================================================================

create or replace function public.agent_stats()
returns jsonb
language sql stable security definer set search_path = public as $$
  with me as (select auth.uid() as id),
  referred as (
    select u.id, u.full_name, u.email, u.created_at
    from public.users u, me
    where u.referred_by = me.id
  ),
  sales as (
    select c.id, c.premium, c.company_id, c.created_at, c.coverage_name, c.user_id
    from public.contracts c
    where c.user_id in (select id from referred) and c.status in ('active', 'expired')
  )
  select jsonb_build_object(
    'referral_code', (select referral_code from public.users, me where public.users.id = me.id),
    'clients', coalesce((select count(*) from referred), 0),
    'sales', coalesce((select count(*) from sales), 0),
    'revenue', coalesce((select sum(premium) from sales), 0),
    'commission', coalesce((
      select sum(s.premium * coalesce(ic.commission_rate, 0.10))
      from sales s left join public.insurance_companies ic on ic.id = s.company_id
    ), 0),
    'clients_list', coalesce((
      select jsonb_agg(jsonb_build_object('name', full_name, 'email', email, 'joined_at', created_at) order by created_at desc)
      from referred
    ), '[]'::jsonb)
  )
  where exists (select 1 from public.users, me where public.users.id = me.id and public.users.role in ('agent', 'admin'));
$$;

grant execute on function public.agent_stats() to authenticated;
