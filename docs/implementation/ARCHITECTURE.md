# Architecture and decision register

## ADR-001: delivery surface and scope

Implementation default for this audit: responsive web/PWA first. Keep a transport-independent character/state service behind an HTTP API and an optional MCP adapter. Native mobile applications may consume the same API later. Do not disguise adult functionality to obtain store approval. Public deployment is blocked until RCE-089 records distribution, age-assurance, geography, provider and privacy decisions.

Version 1 supports many independent accounts, but each conversation contains one human-controlled persona and one to four AI-controlled instances. Curated shared catalog plus private authoring is supported. Public user publishing, human multiplayer, payments and generated audio/images are deferred. Portrait uploads are permitted only through the bounded media pipeline.

## ADR-002: implementation stack

Use TypeScript strict and Node 24 LTS with npm workspaces. apps/api uses Express 5; apps/web uses Vue 3 with Vite and Vue Router; apps/worker is a separate process. packages/domain contains pure domain rules; packages/contracts contains schemas/DTOs; packages/client contains typed API access. PostgreSQL stores authoritative data and a durable outbox/job queue. pgvector or another search index is optional and rebuildable; no vector result is canonical truth. Local OIDC uses Keycloak; a maintained OIDC client handles authorization-code + PKCE. Use same-origin server sessions for the browser. Do not hand-roll password storage or OAuth cryptography.

These are concrete implementation defaults, not claims that providers are selected for production. Pin tested package/container versions and lockfiles in RCE-061. Do not reuse unverified dependency ranges from earlier conversation snippets. Existing LICENSE remains unchanged. No React.

## ADR-003: character layers

A creator-owned global CharacterCore has immutable published CharacterRelease versions. A scenario CharacterInstance pins a release plus explicit overrides. RuntimeState contains temporary conditions and physical state. A core edit creates a new release; it never updates existing scenarios implicitly.

Resolution is field-aware: species/preset/archetype defaults initialize a release; explicit core values override defaults; authorized scenario definition overrides override that pinned core. Runtime changes modify only runtime fields and approved temporary modifications. A mood change cannot edit core values. User identity/pronouns, anatomy, appearance, orientation and relationship configuration are independent. Locks prevent model-derived edits, not authorized scoped author operations. Security/age gates cannot be overridden by fiction.

Each instance has a continuity and owner. Memories, relationships, beliefs, goals, focus and corrections are isolated by continuity/branch and instance. Global promotion is an explicit authorized operation. A character appearing in another account never imports the first account's memories.

## ADR-004: canonical state and commits

An incoming user message is durable input, not proof its described changes occurred. Build a proposed action plan against a versioned snapshot, generate a candidate outside any database transaction, extract claims/actions, validate, then commit. Keep canonical transcript and domain state consistent.

The commit transaction checks owner, current eligibility, active branch, expected scene revision and worker fencing token. It atomically appends accepted domain events, stores validated assistant utterances, updates current projections/turn outcome and adds outbox intent. Required deterministic memory facts may be committed with events; expensive derived projections run idempotently afterward. A following turn must wait for relevant projection checkpoints or read authoritative recent events, never silently use stale memory.

Use an append-only logical event history with separately erasable personal payloads. Privacy erasure overrides archival convenience. Separate content payloads and minimum integrity metadata so deletion is possible. Restoring backups reapplies deletion tombstones before serving requests.

## ADR-005: output and concurrency

V1 buffers model output until validation and commit succeed. SSE publishes durable status and committed output. A typing/progress indicator is not an excuse to expose unvalidated tokens. Progressive display may occur after commit. Optimistic concurrency uses integer revisions; at most one canonical commit wins a given scene revision. Other attempts receive conflict or regenerate against fresh context.

Idempotency is scoped to owner, endpoint and key plus canonical request hash. Duplicate identical input returns the same resource/result; key reuse with different input returns conflict. Jobs have leases and monotonically increasing fencing tokens. At-least-once delivery is expected; consumers deduplicate. Exactly-once external model calls/costs are not promised.

Cancel before commit prevents state mutation and fences late results. If commit already won, return committed. Revisions/regeneration create a child branch from the pre-turn state and switch active branch only after successful replacement. Old branches remain auditable and excluded from active retrieval.

## ADR-006: security and adult-use boundary

Account access, fictional adult eligibility, player content authorization, character current willingness and provider capability are evaluated separately. Do not derive consent from preference, orientation, relationship status, bodily response or silence. Current consent can be scoped and ongoing; revalidate when its scope changes or it is withdrawn, without forcing repetitive canned dialogue.

Model/refusal behavior is a typed adapter outcome. A refusal cannot alter canon or trigger hidden fallback designed to evade provider rules. Explicit adult data remains precisely represented, rather than being euphemized in storage, when all applicable gates permit processing. No real intimate transcripts, identity documents or secrets in source control or standard telemetry.

## ADR-007: state lifetime

Disconnect, browser close and room departure are not scene teardown. Scenes persist for resume. A user-approved ephemeral environment may reset on explicit teardown/expiry; ordinary persistent inventory and promoted facts survive. Reset previews affected entities and cannot clone or silently delete owned objects. Core, scenario, scene, momentary and derived lifetimes are explicit per property.

## Module layout and commands

apps/api: auth, controllers, validation and service composition. apps/web: screens and state presentation only. apps/worker: generation and projection orchestration. packages/domain: entities, reducers, permission-aware services and validators. packages/contracts: shared schemas, OpenAPI and errors. packages/client: typed calls. db/migrations: ordered singular-table migrations. tests/fixtures: synthetic structured examples. docs/implementation: source-linked story contracts.

RCE-061 must implement root commands npm run lint, typecheck, test, test:integration, test:e2e, build, db:migrate, db:seed, dev and spec:check. npm ci requires its committed lockfile. Until bootstrap is complete, report those commands as unavailable, not passing.
