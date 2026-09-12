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
pages → responsive. Colours are Pakistan green (`--green #0f5c3f`), deep forest
(`--deep #072a1d`), warm off-white, charcoal and muted grey, with five restrained status
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

`updatePassword` no longer redirects at all: it returns `redirectTo` and the client navigates,
which removes the same hazard from the recovery flow and lets the signed-in account page reuse
the action with `intent=account` to change a password in place.

The account menu (`components/civic/account-menu.tsx`) offers Profile, Change password, Sign in
with another account, and Sign out. Switching accounts ends the current session and returns to
the matching sign-in screen; there is deliberately no concurrent multi-session handling.

## Backend optimization required later

- **Batched incident locations.** `government_incident_location(p_actor, p_incident)` authorizes
  one incident per call, so the Government overview (20) and Live Map (up to 100) fan out that
  many round trips. A batched RPC taking an array of incident ids would collapse this; the
  frontend already caches the officer's assignments per request, which was the other duplicate.
- **Jurisdiction centroids.** `jurisdictions.boundary` is never exposed to the browser, so the
  map cannot frame a civic area that has no reports and cannot draw the reporting-area polygon.
  `components/map/city-centers.ts` covers the demo cities from the seed migration as a stopgap; a
  read-only RPC returning a centroid (and optionally simplified GeoJSON) would replace it.
- **Contribution ledger detail.** The ledger records only `REPORT_ACCEPTED`, so "resolved
  contributions" on the leaderboard is derived from the citizen's own report statuses.

## Security boundaries kept intact

- Public maps consume `list_public_incidents()`, whose coordinates the database already
  rounds; the frontend does not fetch or display anything finer.
- Government maps call `government_incident_location(p_actor, p_incident)` per incident,
  exactly as before, so jurisdiction authorization is still enforced server-side.
- Map info windows are built with DOM nodes and `textContent`; citizen descriptions and
  signed media URLs are never interpolated into markup.
- The reporting-area messaging in the report flow is presentational. `/api/capture` and
  `/api/reports` remain the only things that decide whether a location is acceptable.
