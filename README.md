# 🏺 Sheila's Glazes

A simple web app for tracking glaze recipes and material inventory.

It solves the unit headache potters know well: **materials are bought in pounds,
but recipes are written in percentages and mixed in grams.** Every weight is
stored internally in grams, so the math is always exact — pounds are just how
things are shown and entered.

## What it does

- **Recipes** — Write down a glaze by name and its ingredient percentages, just
  like a handwritten card. Typing a new ingredient name adds it to your
  materials list automatically.
- **Materials** — Track how much of each raw, dry material you have, in pounds
  (or kg/g). Mark a reorder level to get a "Low — reorder" flag.
- **Glazes** — Track your mixed, finished glaze buckets by **volume** (cups,
  pints, quarts, gallons) with a quick consistency note (Good / Dryish / Chunky
  / Empty). Quickly record using some or topping up.
- **Mix a batch** — Enter a batch size in grams. The app figures out how much of
  each material you need, warns if you might be short, and subtracts what you
  used from your materials. Optionally record the volume made and it's added to
  that glaze's bucket. Every batch can be undone (restores both).

## Tech

Next.js + Tailwind CSS, a Postgres database (via Drizzle ORM), deployed on
Vercel. Single user, no login by default.

---

## Setup (one time)

You'll need a free [Neon](https://neon.tech) database and a free
[Vercel](https://vercel.com) account.

### 1. Create the database
1. Sign up at neon.tech and create a project.
2. Copy the **pooled connection string** from the dashboard.

### 2. Run it locally (optional, for development)
```bash
npm install
cp .env.example .env          # then paste your connection string into DATABASE_URL
npm run db:push               # creates the tables
npm run db:seed               # optional: adds a few example materials + a recipe
npm run dev                   # open http://localhost:3000
```

### 3. Deploy to the web
1. Push this repo to GitHub.
2. In Vercel, "Add New → Project" and import the repo.
3. Under **Environment Variables**, add `DATABASE_URL` with your Neon string.
4. Deploy. Vercel gives you a URL that works on any phone, tablet, or laptop.
5. After the first deploy, run `npm run db:push` once (locally, pointed at the
   same `DATABASE_URL`) to create the tables in the production database.

### Adding a password (optional)
By default there's no login. To protect the site, set an `APP_PASSWORD`
environment variable in Vercel. The browser will then ask for a password
(username `sheila`) before showing anything.

---

## Useful commands

| Command | What it does |
|---|---|
| `npm run dev` | Run locally for development |
| `npm test` | Run the unit tests (weight conversions + batch math) |
| `npm run db:push` | Create/update database tables from the schema |
| `npm run db:seed` | Add example starter data |
| `npm run db:studio` | Browse the database in a web UI |

## Project layout

- `src/lib/units.ts` — weight (lb/g/kg) and volume (cup/pint/quart/gallon) conversions and batch math (the core).
- `src/lib/actions.ts` — all data operations (materials, glazes, recipes, mixing, undo).
- `src/db/schema.ts` — database tables.
- `src/app/` — the pages (`/recipes`, `/glazes`, `/inventory`).
- `src/components/` — the recipe entry form and mix-a-batch panel.
- `scripts/verify.ts` — an end-to-end integration check against a real database.
