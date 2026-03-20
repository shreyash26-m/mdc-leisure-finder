# MDC Leisure Finder — Vercel Deployment Guide

## What Changed & Why

| Old (Flask/Python) | New (Next.js/Node) | Reason |
|---|---|---|
| `app.py` (Flask server) | `pages/api/*.js` (Serverless API routes) | Vercel is serverless — no persistent Python server |
| `pytesseract` (local binary OCR) | Claude Vision API (cloud OCR) | Tesseract binary can't install on Vercel |
| `site.db` (SQLite file) | Supabase PostgreSQL (cloud DB) | Vercel filesystem is read-only & ephemeral |
| `openpyxl` (Python Excel) | `xlsx` npm package (JS Excel) | No Python runtime needed |
| `os.startfile()` (Windows Excel opener) | Browser file upload button | Works on all OS, cloud-native |
| Jinja2 HTML templates | React/Next.js pages | Native to Next.js |

---

## One-Time Setup (Do This Before Deploying)

### Step 1 — Create a Supabase Database (Free)

1. Go to https://supabase.com and sign up (free)
2. Click **New Project** → give it a name → set a strong password → click Create
3. Wait ~2 minutes for it to provision
4. Go to **Project Settings → Database → Connection String → URI**
5. Copy the URI — it looks like:
   ```
   postgresql://postgres:[YOUR-PASSWORD]@db.[REF].supabase.co:5432/postgres
   ```
6. Save this — you'll need it as `DATABASE_URL`

### Step 2 — Get a Claude (Anthropic) API Key (for OCR)

1. Go to https://console.anthropic.com/settings/keys
2. Click **Create Key** → copy it
3. Save as `ANTHROPIC_API_KEY`

### Step 3 — Generate a NextAuth Secret

Run this in your terminal:
```bash
openssl rand -base64 32
```
Save the output as `NEXTAUTH_SECRET`

---

## Local Development Setup

```bash
# 1. Clone / copy the project
cd mdc-leisure-finder

# 2. Install dependencies
npm install

# 3. Copy env file and fill in your values
cp .env.local.example .env.local
# Edit .env.local with your keys (see below)

# 4. Push database schema to Supabase
npx prisma db push

# 5. Run locally
npm run dev
# Open http://localhost:3000
```

### .env.local values to fill in:
```
DATABASE_URL=postgresql://postgres:YOUR_PASS@db.YOUR_REF.supabase.co:5432/postgres
NEXTAUTH_SECRET=your-generated-secret
NEXTAUTH_URL=http://localhost:3000
ADMIN_USERNAME=nitish
ADMIN_PASSWORD=boss
ANTHROPIC_API_KEY=sk-ant-YOUR_KEY
```

---

## Deploy to Vercel

### Step 1 — Push to GitHub

```bash
git init
git add .
git commit -m "Initial commit - MDC Leisure Finder"
git remote add origin https://github.com/YOUR_USERNAME/mdc-leisure-finder.git
git push -u origin main
```

### Step 2 — Import to Vercel

1. Go to https://vercel.com → **Add New Project**
2. Import your GitHub repo
3. Framework preset will auto-detect as **Next.js** ✓
4. **Do NOT deploy yet** — set env variables first (Step 3)

### Step 3 — Add Environment Variables in Vercel

In Vercel project settings → **Environment Variables**, add:

| Name | Value |
|---|---|
| `DATABASE_URL` | Your Supabase connection string |
| `NEXTAUTH_SECRET` | Your generated secret |
| `NEXTAUTH_URL` | `https://your-project.vercel.app` (your actual Vercel URL) |
| `ADMIN_USERNAME` | `nitish` |
| `ADMIN_PASSWORD` | `boss` |
| `ANTHROPIC_API_KEY` | Your Anthropic key |

### Step 4 — Deploy

Click **Deploy**. The `vercel.json` build command runs:
```
npx prisma generate && next build
```
This auto-creates the DB tables on first deploy.

---

## Post-Deployment: Copy Your Existing Members

Since you have `site.db` with existing members, migrate them:

```bash
# Run this locally with your production DATABASE_URL set in .env.local
npx ts-node scripts/migrate-sqlite.js
```

Or manually: export your SQLite data to Excel and upload via the **Upload Excel** button in the Members page.

---

## How the App Works Now

### Uploading Members
- Go to **Members** page → click **📂 Upload Excel**
- Select your `members.xlsx` file
- It parses the file in the browser, sends to `/api/sync-excel`
- New members are added, existing ones updated
- If a `timetable_drive_link` is new/changed → OCR runs automatically via Claude Vision API

### OCR Flow
```
Upload Excel → new timetable_drive_link detected
  → Download image from Google Drive
  → Send image to Claude Vision API
  → Get back JSON timetable {day: {slot: "Free"|"Occupied"}}
  → Save to database
```

### Google Drive Sharing
Timetable images on Google Drive must be set to **"Anyone with the link can view"**.
Otherwise the download step will fail silently and the timetable stays blank.

---

## File Structure

```
mdc-leisure-finder/
├── pages/
│   ├── index.js              # Redirects to /dashboard or /login
│   ├── login.js              # Admin login page
│   ├── dashboard.js          # Dashboard with domain stats
│   ├── finder.js             # Leisure slot finder
│   ├── members/
│   │   ├── index.js          # Members list + Excel upload
│   │   └── [id]/
│   │       ├── edit.js       # Edit member details
│   │       └── timetable.js  # Timetable editor grid
│   └── api/
│       ├── auth/[...nextauth].js  # Login/logout/session
│       ├── members/
│       │   ├── index.js      # GET all members
│       │   ├── [id].js       # GET/PUT/DELETE single member
│       │   └── [id]/timetable.js  # POST save timetable
│       ├── find-slots.js     # POST leisure slot finder logic
│       └── sync-excel.js     # POST Excel sync + OCR trigger
├── lib/
│   ├── constants.js          # DOMAINS, DAYS, TIME_SLOTS (was models.py)
│   ├── prisma.js             # DB client singleton
│   ├── auth.js               # requireAuth() helper
│   └── ocrParser.js          # Claude Vision OCR (was ocr_parser.py)
├── components/
│   └── Layout.js             # Sidebar + nav (was base.html)
├── prisma/
│   └── schema.prisma         # DB schema (PostgreSQL)
├── public/
│   ├── style.css             # YOUR EXISTING CSS — copy it here as-is
│   ├── app.js                # YOUR EXISTING JS — copy it here as-is
│   └── mdc_logo.svg          # YOUR EXISTING LOGO — copy it here as-is
├── styles/
│   └── globals.css           # Next.js global CSS reset
├── .env.local.example        # Environment variables template
├── vercel.json               # Vercel config
└── package.json
```

---

## ⚠️ Important: Copy Your Static Assets

Copy these files from your old Flask project into `public/`:

```bash
# From your old project's static/ folder:
cp static/style.css   public/style.css
cp static/app.js      public/app.js
cp static/mdc_logo.svg public/mdc_logo.svg
```

These are used as-is — no changes needed.

---

## Troubleshooting

| Problem | Fix |
|---|---|
| `PrismaClientInitializationError` | Check `DATABASE_URL` in Vercel env vars |
| Login fails | Check `ADMIN_USERNAME` and `ADMIN_PASSWORD` env vars |
| OCR returns all Free | Check Drive image sharing is set to "Anyone with link"; check `ANTHROPIC_API_KEY` |
| Build fails with Prisma error | Run `npx prisma generate` locally first, then push |
| `NEXTAUTH_URL` mismatch | Set it to your exact Vercel URL including `https://` |
