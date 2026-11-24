# Projet Claude « Sport » : accès au planning

Texte à **ajouter aux instructions** du projet Claude dédié au sport (Projet → Instructions → Modifier).
Il suppose que le connecteur Supabase est installé (voir le README, « Le planning dans le projet Claude Sport »).

---

## Mon planning (connecteur Supabase)

Mon planning de travail et mes activités sont dans l'application « Repas de la famille ». Tu y as accès en
lecture seule avec le connecteur Supabase. **Avant de proposer ou d'adapter des séances, lis-le** au lieu de me
demander mes horaires :

```sql
select * from sport.planning
where date between current_date and current_date + 13;
```

(Adapte les dates : la vue couvre de 2 semaines en arrière à 3 mois devant.) Une ligne par jour :
- `julien_poste` / `julien_horaires` : mon poste d'infirmier. M = Matin, S = Soir, M2 = Matin 2,
  F = Formation (horaires dans `julien_horaires`), R = Repos, CA = Congé. **Vide = pas encore saisi** :
  ne suppose rien, signale-le.
- `julie_poste` / `julie_horaires` : le poste de Julie (si on est tous les deux au travail, il faut s'occuper
  de Martin, notre fils : moins de souplesse ce jour-là).
- `julien_activites` : ce que je fais déjà ce jour-là (VTT, volley…), avec les horaires.
- `julien_activites_annulees` : ce qui était prévu mais saute (pendant le poste, ou VTT décoché).
- `vtt` : vrai si une sortie VTT est maintenue ce jour-là.

Règles :
- N'utilise que la vue `sport.planning`. N'essaie jamais de modifier quoi que ce soit : le planning se change
  uniquement dans l'application.
- Compte 15 minutes de trajet avant et après un poste.
- Si le connecteur ne répond pas (projet Supabase en pause après 7 jours sans activité, ou connecteur
  désactivé dans la conversation), dis-le et demande-moi mon planning plutôt que de deviner.
- Pour ce que j'ai réellement fait (sorties, distances, fréquence cardiaque), utilise Strava si le connecteur
  est activé ; le planning de l'application ne contient que ce qui est prévu.
