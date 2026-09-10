# Implementation Plan: CivicPakistan

## Overview

Implement CivicPakistan as a modular monolith Next.js application backed by Supabase, organized into three sequential milestones:
1. **Part 1 — Foundation + Citizen Core**: Working citizen reporting flow
2. **Part 2 — AI + Government Operations**: Complete citizen → AI → government → resolution workflow
3. **Part 3 — Accountability + Production Finish**: Polished hackathon-ready product with public accountability

## Tasks

### Part 1 — Foundation + Citizen Core
*Milestone: Working citizen reporting flow*

- [ ] 1. Initialize Next.js TypeScript project with Supabase integration
  - Set up Next.js 14+ with App Router, TypeScript, Tailwind CSS
  - Configure Supabase client with environment variables
  - Set up Supabase CLI for local development
  - Create project structure with modules directory
  - *Requirements: 1.1–1.16, 2.1–2.12, 28.1–28.12*

- [ ] 2. Implement authentication module
  - [ ] 2.1 Create user registration with email/password validation
    - Implement RFC 5322 email validation, password requirements (8–128 chars, uppercase/lowercase/digit/special)
    - Handle duplicate email registration
    - *Requirements: 1.1–1.7*
  
  - [ ]* 2.2 Write property test for email validation
    - **Property 1: Email validation universality**
    - **Validates: Requirements 1.2**
  
  - [ ]* 2.3 Write property test for password constraints
    - **Property 2: Password constraint universality**
    - **Validates: Requirements 1.4, 1.5**
  
  - [ ] 2.4 Implement login, logout, session management
    - Handle invalid credentials with generic error messages
    - Implement rate limiting (5 failed attempts/15 minutes)
    - *Requirements: 1.7–1.16*
  
  - [ ] 2.5 Implement password reset flow
    - Send reset link expiring after 1 hour
    - Validate new password meets complexity requirements
    - *Requirements: 1.12–1.13*

- [ ] 3. Checkpoint - Authentication working
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 4. Implement geography/jurisdiction module
  - [ ] 4.1 Create database migrations for jurisdiction hierarchy
    - Create `jurisdictions` table with self-referencing parent_id
    - Add PostGIS geography column for boundaries
    - Create indexes for spatial queries
    - *Requirements: 3.1–3.13, Design: Jurisdiction hierarchy*
  
  - [ ]* 4.2 Write property test for jurisdiction name uniqueness
    - **Property 4: Jurisdiction name uniqueness enforcement**
    - **Validates: Requirements 3.9, 3.10**
  
  - [ ] 4.3 Implement jurisdiction CRUD API (Platform_Admin only)
    - Create, read, update jurisdiction boundaries
    - Validate parent-child relationships
    - Prevent deletion with dependent entities
    - *Requirements: 3.9–3.13*
  
  - [ ] 4.4 Implement PostGIS boundary validation functions
    - Create server-side `ST_Within` validation
    - Validate coordinates fall within Pakistan boundaries
    - *Requirements: 4.8–4.10, Design: Geofence validation*

- [ ] 5. Implement capture sessions and evidence storage
  - [ ] 5.1 Create capture session data model
    - Create `capture_sessions` table with coordinates, accuracy, jurisdiction_id
    - Implement 5-minute expiry validation
    - *Requirements: 4.1–4.13, Design: Capture sessions*
  
  - [ ]* 5.2 Write property test for GPS accuracy threshold
    - **Property 5: GPS accuracy threshold**
    - **Validates: Requirements 4.4, 4.5**
  
  - [ ]* 5.3 Write property test for coordinate boundary containment
    - **Property 6: Coordinate boundary containment**
    - **Validates: Requirements 4.8, 4.9, 4.10**
  
  - [ ]* 5.4 Write property test for location staleness threshold
    - **Property 7: Location staleness threshold**
    - **Validates: Requirements 4.12, 4.13**
  
  - [ ] 5.5 Implement evidence storage pipeline
    - Configure Supabase Storage private/public buckets
    - Create signed URL generation for client uploads
    - Implement EXIF stripping for public derivatives
    - *Requirements: 5.1–5.16, 27.1–27.11, Design: Evidence storage*

