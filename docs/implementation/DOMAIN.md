# Domain contract

## Common representation

Persistent entities use UUID id, owner_id, created_at/updated_at in UTC, schema_version and integer revision. Continuity data also carries continuity_id, branch_id or branch visibility metadata, character_instance_id where applicable and source_event_id. Server identity determines owner; clients cannot reassign it by payload. References enforce matching owner and continuity through repository policy and database constraints.

Facts carry value, knowledge_status (known/unknown/contested), authority (explicit_author/canonical/imported/derived/default), source type/id, source span where available, lock state, lifetime and effective revision. Source authority and a character's belief confidence are different fields. Lower-authority prose cannot overwrite locked canon. Conflicting equal-authority facts produce an explicit conflict. Null/omitted values never automatically mean absent or false. Explicit unset/reset operations differ from unknown.

## Account and persona

UserAccount stores issuer+subject unique identity binding, display profile, status, settings and eligibility references. Do not merge accounts by email alone. Auth sessions store hashed opaque handles, expiry/revocation and encrypted server-side provider material where needed. Roles are granted by trusted administration only. Persona is the user's fictional identity: name, pronouns, explicit adult age, appearance, anatomy and agency settings. It is not the user's real identity record.

UserEligibility contains assurance status/method/result reference, issued/expiry/revoked times and policy version. Identity documents are not stored by this application. ContentConsent is a separate user authorization with scope and revocation. Development mock results must be impossible to accept in production.

## Core, release, instance

CharacterCore: owner, stable id, draft and release references, visibility and archive status. CharacterRelease: immutable core snapshot, schema version, title, age, identity, appearance, anatomy, values, personality, voice, preferences, agency, goals/background and pinned archetype/preset references. CharacterInstance: scenario/continuity owner, source release id, explicit overrides, resolved definition hash and instance revision.

Age must be unambiguously adult for adult mode; unknown/conflicting age fails eligibility. Do not infer adulthood from appearance, anatomy, species or archetype names. Catalog preview excludes private facts, internal anatomy detail, secret history and other users' runtime state. Shared catalog approval and private character ownership are separate.

Orientation and relationship model are independent. For example, monogamy/polyamory is not a substitute for attraction/orientation. An authorized scenario override changes only that instance. Preferred vocabulary maps to canonical structure IDs and does not create anatomy.

## Anatomy

StructureDefinition: id/type, parent relationship, laterality, cardinality, semantic region and allowed properties. StructureInstance: unique id within body, definition reference, presence (present/absent/unknown/variable/not_applicable), properties and provenance. A reference definition is not evidence that a character possesses that structure.

PresetRelease resolves species defaults and structure configuration explicitly; version and resolution hash are pinned. Support male/female and fictional thematic configurations as authored presets, not inferred identity rules. Ambiguous thematic labels require a selected variant or remain unknown. Missing preset fields do not silently manufacture structures.

Anatomy graph validation rejects cycles, invalid parents, negative/cardinality contradictions and contact against absent structures. Unknown structure presence returns unresolved rather than inventing confirmation. Body modifications are explicit events/overlays with duration and restoration rules.

## Personality, values, voice and preferences

Trait has stable name/id, authored intensity where useful, contextual expressions, anti-expressions, triggers/suppressors, evidence and mutability policy. Values and boundaries are separate from personality descriptors. VoiceProfile contains formality, vocabulary, rhythm, humor, allowed/avoided phrases and positive/negative dialogue examples. Scores are design parameters, not measurements of real human psychology.

A temporary mood or bodily condition cannot overwrite a trait, orientation, core value or willingness. Sexual preferences and boundaries may be authored, overridden for a scenario or learned as scoped evidence. Learned evidence does not automatically rewrite canon. A correction targets a layer and scope; default scope is the current instance/continuity and default outcome is a proposed change. Explicit authorized canon edits use a distinct command with preview/audit.

## Consent and interaction

CharacterWillingness records instance, counterparty set, interaction scope, status (unknown/affirmed/declined/withdrawn), evidence, context revision and validity period. A pre-existing relationship does not establish willingness. Player ContentConsent is outside fiction and not interchangeable with this record. Relationship labels, attraction scores, bodily responses and repeated past actions cannot automatically affirm it. Revocation is checked again at execution/commit.

