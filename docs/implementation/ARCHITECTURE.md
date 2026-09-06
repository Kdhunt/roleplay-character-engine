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

Decision clarified with the owner on 2026-09-05: preserve what a scene establishes, not a separate memory of every action used to establish it. Required continuity state and optional narrative recall have different retention and commit rules. This section, the compact continuity contract in DOMAIN.md and INV-023 in INVARIANTS.md define the previously unspecified required deterministic memory effects. They are specifications, not evidence of completed implementation.

An incoming user message is durable input. Distinguish an authorized scenario declaration from an attempted action, quoted dialogue, a hypothetical, a deliberate in-character falsehood or a private thought. An unambiguous owner declaration establishes scoped scenario truth after core-rule and permission validation; it is not subject to a low significance score veto. Compile the declaration into a typed authorized scenario edit and apply it to the proposed snapshot before generating the response. Do not rewrite the saved persona, global core or other scenarios. Attempted actions still require physical and domain validation. Ambiguous or conflicting intent is unresolved rather than silently converted into authority. Historical contradictions that rewrite accepted events use the existing branch/retcon operation, not in-place history replacement.

Build the proposed action plan against a versioned snapshot, generate and extract outside any database transaction, validate the complete turn and its selected effects, then commit. Keep canonical transcript and domain state consistent. A model-derived interpretation is not source authority and cannot bypass locks, player agency, eligibility or current willingness.

### Required effect set

The required set is the union of the following applicable, validated changes for an accepted turn. Only changed records are written; none of these categories requires an observer-memory row for every routine action.

1. Scenario facts and overrides: explicit authorized assertions and corrections, including quantities, participants, negation, temporal qualifiers, scenario history, declared relationships and scenario-specific persona changes. Preserve complete propositions and their source, authority, scope and visibility. A declared identity change does not infer anatomy or unrelated preferences.
2. Active continuity constraints: starts, transitions and endings of consequential actions; bound participants, structures and tracked objects; required positions, occupancy/reservations, releases, containment and accessibility changes. An occupied resource is released by an accepted transition, never by recall decay or omission from narration. Record meaningful outcomes such as an injury or a changed access condition, not every decorative movement leading to them.
3. Selected semantic records: the source-linked, structured content of significant outcomes and retained observations, commitments made/fulfilled/broken, explicit goal-status changes and supported temporary emotional or belief changes. Whole-turn selection must finish before acceptance; optional later enrichment must not be the only place the selected assertion exists. Preserve interpretation and uncertainty separately from established fact. An ambiguous gesture does not automatically become a permanent trait.
4. Knowledge boundaries: the observer/recipient bindings, evidence channel and visibility changes for retained facts and disclosures. Private thought may be available to the scenario engine without being available to an in-fiction speaker. A report establishes that a claim was heard, not automatically that it is objectively true. Scope/filtering is applied before character context construction.
5. Authorized memory controls: remember/pin/unpin, correction, suppression and source invalidation accepted as part of this turn, with provenance and effective revision. Suppression/erasure authorization state and invalidation markers must prevent affected sources or stale derivatives from resurfacing immediately; expensive derivative cleanup remains idempotent deferred work. Standalone commands retain their own authorized transaction and deletion semantics.
6. Established narrative commitments: the actual content, knowledge scope and current status of a secret or other unresolved scenario-defining commitment created within the AI's authorized narrative scope. Possible consequences, reveal conditions and character intentions are stored as plans, not as accomplished events. Their execution remains responsive to player choices and cannot manufacture player decisions or knowledge.

These are semantic effect categories, not final DTO field spellings. RCE-025 owns their type/lifetime matrix; RCE-053 fixes executable contract names and versions; RCE-028 owns significance selection; RCE-018 owns atomic application. RCE-010/011/049/050 retain physical-state ownership, RCE-014/027 retain knowledge/perception ownership, and RCE-034 retains commitments/secrets ownership. Reuse those services rather than implement a second simulation or memory repository.

### Selection, determinism and atomicity

Evaluate all claims and actions in the turn before allocating the retained-memory budget. Required facts and active constraints bypass optional ranking. Other candidates are assessed for consequences, recurring entities/concepts, unresolved obligations, current goals, future relevance and supported characterization. Routine narration creates no separate observation or memory unless it changes a required constraint or becomes consequential. Do not retain the first action merely because it appears first.

