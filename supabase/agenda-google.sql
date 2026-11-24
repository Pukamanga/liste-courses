-- ============================================================================
-- Synchronisation du planning avec Google Agenda (fonction Supabase « agenda-google »).
--
-- À exécuter une fois dans Supabase → SQL Editor → New query → Run.
-- Ré-exécutable sans risque : rien n'est modifié dans les données de l'application.
--
-- Fonctionnement :
--   1. chaque modification d'un jour du planning (ou des horaires des postes) est notée
--      dans agenda.file par un déclencheur sur public.docs ;
--   2. chaque minute, s'il y a du travail, pg_cron appelle la fonction agenda-google ;
--   3. la fonction met à jour l'agenda « Planning travail » de chaque compte connecté.
--
-- Tout est rangé dans un schéma « agenda » qui n'est PAS exposé par l'API : les clés Google
-- ne sont lisibles ni depuis l'application, ni depuis le web. Seule la fonction y accède.
-- ============================================================================

create schema if not exists agenda;
revoke all on schema agenda from public, anon, authenticated;

-- Comptes Google connectés (un par membre)
create table if not exists agenda.comptes (
  email            text primary key,  -- adresse de connexion à l'application (table membres)
  google_email     text,              -- compte Google qui reçoit l'agenda
  refresh_token    text not null,     -- clé longue durée donnée par Google
  calendar_id      text not null,     -- agenda « Planning travail » créé par la fonction
  connecte_le      timestamptz not null default now(),
  derniere_synchro timestamptz,
  erreur           text,
  bloque           boolean not null default false -- il faut reconnecter l'agenda
);

-- Événements déjà envoyés à Google (pour n'envoyer que les changements)
create table if not exists agenda.etat (
  email     text not null references agenda.comptes (email) on delete cascade,
  event_id  text not null,
  date      text not null check (date ~ '^\d{4}-\d{2}-\d{2}$'),
  empreinte text not null,
  primary key (email, event_id)
);
create index if not exists etat_date on agenda.etat (email, date);

-- Jours à revoir : une date « AAAA-MM-JJ », ou « * » pour tout revoir
create sequence if not exists agenda.file_n;
create table if not exists agenda.file (
  cle text primary key,
  n   bigint not null default nextval('agenda.file_n')
);

-- Autorisations Google en cours (le temps d'aller sur la page Google et d'en revenir)
create table if not exists agenda.demandes (
  jeton   text primary key,
  email   text not null,
  retour  text not null,
  cree_le timestamptz not null default now()
);

-- Adresse de la fonction (notée par la fonction elle-même) et verrou contre deux traitements simultanés
create table if not exists agenda.config (
  id           int primary key default 1 check (id = 1),
  url          text,
  verrou_jusqu timestamptz not null default '-infinity',
  verrou_jeton text
);
insert into agenda.config (id) values (1) on conflict do nothing;

alter table agenda.comptes enable row level security;
alter table agenda.etat enable row level security;
alter table agenda.file enable row level security;
alter table agenda.demandes enable row level security;
alter table agenda.config enable row level security;
revoke all on all tables in schema agenda from public, anon, authenticated;
revoke all on all sequences in schema agenda from public, anon, authenticated;

-- Demander une mise à jour
create or replace function agenda.a_revoir(cle text)
returns void
language sql
set search_path = agenda
as $$
  insert into agenda.file (cle) values ($1)
  on conflict on constraint file_pkey do update set n = nextval('agenda.file_n');
$$;

create or replace function agenda.tout_resynchroniser()
returns void
language sql
set search_path = agenda
as $$ select agenda.a_revoir('*'); $$;

-- Déclencheur : un jour modifié → ce jour à revoir ; horaires ou prénoms modifiés → tout revoir
create or replace function agenda.noter_changement()
returns trigger
language plpgsql
security definer
set search_path = agenda, public
as $$
begin
  if new.coll = 'jours' and new.id ~ '^\d{4}-\d{2}-\d{2}$' then
    if tg_op = 'INSERT'
       or (old.data -> 'moi', old.data -> 'julie', old.deleted)
          is distinct from (new.data -> 'moi', new.data -> 'julie', new.deleted) then
      perform agenda.a_revoir(new.id);
    end if;
  elsif new.coll = 'reglages' and new.id = 'regles' then
    if tg_op = 'INSERT'
       or (old.data -> 'postes', old.data -> 'noms', old.deleted)
          is distinct from (new.data -> 'postes', new.data -> 'noms', new.deleted) then
      perform agenda.tout_resynchroniser();
    end if;
  end if;
  return null;
exception when others then
  -- Ne jamais empêcher l'application d'enregistrer
  raise warning 'agenda-google : %', sqlerrm;
  return null;
end;
$$;
revoke all on function agenda.noter_changement() from public, anon, authenticated;

drop trigger if exists agenda_google on public.docs;
create trigger agenda_google
  after insert or update on public.docs
  for each row
  when (new.coll in ('jours', 'reglages'))
  execute function agenda.noter_changement();

-- Tâche planifiée : chaque minute, appelle la fonction s'il y a quelque chose à envoyer.
-- (Extensions pg_cron et pg_net, disponibles sur tous les projets Supabase.)
do $outer$
begin
  if not exists (select 1 from pg_available_extensions where name = 'pg_cron')
     or not exists (select 1 from pg_available_extensions where name = 'pg_net') then
    raise warning 'Extensions pg_cron / pg_net indisponibles : la synchronisation automatique ne tournera pas.';
    return;
  end if;
  create extension if not exists pg_cron;
  create extension if not exists pg_net with schema extensions;
  perform cron.schedule('agenda-google', '* * * * *', $job$
    select net.http_post(
      url := c.url,
      body := '{"action": "traiter"}'::jsonb,
      headers := '{"Content-Type": "application/json"}'::jsonb,
      timeout_milliseconds := 10000
    )
    from agenda.config c
    where c.url is not null
      and exists (select 1 from agenda.file)
      and exists (select 1 from agenda.comptes where not bloque)
  $job$);
end
$outer$;
