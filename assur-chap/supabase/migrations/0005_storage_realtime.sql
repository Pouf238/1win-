-- ============================================================================
-- Assur Chap — Migration 0005 : Storage (buckets + policies) & Realtime
-- Requis par l'app Next.js : upload carte grise / médias de sinistre, et
-- mises à jour en direct (notifications, sinistres, contrats, paiements).
-- ============================================================================

-- ---------------------------------------------------------------- BUCKETS
-- Buckets privés ; l'accès est restreint au préfixe = auth.uid()/...
insert into storage.buckets (id, name, public)
values ('documents', 'documents', false),
       ('claims',    'claims',    false),
       ('contracts', 'contracts', false)
on conflict (id) do nothing;

-- ---------------------------------------------------- STORAGE POLICIES
-- Le propriétaire accède à SES fichiers (1er segment du chemin = son uid).
drop policy if exists "own_files_rw" on storage.objects;
create policy "own_files_rw" on storage.objects for all to authenticated
  using (
    bucket_id in ('documents', 'claims', 'contracts')
    and (storage.foldername(name))[1] = auth.uid()::text
  )
  with check (
    bucket_id in ('documents', 'claims', 'contracts')
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- Les admins peuvent lire tous les fichiers (supervision sinistres / contrats).
drop policy if exists "admin_files_read" on storage.objects;
create policy "admin_files_read" on storage.objects for select to authenticated
  using (bucket_id in ('documents', 'claims', 'contracts') and public.is_admin());

-- ---------------------------------------------------------------- REALTIME
-- Ajoute les tables à la publication supabase_realtime (idempotent).
do $$
declare t text;
begin
  foreach t in array array['notifications','claims','contracts','payments'] loop
    begin
      execute format('alter publication supabase_realtime add table public.%I', t);
    exception
      when duplicate_object then null;  -- déjà dans la publication
      when undefined_object then null;  -- publication absente (selon config projet)
    end;
  end loop;
end $$;
