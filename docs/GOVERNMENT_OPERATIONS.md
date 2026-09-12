# Government operations setup

Apply `20260910175958_government_operations.sql` after the Citizen Core and reporting-location migrations, then apply `20260911003125_platform_admin_provisioning.sql`. These additive migrations create the government lifecycle, memberships, audit records, completion evidence, contribution ledger, and Platform Admin provisioning functions.

## Platform Admin provisioning

Government signup remains intentionally unavailable. A signed-in `platform_admin` provisions accounts at `/admin/government-users`. The page supports a Supabase email invitation or an initial password, assigns one validated local civic area, and records the Reviewer or Operator membership atomically. It also supports membership edits and reversible access disablement.

Reviewers can accept or reject submitted reports in their assigned civic areas. Operators can also publish progress updates, upload completion evidence, and resolve accepted work. The database enforces the Operator requirement for progress and resolution records.

The Auth Admin API is called only by the protected Next.js route handler. The service-role key is never serialized into browser code. Both the page and API independently validate the signed-in user against `profiles.role='platform_admin'`; the database functions repeat the actor, local-jurisdiction, and role checks.

One trusted bootstrap Platform Admin must already exist. If the project has no Platform Admin, promote the first trusted operator out of band in Supabase before using the UI. After that bootstrap, Government user provisioning does not require manual SQL.

For invitations, add `<NEXT_PUBLIC_APP_URL>/auth/invite` to Supabase Auth's allowed redirect URLs and keep the Invite User email template enabled. The application consumes the one-time invite session, removes tokens from the address bar, and sends the user to the existing password setup page.

One Supabase identity has one email and one platform role; use separate email identities when a person genuinely needs both citizen and government accounts.

Government operations run through authenticated server code and service-role-only database functions. Every function rechecks the actor's profile role and jurisdiction membership. The browser never receives the service key. The government tables have RLS enabled and no `anon` or `authenticated` grants.

## Evidence-quality assessment

The AI assessment is off by default. To enable it explicitly, set:

```text
CIVIC_AI_EVIDENCE_ENABLED=true
OPENAI_API_KEY=<server-only key>
CIVIC_EVIDENCE_MODEL=gpt-5.6-luna
```

When enabled, up to three sanitized display derivatives are sent to the configured OpenAI Responses API. The request disables response storage. The model returns a 0–10 photographic-usefulness score and one short note. Failures never block report recording; the score becomes unavailable. This score is advisory and never changes acceptance, rejection, contribution points, or government performance.

## Acceptance checks

1. Sign in through `/government/sign-in` with a provisioned account. Confirm a citizen account is rejected.
2. Confirm the queue contains only assigned jurisdictions. Test a forged incident URL from another jurisdiction.
3. Accept one report and verify category, workstream, public visibility, 48-hour/7-day SLA, citizen status, audit event, and one ledger credit.
4. Reject another with fewer than 20 characters, then with a valid reason. Confirm the first is blocked and the reason appears only to the report owner.
5. As an Operator, add a progress update. Confirm the incident and citizen report show In Progress and the public timeline displays the update; confirm a Reviewer is denied.
6. Resolve with 1–5 JPEG/PNG images and 20–500 characters. Confirm sanitized completion images, resolution note, status, timestamp, and SLA outcome appear publicly.
7. Verify anonymous/authenticated direct table writes and direct function calls are denied. Confirm an assigned government account cannot access another area's exact coordinates or evidence.
8. As a citizen and ordinary Government user, request `/admin/government-users` and its API directly; confirm access is denied. As Platform Admin, create an invited user, edit its membership, disable access, and confirm an existing session can no longer open Government pages.

The application does not fabricate a composite performance score. It shows components supported by existing lifecycle records and withholds the composite until citizen verification and complete response-timing data exist.
