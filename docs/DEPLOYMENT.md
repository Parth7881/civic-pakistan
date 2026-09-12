# Production deployment checklist

No secret values appear in this document. Every item below is a configuration step for the
operator, to be performed in the Vercel, Supabase and Google Cloud consoles.

## 1. Environment variables

Set these in **Vercel → Project → Settings → Environment Variables** for Production (and Preview
if previews are used). `.env.example` lists the same names.

| Variable | Scope | Notes |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Public | Project **API** URL, not a dashboard link |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Public | Publishable/anon key only |
| `SUPABASE_SERVICE_ROLE_KEY` | **Secret** | Server only. Must never be `NEXT_PUBLIC_*` |
| `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` | Public | Browser key, referrer-restricted (§3) |
| `NEXT_PUBLIC_APP_URL` | Public | Exact production origin, no trailing slash |
| `CIVIC_GPS_MAX_ACCURACY_METERS` | Server | 1–100; omit to use the 100 m default |
| `CIVIC_DEMO_GEO_ENABLED` | Server | Must be `false` in production |
| `CIVIC_AI_EVIDENCE_ENABLED` | Server | `true` only when the provider key is set |
| `CIVIC_EVIDENCE_MODEL` | Server | Optional model override |
| `OPENAI_API_KEY` | **Secret** | Server only |
| `NEXT_PUBLIC_HERO_IMAGE` | Public | Optional path to a locally owned hero image |

Verification, run after configuring:

- No variable whose name contains `SERVICE_ROLE`, `SECRET`, `OPENAI` or `DATABASE_URL` is
  prefixed `NEXT_PUBLIC_`. `tests/authorization.test.cjs` asserts this for the codebase; the
  console list must be checked by eye once.
- `CIVIC_DEMO_GEO_ENABLED` is `false`.

## 2. Supabase

1. **Migrations** — apply in timestamp order. The newest is
   `20260912173000_government_batch_geometry_ledger.sql`; it is forward-only and additive
   (three new functions, one `create or replace`, one idempotent backfill, one index).
2. **Auth → URL Configuration**
   - Site URL: the production origin.
   - Redirect URLs: `https://<domain>/auth/callback` (add the preview origin too if used).
   - Recovery and confirmation emails both return through `/auth/callback`.
3. **Storage** — buckets `evidence-originals`, `evidence-display`, `resolution-originals`,
   `resolution-display` stay **private**. The app serves them through short-lived signed URLs;
   do not make any of them public.
4. **Realtime** — nothing to enable. The Government Live Map deliberately does not use a browser
   Realtime subscription (see `docs/FRONTEND.md`), so no publication change is required.
5. **Provisioning** — create the first Platform Admin, then government users through
   `/admin/government-users`. Government accounts are never self-service.

## 3. Google Maps

- Enable **only** the Maps JavaScript API.
- Restrict the key by **HTTP referrer** to the production domain (and preview domain if used) and
  by **API** to Maps JavaScript.
- Set a billing budget and alert.
- Full detail in `docs/GOOGLE_MAPS.md`.

## 4. Pre-launch smoke tests

Against the deployed URL, signed in with disposable accounts:

- [ ] Citizen: sign in with correct credentials — **no red error flashes** during the redirect.
- [ ] Citizen: Home map frames the active city; Explore pans worldwide.
- [ ] Citizen: submit one report end to end; it appears in My Reports as Submitted.
- [ ] Citizen: profile name update persists; email, role and jurisdiction stay read-only.
- [ ] Government: sign in; Overview, Reports, Live Map, History, Performance all load.
- [ ] Government: the Live Map civic-area selector filters and reframes **without leaving**
      `/government/map`, including for an area with zero reports.
- [ ] Government: accept a report, then resolve it; the citizen's contribution score increases
      once, and repeating the resolve does not increase it again.
- [ ] Government: a report outside the officer's jurisdiction is not listed and its detail route
      returns not-found.
- [ ] Password recovery: request a link, open it, set a new password, land signed in.
- [ ] Sign out from both portals.

## 5. Known gaps to close before or shortly after launch

- **ESLint is not configured.** `npm run lint` runs `next lint`, which prompts for interactive
  setup and therefore cannot run in CI. Add an `.eslintrc.json` (`next/core-web-vitals`) or drop
  the script. Left unconfigured here to avoid an unrelated diff.
- **No error monitoring.** Sentry is not installed; no DSN is configured. If it is wanted, add it
  before launch rather than after.
- **AI assessment is awaited inline** in `POST /api/reports`. The report is already persisted
  before the call and the call cannot fail the request, but with the provider enabled it can add
  up to 20 s to the submit response. Moving it to a queue or to `after()` on Next 15 would remove
  that latency; a fire-and-forget on Vercel today would risk losing the assessment silently.
