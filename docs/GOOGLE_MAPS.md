# Google Maps configuration

CivicPakistan renders all maps with the **Google Maps JavaScript API**, loaded once per
browser session by `components/map/maps-loader.ts`.

## 1. What you must configure

One environment variable:

```
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=AIza...
```

This is a **browser key**. It is sent to every visitor by design. No server secret
(`SUPABASE_SERVICE_ROLE_KEY`, `OPENAI_API_KEY`, `DATABASE_URL`) is ever read by map code.

Restart the dev server or rebuild after setting it — `NEXT_PUBLIC_*` values are inlined at
build time.

## 2. Google Cloud setup

1. Create or select a project in the Google Cloud console.
2. **APIs & Services → Library**: enable **Maps JavaScript API**. Enable nothing else.
   The application does not call Places, Geocoding, Directions, Distance Matrix, Roads or
   Static Maps, so leaving those disabled avoids their billing.
3. **APIs & Services → Credentials → Create credentials → API key**.
4. Open the new key and apply **both** restrictions:
   - **Application restrictions → Websites (HTTP referrers)**. Add only the origins that
     serve the app, for example:
     ```
     http://localhost:3000/*
     http://localhost:3001/*
     https://your-production-domain/*
     ```
     A key with no referrer restriction can be copied off the page and billed by anyone.
   - **API restrictions → Restrict key → Maps JavaScript API**.
5. Set a billing budget and an alert on the project. Map loads are billed per load.

## 3. Optional extras (not enabled, and not required)

- **Places API** would be needed for worldwide address/place autocomplete. It is **not**
  used. Location search in Explore and the Government map searches the platform's own
  civic areas, categories and report IDs instead, which costs nothing and covers the
  cities the platform actually operates in. Enable Places only if you later want
  arbitrary worldwide address search, and budget for it separately.
- **Map ID / cloud styling** is not required. The basemap is styled in JavaScript
  (`MAP_STYLE` in `components/map/maps-config.ts`), which works on a plain key. If you
  later create a Cloud Map ID you can switch to Advanced Markers, but nothing today
  depends on one.

## 4. Behaviour without a key

Every map surface falls back to a developer configuration notice naming the missing
variable, and the surrounding page keeps working: Explore still lists reports, the report
flow still verifies location, and the government queue still opens records. No map is
described as "unavailable" to citizens as a dead end — the report list is always present.

## 5. What the maps show

| Surface | Data | Precision |
| --- | --- | --- |
| Landing, Explore, Home, public case detail | `list_public_incidents()` RPC | Coordinates rounded to 3 decimal places by the database (~110 m) |
| Report → verify location | The citizen's own live GPS reading | Exact, in the citizen's browser only |
| Government overview / live map / case detail | `government_incident_location(p_actor, p_incident)` RPC | Exact, and only for incidents inside the officer's authorized jurisdictions |

The frontend never widens any of this. Rejected reports do not appear on the public map
because the RPC does not return them, and the government map calls the authorization RPC
per incident exactly as the previous implementation did.

## 6. Reporting area versus map browsing

The map pans and zooms worldwide. **Reporting does not.** The report flow shows a
persistent "Reporting area · <city>" banner, repeats the constraint in the location step,
and surfaces an explicit "This location is outside your active reporting area" message
with a link to change the active city when the server rejects a position. The server-side
geofence in `/api/capture` and `/api/reports` is unchanged and remains the only thing that
actually decides whether a report is accepted.