- [ ] 6. Implement citizen report submission flow
  - [ ] 6.1 Create live camera capture component
    - Implement browser Camera API with permission handling
    - Prevent gallery/file uploads
    - Embed EXIF metadata with GPS coordinates
    - *Requirements: 5.1–5.5*
  
  - [ ] 6.2 Implement report submission server action
    - Validate GPS accuracy ≤ 100m, location staleness ≤ 60s
    - Validate at least one photo, maximum 5 photos ≤ 2MB each
    - Accept urgency selection (URGENT_HAZARD/MAINTENANCE)
    - Accept optional description ≤ 500 characters
    - *Requirements: 6.1–6.12*
  
  - [ ]* 6.3 Write property test for report identifier uniqueness
    - **Property 8: Report identifier uniqueness**
    - **Validates: Requirements 6.7**
  
  - [ ] 6.4 Create citizen reports data model
    - Create `citizen_reports` table with status tracking
    - Link to capture sessions and evidence
    - *Requirements: 6.1–6.12, Design: Citizen reports*

- [ ] 7. Implement citizen dashboard and navigation
  - [ ] 7.1 Create city home dashboard
    - Display open/resolved/overdue incident counts
    - Show recent incidents list
    - Show map with incident locations
    - *Requirements: 18.1–18.11*
  
  - [ ] 7.2 Implement personal report tracking view
    - Show all submitted reports with status
    - Display rejection reasons if applicable
    - Show contribution score (placeholder for Part 3)
    - *Requirements: 19.1–19.10*
  
  - [ ] 7.3 Implement public incident exploration
    - Allow unauthenticated viewing of accepted incidents
    - Filter by status, urgency, category, date range
    - Show incident details with evidence timeline
    - *Requirements: 20.1–20.10*
  
  - [ ] 7.4 Implement map interface
    - Integrate MapLibre GL JS
    - Show incidents with status-based markers
    - Implement clustering at zoomed-out levels
    - *Requirements: 22.1–22.10, Design: Map experience*

- [ ] 8. Checkpoint - Part 1 complete
  - Ensure citizen can: authenticate, select jurisdiction, view city dashboard, grant GPS permission, capture live camera evidence, submit report, view submissions
  - Ask the user if ready to proceed to Part 2

### Part 2 — AI + Government Operations
*Milestone: Complete citizen → AI analysis → government review → resolution workflow*

- [ ] 9. Implement Civic AI Orchestrator
  - [ ] 9.1 Create AI provider abstraction layer
    - Define interface for Anthropic/OpenAI multimodal API
    - Implement structured output validation with Zod
    - *Requirements: 7.1–7.15, Design: AI architecture*
  
  - [ ] 9.2 Implement AI analysis pipeline
    - Accept report ID, photos, GPS coordinates, urgency, description
    - Generate summary ≤ 200 characters
    - Recommend category, urgency, workstream
    - Return duplicate candidate IDs
    - *Requirements: 7.1–7.8*
  
  - [ ] 9.3 Implement AI failure handling
    - 30-second timeout with 3 retries (1s→2s→4s→max 30s)
    - Circuit breaker: 5 failures/60s → open 120s → half-open → close
    - Mark `requires_manual_classification` on failure
    - *Requirements: 7.9–7.14, 31.1–31.19*
  
  - [ ] 9.4 Create AI assessments data model
    - Create `ai_assessments` table with confidence scores
    - Store raw response JSON for auditability
    - Link to reports and incidents
    - *Design: AI assessments table*

- [ ] 10. Implement duplicate detection pipeline
  - [ ] 10.1 Create PostGIS duplicate proximity search
    - Find reports within 100m using `ST_DWithin`
    - Filter by same category and submission within 7 days
    - *Requirements: 7.8, 8.1*
  
  - [ ]* 10.2 Write property test for duplicate detection predicate conjunction
    - **Property 9: Duplicate detection predicate conjunction**
    - **Validates: Requirements 7.8, 8.1, 8.2**
  
  - [ ] 10.2 Implement duplicate association workflow
    - When government confirms duplicate: increment confirmation count, add evidence, credit contributor
    - Prevent new incident creation for duplicates
    - Handle recurrence detection (within 50m of VERIFIED_RESOLVED)
    - *Requirements: 8.3–8.12*
  
  - [ ]* 10.3 Write property test for duplicate association invariants
    - **Property 10: Duplicate association invariants**
    - **Validates: Requirements 8.3, 8.4, 8.5, 8.6, 8.7**

