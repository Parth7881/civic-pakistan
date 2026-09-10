---
inclusion: auto
name: CivicPakistan Product Context
description: Core product definition, principles, and workflows for the CivicPakistan civic accountability platform
---

# CivicPakistan Product Context

## Product Definition

CivicPakistan is an AI-assisted civic issue resolution, transparency, and government accountability platform for Pakistan.

This is not a complaint portal. It connects real-world citizen evidence with an auditable government resolution workflow so citizens can report civic problems, authorities can act on them, and the public can transparently see what happened afterward.

## Core Problem

Citizens regularly encounter civic problems:
- Dangerous potholes and damaged roads
- Fallen trees and road blockages
- Garbage accumulation
- Drainage and sewage problems
- Damaged public infrastructure
- Unsafe or obstructed public spaces
- Other government/municipality-maintained civic issues

The problem extends beyond difficult reporting. Citizens lack transparency around:
- Whether government received the report
- Whether it was accepted or rejected, and why
- Whether action started
- Whether resolution exceeded target time
- Whether the issue was genuinely fixed
- How effectively the responsible civic authority performs

## Core Product Loop

1. See a civic problem
2. Report it from the real location
3. Submit live evidence
4. AI converts the raw report into structured civic context
5. Government reviews it
6. Government accepts or rejects it
7. Accepted issues enter a tracked resolution workflow
8. Resolution evidence becomes visible
9. Citizens verify the outcome
10. Civic performance becomes measurable and transparent

## Target Users

1. **Citizens** — report issues, track resolution, verify outcomes
2. **Authorized government/municipal authority users** — review, accept, resolve
3. **Public visitors** — view civic transparency information
4. **Protected platform administrators** — manage the system

## Geographic Scope

**Pakistan only.**

User-facing geography remains simple:
- Pakistan → Province/Region → City/Local Civic Area

Citizens can browse civic information at city, province/region, and Pakistan levels.

New incident reporting is restricted to the citizen's active civic jurisdiction and requires live location verification.

## Core Citizen Principles

- Reporting must be extremely simple
- Initial incident evidence must come from the live in-app camera
- No gallery/file upload for initial citizen evidence
- Live location is required
- Citizens may add an optional short description
- Users may explore public incidents and maps
- Users can confirm existing incidents
- Users can comment separately from confirmations
- Users can track their reports
- Users can verify whether resolved issues appear genuinely fixed
- Useful civic participation contributes to a verified Civic Impact score
- City-level contributor leaderboard should reward meaningful participation, not raw report volume

## Issue Urgency

The citizen experience exposes two simple reporting lanes:

1. **Urgent Civic Hazard**
2. **Civic Maintenance**

Citizen urgency is a proposed classification. AI may recommend a different urgency/category, but government remains responsible for final operational decisions.

## AI Role

**AI is a Civic Copilot, not an autonomous government authority.**

AI may assist with:
- Understanding image + citizen description
- Concise incident summarization
- Category recommendation
- Urgency recommendation
- Responsible workstream recommendation
- Likely duplicate identification
- Recurring civic problem analysis
- City-level civic intelligence
- Citizen-friendly summaries

AI must not autonomously:
- Accept incidents
- Reject incidents
- Declare resolution
- Bypass permissions
- Bypass geofencing
- Arbitrarily calculate civic scores
- Rewrite audit history

Human government users remain responsible for government decisions.

## Duplicate Philosophy

Multiple citizens may report the same physical civic problem. The system should avoid creating unnecessary duplicate public incidents.

A likely duplicate should strengthen the existing incident through:
- Additional citizen confirmation
- Additional evidence
- Additional civic contribution attribution

A legitimate duplicate should not simply be described as "rejected."

Previously resolved issues that recur may create a new incident while preserving recurrence history.

## Government Accountability Principles

Government users work inside the same application through protected role-based views.

They should be able to:
- Review incoming issues
- Inspect location and evidence
- View AI recommendations
- Accept incidents
- Reject incidents only with a mandatory reason
- Update progress
- Resolve incidents with supporting evidence

Government actions must be auditable. Rejection reasons must become part of the accountability record. Accepted incidents should have a target resolution time/SLA. Overdue incidents should be publicly identifiable. Resolution should support before/after evidence. Government users must not be able to silently erase accountability history.

## Public Transparency

Public incident information should make it easy to understand:
- What happened
- Where it happened
- When it was reported
- What government decided
- Why it was rejected (if applicable)
- What progress occurred
- Whether it became overdue
- When/how it was resolved
- Before/after evidence
- Citizen verification

Public civic information may be viewed at:
- Local/city level
- Province/region level
- Pakistan aggregate level

## Civic Performance

**Government Civic Performance must use deterministic, auditable operational metrics** rather than an arbitrary LLM rating.

Potential dimensions include:
- SLA compliance
- Verified resolution rate
- First response timeliness
- Citizen-confirmed resolution
- Backlog health

## Citizen Civic Impact

Citizens should earn recognition for verified, useful civic participation.

The score must not simply reward report volume. Spam, duplicate farming, fabricated activity, or unsafe behavior must not be rewarded equivalently.

## Product Experience

The product should be:
- Calm
- High trust
- Highly intuitive
- Minimal
- Mobile friendly for citizens
- Operationally clear on desktop for government users
- Map-aware where location adds value
- Accessible
- Visually polished

Take inspiration from the usability philosophy of products such as Google Maps without copying Google branding, proprietary layouts, assets, or exact UI.

Use a restrained Pakistan public-service visual identity.

**Avoid:**
- Generic AI-looking gradients
- Robot imagery
- Excessive dashboards
- Unnecessary cards
- Clutter
- AI-generated sounding marketing language
- Excessive animation

A new citizen should rapidly understand: **"See a problem → Report it → Track what happens."**

## Production Philosophy

Build a production-oriented architecture but avoid unnecessary infrastructure complexity.

Important principles:
- Secure authentication
- Role-based authorization
- Jurisdiction-based authorization
- Privacy-aware evidence handling
- Live-location validation
- Immutable/auditable civic history
- Graceful AI failure
- Anti-spam/abuse protections
- Reliable error states
- Responsive UX
- Secure handling of secrets
- Public/private data separation
- Observability and testability

The system should remain usable even if AI temporarily fails.

## Implementation Strategy

The eventual implementation will be organized into three major parts:

- **Part 1** — Foundation + Citizen Core
- **Part 2** — AI + Government Operations
- **Part 3** — Accountability + Production Polish + Testing + Deployment

These will be addressed through structured spec workflows when implementation begins.
