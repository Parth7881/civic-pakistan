> Current continuation: see [CITIZEN_POLISH.md](CITIZEN_POLISH.md) for citizen workflow validation and [GOVERNMENT_OPERATIONS.md](GOVERNMENT_OPERATIONS.md) for the implemented government lifecycle. Earlier verification notes below are historical.

# CivicPakistan Part 1 setup and acceptance

The existing Next.js 14 App Router application is preserved and no Kiro specification was changed. This document records the original citizen-core setup; the additive government workflow is documented separately.

## Configure Supabase

1. Create/select a Supabase PostgreSQL 15+ project. Keep email/password authentication enabled and email confirmation enabled.
2. Copy `.env.example` to `.env.local` locally and supply real values:
   - `NEXT_PUBLIC_SUPABASE_URL`: project API URL.
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`: project public anon key (a publishable key also works).
   - `SUPABASE_SERVICE_ROLE_KEY`: server-only service role key. Never use a `NEXT_PUBLIC_` prefix for this key.
   - `NEXT_PUBLIC_APP_URL`: exact application origin, initially `http://localhost:3000`.
   - `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY`: Google Maps **browser** key. Restrict it in Google Cloud by HTTP referrer and enable only the Maps JavaScript API. Without it, map panels show a configuration notice and reports stay available as lists.
   - `OPENAI_API_KEY` is optional and server-only. It is used only when `CIVIC_AI_EVIDENCE_ENABLED=true`; see the government operations guide.
3. Apply migrations in timestamp order through the Supabase SQL editor or your normal migration workflow. The two `202609101249*` files are bootstrap migrations for a project without these application tables. The additive `20260910150612_reporting_location_policy.sql` migration adds controlled demo-location provenance. Inspect an existing remote schema before applying anything; the bootstrap files are not a remote schema reconciliation tool.
4. The schema expects PostGIS in the `extensions` schema. If PostGIS is already installed elsewhere, reconcile that extension placement before applying the migration. Do not blindly replace an existing database.
5. Confirm the migrations created the `evidence-originals` and `evidence-display` private buckets. Both allow JPEGs up to 2 MB. Do not make either public or add browser upload policies.
6. In Auth URL configuration, set Site URL to the application origin, and allow `http://localhost:3000/auth/callback`. Signup and recovery both use this callback; recovery is recognized from the SDK's PKCE state. Add the deployed HTTPS callback when deploying. Keep email templates configured to use Supabase's confirmation URL so the PKCE code exchange returns to this callback. Set recovery link expiry to one hour. Open links in the same browser and use the configured application hostname consistently (do not switch between localhost and 127.0.0.1).
7. Configure working email delivery/SMTP for signup confirmation and the desired Auth password/rate-limit policies. The application checks signup complexity; hosted Auth must also enforce password rules for direct API calls.
8. Run `npm run build` with your real public environment variables present, then `npm start`. Browser-exposed variables are embedded at build time. Restart/rebuild after changing them. Use HTTPS for camera/GPS on physical phones; localhost is allowed on the computer running the browser.

The configured hosted project now responds to read-only Auth, profile, and private bucket checks. The two bootstrap migrations are already applied. The reporting-location migration below still requires application. End-to-end authenticated and physical-device acceptance remains pending.

## What is implemented

- `/sign-up`, `/sign-in`, `/auth/callback`: citizen registration, email confirmation, sign-in; sign-out in the account menu.
- `/forgot-password`, `/reset-password`: email-based password recovery and password update.
- Cookie-based SSR client, middleware refresh, and independent server identity/role checks. Client, server, and service-role factories are separate.
- `/jurisdiction`: Pakistan → Province/Region → City/Local Civic Area, persisted on the profile.
- `/home`: local public counts, recent public incidents, personal report count, reporting entry point.
- `/report`: urgency, live GPS, database geofence check, live camera, capture/retake, up to five photos, optional description, staged upload, fresh GPS at submission.
- `/my-reports` and `/incidents/[id]`: personal records, evidence, IDs, timestamps, and current status.
- `/explore`: public list/map with region, area, urgency, status, category and date filters. Map clustering and list fallback are included.
- Missing configuration, unavailable service, empty records, permission and submission failures have explicit states.

