# 🍽️ Repas de la famille

Application web (PWA) de planification des repas, pensée pour le téléphone. Elle part de nos plannings
d'infirmiers (postes M, S, M2, F, R, CA), du sport et des activités pour déduire, repas par repas :
qui mange à la maison, à quelle heure, combien de temps on a pour cuisiner, et propose des plats adaptés,
de saison, avec les restes enchaînés. Elle produit aussi la liste de courses de la semaine.

- **Planning** : grille du mois (un bouton par personne qui fait défiler M → S → M2 → F → R → CA), case VTT,
  import d'un planning en JSON, périodes « Grands-parents à la maison ».
- **Semaine** : moments de repas (heure + convives), temps de préparation, étiquettes
  (« Express 15 min », « Prêt à l'avance », « En plusieurs temps », « Jour de cuisine », « VTT », « Grands-parents »),
  proposition automatique, « Autre idée », verrouillage, notes après le repas.
- **Plats** : 54 plats de départ (avec recette Thermomix), majoritairement végétariens et équilibrés (légumes + protéine + féculent), modifiables
  (temps, étiquettes, saisons, protéine principale, ingrédients par personne). La viande n'est proposée que quand
  les grands-parents sont là.
- **Courses** : ingrédients additionnés et regroupés par rayon, cases « déjà à la maison », bouton « Copier » et
  bouton « Copier la liste avec le prompt Claude » pour que Claude remplisse le panier Leclerc Drive.
- **Réglages** : toutes les règles (horaires des postes, heures des repas, temps de cuisine, activités,
  vacances scolaires, portions…).
- Synchronisation en temps réel entre nos deux téléphones (Supabase), utilisable hors connexion.

---

## ✅ Ce que tu dois faire, pas à pas

Compte environ 20 minutes. Toutes les étapes se font depuis un ordinateur, sauf la dernière.

### Étape 0 — Branche principale et visibilité du dépôt

1. **Branche** : le code est sur la branche `ccr-5d67a130-q3jtmq`, qui est aujourd'hui la branche par défaut
   du dépôt. Pour plus de clarté, renomme-la en `main` : sur GitHub, onglet **Code** → bouton des branches →
   **View all branches** → icône ✏️ à côté de la branche → nom `main` → **Rename branch**.
   Le site est publié automatiquement depuis la branche par défaut, quel que soit son nom.
2. **Visibilité** : le dépôt est **privé**. GitHub Pages n'est gratuit que pour les dépôts **publics**.
   Pour un dépôt privé, il faut GitHub Pro (environ 4 $/mois). Deux options :
   - **Rendre le dépôt public** (Settings → General → tout en bas, *Danger Zone* → **Change visibility**).
     C'est sans risque pour vos données : le code ne contient aucun secret, et les données (planning,
     repas) sont dans Supabase, protégées par la connexion et la Row Level Security.
   - Ou prendre GitHub Pro et garder le dépôt privé.

### Étape 1 — Créer le projet Supabase (gratuit)

