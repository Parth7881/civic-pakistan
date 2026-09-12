# Frontend architecture

This document describes the UI layer only. Database schema, RLS, Supabase policies,
server-side geofencing and the government workflow are unchanged by the redesign.

## Shell

`app/layout.tsx` → `AppShell` (server) → `ShellFrame` (client).

`AppShell` resolves identity once per request and passes a plain `Identity`
(`{name, role, area, areaCount}`) to `ShellFrame`, which picks one of four layouts from
`usePathname()`:

| Layout | When | Structure |
| --- | --- | --- |
| `auth-shell` | `/sign-in`, `/sign-up`, `/forgot-password`, `/reset-password`, `/setup`, `/government/sign-in`, `/auth/invite` | Full-screen split, no navbar |
| `public-shell` | `/`, and **any** page reached without a session | Public header, content, footer |
| `citizen-shell` | Signed-in citizen pages | Deep-emerald sidebar + topbar + content (mobile: top bar + bottom nav) |
| `government-shell` | `/government/*`, `/admin/*`, or any signed-in government account | Dark-forest sidebar + topbar + content |

Authentication pages render **no** public navbar: `auth-shell` is a full-screen split with its own
brand mark, so the page offers exactly one thing to do.

Platform Admin provisioning stays on its protected `/admin/government-users` route and is absent
from the Government Portal navigation.

Navigation lives in exactly one place per breakpoint. `components/civic/nav-items.ts` is the
single source of nav entries and of the active-route match (deepest prefix wins, so
`/government/reports/<id>` highlights **Reports**).

## Components

```
components/
  civic/          app-sidebar, mobile-nav, top-bar, nav-items,
                  report-table, my-reports-view, activity-timeline, impact-bars
  map/            maps-config, maps-loader, civic-map, civic-map-frame
  visuals/        pakistan-scene (original SVG artwork), hero-backdrop
  ui/civic.tsx    PageHeader, Surface, SectionHeader, MetricStrip, StatusBadge,
                  EvidenceScore, EmptyState, Alert, StepCard, ReportingAreaBanner
```

`app/globals.css` is the whole design system: tokens → primitives → shell → components →
pages → responsive. Colours are civic green (`--green #0B6B4F`), citizen emerald (`--emerald #063B2C`), government deep forest (`--deep #043126`), warm ivory, charcoal and muted grey, with five restrained status
colours that are used identically in chips, metric dots, map markers and progress bars.

## Maps

See `docs/GOOGLE_MAPS.md`. In short: one script load per session
(`components/map/maps-loader.ts`), one reusable `CivicMapFrame` that dynamically imports the
map bundle with `ssr:false`, custom SVG markers coloured by status and glyphed by category,
and `@googlemaps/markerclusterer` for clustering.

## Performance notes

- **Request-level identity cache.** `modules/auth/identity.ts` wraps `auth.getUser()` and
  the profile read in React `cache()`. The shell and the page guard previously each made
  their own auth round trip on every navigation; now they share one.
- **Map code is out of the initial bundle.** `CivicMapFrame` dynamically imports
  `civic-map.tsx`, so the shell paints before any mapping JS is fetched, and the Google
  script is injected once per session rather than once per page.
- **MapLibre and the MapTiler key were removed** along with the "Map unavailable" panel.
- **Client-side navigation only.** Every internal destination uses `next/link`; sidebar and
  bottom-nav entries prefetch, long report lists do not (`prefetch={false}`).
- `app/loading.tsx` renders a skeleton immediately for every route, so navigation never
  shows a blank screen while a dynamic page streams.

## Authentication

A Server Action that calls `redirect()` signals it by *throwing* a control-flow error carrying a
`digest` of `NEXT_REDIRECT;…`. Invoked imperatively from a client handler, that throw arrives as a
rejected promise, so a plain `catch` reported a **successful** sign-in as "Unable to connect."
while the router was still navigating — the one-second red flash. `lib/navigation-error.ts`
identifies that signal; `auth-form`, `password-form` and `jurisdiction-form` let it through
instead of rendering an error, and keep the button in its loading state until navigation lands.
`tests/auth.test.cjs` pins this against the error Next itself throws.

`updatePassword` no longer redirects at all: it returns `redirectTo` and the client navigates, which removes the same hazard from the recovery flow. Password recovery remains available from the login flow; the authenticated Profile screen is intentionally limited to profile identity editing.

The desktop account menu (`components/civic/account-menu.tsx`) intentionally exposes only **Profile** and **Sign out**. The redundant top-right account control is removed on desktop; mobile keeps the same compact account menu in the top bar because the sidebar is hidden. The Profile page allows the signed-in user to update only their own display name; email, role and jurisdiction remain read-only.

## Government data path (resolved)

- **Batched incident locations.** `government_incident_locations(p_actor, p_incidents[])` replaces
  the per-incident fan-out. It reuses the exact role/membership predicate of the single-row
  function, so ids the officer is not authorized for are simply absent from the result. Overview
  and Live Map each make one bounded call (chunked at 200 ids) instead of one call per report.
- **Real jurisdiction geometry.** `government_jurisdiction_geometry(p_actor)` returns centroid and
  bounds for the officer's assigned civic areas; `jurisdiction_map_frames()` does the same for the
  public map, rounded to the precision `list_public_incidents()` already publishes.
  `ST_PointOnSurface` is used rather than `ST_Centroid` so a concave service area still frames on
  a point inside itself. The hardcoded `city-centers.ts` fallback has been deleted.
- **Live Map updates.** `fetchLiveIncidents()` is an authorized Server Action that re-runs
  `requireGovernment()` on every call. A browser Supabase Realtime subscription is *not* used: the
  RLS policy on `incidents` only exposes rows owned by the signed-in citizen, so a client
  subscription would either deliver nothing or require relaxing that policy. `useLiveIncidents`
  runs one timer per mounted map, pauses while the tab is hidden, refreshes on focus, never
  overlaps requests, and stops permanently if authorization is lost. `mergeLivePoints` returns the
  previous array when nothing changed, so unchanged polls do not rebuild markers, and the map's
  viewport is untouched because `CivicMap` only fits bounds on first render.
- **Contribution ledger.** `government_resolve_incident` now records `REPORT_RESOLVED` (+5) for the
  reporting citizen, excluding demo incidents. Idempotency is structural — the table's
  `unique(citizen_id,incident_id,event_type)` plus `on conflict do nothing` — so a retried resolve
  cannot double-award. Already-resolved incidents were backfilled by the same migration, and the
  leaderboard now counts resolutions from the ledger instead of inferring them from report status.

## Security boundaries kept intact

- Public maps consume `list_public_incidents()`, whose coordinates the database already
  rounds; the frontend does not fetch or display anything finer.
- Government maps call `government_incident_location(p_actor, p_incident)` per incident,
  exactly as before, so jurisdiction authorization is still enforced server-side.
- Map info windows are built with DOM nodes and `textContent`; citizen descriptions and
  signed media URLs are never interpolated into markup.
- The reporting-area messaging in the report flow is presentational. `/api/capture` and
  `/api/reports` remain the only things that decide whether a location is acceptable.