## Submission and privacy model

Submission creates a **private `SUBMITTED` incident**, linked to the report, with `requires_manual_classification` set. The government workflow transitions that same incident during review rather than inserting a second record. Acceptance assigns the category, workstream, and SLA and publishes non-demo incidents.

Public Explore shows incidents only after an authorized government reviewer accepts and publishes them. No fictional accepted incidents are seeded.

Public access uses a restricted RPC projection with rounded coordinates, no citizen IDs, and no original evidence paths. Public evidence access is authorized by that projection, then a short-lived signed URL is issued for a sanitized derivative. Pending detail access is checked with user-scoped RLS. Current raw tables have no public SELECT access.

Camera photos are JPEGs with advisory timestamp/GPS EXIF. Browser metadata is not proof of authenticity. The authenticated capture-session record and database validation are authoritative. The interface has no gallery/file picker.

Each image is uploaded separately (maximum 2 MB) through an authenticated server endpoint, decoded with a pixel limit, and re-encoded to remove metadata from the display copy. A service-only `capture_uploads` staging table binds validated objects to a citizen/session. Final submission validates the binding and atomically creates report, private incident, evidence rows, and consumes the session. Session replay returns the same incident. Uploaded photos survive a retry within the five-minute session.

Storage writes cannot share a PostgreSQL transaction. Failed or abandoned uploads may leave private objects/staging rows. Before production, add an operator reconciliation job for expired, unreferenced uploads; never delete objects referenced by `evidence`. This is not a public data exposure, but storage retention is not yet automated.

## Demo geography

Eight local service areas are seeded: Lahore, Rawalpindi, Karachi, Peshawar, Quetta, Islamabad, Gilgit and Muzaffarabad. Their boundaries are **approximate demo rectangles**, not verified administrative polygons. Province/country demo coverage is the union of these supported areas, not a complete national boundary dataset. Outside supported coverage, reporting is denied even if physically inside Pakistan.

Replace these demo polygons with verified jurisdiction boundaries before claiming national coverage. The UI explicitly labels demo coverage. Location must be accurate to 100 m, fresh within 60 seconds (future timestamps beyond five seconds are rejected), inside the selected area, and within 100 m of the capture-session location at submission. Capture sessions expire after five minutes.

## Required manual acceptance checks

1. **Authentication:** register, confirm email in the same browser, sign in/out; invalid password/email; missing confirmation; expired callback; logged-out access to every protected route; unavailable Supabase. Ensure editing signup metadata cannot assign an elevated role.
2. **Jurisdiction:** choose region/city, reload to confirm persistence; switch region and confirm city resets; attempt direct profile role changes and a non-local jurisdiction ID (both must be denied).
3. **GPS:** allow, deny, timeout, low accuracy, stale/future timestamps, out-of-area and outside demo Pakistan coverage. Test server/API rejection, not only disabled UI. Switching civic area after capture must invalidate submission.
4. **Camera:** permission denial; unavailable/in-use camera; mobile rear camera; preview, capture, retake, use/remove photos; 1 and 5 photos; no gallery picker; navigate away and confirm the camera stops.
5. **Report:** submit both urgency lanes, blank/500-character descriptions; reject 501 characters, missing photos, non-JPEG/corrupt/oversized images, forged session IDs, another citizen's upload IDs, and a sixth photo. Verify five-minute expiry and the five-reports/hour limit.
6. **Persistence:** verify exactly one report/incident per capture session; retry after a lost response; verify successful evidence references and `consumed_at`; inspect the report in My Reports and detail after reload.
7. **Privacy/RLS:** use citizen A, citizen B, and anon clients. B/anon must not read A's pending report, private incident, staged uploads or evidence. Public RPC must never return pending records, personal IDs or full GPS. Neither private bucket may be browsed anonymously. Attempt direct INSERT/UPDATE/DELETE on sensitive tables; these must be denied. Service-only RPCs must reject anon/authenticated calls.
8. **Failure recovery:** disable Storage/network during upload, retry; fail final database save and retry without duplicate incidents; confirm metadata is absent from display JPEGs.
9. **Public pages:** an empty Explore is correct for a new Part 1 database. When reviewing separately prepared accepted fixtures, verify filters, map clustering, public detail, coordinate precision, and private-original isolation. Do not enable fake government acceptance just to populate the map.
10. **UI:** test 320 px mobile and desktop, keyboard navigation, focus, screen-reader labels and alert states. Check the actual camera flow on HTTPS on a phone.

