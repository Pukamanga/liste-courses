-- ============================================================================
-- Vue « planning sport » : le planning de l'application, lisible par Claude
-- (projet Claude « Sport », connecteur Supabase en lecture seule).
--
-- À exécuter une fois dans Supabase → SQL Editor → New query → Run.
-- Ré-exécutable sans risque : rien n'est modifié dans les données de l'application.
--
-- La vue est rangée dans un schéma « sport » qui n'est PAS exposé par l'API de
-- l'application : elle n'est lisible ni depuis le web, ni par les comptes
-- connectés à l'application, seulement depuis le tableau de bord Supabase et
-- par le connecteur Claude.
-- ============================================================================

create schema if not exists sport;
revoke all on schema sport from public, anon, authenticated;

create or replace view sport.planning as
with
-- Règles par défaut de l'application (src/moteur/reglages.js), complétées plus bas
-- par celles modifiées dans l'écran Réglages. Un test vérifie qu'elles restent identiques.
defauts as (
  select
    $postes${
      "M": { "libelle": "Matin", "debut": "06:15", "fin": "14:15" },
      "S": { "libelle": "Soir", "debut": "13:15", "fin": "21:15" },
      "M2": { "libelle": "Matin 2", "debut": "08:30", "fin": "16:30" },
      "F": { "libelle": "Formation", "debut": "09:00", "fin": "17:00" },
      "R": { "libelle": "Repos", "debut": "", "fin": "" },
      "CA": { "libelle": "Congé", "debut": "", "fin": "" }
    }$postes$::jsonb as postes,
    $activites$[
      { "nom": "Volley", "qui": "moi", "jours": [2], "debut": "20:30", "fin": "22:30" },
      { "nom": "Volley", "qui": "moi", "jours": [4], "debut": "20:00", "fin": "22:00" },
      { "nom": "VTT", "qui": "moi", "jours": [2], "debut": "08:30", "fin": "12:00", "mois": [4, 5, 6, 7, 8, 9, 10, 11], "consistant": true }
    ]$activites$::jsonb as activites,
    $vtt${ "nom": "VTT", "qui": "moi", "debut": "08:30", "fin": "12:00", "consistant": true }$vtt$::jsonb as vtt_manuel
),
enregistres as (
  select coalesce(
    (select data from public.docs where coll = 'reglages' and id = 'regles' and not deleted),
    '{}'::jsonb
  ) as d
),
regles as (
  select
    (select jsonb_object_agg(k, coalesce(def.postes -> k, '{}') || coalesce(e.d -> 'postes' -> k, '{}'))
       from jsonb_object_keys(def.postes || coalesce(e.d -> 'postes', '{}')) as k) as postes,
    -- La liste des activités enregistrée remplace entièrement celle par défaut (comme dans l'app)
    coalesce(nullif(e.d -> 'activites', 'null'), def.activites) as activites,
    def.vtt_manuel || coalesce(nullif(e.d -> 'vttManuel', 'null'), '{}') as vtt_manuel
  from defauts def, enregistres e
),
-- De 2 semaines en arrière à 3 mois devant (heure de Paris)
jours as (
  select g::date as date, coalesce(d.data, '{}') as j
  from generate_series(
    (now() at time zone 'Europe/Paris')::date - 14,
    (now() at time zone 'Europe/Paris')::date + 90,
    interval '1 day'
  ) as g
  left join public.docs d
    on d.coll = 'jours' and d.id = to_char(g, 'YYYY-MM-DD') and not d.deleted
),
-- Activités récurrentes de Julien prévues ce jour-là
recurrentes as (
  select jo.date, a
  from jours jo, regles r, jsonb_array_elements(r.activites) as a
  where a ->> 'qui' = 'moi'
    and coalesce(a -> 'jours', '[]') @> to_jsonb(extract(dow from jo.date)::int)
    and (jsonb_typeof(a -> 'mois') is distinct from 'array'
         or a -> 'mois' @> to_jsonb(extract(month from jo.date)::int))
),
-- Plus le VTT ajouté avec la case 🚵 (s'il n'y a pas déjà un VTT ce jour-là)
activites as (
  select * from recurrentes
  union all
  select jo.date, r.vtt_manuel
  from jours jo, regles r
  where jo.j -> 'vtt' = 'true'
    and not exists (
      select 1 from recurrentes x
      where x.date = jo.date and x.a -> 'consistant' = 'true'
    )
),
-- Une activité saute si la case 🚵 est décochée (VTT) ou si elle tombe pendant le poste
evaluees as (
  select
    ac.date,
    ac.a ->> 'nom' as nom,
    ac.a ->> 'debut' as debut,
    ac.a ->> 'fin' as fin,
    ac.a -> 'consistant' = 'true' as consistant,
    case
      when jo.j -> 'vtt' = 'false' and ac.a -> 'consistant' = 'true' then 'décochée'
      when coalesce(p ->> 'debut', '') <> '' and coalesce(p ->> 'fin', '') <> ''
           and ac.a ->> 'debut' < p ->> 'fin' and p ->> 'debut' < ac.a ->> 'fin'
        then 'en poste ' || (jo.j ->> 'moi')
    end as raison
  from activites ac
  join jours jo on jo.date = ac.date
  cross join regles r
  left join lateral (select r.postes -> (jo.j ->> 'moi') as p) as poste on true
)
select
  jo.date,
  (array['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'])
    [extract(dow from jo.date)::int + 1] as jour,
  jo.j ->> 'moi' as julien_poste,
  r.postes -> (jo.j ->> 'moi') ->> 'libelle' as julien_poste_libelle,
  nullif(concat_ws('–',
    nullif(r.postes -> (jo.j ->> 'moi') ->> 'debut', ''),
    nullif(r.postes -> (jo.j ->> 'moi') ->> 'fin', '')), '') as julien_horaires,
  jo.j ->> 'julie' as julie_poste,
  r.postes -> (jo.j ->> 'julie') ->> 'libelle' as julie_poste_libelle,
  nullif(concat_ws('–',
    nullif(r.postes -> (jo.j ->> 'julie') ->> 'debut', ''),
    nullif(r.postes -> (jo.j ->> 'julie') ->> 'fin', '')), '') as julie_horaires,
  (select string_agg(format('%s %s–%s', e.nom, e.debut, e.fin), ', ' order by e.debut)
     from evaluees e where e.date = jo.date and e.raison is null) as julien_activites,
  (select string_agg(format('%s %s–%s (%s)', e.nom, e.debut, e.fin, e.raison), ', ' order by e.debut)
     from evaluees e where e.date = jo.date and e.raison is not null) as julien_activites_annulees,
  coalesce((select bool_or(e.consistant) from evaluees e
             where e.date = jo.date and e.raison is null), false) as vtt
from jours jo, regles r
order by jo.date;

comment on view sport.planning is
  'Planning de Julien (et poste de Julie), un jour par ligne, de J-14 à J+90. '
  'Postes : M Matin, S Soir, M2 Matin 2, F Formation, R Repos, CA Congé ; poste vide = pas encore saisi. '
  'julien_activites : activités maintenues ce jour (VTT, volley…) ; '
  'julien_activites_annulees : prévues mais annulées (case VTT décochée ou pendant le poste). '
  'Lecture seule : le planning se modifie uniquement dans l''application.';

-- Personne d'autre que le propriétaire (et le connecteur, ci-dessous) ne lit la vue
revoke all on sport.planning from public, anon, authenticated;

-- Rôle utilisé par le connecteur Supabase en mode lecture seule (s'il existe)
do $$
begin
  if exists (select 1 from pg_roles where rolname = 'supabase_read_only_user') then
    grant usage on schema sport to supabase_read_only_user;
    grant select on sport.planning to supabase_read_only_user;
  end if;
end $$;
