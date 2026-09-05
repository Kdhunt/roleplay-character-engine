# Character, release and instance schemas

Source: RCE-003 (https://trello.com/c/Sl458Ct3). Snapshot 2026-09-05. Depends on RCE-001.

Machine-readable contracts in `packages/contracts/schema`, fixtures in `tests/fixtures/character`. JSON Schema draft 2020-12. Schema `$id`s are URNs (`urn:rce:schema:<name>`) — stable identifiers, deliberately not dereferenceable, so nothing resolves them over the network.

DOMAIN.md owns entity meaning and lifetimes; this document and the schema files own their shape. RCE-053 turns these into OpenAPI and runtime DTOs; RCE-055 owns the resolution algorithm; RCE-067 owns the editor; RCE-081 owns persistence.

## The schema set

| Schema | What it is |
| --- | --- |
| `common` | Shared definitions: identifiers, timestamps, revisions, enums, scopes, provenance, pinned versions, extensions |
| `fact-envelope` | The wrapper that makes a value auditable — authority, provenance, lock state, lifetime, epistemic status |
| `character-core` | Creator-owned mutable draft plus pointers to its releases |
| `character-release` | Immutable published snapshot |
| `character-instance` | A character inside one scenario continuity: a pinned release plus overrides |
| `persona` | The user's fictional identity — never their real identity record |
| `character-preview` | What the catalog may show someone who does not own the character |
| `resolved-character` | The computed view, recording which layer supplied each field |

## Three states, not two

The distinction RCE-001 left open is settled here, and it is the reason `null` never appears as a value.

- **Envelope absent** — nothing was ever recorded. The field does not exist.
- **`knowledge_status: "unknown"`** — canon records that no value is established. Something is known about the absence.
- **`knowledge_status: "contested"`** — two or more equal-authority facts conflict; each is kept in `candidates` with its own provenance, and none silently wins (INV-006).

A `known` envelope must carry a `value`; an `unknown` one must not; a `contested` one must carry at least two candidates and no `value`. Those are enforced by the schema, not by convention, and `invalid/fact.*.json` proves each rejection.

**`knowledge_status` is world-level.** It describes the record's state in authoritative storage, never a character's belief. What a character thinks is true, and how sure they are, is a separate Belief record with its own confidence — because collapsing the two is exactly how objective truth leaks into a character's head (INV-008). This resolves INVARIANTS.md unresolved item 3.

## Structural guarantees

Several invariants are enforced by shape rather than by a rule someone has to remember:

- **Adulthood.** A release and a persona require `age.knowledge_status = "known"` and `value >= 18`. Unknown, contested and underage ages all fail validation, so an underage or ambiguous character is not representable as a published release (INV-032). A *draft core* may hold an unknown age — it simply cannot be published.
- **Override scope.** `character-instance.overrides` is keyed by dotted path, so the same field cannot be overridden twice — conflicting overrides are unrepresentable rather than merely discouraged. `propertyNames` restricts which paths may be overridden at all; `age`, `id`, `core_id` and `owner_id` are not among them, so a scenario override can neither move the adult gate nor reassign ownership (INV-012, INV-018).
- **Preview redaction.** `character-preview` enumerates its permitted fields with `additionalProperties: false`. A preview built by copying a release fails validation instead of leaking secrets, private goals or internal anatomy detail (INV-022).
- **Independence.** `identity`, `anatomy`, `orientation`, `terminology` and `relationship_config` are sibling objects with no cross-references, so none can be derived from another (INV-014).
- **Reproducible resolution.** A release pins its schema, archetype and preset versions; `resolved-character` records the inputs and a `resolution_hash` (INV-013).

## Extensions and unknown data

Unknown top-level fields are **rejected**, not silently preserved. `additionalProperties: false` applies to every entity. Data outside the contract goes in `x_ext`, whose keys must be `vendor.name`; that data is inert, never interpreted, and preserved across round-trip and migration. `invalid/release.unknown-field.json` and `invalid/release.extension-unnamespaced.json` prove both halves.

## Versioning

Every entity carries `schema_version`. A release additionally pins the archetype and anatomy-preset release ids it resolved against, so a later preset revision cannot retroactively change a published character. Migration between schema versions is RCE-058's concern; these schemas only guarantee the version is always recorded.

## Fixtures

`tests/fixtures/character/manifest.json` lists every case with the schema it must be checked against, its expected outcome and why it exists. Twenty-two cases: ten valid, twelve invalid, covering the six the card requires — minimal valid character, invalid age, invalid reference, conflicting overrides, inert extensions, and private-preview redaction.

The manifest is the interface for automated validation. A checker reads it, resolves each `schema` name against `schema_dir`, and asserts the outcome matches `expect`.

## Verification status

These schemas and fixtures were validated with ajv 8 in strict mode during authoring: all 8 schemas compile and all 22 fixtures produce their expected outcome. That was run from a scratch directory, because **this repository has no dependencies, no lockfile and no test runner until RCE-061**. There is no committed command that reproduces it yet.

RCE-053 should wire this manifest into `spec:check` once the workspace exists. Until then, treat the result above as authoring evidence, not as a passing repository test.

## Unresolved

1. **No committed validator.** The evidence above cannot currently be reproduced by anyone running a repository command. This is a gap in provability, not in the artifacts. RCE-061 provides the runner; RCE-053 should own the wiring.
2. **`LongText` at 20000 characters is a guess.** Field length caps are enforced but unmeasured. `background` in particular drives context budget, which ADR-004 requires RCE-025/028/037 to benchmark. Revisit the caps with that measurement rather than defending these numbers.
3. **Anatomy structure identifiers are UUID references only.** These schemas do not define the structure registry itself — RCE-006 and RCE-051 own it. A fixture referencing a structure cannot currently be checked for referential integrity, only for shape.