Interaction has id, participant/role bindings, action type, referenced structures/objects, phase (proposed/active/paused/interrupted/completed), causal predecessor, occupancy requirements and source. Starting/updating/ending an interaction uses validated transitions. A structure can have multiple compatible contacts; exclusive manipulator/resource use is constrained by the action, not a blanket one-contact-per-body-part rule. Do not infer geometric impossibility merely because two regions are coarsely described as nearby.

## World and scene

WorldRelease contains authored lore/rules and visibility. Location is hierarchical with world/building/room/furniture/surface relations and no cycles. EnvironmentTemplate supplies conservative optional defaults and capabilities: openable, supports, contains, wearable and light source. Defaults can be absent/overridden; a template does not claim every real bedroom contains a dresser.

SceneState: continuity, active branch, revision, world time, environment instance, participants, entity placements, clothing, contacts, active interactions and temporary conditions. SpatialState uses posture, support, orientation, qualitative proximity, relative placement and optional detail extensions. Numeric coordinates are optional extensions and never required for ordinary chat. Added narrative detail must remain compatible with authoritative relations.

ObjectInstance: stable ID, kind, capabilities, ownership, exactly one primary location/containment, visibility, condition and lifetime. A watch dropped on a floor remains there until a committed event moves it. Referent resolution merges aliases, not distinct physical objects. A quoted/hypothetical noun does not necessarily instantiate anything.

Wardrobe/equipment: garment object reference, state, coverage, fastening/accessibility and placement. Worn/open/partly_removed/removed/damaged/displaced states have validated transitions. Holding requires available compatible manipulators; simultaneous actions are ordered/validated against intermediate state. Removing an already removed garment is either an explicit idempotent no-op or a rejected transition, never a second narrative removal.

## Memory and knowledge

WorldEvent records objective accepted changes once. Observation records what an instance could perceive. Memory records owner instance, type, content/payload reference, supporting events, importance, confidence, retrieval strength, persistence, visibility, branch/effective sequence and suppression/deletion state. Memories are not copied indiscriminately to every participant.

Semantic, episodic, emotional, relationship, belief, secret, commitment and working records remain distinguishable. Canon lives in the definition/state system, not as a forgettable low-ranked memory. Belief links evidence and confidence without revealing objective truth in character-facing contexts. Relationship is directional, with dimensions/labels/agreements and causal evidence. Goal, promise and secret have status and visibility, not merely free text.

Decay changes recall salience, not event truth. Recall reinforcement does not prove factual accuracy. Deduplication preserves different observers, branch histories, contradictory beliefs and distinct repeated events. Summaries reference source records and visibility intersection; a summary cannot grant access to a hidden source. Retcons invalidate descendants and rebuild derived projections by branch. Suppress, correct, erase and rewrite-history are distinct operations.

## Conversation and generation

Conversation belongs to owner/continuity and points to active branch. Message has author kind, speaker_instance_id or persona_id, parent turn, content, revision and delivery state. User input is durable even when its processing fails; it is not included as a successful state mutation. TurnAttempt stores status, snapshot revision/hash, model revision, validation result and usage. Rejected candidates are never fed back as accepted history.

CandidateTurn contains utterances (speaker, addressees, kind, text), ordered actions, grounded claims, unresolved references and optional proposed memories. Each proposal points to source evidence; an extractor's confidence never grants authority. ValidationResult contains valid/needs_clarification/rejected outcome, issue codes, severity, offending spans, expected facts and bounded repair guidance.

Canonical commit appends events and accepted utterances together, advances revision and emits durable outbox intent. A projection checkpoint prevents stale memory reads. Snapshot hash plus versions make generation explainable and concurrency-safe. Branch-aware queries exclude future/sibling/superseded history.

## Portability, deletion and extension safety

CharacterPackage has format, schema_version, package id, core/release snapshot, pinned dependency snapshots, content hashes and inert namespaced extensions. Import validates limits, identifiers, dependencies and age, then previews changes before commit. Do not include account credentials or private continuity history by default. A separate optional ContinuityPackage requires explicit scope selection and authorization.

Support compatible version migrations without silent field loss. Unsupported future versions fail with actionable diagnostics; unknown extensions are preserved as inert data. Duplicate imports require explicit reuse/clone/update choice, never silently overwrite another entity.

Erasure removes content and derived copies, including embeddings, summaries, exports, feedback and media; minimum audit metadata is separately governed. Data must not become undeletable because the event stream is logically append-only.
