# BlogMigrate — Guide de développement

Application blog/CMS complète en Next.js, hébergée sur **Vercel**, qui illustre une migration de base de données de **MongoDB vers Supabase (PostgreSQL)**.  
Le projet est pleinement fonctionnel et accessible en ligne — les visiteurs peuvent lire les articles, explorer les commentaires et voir les données en temps réel depuis Supabase.

---

## Stack

| Rôle | Outil |
|---|---|
| Framework | Next.js 14 + TypeScript + Tailwind CSS |
| Hébergement | Vercel |
| Base source | MongoDB (Docker local) + Mongoose |
| Base cible | Supabase (PostgreSQL) + Prisma |
| Données factices | @faker-js/faker |
| Tests E2E | Playwright |

---

## Étapes de développement

### ✅ Étape 0 — Initialisation
- [x] Scaffold Next.js 14 (TypeScript, Tailwind, App Router, src/)
- [x] Initialiser git + `.gitignore`
- [x] Créer le repo GitHub et premier push

---

### ✅ Étape 1 — App MongoDB (état « avant »)

Construire l'application de départ avec MongoDB comme source de données.

**Tâches :**
- [x] `docker-compose.yml` avec MongoDB (port 27017)
- [x] Variables d'environnement (`.env.local`) : `MONGODB_URI`
- [x] Connexion MongoDB (`src/lib/mongodb.ts`)
- [x] Modèles Mongoose :
  - `User` — `{ name, email, avatar, bio, createdAt }`
  - `Post` — `{ title, slug, content, author (ref), tags: string[], comments: [{author, content, createdAt}], status, publishedAt }`
  - `Tag` — `{ name, slug }` *(pour référence, les tags sont aussi stockés inline dans Post)*
- [x] Script de seed (`scripts/seed.ts`) avec Faker :
  - 50 utilisateurs
  - 500 articles (avec 2–8 tags chacun)
  - ~2 816 commentaires imbriqués dans les articles
- [x] Pages Next.js :
  - `/` — liste paginée des articles (titre, auteur, tags, nb de commentaires)
  - `/posts/[slug]` — article complet avec commentaires
- [x] Vérifier que `npm run dev` fonctionne et que les données s'affichent
- [x] **Commit git : `feat: étape 1 — app Next.js avec MongoDB`**

---

### ✅ Étape 2 — Schéma relationnel cible (Supabase)

Concevoir le schéma PostgreSQL qui remplacera les collections MongoDB.

**Tâches :**
- [x] Créer un projet Supabase (`blogmigrate`, eu-west-1, projet ID : `uxuditzgocapinwvmvar`)
- [x] Variables d'environnement : `DATABASE_URL`, `DIRECT_URL`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- [x] Installer Prisma v5 : `npm install prisma@5 @prisma/client@5`
- [x] Écrire `prisma/schema.prisma` avec les tables :
  - `users` (id UUID, name, email unique, avatar, bio, createdAt)
  - `posts` (id UUID, title, slug unique, content, authorId FK→users, status, publishedAt, createdAt)
  - `comments` (id UUID, postId FK→posts, authorId FK→users, content, createdAt)
  - `tags` (id UUID, name unique, slug unique)
  - `post_tags` (postId FK→posts, tagId FK→tags) — table de jonction
- [x] Migration `20260616234219_init` appliquée sur Supabase
- [x] Singleton PrismaClient (`src/lib/prisma.ts`)
- [x] **Commit git : `feat: étape 2 — schéma Prisma/Supabase`**

**Notes :**
- Prisma 7 a cassé la compatibilité avec `url` dans `schema.prisma` → downgrade vers Prisma 5
- Prisma lit `.env`, pas `.env.local` → les variables DATABASE_URL/DIRECT_URL doivent être dans `.env`

---

### ✅ Étape 3 — Script de migration des données

Transférer les données de MongoDB vers Supabase en gérant les transformations.

**Tâches :**
- [x] Créer `migration/migrate.ts`
- [x] Migrer les **users** (ObjectId Mongo → UUID Postgres, table de mapping en mémoire)
- [x] Migrer les **tags** (dédoublonner, créer en une passe)
- [x] Migrer les **posts** (résoudre la FK `authorId` via la table de mapping)
- [x] Migrer les **commentaires imbriqués** → table `comments` (aplatissement, résolution FK)
- [x] Peupler **post_tags** (jonction posts ↔ tags)
- [x] Inserts par lots (batch de 100) pour la performance
- [x] Logs de progression + rapport final (nb de lignes insérées)
- [x] `npm run migrate` dans `package.json`
- [x] **Commit git : `feat: étape 3 — script de migration MongoDB→Supabase`**

