# Citizen Core continuation and acceptance

## Current state

The existing Next.js 14 / Supabase architecture and paused authentication work were preserved. No commit, push, .kiro edit, or .env.local edit was made.

## Required additive migration

The hosted project has the two bootstrap migrations. Apply `supabase/migrations/20260910150612_reporting_location_policy.sql`, `supabase/migrations/20260910175958_government_operations.sql`, then `supabase/migrations/20260911003125_platform_admin_provisioning.sql`, once using the Supabase SQL editor or your normal migration workflow. Do not reapply the bootstrap migrations.

The location migration adds source markers to captures/reports, a private-only constraint on demo incidents, and service-role-only functions for canonical demo coordinates. The government migration adds role-scoped operations, evidence scoring fields, completion evidence, an append-only lifecycle history, and the contribution ledger. Neither additive migration has been executed against the hosted project from this environment.

To demonstrate from a laptop, explicitly set `CIVIC_DEMO_GEO_ENABLED=true` locally and restart the application. The default is false; the agent did not change it. Select a seeded demo civic area, then choose **Use demo location**. Coordinates are selected by the server inside that area; client coordinates are ignored for demo submission. A demo session still requires real camera evidence and remains private. Disable the flag for normal production use.

`CIVIC_GPS_MAX_ACCURACY_METERS` defaults to 100 and may only tighten the database threshold. Live acquisition watches improving readings for 30 seconds, retains the best valid reading, supports cancel/retry, and clears the watcher on completion or navigation. Submission acquires a fresh live reading. Capture sessions last five minutes.

## Evidence and report behavior

Camera permission, missing device, busy hardware, unsupported browsers, and insecure contexts have distinct messages. Camera defaults to the rear camera when available and falls back when constraints cannot be satisfied. Streams stop on close, retake, expiry, and navigation.

Use Photo immediately starts a private upload. Only a successful server response marks it Uploaded. Failed uploads retain the in-memory JPEG and can be retried with the same upload ID. Uploading photographs cannot be removed or replaced mid-upload. Final submission checks ownership and staging references before invoking the existing atomic database transaction. Replays reuse the existing incident. A reload clears in-memory photos; an expired session needs new captures.

Originals and sanitized derivatives remain in separate private buckets. Abandoned uploads still require the operator reconciliation described in PART1_SETUP.md; no automatic retention job was introduced. Never remove storage objects referenced by evidence.

## Design and responsive behavior

Original abstract SVG map landing hero; shared civic green tokens, cards, statuses, step headers and empty/error states; dedicated public/auth navigation; desktop citizen tabs; mobile five-item bottom navigation with safe-area spacing. Home uses real counts. Explore supports search, existing filters, split desktop list/map, and mobile list/map selection. My Reports shows owned display thumbnails, evidence scores, review results, and rejection reasons. Detail shows the complete public lifecycle and government resolution proof. Impact uses the append-only contribution ledger and weekly local ranking.

Layouts are authored for 375px mobile through 1440px desktop, with single-column reporting, large camera surfaces and sticky submission actions clear of bottom navigation. No connected browser was available for visual viewport, keyboard or hardware verification; no visual pass is claimed.

## Verification

- Typecheck and production build pass.
- 19 focused tests pass: Platform Admin authorization/provisioning/cleanup; auth configuration/errors/guard/cookie persistence and refresh; improving GPS, timeout/cancel/permission cleanup; camera error mapping; upload failure/retry confirmation; canonical demo coordinates and disabled-mode rejection; missing evidence rejection; origin, GPS/report contracts and real Sharp sanitization.
- These tests exercise actual route handlers with controlled database/storage fixtures. They are not remote database integration proof.
- Read-only hosted checks: Auth responds, email confirmation enabled, profiles available, both evidence buckets private. Demo migration is absent.
- Browser tool inventory returns no browsers. Live signup/signin, email delivery, account persistence through UI, camera capture, authenticated upload/submission and visual acceptance remain untested.

Do not run `npm run dev` and `npm run build` concurrently in this checkout: both use `.next`. A concurrent dev worker replaced the production runtime during validation, causing missing chunks; stopping that worker and rebuilding resolves the artifact conflict.

## Manual acceptance

1. Apply both additive migrations in timestamp order; optionally enable explicit demo mode and restart.
2. Open the same localhost hostname used in Auth configuration. Sign in with your own confirmed citizen account. Select a civic area and check persistence on refresh.
3. Verify live location (or explicitly choose demo), open camera, capture, retake, capture again, use the photo, and wait for Uploaded. Test failed-upload retry without retaking.
4. Submit; confirm detail, My Reports, evidence, refresh, logout, and protected-route redirect. Confirm demo reports stay private.
5. Test on a real 375px-class phone over HTTPS: permissions, rear camera, bottom navigation, keyboard, expiry, map/list selection. Review at 768px, 1024px and 1440px too.
6. Configure a domain-restricted MapTiler public key only if you need the interactive basemap. Without it the application deliberately offers the incident list and a map-unavailable state.

Government review, urgency-based SLAs, completion proof, contribution scoring, and optional advisory evidence-quality assessment are implemented without synthetic public data. See `GOVERNMENT_OPERATIONS.md` for provisioning and configuration.