1. Va sur <https://supabase.com>, crée un compte puis **New project** :
   - nom : `repas-famille` ; région : **West EU (Paris)** ou **Central EU (Frankfurt)** ;
   - un mot de passe de base de données (garde-le, il ne servira pas à l'application).
2. Attends 1 à 2 minutes que le projet soit prêt.

### Étape 2 — Créer la base (script SQL)

1. Ouvre le fichier [`supabase/schema.sql`](supabase/schema.sql) de ce dépôt et copie tout son contenu.
2. Dans Supabase : menu de gauche **SQL Editor** → **New query** → colle le script.
3. **Remplace les deux adresses** `moi@example.com` et `julie@example.com` par vos vraies adresses
   (section « 1. Adresses autorisées »).
4. Clique **Run**. Le message attendu est « Success. No rows returned ».

Le script crée :
- la table `membres` (les deux adresses autorisées, illisible depuis l'application) ;
- la table `docs` (toutes les données), protégée par la Row Level Security : seule une personne connectée
  dont l'e-mail figure dans `membres` peut lire ou écrire, et personne ne peut supprimer ;
- une règle « la dernière modification gagne » et l'activation du temps réel.

> Pour ajouter ou changer une adresse plus tard : **Table Editor** → `membres`.

### Étape 3 — Configurer la connexion par e-mail

Dans Supabase, menu **Authentication** :

1. **Sign In / Providers** (ou **Providers**) : vérifie que **Email** est activé. Puis **désactive
   « Allow new users to sign up »**, pour que personne d'autre ne puisse créer de compte.
2. **Users** → **Add user** → **Create new user** : crée vos deux comptes (ton e-mail puis celui de Julie),
   avec n'importe quel mot de passe et la case **Auto Confirm User** cochée.
   Le mot de passe ne sert à rien : la connexion se fait par e-mail.
3. **URL Configuration** :
   - **Site URL** : `https://pukamanga.github.io/liste-courses/`
   - **Redirect URLs** → **Add URL** : `https://pukamanga.github.io/liste-courses/`
     (et, si tu veux tester en local, `http://localhost:5173/`)
4. **Envoi des e-mails par Gmail (obligatoire).** Sans serveur d'envoi personnel (« SMTP »), Supabase
   bloque la modification des modèles d'e-mail, n'envoie qu'aux membres de l'équipe du projet (donc pas à
   Julie) et pas plus de 2 e-mails par heure. Pour utiliser ton adresse Gmail :
   1. Dans ton compte Google, active la **validation en deux étapes** (Sécurité), puis ouvre
      <https://myaccount.google.com/apppasswords>, crée un mot de passe d'application nommé « Supabase » et
      copie les 16 caractères.
   2. Dans Supabase : **Authentication** → **Emails** → onglet **SMTP Settings** (selon la version, c'est
      dans **Project Settings** → **Authentication**) → active **Enable custom SMTP** et remplis :
      - Sender email : ton adresse Gmail ; Sender name : `Repas de la famille`
      - Host : `smtp.gmail.com` ; Port : `465`
      - Username : ton adresse Gmail ; Password : le mot de passe d'application (sans espaces)

      Puis clique **Save**.
5. **Emails** → **Templates** → **Magic Link** (modifiable une fois le SMTP enregistré) : remplace le
   contenu par celui-ci, qui ajoute un **code à 6 chiffres** (indispensable pour l'app installée sur
   iPhone, voir l'étape 6) :

   ```html
   <h2>Connexion à Repas de la famille</h2>
   <p>Ton code : <strong style="font-size:24px">{{ .Token }}</strong></p>
   <p>Ou touche ce lien : <a href="{{ .ConfirmationURL }}">me connecter</a></p>
   ```

   Clique **Save**.

> ℹ️ Gmail accepte plusieurs centaines d'envois par jour, largement assez pour deux personnes dont la
> session reste ouverte des semaines.

### Étape 4 — Ajouter les secrets dans GitHub

1. Dans Supabase : **Project Settings** (roue dentée) → **Data API** (ou **API**) : copie la **Project URL**
   (`https://xxxx.supabase.co`).
2. **Project Settings** → **API Keys** : copie la clé **publique**, c'est-à-dire la clé `anon` `public` ou
   la clé **publishable** (`sb_publishable_…`).
   ⚠️ **Jamais** la clé `service_role` ni une clé `sb_secret_…`. La construction du site s'arrête toute
   seule si on lui en donne une.
3. Sur GitHub, dans le dépôt : **Settings** → **Secrets and variables** → **Actions** →
   **New repository secret**, deux fois :
   - nom `SUPABASE_URL`, valeur : la Project URL ;
   - nom `SUPABASE_ANON_KEY`, valeur : la clé publique.

> La clé publique est faite pour être visible dans une application web. Ce qui protège les données, ce
> sont la connexion et la Row Level Security.

### Étape 5 — Activer GitHub Pages

1. Sur GitHub : **Settings** → **Pages** → **Build and deployment** → **Source** : **GitHub Actions**.
2. Onglet **Actions** → workflow **Tests et déploiement** → **Run workflow** (ou pousse un commit sur la
   branche par défaut).
3. Après 1 à 2 minutes, l'application est en ligne sur **<https://pukamanga.github.io/liste-courses/>**.

Le workflow lance d'abord les tests unitaires, puis construit le site et le publie. Si les secrets
manquent, le site est quand même publié, mais en « mode local » sans synchronisation (un avertissement
s'affiche dans Actions).

### Étape 6 — Installer l'application sur vos téléphones

**Android (Chrome)**
1. Ouvre `https://pukamanga.github.io/liste-courses/`.
2. Menu ⋮ → **Installer l'application** (ou **Ajouter à l'écran d'accueil**).
3. Ouvre l'app depuis l'écran d'accueil, saisis ton e-mail, puis touche le lien reçu ou tape le code.

**iPhone (Safari obligatoirement)**
1. Ouvre `https://pukamanga.github.io/liste-courses/` dans **Safari**.
2. Bouton **Partager** → **Sur l'écran d'accueil** → **Ajouter**.
3. Ouvre l'app **depuis l'écran d'accueil**, saisis ton e-mail, puis **tape le code à 6 chiffres** reçu.
   Sur iPhone, le lien de l'e-mail s'ouvre dans Safari et non dans l'app installée, d'où le code.

Faites-le chacun sur votre téléphone. Une fois connecté, on reste connecté. L'app marche hors connexion :
les modifications sont envoyées au retour du réseau.

---

## 📝 Utilisation

### Saisir le planning du mois
- Onglet **Planning** : touche la case de chaque personne pour faire défiler M → S → M2 → F → R → CA → vide.
  Un ⚠️ apparaît si vous êtes tous les deux en M ou tous les deux en S hors période grands-parents. C'est
  un avertissement, la saisie n'est pas bloquée.
- Case 🚵 : le VTT du mardi (d'avril à novembre) est automatique. Touche la case pour l'annuler un mardi
  donné, ou pour ajouter du VTT un jour de repos. Une case barrée signifie que le VTT tombe pendant un poste
  et sera donc ignoré.
- **Importer** : colle le JSON produit par Claude, puis **Vérifier** (erreurs, avertissements, jours
  manquants), puis **Valider l'import**.

**Prompt à donner à Claude avec la photo des plannings :**

> Voici nos plannings du mois de novembre 2026 (moi et Julie). Produis uniquement un JSON au format
> `{"mois":"2026-11","jours":{"2026-11-01":{"moi":"M","julie":"S"}, …}}` avec un objet pour chaque jour du mois,
> et uniquement les codes M, S, M2, F, R, CA.

### La semaine
- **Proposer** remplit la semaine. Les repas verrouillés 🔒 et ceux déjà notés sont conservés.
- **🎲 Autre idée** remplace un plat (le plat refusé n'est plus reproposé pour ce repas), **Choisir…**
  permet de prendre un plat précis ou d'indiquer « Pas de repas à prévoir ».
- ♻️ indique des restes. Le plat d'origine affiche « Cuisiner en double : aussi pour … ».
- Après le repas : **👍 À refaire**, **😐 Bof**, **😋 Martin a aimé**. Ces notes pèsent dans les
  propositions suivantes.

### Courses
En haut de la liste, réponds aux questions de la semaine : « Reste-t-il de quoi faire les petits-déjeuners ? »,
« … les goûters ? », « … des bananes ? », et le rappel « As-tu pensé aux yaourts de Martin ? ». « Non, à racheter » ajoute les articles correspondants dans les bons rayons
(les fruits du goûter sont ceux de saison). La copie n'est possible qu'une fois les questions répondues. Questions et
articles se modifient dans **Réglages → Questions avant les courses**.

Coche ce que vous avez déjà, ajoute des articles en plus si besoin, puis :
- **📋 Copier** : la liste (un article par ligne), à coller dans la liste de courses de l'app Leclerc Drive ;
- **🤖 Copier la liste avec le prompt Claude** : un texte complet à coller dans Claude, qui doit pouvoir piloter
  le navigateur (extension **Claude dans Chrome**). Claude ouvre Leclerc Drive et remplit le panier en privilégiant
  le bio (Bio Village), les Nutri-Score A/B et les produits sans additifs à risque. Il s'arrête au panier :
  **il ne valide pas la commande**, et il termine par un récapitulatif (prix, bio, Nutri-Score, remplacements).
  Indique ton magasin et d'éventuelles consignes (budget, lait végétal…) dans **Réglages → Courses Leclerc Drive**.

> Le score Yuka n'est pas affiché sur Leclerc Drive : le prompt demande à Claude d'appliquer les mêmes critères
> (Nutri-Score, bio, additifs à risque, produit peu transformé) en lisant les fiches produits.

---

## 🧠 Comment les règles sont appliquées

Toutes les valeurs ci-dessous se modifient dans **Réglages**.

| Règle | Fonctionnement |
|---|---|
| Midi | M, M2, F : au travail. S : à la maison à **12h00** (départ 12h45). R, CA : à la maison à **12h30**. |
| Soir | S : au travail. Les autres : à la maison à **19h30**. |
| Martin | Cantine les lundi, mardi, jeudi et vendredi. À la maison le mercredi, le week-end, pendant les vacances scolaires (zone A) et les jours fériés. Dîne toujours à la maison. |
| Absences | Cases « Julien absent », « Julie absente », « Martin absent » sur chaque repas : la personne est retirée des convives et ne compte plus comme cuisinier (un jour de cuisine dont le cuisinier est absent au dîner n'en est plus un). |
| Mercredi | Théâtre puis cité des arts (hors vacances) : déjeuner à **12h15**, 15 min de cuisine au plus → « Express 15 min ». |
| Mardi | Julie dîne vers 20h30 (danse, réglée par défaut de 19h00 à 20h15), moi vers 22h45 (volley). |
| Jeudi | Moi : volley de 20h à 22h, dîner vers 22h15. |
| Activité ignorée | Si son horaire chevauche le poste de la personne (ex. volley un jour en S, VTT un jour en M). |
| Dîner en plusieurs temps | Plusieurs heures de dîner (écart supérieur à 15 min) → étiquette « En plusieurs temps », plat obligatoirement réchauffable. |
| Temps de cuisine | Calculé depuis l'heure de retour (fin du poste + 15 min de trajet) jusqu'au repas, sans compter les activités, avec un plafond : 45 min le soir, 120 min un jour de cuisine, 45 min le midi (30 min si seule la personne en S est là). Moins de 10 min → « Prêt à l'avance », 20 min ou moins → « Express 15 min ». |
| Jour de cuisine | L'un de vous est en R, CA ou M. Les plats longs et « en double » sont favorisés, et un plat en double remplit 1 ou 2 créneaux des 2 jours suivants (en priorité les soirs en plusieurs temps, puis ceux « prêt à l'avance » ou « express »). |
| VTT | Mardi matin (avril–novembre) ou case cochée : repas « consistants » favorisés, portion +30 %. |
| Grands-parents | Ajoutés à tous les repas à la maison (2 par défaut), peuvent garder Martin : pas d'avertissement M/S ni « aucun adulte avec Martin ». |
| Viande et équilibre | Les plats « viande » ne sont proposés que pendant une période grands-parents (réglable). D'un repas à l'autre, la source de protéines varie (légumineuses, œufs, fromage, soja, poisson). |
| Proposition | Score sans IA : saison du plat et des fruits et légumes du mois (calendrier France inclus), notes, préférences de Martin, consistant les jours de VTT, plats en double les jours de cuisine. Pas le même plat deux fois en 10 jours (hors restes). Un léger hasard, identique sur les deux téléphones, varie les semaines. |

---

## 🛠️ Développement

```bash
npm install
npm test          # tests unitaires du moteur (Vitest)
npm run dev       # http://localhost:5173 (mode local sans Supabase)
npm run build
```

Pour tester la synchronisation en local, copie `.env.example` en `.env.local` et renseigne l'URL et la clé
**publique**.

### Organisation du code

```
src/moteur/          ← logique pure, sans interface, entièrement testée
  regles.js          qui mange où et quand, temps de cuisine, étiquettes, avertissements
  proposition.js     score, filtres, anti-répétition, enchaînement des restes
  saisons.js         calendrier des fruits et légumes de France
  vacances.js        vacances zone A + jours fériés (calcul de Pâques)
  courses.js         agrégation des ingrédients par rayon
  import.js          lecture du JSON de planning
  reglages.js        règles par défaut (modifiables dans l'app)
  plats-depart.js    les 54 plats de départ (VERSION_PLATS à incrémenter quand on les change)
src/store.js         stockage local-first (localStorage) + file d'envoi
src/sync.js          Supabase : connexion, envoi, lecture, temps réel
src/vues/            écrans (Preact)
public/sw.js         service worker (hors connexion)
supabase/schema.sql  tables, RLS, temps réel
tests/               tests unitaires
```

---

## ⚠️ Limites connues

- **Vacances scolaires** : les dates de la zone A (2025-2026 et 2026-2027) sont saisies dans le code de
  mémoire, sans vérification sur le site officiel. **Vérifie-les** sur education.gouv.fr, et corrige-les
  ou complète-les dans **Réglages → Vacances scolaires**.
- **Horaire de la danse** : le début est supposé à 19h00. Ajuste-le dans **Réglages → Activités** s'il est
  différent : il détermine si Julie est là pour préparer le dîner le mardi.
- **Synchronisation** : la règle est « la dernière modification gagne », document par document. Si vous
  modifiez **le même** repas au même moment sur deux téléphones, une seule des deux modifications est
  gardée. L'ordre repose sur l'horloge des téléphones.
- **Supabase gratuit** : le projet est mis en pause après 7 jours sans aucune activité. Il suffit de le
  relancer depuis le tableau de bord Supabase. Les données restent aussi sur chaque téléphone.
- Pas de week-end travaillé « un sur deux » calculé automatiquement : c'est la grille saisie qui fait foi.
- Les plats de départ sont identiques sur les deux téléphones et ne sont envoyés à Supabase qu'une fois
  modifiés. Quand une nouvelle version de la base est publiée, les plats de départ jamais modifiés sont
  remplacés automatiquement ; ceux que vous avez modifiés ou créés sont conservés.
- Les articles des questions avant les courses ont des quantités fixes (à ajuster dans les réglages) : elles ne
  sont pas calculées selon le nombre de convives.
- Pas de photos ni de recettes détaillées dans les fiches plats (nom, temps, étiquettes et ingrédients
  seulement).