- [ ] 11. Implement government authorization and roles
  - [ ] 11.1 Create government membership system
    - Create `government_memberships` table linking users to jurisdictions
    - Implement role assignment (Government_User, Platform_Admin)
    - *Requirements: 2.1–2.12, Design: Role definitions*
  
  - [ ]* 11.2 Write property test for role-permission denial universality
    - **Property 3: Role-permission denial universality**
    - **Validates: Requirements 2.9**
  
  - [ ] 11.2 Implement RLS policies for government access
    - Government users can only access their jurisdiction incidents
    - Platform_Admin can manage users and system config
    - *Requirements: 2.5–2.7, Design: RLS policies*

- [ ] 12. Checkpoint - AI and government foundation
  - Ensure AI analysis works, duplicate detection functions, government roles enforced
  - Ask the user if questions arise before proceeding

- [ ] 13. Implement government review queue
  - [ ] 13.1 Create government dashboard
    - Show pending reports for jurisdiction (newest first)
    - Display AI recommendations, photos, map location
    - Allow filtering by urgency and category
    - *Requirements: 9.1–9.10*
  
  - [ ] 13.2 Implement report acceptance workflow
    - Validate report is in "Pending Review" status
    - Create Civic_Incident with unique ID
    - Set category, urgency, workstream from government selection
    - Calculate SLA deadline: 48h for URGENT_HAZARD, 7d for MAINTENANCE
    - *Requirements: 10.1–10.19*
  
  - [ ]* 13.3 Write property test for SLA deadline arithmetic
    - **Property 12: SLA deadline arithmetic**
    - **Validates: Requirements 10.11, 10.12, 12.3**
  
  - [ ] 13.3 Implement report rejection workflow
    - Require rejection reason 20–500 characters
    - Record rejection in audit trail with timestamp and user
    - Notify citizen with reason
    - Prevent incident creation
    - *Requirements: 11.1–11.14*
  
  - [ ]* 13.4 Write property test for rejection reason length constraint
    - **Property 11: Rejection reason length constraint**
    - **Validates: Requirements 11.4, 11.5**

- [ ] 14. Implement incident state machine and SLA tracking
  - [ ] 14.1 Create incidents data model
    - Create `incidents` table with status lifecycle
    - Create `incident_events` append-only audit table
    - Implement state transitions: SUBMITTED → UNDER_REVIEW → ACCEPTED/REJECTED/ASSOCIATED_DUPLICATE → IN_PROGRESS → RESOLVED → VERIFIED_RESOLVED
    - *Design: Incident state machine*
  
  - [ ] 14.2 Implement overdue calculation
    - Derived condition: `now() > sla_deadline` AND status IN (ACCEPTED, IN_PROGRESS)
    - Never stored as status column
    - *Requirements: 12.1–12.14, Design: OVERDUE derivation*
  
  - [ ]* 14.3 Write property test for OVERDUE derivation correctness
    - **Property 13: OVERDUE derivation correctness**
    - **Validates: Requirements 12.5**
  
  - [ ] 14.3 Implement government progress updates
    - Allow updates of 10–500 characters
    - Record in audit trail with timestamp
    - Optionally update status to "In Progress"
    - Notify reporting citizen
    - *Requirements: 13.1–13.9*

- [ ] 15. Implement incident resolution with evidence
  - [ ] 15.1 Create resolution evidence upload
    - Allow government to upload 1–5 resolution photos ≤ 5MB each
    - Require resolution notes 20–500 characters
    - Store in evidence table with `is_resolution_evidence` flag
    - *Requirements: 14.1–14.17*
  
  - [ ] 15.2 Implement resolution workflow
    - Validate government user jurisdiction matches incident
    - Update incident status to "Resolved"
    - Compare resolution timestamp to SLA deadline
    - Record SLA compliance: "Met" if resolved ≤ deadline, "Missed" if >
    - *Requirements: 14.1–14.17*
  
  - [ ]* 15.3 Write property test for SLA compliance tagging at resolution
    - **Property 14: SLA compliance tagging at resolution**
    - **Validates: Requirements 14.10, 14.11, 14.12**

- [ ] 16. Checkpoint - Part 2 complete
  - Ensure complete workflow: citizen report → AI analysis → government review → accept/reject → SLA tracking → progress updates → resolution with evidence
  - Ask the user if ready to proceed to Part 3

### Part 3 — Accountability + Production Finish
*Milestone: Complete polished hackathon-ready CivicPakistan product*