**Résultat :** 50 users, 50 tags, 500 posts, 2816 commentaires, 2278 relations post_tags migrés sans erreur.

---

### ✅ Étape 4 — Adapter le code applicatif

Remplacer la couche MongoDB par Supabase/Prisma, sans changer le comportement visible.

**Tâches :**
- [x] Créer `src/lib/prisma.ts` (singleton PrismaClient) — fait à l'étape 2
- [x] Remplacer les requêtes Mongoose dans les pages par des requêtes Prisma
- [x] La page `/` et `/posts/[slug]` doivent afficher **exactement le même contenu** qu'avant
- [x] Supprimer les imports Mongoose des pages (garder les modèles pour référence dans `/src/lib/models/`)
- [x] Vérifier `npm run dev` et `npm run build` sans erreurs
- [x] **Commit git : `feat: étape 4 — couche de données migrée vers Supabase`**

---

### ✅ Étape 5 — Tests et validation

Prouver que la migration est correcte et fonctionnellement transparente.

**Tâches :**
- [x] Script de validation (`migration/validate.ts`) :
  - Comparer les counts MongoDB ↔ PostgreSQL (users, posts, comments, tags)
  - Vérifier l'intégrité référentielle (0 commentaire orphelin, 0 post sans auteur) via requêtes SQL LEFT JOIN
  - Comparer 5 articles « avant/après » (titre, auteur, nb de commentaires)
- [x] Tests Playwright (`tests/blog.spec.ts`) :
  - La liste des articles s'affiche avec le bon nombre d'entrées
  - Une page article affiche l'auteur, les tags, et les commentaires
- [x] `npm run validate` + `npm run test:e2e` dans `package.json`
- [ ] **Commit git : `test: étape 5 — validation et tests E2E`**

**Résultat :** `npm run validate` → SUCCÈS (50 users, 50 tags, 500 posts, 2816 comments, 0 orphelin). `npm run test:e2e` → 2/2 tests passés.

**Notes :**
- Le pooler Supabase (free tier) a des coupures TCP intermittentes (`Can't reach database server`) — transitoire, pas un bug applicatif. Relancer suffit.
- Browsers Playwright téléchargés via `playwright.dev` bloqués sur ce réseau (DNS) → config pointée sur Chrome local via `channel: "chrome"` dans `playwright.config.ts`.

---

### Étape 6 — Documentation (README)

Rendre le dépôt compréhensible et vendable sur Upwork.

**Tâches :**
- [ ] Réécrire `README.md` :
  - Badges (Next.js, MongoDB, Supabase, Prisma, Playwright)
  - Diagramme schéma MongoDB « avant » (texte ASCII ou Mermaid)
  - Diagramme schéma SQL « après » (Mermaid ERD)
  - Instructions `docker-compose up` + `npm run seed` + `npm run migrate`
  - Section « Défis techniques » (documents imbriqués, plusieurs-à-plusieurs, mapping d'IDs)
  - Résultats des tests
  - Plan de rollback
- [ ] **Commit git : `docs: étape 6 — README et documentation finale`**

---

## Commandes utiles

```bash
# Démarrer MongoDB
docker-compose up -d

# Remplir MongoDB avec des données factices
npm run seed

# Démarrer l'app (mode MongoDB)
npm run dev

# Migrer les données vers Supabase
npm run migrate

# Valider la migration
npm run validate

# Tests E2E
npm run test:e2e
```

---

## Structure du projet

```
BlogMigrate/
├── docker-compose.yml          # MongoDB local
├── prisma/
│   └── schema.prisma           # Schéma cible Supabase
├── migration/
│   ├── migrate.ts              # Script de migration
│   └── validate.ts             # Script de validation
├── scripts/
│   └── seed.ts                 # Générateur de données Faker
├── src/
│   ├── app/
│   │   ├── page.tsx            # Liste des articles
│   │   └── posts/[slug]/
│   │       └── page.tsx        # Détail article + commentaires
│   └── lib/
│       ├── mongodb.ts          # Connexion MongoDB
│       ├── prisma.ts           # Client Prisma (Supabase)
│       └── models/             # Modèles Mongoose
│           ├── User.ts
│           ├── Post.ts
│           └── Tag.ts
└── tests/
    └── blog.spec.ts            # Tests Playwright
```

---

## Étape en cours

**→ Étape 6 : Documentation (README)**
