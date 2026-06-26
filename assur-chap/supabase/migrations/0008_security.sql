-- ============================================================================
-- Assur Chap — Migration 0008 : durcissement sécurité
-- ============================================================================

-- Les paiements ne doivent être créés QUE par les Edge Functions (service_role,
-- qui contourne la RLS). Un client ne doit jamais insérer une ligne payment
-- (sinon il pourrait fabriquer un paiement "réussi"). On retire l'insert client.
drop policy if exists payments_insert_self on public.payments;

-- (Lecture seule pour le client conservée via payments_select.)

-- Les contrats : déjà non insérables/non modifiables par le client (aucune policy
-- insert ; update réservé à l'admin). Rien à changer.

-- Index utile pour la vérification publique (anti-brute-force = à compléter par du
-- rate-limiting applicatif côté Edge/Reverse-proxy).
create index if not exists idx_contracts_verify on public.contracts (contract_number, verify_token);
