-- ============================================================================
-- Assur Chap — Migration 0004 : seed des compagnies & formules d'assurance
-- ============================================================================

insert into public.insurance_companies (name, slug, brand_color, rating, claim_days, commission_rate, description)
values
  ('NSIA Assurances',   'nsia',    '#1F7A8C', 4.6, 7,  0.100, 'Leader de la bancassurance en Afrique de l''Ouest.'),
  ('SUNU Assurances',   'sunu',    '#2d72b8', 4.4, 9,  0.092, 'Couverture panafricaine, bon rapport qualité-prix.'),
  ('Saham Assurance',   'saham',   '#7c4dff', 4.5, 6,  0.108, 'Service premium et indemnisation rapide.'),
  ('AXA Afrique',       'axa',     '#00008f', 4.7, 5,  0.120, 'Réseau international, garanties les plus complètes.'),
  ('Allianz Africa',    'allianz', '#003781', 4.3, 8,  0.097, 'Solidité financière et assistance étendue.'),
  ('Sanlam Assurances', 'sanlam',  '#1f9d6b', 4.2, 10, 0.088, 'Tarifs accessibles, idéal pour petits budgets.')
on conflict (slug) do nothing;

-- Formules par compagnie. Le moteur de tarification (front + Edge Function)
-- lit price_multiplier (positionnement prix) + rating_config (coefficients).
do $$
declare comp record;
begin
  for comp in select id, slug from public.insurance_companies loop
    insert into public.insurance_plans (company_id, code, name, guarantees, price_multiplier, franchise_rule, rating_config)
    values
      (comp.id, 'tiers', 'Responsabilité Civile (Tiers)',
        '["Responsabilité civile","Défense & recours","Assistance de base"]'::jsonb,
        case comp.slug when 'axa' then 1.20 when 'saham' then 1.08 when 'nsia' then 1.00 when 'allianz' then 0.97 when 'sunu' then 0.92 else 0.88 end,
        '{"type":"fixed","amount":0}'::jsonb,
        '{"rc_base":28000,"rc_per_power":3600}'::jsonb),
      (comp.id, 'tiers_plus', 'Tiers Étendu',
        '["Responsabilité civile","Vol & incendie","Bris de glace","Défense & recours","Assistance 24/7"]'::jsonb,
        case comp.slug when 'axa' then 1.20 when 'saham' then 1.08 when 'nsia' then 1.00 when 'allianz' then 0.97 when 'sunu' then 0.92 else 0.88 end,
        '{"type":"fixed","amount":50000}'::jsonb,
        '{"rc_mult":1.85,"value_rate":0.0055}'::jsonb),
      (comp.id, 'tous_risques', 'Tous Risques',
        '["Responsabilité civile","Dommages tous accidents","Vol & incendie","Bris de glace","Catastrophes naturelles","Assistance 0 km","Véhicule de remplacement"]'::jsonb,
        case comp.slug when 'axa' then 1.20 when 'saham' then 1.08 when 'nsia' then 1.00 when 'allianz' then 0.97 when 'sunu' then 0.92 else 0.88 end,
        '{"type":"percent_value","rate":0.01,"min":75000}'::jsonb,
        '{"rc_mult":1.25,"value_rate":0.042}'::jsonb)
    on conflict (company_id, code) do nothing;
  end loop;
end $$;
