# Persistence, event boundaries and erasable payloads

Source: RCE-002 (https://trello.com/c/YxE0GXlX). Snapshot 2026-09-05. Depends on RCE-001. Normative for storage shape and write boundaries.

This is a reviewed storage contract, not a deployed database and not a schema. ADR-004 owns *what* an accepted turn must record — the required effect set — and this document owns *how* that set is stored, scoped, versioned, erased and migrated. RCE-003 owns entity field definitions; RCE-081 implements the migration harness and base repositories; RCE-012 implements event append, replay and snapshots; RCE-073 implements the queue, outbox and fencing; RCE-077 implements export, erasure and retention jobs. It cites INVARIANTS.md rather than restating rules.

Explicit exclusions: no table DDL, no column types, no index tuning, no chosen retention periods (RCE-089), no provider or hosting selection, and no redefinition of the required effect set.

## Storage baseline

PostgreSQL holds all authoritative state. Relational tables hold current projections; an append-only logical event history holds accepted change. A durable outbox and job queue live in the same database so that intent commits with the state that produced it. Search and vector indexes are derived, rebuildable and never authoritative (INV-039).

JSONB is permitted only for versioned extensible leaves — an entity's inert namespaced extension data — never for an aggregate root, never for anything queried as a first-class relation, and never as a substitute for a column that a constraint should enforce. There is no JSON universe blob.

Conventions: singular table names, UUID primary keys, UTC timestamps, integer revisions, `schema_version` on every persisted entity.

## Aggregates and ownership

Five aggregate families, each with its own transactional boundary and revision. A write touches exactly one aggregate root plus the event, effect and outbox rows it produces.

| Aggregate | Root | Ownership key path | Revision |
| --- | --- | --- | --- |
| Account | `user_account` | self | account revision |
| Character definition | `character_core` → `character_release` | `owner_id` | core revision; release immutable |
| Scenario instance | `character_instance` | `owner_id` + `continuity_id` | instance revision |
| Continuity | `continuity` → `branch` | `owner_id` | branch head sequence |
| Scene | `scene_state` | `owner_id` + `continuity_id` + `branch_id` | scene revision, required-state completion revision |

Ownership is a stored edge, not an inference. Every continuity-scoped row carries `owner_id`, `continuity_id` and `branch_id` denormalized onto the row itself, and every foreign key that crosses into continuity data is a composite key including `owner_id`, so a mismatched parent is a constraint violation rather than a policy check that a query can forget (INV-017, INV-018). Repository policy enforces the same scope a second time; neither layer is permitted to be the only one.

A release is immutable once published. A core edit writes a new release row and never updates an existing one (INV-009). An instance stores its `source_release_id` plus explicit overrides and a `resolved_definition_hash`; resolving an instance never writes to the release or the core (INV-012).

## Writing the required effect set

ADR-004 defines the required effect set in six categories: scenario facts and overrides, active continuity constraints, selected semantic records, knowledge boundaries, authorized memory controls, and established narrative commitments. This section does not restate, narrow or extend that set. It fixes how the set is persisted.

Extraction, selection and validation of the whole turn complete **before** the transaction opens; no model call, network dependency or uncontrolled clock occurs inside the commit transaction or inside a replay reducer (INV-024). Accepted model-derived content is persisted before anything may treat it as canon — replay never asks a model to rediscover what a memory or secret meant. Selection being model-derived does not make it deferrable: a selected assertion must exist in committed state, and optional later enrichment may never be its only home.

**Written inside the turn transaction.** Accepted domain events; validated assistant utterances; every applicable required effect; current projection updates; the scene revision increment; the required-state completion revision; the turn outcome; and outbox intent rows (INV-023).

Each accepted effect is stored with its source references, operation and target identity, owner, continuity and branch, applicable observer scope, expected revision, and the pinned extraction, selection and rule versions needed to diagnose it later. The turn carries a completion manifest — an effect count or digest — so a partially applied turn is detectable rather than silently plausible. Only changed records are written: a valid routine-only turn legitimately produces zero retained-memory effects, and that is a normal outcome rather than a missed extraction.

**Failure is all-or-nothing.** If any required effect cannot be applied, none of that turn's canonical output or effects commits. This is deliberately stricter than ordinary deferred-work handling: a missing required quantity or consequential outcome is repaired or the turn is rejected, never excused as a low score. Rejected, cancelled, stale and fenced attempts create no canonical memory, and retry or replay neither duplicates effects nor releases a reservation twice.

## Deferred work and freshness

Only optional work is deferred: reranking, summaries, embeddings, search indexes, cache enrichment, and active-to-long-term organization. Deferred work never determines whether an already accepted fact is true and can never be the sole record of required state.

Each deferred projection records a checkpoint — the last event sequence it consumed, per continuity and branch. A required-state completion revision is separate from those checkpoints and must never be marked complete merely because optional work was queued.

A following turn normally proceeds from the complete committed required state. If an optional projection lags, the turn uses an authorized, branch-correct reconstruction from current state and recent accepted events, bounded by the context budget — never raw omniscient history in place of a character-facing view (INV-021). If required state or visibility cannot be reconstructed completely, generation pauses with an explicit retryable dependency or freshness failure rather than proceeding on partial state. Optional summary or index lag alone does not block a correct turn.

Projections are idempotent and replayable from the event log. Rebuilding one is always permitted and never changes canonical state. An optional projection failure is retried and alerted; it does not invalidate the committed turn that produced its input.

## Concurrency and failure

Optimistic concurrency on integer revisions. A write states the revision it expects; the database rejects a mismatch. At most one canonical commit wins a given scene revision (INV-025); losers receive a typed conflict and either regenerate against fresh context or surface the conflict.

Idempotency keys are scoped to owner, endpoint, key and canonical request hash, stored with the result reference (INV-026). Replaying an identical request returns the stored result; the same key with a different payload is a conflict.

A failed commit leaves no partial state: no event appended, no effect applied, no utterance stored, no revision advanced, no outbox row. The user's input message remains durable and is not marked as a successful mutation. A late worker whose fencing token has been superseded cannot commit at all (INV-027).

Branches: a revision or regeneration appends to a child branch and switches the branch head only after the replacement commits (INV-029). Abandoned branches remain queryable for audit and are excluded from active retrieval by branch predicate, not by deletion (INV-021).

## Erasable payloads

Append-only history must still permit erasure (INV-040). Every event is stored as two rows with different lifetimes:

- **Integrity metadata** — event id, sequence, type, aggregate reference, owner, continuity, branch, timestamp, causation and correlation ids, payload hash. Retained for as long as the log is retained. Contains no personal content.
- **Content payload** — the event body, and any personal text, media reference or structured personal data. Independently erasable, replaced on erasure by a tombstone recording that erasure occurred and when.

Replay over an erased event reconstructs structure, not content: reducers must tolerate a tombstoned payload and produce a state marked incomplete rather than failing or inventing a value. This is the price of erasability and is deliberate.

Authorized suppression, correction and source invalidation accepted within a turn take effect immediately, so an invalidated source or stale derivative cannot resurface while the expensive cleanup is still queued. That cleanup is idempotent deferred work; the authorization state that hides the source is not.

Erasure fans out to every derivative: embeddings, summaries, exports, feedback records, media objects, search index entries and cached projections (INV-040). A derivative that cannot be located is a defect in the derivation registry, not an acceptable residue — every derivation records the source event or entity it came from, so the fan-out is a lookup rather than a scan.

**Backup restoration.** A restored backup may predate an erasure. Deletion tombstones are stored in a separately replicated erasure ledger; restoration reapplies every tombstone whose timestamp precedes the moment service reopens, before the service accepts a single read. A restore that cannot reach the erasure ledger does not open.

## Retention boundaries

Four categories, each with a distinct rule. Actual durations are an owner decision under RCE-089 and are not chosen here.

| Category | Examples | Erasure behavior |
| --- | --- | --- |
| Canonical content | events' content payloads, utterances, required effects, character definitions, media | Erased on user request; tombstoned in the log |
| Derived artifacts | embeddings, summaries, optional projections, indexes | Erased with their source; independently rebuildable |
| Operational telemetry | traces, metrics, error reports, bounded diagnostic traces | Never contains private content; retained on its own clock |
| Audit and integrity metadata | event integrity rows, erasure ledger, admin action log | Survives user erasure; separately governed and minimal |

No private dialogue, character content or identity data enters operational telemetry (INV-022). There is no permanent per-observer diary of discarded selection candidates; diagnostic traces are bounded and follow retention policy.

## Migration ordering

Ordered, numbered, forward-only migrations with an explicit rollback note per migration. RCE-081 implements the harness; this is the dependency order it must respect.

1. Identity and ownership: `user_account`, session and eligibility references.
2. Character definition: `character_core`, `character_release`, preset and archetype registries.
3. Continuity: `continuity`, `branch`, `character_instance`.
4. Scene and world: `scene_state`, object, placement and interaction tables.
5. Event log, effects and erasure: event integrity, event content, effect records, erasure ledger.
6. Outbox, queue and projection checkpoints.
7. Derived stores: search and vector indexes, last because they are rebuildable.

A migration never rewrites event content. Backfills that derive new projections run as jobs after the schema change, not inside the migration transaction.

## Verification

Mapped to QUALITY.md's mandatory regression fixtures; RCE-081, RCE-012, RCE-073 and RCE-077 own execution.

| Requirement from this contract | Fixture | Implementing story |
| --- | --- | --- |
| Fresh and upgrade migration | 1, 2 | RCE-081 |
| Cross-owner access denied by constraint | 1 | RCE-081 |
| Two continuities from one core stay separate | 2 | RCE-081, RCE-012 |
| Replay determinism under pinned rule versions | — | RCE-012 |
| Replay over a tombstoned payload | 15 | RCE-012, RCE-077 |
| A failed required effect rejects the whole turn | — | RCE-018, RCE-012 |
| Routine-only turn commits zero memory effects | — | RCE-028 |
| Concurrent writes, stale revision rejected | 10 | RCE-012 |
| Failed commit leaves no partial state | 10, 11 | RCE-012, RCE-073 |
| Duplicate send and duplicate outbox delivery | 10 | RCE-073 |
| Fencing prevents a late worker commit | 11 | RCE-073 |
| Branch isolation on regeneration | 12 | RCE-012 |
| Suppression hides a source before cleanup runs | 15 | RCE-077 |
| Erasure reaches every derivative | 15 | RCE-077 |
| Restore after deletion does not resurrect | 15 | RCE-077 |

## Unresolved

Recorded for owner decision; not defaulted by an agent. Numbering is stable and independent of INVARIANTS.md.

1. **Retention durations are undecided.** The categories above are settled; how long each is kept is not, and it is a launch decision under RCE-089 alongside privacy terms and recovery targets. RCE-077 cannot be completed without it.

2. **Event log partitioning is unchosen.** A single global append log is simplest and makes cross-continuity audit trivial; partitioning per continuity bounds replay cost and makes erasure fan-out cheaper. The choice affects RCE-012's replay design and RCE-081's schema, and should be made before either starts. Recommend per-continuity partitioning unless cross-continuity audit is a stated requirement.

3. **Snapshot cadence is unset.** Replay cost grows with branch length. A snapshot every N events bounds it, but N is an engineering decision needing a measured baseline, which does not exist until RCE-083. Recommend an explicit configured value with a conservative default rather than an implicit one, so the number is visible and revisable. ADR-004 already requires RCE-025/028/037 to benchmark a compact context budget on shared continuity fixtures; snapshot cadence should be measured in the same exercise.

4. **Three requirements have no fixture.** Replay determinism under pinned rule versions, a failed required effect rejecting the whole turn, and a routine-only turn committing zero memory effects are all normative here but uncovered by QUALITY.md's eighteen fixtures. The third matters most: without it, an over-eager extractor that writes a memory for every action passes every existing test. Recommend adding all three under RCE-012, RCE-018 and RCE-028.