## Validation commands

```
npm run build
npm run typecheck
npm test
```

Focused tests cover invalid/stale GPS, report validation and real Sharp image decoding/EXIF removal. They are not database integration or end-to-end proof. Some restricted environments need permission for build/test worker processes.

## Remaining beyond the verified code path

Supabase migrations/RLS/Auth/Storage and physical GPS/camera acceptance require the manual checks above. Exact per-email lockout/inactivity policies still need provider configuration or additional enforcement; verified nationwide boundaries are not included. Current Explore reads up to 500 public incidents; pagination is needed before larger deployments. Government review, AI, SLA, scoring and accountability features intentionally remain for later parts.

## Earlier implementation verification (superseded)

- Final production build: passed; all 18 generated page entries and API routes compiled.
- `npm run typecheck`: passed.
- `npm test`: 4 passed, 0 failed (origin regression, GPS validation, report contract, image metadata removal).
- Production HTTP checks: protected pages redirect to setup when unconfigured; public/auth pages show unavailable states; API endpoints accept the matching loopback origin and report missing configuration; cross-origin requests are rejected.
- Browser visual verification: unavailable because the connected browser tool reported no browser. No visual or physical-device pass is claimed.
- Database/RLS and real Auth/Storage: not executed; no credentials and no running local Docker engine.
- `git diff --check`: passed. `.kiro` diff is empty. No Git commit.

## File inventory

Existing files modified: `.env.example`, `.gitignore`, `app/globals.css`, `app/layout.tsx`, `app/page.tsx`, `components/ui/button.tsx`, `components/ui/toast.tsx`, `lib/supabase.ts`, `lib/utils.ts`, `package.json`, `package-lock.json`, `tailwind.config.js`, `types/database.ts`. Next.js also normalized its generated `next-env.d.ts` file.

New route files: `app/api/capture/route.ts`, `app/api/evidence/route.ts`, `app/api/reports/route.ts`, `app/auth/callback/route.ts`; pages under `app/explore`, `app/forgot-password`, `app/home`, `app/incidents/[id]`, `app/jurisdiction`, `app/my-reports`, `app/report`, `app/reset-password`, `app/setup`, `app/sign-in`, and `app/sign-up`; shared `app/error.tsx`, `app/loading.tsx`, and `app/not-found.tsx`.

New components: `app-shell.tsx`, `auth-form.tsx`, `explore-view.tsx`, `incident-list.tsx`, `incident-map.tsx`, `jurisdiction-form.tsx`, `password-form.tsx`, and `report-form.tsx` in `components/`.

New supporting code: `lib/http.ts`, `lib/supabase/{browser,config,server,service}.ts`, `middleware.ts`, `modules/auth/{actions,api,session}.ts`, `modules/geography/actions.ts`, `modules/incidents/queries.ts`, `modules/reports/{location,validation}.ts`, `types/piexifjs.d.ts`, `tests/report-validation.test.cjs`, the two SQL migrations, and this setup guide.