The accepted effect set includes source references, operation/target identity, owner/continuity/branch, applicable observer scope, expected revision and the pinned extraction/selection/rule versions needed for diagnosis. Record compact selection reasons and an effect count/digest or equivalent completion manifest with the turn. A valid routine-only turn can have zero retained-memory effects. Do not create a permanent per-observer diary of discarded candidates; bounded diagnostic traces follow privacy/retention policy.

Deterministic application means the same prior state, validated effect set and pinned rule versions produce the same resulting state. No model call, network dependency or uncontrolled clock occurs inside the commit transaction or replay reducer. Persist accepted model-derived content before it can be treated as canon; replay does not ask a model to rediscover what a secret or memory meant. Live extraction/significance quality needs separate evaluation and is not claimed infallible.

The commit transaction rechecks owner, current eligibility, active branch, expected scene revision and worker fencing token. It atomically appends accepted domain events, stores validated assistant utterances, applies every required effect, updates current projections and the required-state completion revision, stores the turn outcome and adds durable outbox intent. If any required effect fails, none of that turn's canonical output or effects commits. Rejected, cancelled, stale and fenced attempts create no canonical memory. Retry and replay do not duplicate effects or release reservations twice.

### Deferred processing and freshness

Optional reranking, summaries, embeddings, search indexes, cache enrichment and active-to-long-term organization may run idempotently after commit. They do not determine whether an already accepted fact is true and cannot be the sole record of required state. Initial extraction/selection failure differs from optional reranking failure: missing a required quantity or consequential outcome must be repaired or rejected when detected, not excused as a low score.

A following turn normally proceeds from the complete committed required state. If an optional projection lags, use an authorized, branch-correct reconstruction from current state and recent accepted events, bounded by the context budget. Never substitute raw omniscient history for a character-facing knowledge view. If required state or visibility cannot be reconstructed completely, pause generation with an explicit retryable dependency/freshness failure; insufficient mandatory context returns the existing typed budget failure. Optional summary/index lag alone does not block a correct turn. A required-state checkpoint must not claim completion merely because optional work was queued.

### Compact context and retention

Keep one bounded, parsable context submission per generation invocation rather than a memory entry for every perceived action. Reserve space for required state and safeguards; rank optional recall in the remaining allowance. Immediate state, meaningful active memories and durable character/scenario-defining memories have distinct lifetimes. Disuse may lower active-context priority but never releases an ongoing action, erases a protected fact or resolves a secret. Exact incidental placement can remain untracked; narrate at lower specificity rather than invent a contradictory location. Detail becomes tracked when it has causal, access, conflict or user-explicit significance.

RCE-025/028/037 must benchmark a baseline compact context budget and compare threefold and fourfold headroom using the same continuity fixtures. Select a versioned bounded configuration from measured evidence within provider limits and output reservation. No optimal size or universal multiplier is asserted by this decision. Storage/archive capacity and the per-submission token budget are separate. Full transcripts remain evidence under privacy policy, not an instruction to retain every sentence as a memory.

Use an append-only logical event history with separately erasable personal payloads. Privacy erasure overrides archival convenience. Separate content payloads and minimum integrity metadata so deletion is possible. Restoring backups reapplies deletion tombstones before serving requests.

## ADR-005: output and concurrency

V1 buffers model output until validation and commit succeed. SSE publishes durable status and committed output. A typing/progress indicator is not an excuse to expose unvalidated tokens. Progressive display may occur after commit. Optimistic concurrency uses integer revisions; at most one canonical commit wins a given scene revision. Other attempts receive conflict or regenerate against fresh context.

Idempotency is scoped to owner, endpoint and key plus canonical request hash. Duplicate identical input returns the same resource/result; key reuse with different input returns conflict. Jobs have leases and monotonically increasing fencing tokens. At-least-once delivery is expected; consumers deduplicate. Exactly-once external model calls/costs are not promised.

Cancel before commit prevents state mutation and fences late results. Revisions/regeneration create a child branch from the pre-turn state and switch active branch only after successful replacement. Old branches remain auditable and excluded from active retrieval. If commit already won, return committed.

## ADR-006: security and adult-use boundary

Account access, fictional adult eligibility, player content authorization, character current willingness and provider capability are evaluated separately. Do not derive consent from preference, orientation, relationship status, bodily response or silence. Current consent can be scoped and ongoing; revalidate when its scope changes or it is withdrawn, without forcing repetitive canned dialogue.

