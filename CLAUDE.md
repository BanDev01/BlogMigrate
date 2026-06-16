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
- [ ] Initialiser git + `.gitignore`
- [ ] Créer le repo GitHub et premier push

---

### Étape 1 — App MongoDB (état « avant »)

Construire l'application de départ avec MongoDB comme source de données.

**Tâches :**
- [ ] `docker-compose.yml` avec MongoDB (port 27017)
- [ ] Variables d'environnement (`.env.local`) : `MONGODB_URI`
- [ ] Connexion MongoDB (`src/lib/mongodb.ts`)
- [ ] Modèles Mongoose :
  - `User` — `{ name, email, avatar, bio, createdAt }`
  - `Post` — `{ title, slug, content, author (ref), tags: string[], comments: [{author, content, createdAt}], status, publishedAt }`
  - `Tag` — `{ name, slug }` *(pour référence, les tags sont aussi stockés inline dans Post)*
- [ ] Script de seed (`scripts/seed.ts`) avec Faker :
  - 50 utilisateurs
  - 500 articles (avec 2–8 tags chacun)
  - ~3 000 commentaires imbriqués dans les articles
- [ ] Pages Next.js :
  - `/` — liste paginée des articles (titre, auteur, tags, nb de commentaires)
  - `/posts/[slug]` — article complet avec commentaires
- [ ] Vérifier que `npm run dev` fonctionne et que les données s'affichent
- [ ] **Commit git : `feat: étape 1 — app Next.js avec MongoDB`**

---

### Étape 2 — Schéma relationnel cible (Supabase)

Concevoir le schéma PostgreSQL qui remplacera les collections MongoDB.

**Tâches :**
- [ ] Créer un projet Supabase (gratuit sur supabase.com)
- [ ] Variables d'environnement : `DATABASE_URL`, `DIRECT_URL`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- [ ] Installer Prisma : `npm install prisma @prisma/client`
- [ ] Écrire `prisma/schema.prisma` avec les tables :
  - `users` (id UUID, name, email unique, avatar, bio, createdAt)
  - `posts` (id UUID, title, slug unique, content, authorId FK→users, status, publishedAt, createdAt)
  - `comments` (id UUID, postId FK→posts, authorId FK→users, content, createdAt)
  - `tags` (id UUID, name unique, slug unique)
  - `post_tags` (postId FK→posts, tagId FK→tags) — table de jonction
- [ ] `npx prisma migrate dev --name init` pour générer et appliquer la migration SQL
- [ ] **Commit git : `feat: étape 2 — schéma Prisma/Supabase`**

---

### Étape 3 — Script de migration des données

Transférer les données de MongoDB vers Supabase en gérant les transformations.

**Tâches :**
- [ ] Créer `migration/migrate.ts`
- [ ] Migrer les **users** (ObjectId Mongo → UUID Postgres, table de mapping en mémoire)
- [ ] Migrer les **tags** (dédoublonner, créer en une passe)
- [ ] Migrer les **posts** (résoudre la FK `authorId` via la table de mapping)
- [ ] Migrer les **commentaires imbriqués** → table `comments` (aplatissement, résolution FK)
- [ ] Peupler **post_tags** (jonction posts ↔ tags)
- [ ] Inserts par lots (batch de 100) pour la performance
- [ ] Logs de progression + rapport final (nb de lignes insérées)
- [ ] `npm run migrate` dans `package.json`
- [ ] **Commit git : `feat: étape 3 — script de migration MongoDB→Supabase`**

---

### Étape 4 — Adapter le code applicatif

Remplacer la couche MongoDB par Supabase/Prisma, sans changer le comportement visible.

**Tâches :**
- [ ] Créer `src/lib/prisma.ts` (singleton PrismaClient)
- [ ] Remplacer les requêtes Mongoose dans les pages par des requêtes Prisma
- [ ] La page `/` et `/posts/[slug]` doivent afficher **exactement le même contenu** qu'avant
- [ ] Supprimer les imports Mongoose des pages (garder les modèles pour référence dans `/src/lib/models/`)
- [ ] Vérifier `npm run dev` et `npm run build` sans erreurs
- [ ] **Commit git : `feat: étape 4 — couche de données migrée vers Supabase`**

---

### Étape 5 — Tests et validation

Prouver que la migration est correcte et fonctionnellement transparente.

**Tâches :**
- [ ] Script de validation (`migration/validate.ts`) :
  - Comparer les counts MongoDB ↔ PostgreSQL (users, posts, comments, tags)
  - Vérifier l'intégrité référentielle (0 commentaire orphelin, 0 post sans auteur)
  - Comparer 5 articles « avant/après » (titre, auteur, nb de commentaires)
- [ ] Tests Playwright (`tests/`) :
  - La liste des articles s'affiche avec le bon nombre d'entrées
  - Une page article affiche l'auteur, les tags, et les commentaires
- [ ] `npm run validate` + `npm run test:e2e` dans `package.json`
- [ ] **Commit git : `test: étape 5 — validation et tests E2E`**

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

**→ Étape 1 : App MongoDB**