- [ ] 17. Implement public accountability timeline
  - [ ] 17.1 Create comprehensive incident timeline
    - Display initial report with evidence and AI recommendations
    - Show acceptance details: category, urgency, workstream, SLA deadline
    - Show all progress updates chronologically
    - Show resolution evidence and SLA compliance status
    - *Requirements: 21.1–21.13*
  
  - [ ] 17.2 Implement resolution verification
    - Prompt original reporter for verification after resolution
    - Options: "Yes, it's fixed", "No, still a problem", "I haven't checked"
    - Allow verification notes ≤ 300 characters
    - Update incident to "Verified Resolved" or flag for re-review
    - *Requirements: 15.1–15.11*
  
  - [ ] 17.3 Implement citizen confirmations
    - Allow any citizen to confirm publicly visible incidents
    - Increment confirmation count, record in audit trail
    - Prevent duplicate confirmations by same citizen
    - Credit confirming citizen with contribution
    - *Requirements: 16.1–16.10*
  
  - [ ] 17.4 Implement citizen and government comments
    - Allow authenticated comments 5–500 characters
    - Distinguish citizen vs government comments
    - Moderate for spam/abuse (Platform_Admin)
    - Display chronologically on timeline
    - *Requirements: 17.1–17.10*

- [ ] 18. Implement civic contribution scoring
  - [ ] 18.1 Create contribution ledger
    - Create `contribution_ledger` append-only table
    - Define event types and point values: +10 (accepted report), +5 (duplicate), +3 (confirmation), +5 (verified "fixed"), +3 (verified "still problem"), -5 (spam/fabricated), 0 (other rejections)
    - Calculate score as `MAX(0, SUM(points_delta))`
    - *Requirements: 23.1–23.17, Design: Scoring architecture*
  
  - [ ]* 18.2 Write property test for citizen contribution score accumulation
    - **Property 15: Citizen contribution score accumulation**
    - **Validates: Requirements 23.1, 23.7, 23.8, 23.16, 23.17**
  
  - [ ] 18.2 Implement city leaderboard
    - Rank citizens by Civic_Contribution_Score within city
    - Display top 10 on city home dashboard
    - Allow opt-out from public display
    - Reset monthly (1st of month, 00:00 PKT)
    - *Requirements: 24.1–24.9*

- [ ] 19. Implement government performance metrics
  - [ ] 19.1 Create performance snapshot system
    - Create `performance_snapshots` table with daily scores
    - Calculate SLA compliance rate: resolved within SLA / total resolved (30d)
    - Calculate verified resolution rate: verified "fixed" / total resolved (30d)
    - Calculate avg first response hours: mean(acceptance → first update/resolution)
    - Calculate backlog health: 1 - (overdue % / 100)
    - *Requirements: 25.1–25.20*
  
  - [ ]* 19.2 Write property test for government performance score formula correctness
    - **Property 16: Government performance score formula correctness**
    - **Validates: Requirements 25.8, 25.9, 25.10**
  
  - [ ] 19.2 Implement score aggregation hierarchy
    - City score = composite of local metrics
    - Province score = mean of city scores within province
    - Pakistan score = mean of province scores
    - Update daily at 00:00 PKT via Vercel Cron Job
    - *Requirements: 25.16–25.19*

- [ ] 20. Implement civic intelligence and analytics
  - [ ] 20.1 Create AI civic intelligence module
    - Analyze resolved incidents for recurring problem locations
    - Identify geographic hotspots and seasonal patterns
    - Generate citizen-friendly natural language summaries
    - Display on city home dashboard and public transparency views
    - *Requirements: 26.1–26.10*
  
  - [ ] 20.2 Implement public analytics dashboard
    - Show incidents by category, urgency, status over time
    - Display geographic distribution on map
    - Show government performance trends
    - Provide export functionality for research
    - *Requirements: 20.1–20.10, 25.14–25.15*

- [ ] 21. Implement privacy and security hardening
  - [ ] 21.1 Enhance privacy protections
    - Store citizen location with 50m precision only
    - Display public locations with 100m precision
    - Strip all personal metadata from public evidence derivatives
    - Implement data retention: personal data deleted after 2 years for closed incidents
    - *Requirements: 27.1–27.11*
  
  - [ ] 21.2 Implement abuse prevention
    - Rate limiting: 5 reports/hour, 20 confirmations/hour, 10 comments/hour
    - Detect suspicious patterns: identical photos, rapid submissions
    - Flag for Platform_Admin review
    - Implement CAPTCHA after 100 requests/hour per IP
    - *Requirements: 28.1–28.12*
  
  - [ ]* 21.3 Write property test for audit log immutability
    - **Property 18: Audit log immutability**
    - **Validates: Requirements 29.1, 29.2, 29.3**