Model/refusal behavior is a typed adapter outcome. A refusal cannot alter canon or trigger hidden fallback designed to evade provider rules. Explicit adult data remains precisely represented, rather than being euphemized in storage, when all applicable gates permit processing. No real intimate transcripts, identity documents or secrets in source control or standard telemetry.

## ADR-007: state lifetime

Disconnect, browser close and room departure are not scene teardown. Scenes persist for resume. A user-approved ephemeral environment may reset on explicit teardown/expiry; ordinary persistent inventory and promoted facts survive. Reset previews affected entities and cannot clone or silently delete owned objects. Core, scenario, scene, momentary and derived lifetimes are explicit per property.

## ADR-008: normative invariant register

INVARIANTS.md is the single normative rule set for authority, character layer boundaries, axis independence, ownership and continuity isolation, atomic state change, eligibility gating and state lifetime. Each rule carries a stable INV-### identifier so tests, reviews and pull requests cite a rule rather than restating it. Where ARCHITECTURE.md, DOMAIN.md or API.md is ambiguous on one of those subjects, the register decides; where the register is silent, the owning contract decides. Adding, removing or weakening an invariant is a contract change and cannot be done as a side effect of implementing a story.

The register carries an invariant-to-test matrix binding every rule to the mandatory regression fixtures in QUALITY.md and to the test stories that own them, RCE-020, RCE-021, RCE-041 and RCE-083. It does not introduce a parallel test list: a rule with no fixture is recorded as a gap in QUALITY.md rather than left implicit. Four counterexamples — eye-color drift, the vanishing watch, hidden-knowledge leakage and scenario override bleed — are normative and must each stay failing until the corresponding fixture exists. Contradictions found between existing contracts are recorded in the register's Unresolved section as owner decisions; agents do not resolve them by choosing a default. This ADR records a reviewed specification and asserts nothing about implementation.

## ADR-009: persistence and event boundaries

PERSISTENCE.md is the storage contract: aggregate and ownership boundaries, the atomic commit boundary, deferred projection checkpoints, concurrency and failure behavior, erasable payload structure, retention categories and migration ordering. It decides the boundaries that RCE-081, RCE-012, RCE-073 and RCE-077 implement against, and cites INVARIANTS.md rather than restating rules. It defines no columns; RCE-003 owns entity fields.

Ownership is a stored edge rather than an inference: continuity-scoped rows carry owner, continuity and branch identifiers, and foreign keys crossing into continuity data are composite keys carrying the full scope the reference must preserve — owner and continuity always, plus branch where the relationship is branch-bound — because an owner-only composite still admits a same-owner cross-continuity edge. A mismatched parent is then a constraint violation and not merely a policy check a query could omit. ADR-004 owns the required effect set; PERSISTENCE.md neither restates nor narrows it, and fixes only how that set is written — each effect stored with its source references, scope, expected revision and pinned extraction, selection and rule versions, and the turn carrying a completion manifest so a partially applied turn is detectable. Selection being model-derived does not make it deferrable: extraction and validation finish before the transaction opens, and a selected assertion must exist in committed state rather than only in later enrichment. Deferral is reserved for optional work, and a required-state completion revision is tracked separately from optional projection checkpoints so completion is never claimed because optional work was merely queued. Every event is stored as separately-erasable content alongside retained integrity metadata, so an append-only log still permits erasure; reducers must tolerate a tombstoned payload and mark the resulting state incomplete rather than fail or invent a value. Retention durations, log partitioning and snapshot cadence remain recorded owner decisions.

## Module layout and commands

apps/api: auth, controllers, validation and service composition. apps/web: screens and state presentation only. apps/worker: generation and projection orchestration. packages/domain: entities, reducers, permission-aware services and validators. packages/contracts: shared schemas, OpenAPI and errors. packages/client: typed calls. db/migrations: ordered singular-table migrations. tests/fixtures: synthetic structured examples. docs/implementation: source-linked story contracts.

RCE-061 must implement root commands npm run lint, typecheck, test, test:integration, test:e2e, build, db:migrate, db:seed, dev and spec:check. npm ci requires its committed lockfile. Until bootstrap is complete, report those commands as unavailable, not passing.
