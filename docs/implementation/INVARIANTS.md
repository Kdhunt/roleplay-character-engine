# System invariants and source-of-truth rules

Source: RCE-001 (https://trello.com/c/5pcHXzOk). Snapshot 2026-09-05. Normative for every module.

This register is the single normative rule set referenced by ADR-008. ARCHITECTURE.md owns boundaries and defaults, DOMAIN.md owns entities and lifetimes, QUALITY.md owns verification; where any of them is ambiguous about authority, isolation, atomicity or gating, this document decides. Each invariant has a stable ID so tests, reviews and pull requests can cite it. An invariant is a rule the system must never violate, not a feature; adding one is a contract change.

Nothing here asserts that the described behavior is implemented. RCE-061 bootstraps the workspace; the test stories named in the matrix are unwritten.

## Authority and truth

**INV-001** Structured state is canon. Dialogue proposes mutations and never performs them.

**INV-002** Fact authority is totally ordered: `explicit_author` > `canonical` > `imported` > `derived` > `default`. A value may only be replaced by one of equal or higher authority.

**INV-003** An explicit authorized edit outranks any inference, regardless of how much evidence supports the inference.

**INV-004** Model output carries no authority. An extractor's confidence score never promotes a claim to canon, and no field may be written with authority `explicit_author` or `canonical` on the strength of generated text alone.

**INV-005** Unknown stays unknown. A null or omitted value never means absent or false, and an explicit unset differs from never-known. `knowledge_status` is `known`, `unknown` or `contested`; absence of the field is not a fourth state.

**INV-006** Two contradicting facts of equal authority produce an explicit `contested` conflict. Neither silently wins, and neither is discarded.

**INV-007** Locked canon cannot be overwritten by lower-authority prose. A lock prevents model-derived edits; it does not prevent an authorized scoped author operation.

**INV-008** Source authority and belief confidence are separate fields. How a fact entered the system is never read as how sure a character is of it.

## Character layer boundaries

**INV-009** CharacterCore, CharacterRelease, CharacterInstance and RuntimeState are distinct aggregates. A core edit produces a new immutable release; it never mutates an existing release or an existing scenario.

**INV-010** Resolution is field-aware and ordered: preset and archetype defaults initialize a release, explicit core values override defaults, and an authorized scenario override beats the pinned core. Resolution never runs in the opposite direction.

**INV-011** Runtime writes touch only runtime fields and approved temporary modifications. A mood, condition or bodily state cannot edit a trait, orientation, core value or willingness.

**INV-012** A scenario override changes only its own instance. It never edits the source release, the core, or any other instance pinned to that release.

**INV-013** A release pins its schema, archetype and preset versions. Resolution of a pinned release is reproducible: the same release plus the same overrides yields the same resolved definition hash.

## Independence of character axes

**INV-014** Identity, gender, anatomy, orientation, terminology and relationship configuration are independent axes. None may be derived from another, and editing one never implicitly edits another.

**INV-015** Preferred vocabulary maps to canonical structure IDs. Naming a structure does not create it.

**INV-016** A structure definition is not evidence that a character possesses that structure. Unknown presence resolves to unresolved, never to invented confirmation, and contact against an absent structure is rejected.

## Ownership, continuity and isolation

**INV-017** Every operation carries an authenticated owner and, where continuity data is touched, a continuity and branch scope. There is no unscoped read or write path.

**INV-018** Owner is derived from the verified principal. A client cannot assign or reassign ownership by payload.

**INV-019** No cross-user memory. A character appearing in another account imports none of the first account's memories, relationships, beliefs or corrections.

**INV-020** No cross-scenario memory. Two continuities built from the same core share nothing derived from play; corrections and history in one never enter the other.

**INV-021** Retrieval is branch-aware. Future, sibling, abandoned and superseded history is excluded from active retrieval, caches, summaries, jobs, media and exports alike.

**INV-022** A public or catalog preview excludes secrets, private facts, internal anatomy detail, secret history and any other user's runtime state.

## Atomic state change

**INV-023** Every accepted turn binds transcript and domain state atomically. Accepted domain events, validated assistant utterances, projection or turn-outcome updates and outbox intent commit together or not at all.

**INV-024** Generation happens outside any database transaction. No model call may be made while a transaction is open.

**INV-025** At most one canonical commit wins a given scene revision. Other attempts receive a conflict or regenerate against fresh context.

**INV-026** Idempotency is scoped to owner, endpoint, key and canonical request hash. Identical input returns the same result; the same key with different input is a conflict, never an overwrite.

**INV-027** Cancellation before commit prevents state mutation and fences late results. If the commit already won, the outcome is reported as committed rather than cancelled.

**INV-028** A rejected or unvalidated candidate never becomes accepted history and is never streamed or returned as canonical output. A refusal or provider failure does not mutate canon.

**INV-029** A revision or regeneration creates a child branch from the pre-turn state and switches the active branch only after a successful replacement. A failed replacement leaves the original active branch intact.

## Access and eligibility gates

**INV-030** Five checks are evaluated separately and each independently denies: account access, fictional adulthood, player content authorization, character current willingness, and provider capability.

**INV-031** No gate may be derived from another, and none may be derived from preference, orientation, relationship status, relationship history, bodily response, repeated past action or silence.

**INV-032** Fictional adulthood requires an unambiguously adult age. Unknown or conflicting age fails the check, and adulthood is never inferred from appearance, anatomy, species or archetype name.

**INV-033** Current willingness is scoped and revocable. It is revalidated when its scope changes or it is withdrawn, and it is checked again at execution and at commit.

**INV-034** A provider refusal is a typed adapter outcome. It cannot alter canon, and it cannot trigger a hidden fallback designed to evade provider rules.

**INV-035** Security, account and age gates cannot be overridden by fiction. No in-narrative event changes an authorization decision.

## Lifetime and persistence

**INV-036** A disconnect, browser close, process restart or room departure is not scene teardown. Scenes persist for resume.

**INV-037** An object remains at its committed location until an accepted event moves it. Silence is not removal, and referent resolution merges aliases rather than distinct physical objects.

**INV-038** Decay changes recall salience only. It never changes event truth, and recall reinforcement is not evidence of accuracy.

**INV-039** Vectors, search indexes and summaries are relevance aids and are rebuildable. No vector result is canonical truth, and a summary cannot grant access to a source its reader could not see.

**INV-040** Append-only history must still permit erasure. Personal payloads and their derived copies — embeddings, summaries, exports, feedback and media — are erasable independently of the minimum integrity metadata, and a restored backup reapplies deletion tombstones before serving requests.

## Invariant-to-test matrix

Fixture numbers refer to the mandatory regression fixtures in QUALITY.md. Test stories: RCE-020 anatomy and physical continuity, RCE-021 knowledge, relationship and player agency, RCE-041 memory integrity audit, RCE-083 full product journeys. An invariant with no fixture is a gap in QUALITY.md, not an optional rule — see Unresolved below.

| Invariant | QUALITY.md fixture | Owning test story |
| --- | --- | --- |
| INV-001 canon is structured state | 3, 13 | RCE-020, RCE-083 |
| INV-002 authority ordering | 3 | RCE-020 |
| INV-003 explicit edit outranks inference | 3 | RCE-020 |
| INV-004 no model-generated authority | 3, 13 | RCE-020, RCE-083 |
| INV-005 unknown stays unknown | 4 | RCE-020 |
| INV-006 equal-authority conflict is explicit | — | RCE-020 |
| INV-007 locked canon | 3 | RCE-020 |
| INV-008 authority is not confidence | 7 | RCE-021 |
| INV-009 layer separation | 2, 3 | RCE-020, RCE-021 |
| INV-010 resolution order | 3 | RCE-020 |
| INV-011 runtime cannot edit core | 8 | RCE-021 |
| INV-012 override isolation | 2, 3 | RCE-020, RCE-021 |
| INV-013 pinned reproducible resolution | 14 | RCE-083 |
| INV-014 independent axes | 4 | RCE-020 |
| INV-015 vocabulary creates nothing | 4 | RCE-020 |
| INV-016 definition is not possession | 4, 6 | RCE-020 |
| INV-017 owner and continuity scope | 1 | RCE-083 |
| INV-018 owner from principal | 1, 16 | RCE-083 |
| INV-019 no cross-user memory | 1 | RCE-083 |
| INV-020 no cross-scenario memory | 2 | RCE-021 |
| INV-021 branch-aware retrieval | 12 | RCE-083 |
| INV-022 preview redaction | 1 | RCE-083 |
| INV-023 atomic turn commit | 10 | RCE-083 |
| INV-024 generate outside transaction | — | RCE-083 |
| INV-025 one commit per revision | 10 | RCE-083 |
| INV-026 idempotency scope | 10 | RCE-083 |
| INV-027 cancellation fencing | 11 | RCE-083 |
| INV-028 no unvalidated canon | 13 | RCE-083 |
| INV-029 regeneration branches | 12 | RCE-083 |
| INV-030 five separate gates | 9 | RCE-021, RCE-083 |
| INV-031 no derived consent | 9 | RCE-021 |
| INV-032 unambiguous fictional adulthood | 9 | RCE-021 |
| INV-033 willingness revalidated | 9 | RCE-021 |
| INV-034 refusal is typed | 13 | RCE-083 |
| INV-035 fiction cannot override gates | 9, 16 | RCE-083 |
| INV-036 disconnect is not teardown | 5, 17 | RCE-083 |
| INV-037 object persistence | 5 | RCE-020 |
| INV-038 decay preserves truth | 7 | RCE-041 |
| INV-039 indexes are not truth | 7 | RCE-041 |
| INV-040 erasure reaches derivatives | 15 | RCE-083 |

## Counterexamples

Each counterexample states the failure a naive implementation produces, the invariant that forbids it and the fixture that catches it. These are the four required by RCE-001 and are normative examples, not illustrations.

**Eye-color drift.** A character's eyes are authored green with authority `explicit_author`. A later generated paragraph describes them as blue. The naive system treats the newest description as the current value. Forbidden by INV-001, INV-002, INV-003 and INV-004: narration proposes, and a `derived` claim cannot replace an `explicit_author` fact. Caught by fixture 3. The correct outcome is that the claim is rejected at validation and the eye color remains green; if the narration is accepted for other reasons, the contradicting claim is dropped rather than recorded.

**The vanishing watch.** A watch is dropped on the floor in an accepted event. Several turns, a reload, a network loss and a process restart pass without the watch being mentioned. The naive system, reconstructing the scene from recent dialogue, omits it and it ceases to exist. Forbidden by INV-037 and INV-036: an object stays at its committed location until an accepted event moves it, and a disconnect is not teardown. Caught by fixture 5. Absence of mention carries no information.

**Hidden-knowledge leakage.** Character A learns a fact in a scene character B did not perceive. B later acts on it, or a summary shown to B cites A's private memory as a source. The naive system retrieves from a shared memory pool ranked by relevance. Forbidden by INV-019, INV-021, INV-039 and INV-008: retrieval is scoped and branch-aware, a summary cannot grant access to a source its reader could not see, and a belief's confidence is never read as objective truth. Caught by fixture 7. A false belief held by B does not change world truth either.

**Scenario override bleed.** A user overrides a character's hair color inside one scenario. The naive system writes the override to the pinned release or the core, so every other scenario and every other account using that character sees the change. Forbidden by INV-012, INV-009 and INV-010: an override changes only its own instance, and a core edit is a separate authorized operation producing a new release. Caught by fixtures 2 and 3.

## Unresolved

These are recorded blockers, not defaults chosen by an agent. Each needs an owner decision before the dependent story is implemented. A resolved item keeps its number and stays listed with its decision and owning story, so the reasoning survives and existing references do not shift.

1. **Gate naming — RESOLVED 2026-09-05, owned by RCE-053.** ADR-006 named the five checks "account access, fictional adult eligibility, player content authorization, character current willingness, provider capability" while docs/implementation/README.md named them "adult-user access, fictional adulthood, content authorization, current willingness, provider permission". The owner has confirmed ADR-006 as canonical and assigned reconciliation to RCE-053, which carries the mapping checklist. INV-030 already uses the ADR-006 set. RCE-053 maps each legacy name to its canonical name and final wire field, reconciles README, OpenAPI, DTOs, generated clients and fixtures in one change, and adds drift regression coverage. This is naming cleanup: the meaning and enforcement of each check are unchanged, and no dependent controller may adopt a competing name.

2. **"Required deterministic memory facts" is undefined.** ADR-004 permits some memory facts to commit inside the turn transaction while expensive projections run afterwards, but no rule says which facts qualify. Until it is defined, INV-023 cannot be tested precisely: the boundary between the atomic set and the deferred set is unspecified. RCE-025 and RCE-028 depend on this.

3. **`knowledge_status` scope is ambiguous.** DOMAIN.md places `knowledge_status` on the FactEnvelope and belief confidence on Belief, but does not say whether a fact's `unknown` means the world does not record it or that a particular observer does not know it. INV-005 and INV-008 assume the former. RCE-003 should make this explicit in the schema.

4. **Ephemeral environment reset has no boundary.** ADR-007 allows a user-approved ephemeral environment to reset while "ordinary persistent inventory and promoted facts survive", but does not define which objects are ephemeral. INV-037 currently reads teardown as never removing a committed object, which may be stricter than intended. RCE-048 and RCE-087 need this settled.

5. **Two invariants have no fixture.** INV-006 (equal-authority conflict surfaces explicitly) and INV-024 (generation outside a transaction) are not covered by any of QUALITY.md's eighteen fixtures. Either QUALITY.md gains two fixtures or these invariants are unverifiable. Recommend adding them under RCE-020 and RCE-083 respectively.