- [ ] 22. Implement accessibility and mobile polish
  - [ ] 22.1 Ensure WCAG 2.1 Level AA compliance
    - Provide text alternatives for non-text content
    - Ensure keyboard accessibility
    - Maintain 4.5:1 color contrast for normal text
    - Use semantic HTML and ARIA labels
    - *Requirements: 34.1–34.12*
  
  - [ ] 22.2 Optimize mobile experience
    - Render citizen interfaces optimally on 320px–768px screens
    - Provide 44px minimum tap targets
    - Optimize photo capture for mobile cameras
    - Minimize data usage with compression
    - *Requirements: 32.1–32.10*
  
  - [ ] 22.3 Implement desktop government interface
    - Multi-column layouts for review queue, map, detail panels
    - Keyboard shortcuts for common actions
    - High-resolution photo review
    - Advanced filtering and batch operations
    - *Requirements: 33.1–33.9*

- [ ] 23. Implement production deployment setup
  - [ ] 23.1 Configure production environment
    - Set up environment variables for production
    - Configure Supabase production project with PostGIS
    - Set up Vercel deployment with proper build settings
    - Configure CI/CD pipeline
    - *Design: Deployment architecture*
  
  - [ ] 23.2 Implement observability and monitoring
    - Log errors with stack traces and context
    - Emit metrics for request rates, response times, error rates
    - Provide health check endpoints
    - Set up alerts for error rates > 5% or AI latency > 15s
    - *Requirements: 36.1–36.11*
  
  - [ ]* 23.3 Write property test for configuration parser round-trip
    - **Property 17: Configuration parser round-trip**
    - **Validates: Requirements 37.3, 37.4**
  
  - [ ] 23.3 Create demo seed data
    - Seed jurisdictions: Pakistan → Province → City hierarchy
    - Create sample government users and citizens
    - Create sample incidents across various statuses
    - Generate realistic civic contribution scores
    - *For hackathon demonstration*

- [ ] 24. Final checkpoint - Production ready
  - Ensure all tests pass, fix any lint/type/build issues
  - Verify complete workflow from citizen report to verified resolution
  - Confirm public accountability timeline displays all required information
  - Verify scoring and performance metrics calculate correctly
  - Ensure accessibility and mobile responsiveness
  - Ready for hackathon demonstration

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties
- Unit tests validate specific examples and edge cases
- All database migrations should preserve existing design schema
- Modular monolith architecture must be maintained
- AI remains advisory only; government makes all accept/reject/resolve decisions
- OVERDUE is derived, not stored as a status column
- Audit logs and contribution ledger are append-only
- Test tasks marked optional can be implemented later if time permits

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["2.1", "4.1"] },
    { "id": 1, "tasks": ["2.4", "4.3", "4.4", "5.1", "5.5"] },
    { "id": 2, "tasks": ["2.2", "2.3", "4.2", "5.2", "5.3", "5.4", "6.1"] },
    { "id": 3, "tasks": ["6.2", "6.4", "7.1", "7.2"] },
    { "id": 4, "tasks": ["6.3", "7.3", "7.4"] },
    { "id": 5, "tasks": ["9.1", "9.2", "10.1", "11.1"] },
    { "id": 6, "tasks": ["9.3", "9.4", "10.2", "10.2", "11.2", "11.2"] },
    { "id": 7, "tasks": ["10.3", "13.1", "13.2", "13.3"] },
    { "id": 8, "tasks": ["13.3", "13.4", "14.1", "14.2"] },
    { "id": 9, "tasks": ["14.3", "15.1", "15.2"] },
    { "id": 10, "tasks": ["15.3", "17.1", "17.2", "17.3"] },
    { "id": 11, "tasks": ["17.4", "18.1", "18.2", "19.1"] },
    { "id": 12, "tasks": ["18.2", "19.2", "20.1", "20.2"] },
    { "id": 13, "tasks": ["21.1", "21.2", "21.3", "22.1"] },
    { "id": 14, "tasks": ["22.2", "22.3", "23.1", "23.2"] },
    { "id": 15, "tasks": ["23.3", "23.3"] }
  ]
}
```