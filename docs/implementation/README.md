# Implementation baseline

Audit snapshot: 2026-09-05. These documents specify the product; they do not claim its application code already exists.

## Start here

Read repository-root AGENTS.md, then ARCHITECTURE.md, INVARIANTS.md, DOMAIN.md, PERSISTENCE.md, API.md, CLIENT.md and QUALITY.md. Select a bounded RCE assignment from STORIES.md and story-plan.json. Run `node scripts/show-story.mjs RCE-061` to print the bootstrap assignment and `node scripts/show-story.mjs --order` for dependency-first ordering. Check the latest linked Trello card when access exists and disclose the snapshot revision otherwise.

Trello controls workflow status; the repository stores versioned implementation contracts. Neither a detailed card nor a mock means a feature is complete. RCE-057 is archived and redirects to RCE-010. Do not implement a second geometry engine.

## Version 1

Deliver a responsive web app and installable PWA for multiple adult-user accounts, with registration/verification/recovery, account management, curated character catalog, private character creation/import/export, scenario-level customization, one human persona and one to four AI characters per private conversation, validated chat, recovery/revisions and private-data management.

The service remains API-first and model-independent. MCP is an adapter over the same authorized domain services. Global character cores, immutable releases, scenario instances and runtime state are separate. Private memories and relationships remain owner/continuity/branch scoped.

Explicit consenting-adult data is supported precisely, with real-user eligibility, fictional adulthood, content opt-in, current willingness and provider permission evaluated separately. PWA delivery does not establish provider, legal or native-store approval.

## User journey

Register and verify -> establish eligibility/content preferences -> browse or create character -> configure persona/lineup/scenario -> converse with attributed characters -> cancel/retry/revise -> resume on another device -> inspect/correct scoped state -> manage/export/delete account.

## Delivery gates

M0 creates runnable workspaces, schema/API contracts, migrations, identity and ownership. RCE-061 is the unblocked executable starting point against the documented baseline.

M1a proves a one-character browser/API/database journey with development OIDC and deterministic model fixtures. M1b completes four-character orchestration, authoring, correction/branching, portability, privacy, administration, accessibility, quotas, security and recovery. M1 launch also requires RCE-083 evidence and RCE-089 owner approvals.

M2 contains native clients subject to distribution approval, payments, public creator publishing, human multiplayer, generated audio/images, full visual timeline exploration and autonomous offscreen simulation. These are explicit exclusions, not forgotten requirements.

## Contract ownership

ARCHITECTURE.md owns boundaries and defaults. INVARIANTS.md (RCE-001, ADR-008) owns the normative INV-### rule set for authority, layer boundaries, isolation, atomicity, gating and lifetime, and binds each rule to a QUALITY.md fixture; it decides where another contract is ambiguous on those subjects. PERSISTENCE.md (RCE-002, ADR-009) owns storage shape, aggregate ownership, the atomic commit boundary, erasable payloads, retention categories and migration ordering. DOMAIN.md owns entities/lifetimes and the invariants specific to them. API.md owns routes/DTO/error/event behavior; RCE-053 turns it into executable OpenAPI and runtime schemas. CLIENT.md owns screens and interaction states. QUALITY.md owns verification and release evidence. STORY_TEMPLATE.md defines bounded coding tasks. SOURCES.md records primary external references.

The manifest factors repeated module contracts out of individual records; `show-story.mjs` expands them. A story's acceptance outcome, referenced shared contracts and live source card form its handoff. No claim is made that a backlog can eliminate every future ambiguity: unresolved details become visible contract changes or blockers, never silent agent assumptions.
