# Auth debug findings

## Confirmed cause

The configured `NEXT_PUBLIC_SUPABASE_URL` was a Supabase dashboard URL, not the project API origin. A request to its `/auth/v1/settings` returned HTTP 404, `text/html`. Reproducing `signUp` with the installed SSR client returned `AuthUnknownError` caused by a non-JSON response. The old action replaced that error with a generic signup message.

Read-only requests to the proper project API, using the existing keys in memory, returned:

- Auth settings: HTTP 200; email enabled; signup enabled; email confirmation required.
- Profiles table: HTTP 200; no profile rows at the time of inspection.

This confirms the URL error and valid keys. It does not prove email delivery or execution of the profile-creation trigger. No real account was created and no authentication bypass was added.

## Required operator correction

Replace only `NEXT_PUBLIC_SUPABASE_URL` in `.env.local` with **Project URL** from Supabase Connect/API settings (`https://<project-ref>.supabase.co`). Keep the publishable and server keys unchanged. Restart development, or rebuild and restart production, after the change. The agent did not edit `.env.local`.

Use `http://localhost:3000` consistently for the local app and open confirmation/recovery emails in the browser that requested them. The existing `/auth/callback` allowlist entry serves both signup and recovery; no extra recovery query-string allowlist entry is required now.

## Code changes

- Reject dashboard/path-bearing URLs and secret keys in the public-key field with a configuration message containing no credential values.
- Map provider codes to safe, actionable authentication messages. Development diagnostics contain error code/status/name only, not tokens, email addresses or raw provider messages.
- Explicitly enable cookie writes in Server Actions/callbacks; do not silently swallow their failures. Read-only Server Components retain the middleware-refresh arrangement.
- Route recovery using the installed SDK's PKCE recovery state, not a user-controlled redirect query.
- Treat Auth service outages as retryable page errors instead of falsely redirecting an existing session to signin.
- Keep Explore public and personal/report routes protected. Their navigation links already pointed to the correct routes. A user without a valid session must still sign in.

## Validation scope

The isolated auth regression suite uses the installed Supabase SSR SDK and application cookie adapter. It checks login cookie creation, a subsequent server request, token refresh, logout cookie removal, PKCE recovery state, correct route-guard behavior, URL validation and safe errors. Provider responses in these tests are fixtures; they are not proof of real email delivery or a real browser login.

Live signup, email confirmation, signin/refresh/logout, authenticated navigation, profile-trigger execution and the reporting acceptance sequence still require the corrected environment and a confirmed citizen account. Server geofencing, private evidence and RLS were not weakened. No database schema change was needed for the diagnosed URL error.
