-- =====================================================================
-- Repas de la famille — schéma Supabase (à exécuter une fois dans
-- Supabase > SQL Editor > New query). Ré-exécutable sans risque.
-- =====================================================================

-- 1. Adresses autorisées (les deux seules personnes qui ont accès aux données)
create table if not exists public.membres (
  email text primary key
);
alter table public.membres enable row level security;
-- Aucune policy : la table est illisible depuis l'application.
revoke all on public.membres from anon, authenticated;

-- >>> REMPLACEZ par vos deux adresses e-mail <<<
insert into public.membres (email) values
  ('moi@example.com'),
  ('julie@example.com')
on conflict do nothing;

-- 2. La personne connectée fait-elle partie des membres ?
create or replace function public.est_membre()
returns boolean
language sql stable security definer
set search_path = public
as $$
  select exists (
    select 1 from public.membres m
    where lower(m.email) = lower(coalesce(auth.jwt() ->> 'email', ''))
  );
$$;
revoke all on function public.est_membre() from public, anon;
grant execute on function public.est_membre() to authenticated;

-- 3. Données de l'application : un « document » JSON par élément
--    (jours du planning, plats, menus, courses, réglages, grands-parents)
create table if not exists public.docs (
  coll       text   not null check (coll in ('jours', 'gp', 'plats', 'menus', 'courses', 'reglages')),
  id         text   not null check (char_length(id) between 1 and 100),
  data       jsonb  not null default '{}'::jsonb check (octet_length(data::text) < 200000),
  updated_at bigint not null,                -- horodatage du téléphone (ms)
  deleted    boolean not null default false, -- suppression « douce » (synchronisable)
  updated_by uuid default auth.uid(),
  primary key (coll, id)
);

alter table public.docs enable row level security;
-- Seuls lecture / ajout / modification sont permis (ni DELETE ni TRUNCATE, ni accès anonyme)
revoke all on public.docs from anon, authenticated;
grant select, insert, update on public.docs to authenticated;

drop policy if exists "membres_lecture" on public.docs;
drop policy if exists "membres_ajout" on public.docs;
drop policy if exists "membres_modif" on public.docs;
create policy "membres_lecture" on public.docs for select to authenticated using (public.est_membre());
create policy "membres_ajout" on public.docs for insert to authenticated with check (public.est_membre());
create policy "membres_modif" on public.docs for update to authenticated
  using (public.est_membre()) with check (public.est_membre());
-- Pas de policy DELETE : rien ne peut être effacé physiquement depuis l'application.

-- 4. « La dernière modification gagne » : une écriture plus ancienne n'écrase jamais une plus récente
create or replace function public.docs_plus_recent()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.updated_at < old.updated_at then
    return null; -- on ignore l'écriture périmée
  end if;
  new.updated_by := auth.uid();
  return new;
end;
$$;

drop trigger if exists docs_plus_recent on public.docs;
create trigger docs_plus_recent
  before update on public.docs
  for each row execute function public.docs_plus_recent();

-- 5. Temps réel (les changements de l'un apparaissent sur le téléphone de l'autre)
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'docs'
  ) then
    alter publication supabase_realtime add table public.docs;
  end if;
end $$;
