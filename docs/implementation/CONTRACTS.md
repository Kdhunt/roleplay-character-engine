# Shared application contracts

Source: RCE-053 (https://trello.com/c/LOuL7U3K). Snapshot 2026-09-05. Depends on RCE-001 and RCE-003.

**Tasks 1 and 2 of 3 have landed.** RCE-053 is a large story and QUALITY.md requires large stories to be split into contract, implementation and integration sections with their own acceptance evidence. Task 1 delivered the shared contract foundation; task 2 delivered the executable OpenAPI document over every path in API.md. Task 3 — generated client types — remains blocked on RCE-061.

| Task | Contents | Status |
| --- | --- | --- |
| 1 — shared contracts | gate identifiers, error model and status matrix, response envelopes, turn objects, SSE events, fixtures | landed |
| 2 — OpenAPI document | every path in API.md as an operation, with parameters, request bodies, responses and the error matrix bound per operation | landed |
| 3 — generated client types | typed client generation from the document | blocked on RCE-061 |

Task 3 shrank: the drift check that was going to wait for `spec:check` is dependency-free, so it already runs in CI. Only client-type generation still needs the workspace.

## Gate-name reconciliation

The RCE-053 card carries a checklist requiring a mapping from each legacy gate name to the canonical ADR-006 name and the final wire field. Here it is, with sources.

| Wire field | ADR-006 (canonical) | README.md:17 | QUALITY.md:23 | CLIENT.md |
| --- | --- | --- | --- | --- |
| `account_access` | Account access | real-user eligibility | Real-user eligibility | real-user eligibility (:9) |
| `fictional_adult_eligibility` | fictional adult eligibility | fictional adulthood | fictional age | — |
| `player_content_authorization` | player content authorization | content opt-in | player opt-in | content opt-in (:9) |
| `character_current_willingness` | character current willingness | current willingness | character willingness | current willingness (:17) |
| `provider_capability` | provider capability | provider permission | provider approval | — |

Five checks, ADR-006 naming canonical, per the owner decision on RCE-001.

The first row needed that decision. ADR-006 names *Account access* where README.md and QUALITY.md name *real-user eligibility*, and DOMAIN.md backs them with two separate records — `UserAccount` and `UserEligibility` — so mapping one onto the other looked like it would drop a check rather than rename one. The resolution keeps five identifiers and puts the missing semantics inside the first: **INV-030 now defines account access as a conjunction that fails closed.** Wherever adult access is evaluated, an authenticated and authorized principal AND a valid current UserEligibility assurance are both required. Assurance that is missing, expired or revoked denies through `account_access` with an `assurance_missing`, `assurance_expired` or `assurance_revoked` reason.

So no enforcement is lost and no competing vocabulary is introduced. `gates.schema.json` carries exactly five identifiers, and `report.assurance-expired.json` fixes the behavior in a fixture: expired assurance denies even though authentication succeeded.

`GateReport` is constrained **by gate identity, not by array length**. Each of the five appears exactly once, so a report cannot substitute a duplicated `account_access` for a missing willingness evaluation. `permitted` is derived rather than asserted: true requires every outcome satisfied, false requires at least one that is not, so no caller can authorize an operation the detailed outcomes reject.

The remaining checklist items — reconciling the README and API documentation, adding drift regression coverage, and linking implementation evidence — belong to tasks 2 and 3. The checklist stays incomplete.

## Error model

One shape for every `/v1` endpoint: `{error:{code, message, request_id, retryable, details}}`. `details` carries safe field and constraint diagnostics only — never stack traces, never secret canonical facts, never another owner's revision.

Fourteen stable codes map to the statuses API.md fixes: 400 `MALFORMED_REQUEST`; 401 `UNAUTHENTICATED`; 403 `FORBIDDEN`; 404 `NOT_FOUND`; 409 `STALE_REVISION`, `IDEMPOTENCY_CONFLICT`, `STATE_CONFLICT`; 413 `PAYLOAD_TOO_LARGE`; 422 `SCHEMA_REJECTED`, `DOMAIN_REJECTED`; 428 `PRECONDITION_REQUIRED`; 429 `QUOTA_EXCEEDED`; 503 `DEPENDENCY_UNAVAILABLE`, `FRESHNESS_UNAVAILABLE`.

`FRESHNESS_UNAVAILABLE` is new here. ADR-004 requires generation to pause with an explicit retryable dependency or freshness failure when required state or visibility cannot be reconstructed completely; that outcome had no code.

**A model refusal is never an HTTP error.** It is a typed failed turn outcome carrying `provider_refused`. Returning 403 for a refusal would conflate a provider decision with an authorization decision, and INV-034 forbids exactly that.

## Envelopes

A resource response carries `data` and `meta`; a list carries `data`, `page` and `meta`. `page.next_cursor` and `has_more` cannot contradict each other in either direction: false forbids the cursor, true requires it. Without the second rule a client is told more data exists and given no way to ask for it. `limit` defaults to 20 and caps at 100.

`AsyncOperation` covers write endpoints whose work outlives the response. A `succeeded` operation must reference a resource and must not carry an error; a `failed` one must carry an error and must not reference a resource. Neither combination is representable.

## The OpenAPI document

`packages/contracts/openapi.json` is **generated** by `scripts/build-openapi.mjs` from a single endpoint table, not hand-written. The surface is 100 operations sharing one error matrix, one idempotency rule and one precondition rule; hand-copying those into every operation is how a specification acquires 100 slightly different error sets. The table is the reviewable artifact and the generator applies the cross-cutting rules uniformly.

Component schemas are **bundled** from `packages/contracts/schema` so there is one source of truth. Those files identify themselves with `urn:rce:schema:` URNs, which are stable but deliberately not dereferenceable, and no OpenAPI tool can resolve them — so the generator rewrites every URN reference into a local `#/components/schemas/` pointer and drops the `$id` and `$schema` keywords a bundled component should not carry. A `$defs` entry becomes `name.DefName`. The check asserts no URN survives.

Cross-cutting rules, applied from flags rather than repeated per operation:

| Rule | Applied when |
| --- | --- |
| 401 and 429 | any operation requiring a session |
| 403 and 404 | any operation addressing a resource by path id |
| 413 and 422 | any operation accepting a body |
| 409 | any idempotent write or precondition operation |
| 428 plus a required `If-Match` | any versioned update or delete |
| required `Idempotency-Key` | any operation creating a resource or work |
| 503 | every operation, without exception |

## Turn contracts

`TurnInput`, `TurnView`, `CandidateTurn`, `ActionProposal`, `Claim` and `ValidationResult`, per API.md and ADR-004/005. Three structural points worth naming:

- **A `Claim` has `authority: "derived"` as a constant.** An extracted claim cannot be minted as `canonical` or `explicit_author` at the wire level, so INV-004 is enforced by the type rather than by a validator someone has to run.
- **A character utterance must attribute a speaker; a narrator utterance declares itself.** There is no `player` utterance kind, because player input is durable input rather than generated output.
- **`ValidationResult` issues may cite an invariant** by `INV-###`. Citing rather than restating is the point of the register.

`TurnView` carries no unvalidated model output. A client that receives `turn.committed` is receiving output that is already canon.

## SSE events

Five types on `GET /v1/conversations/{id}/events`: `turn.status`, `turn.committed`, `turn.failed`, `turn.cancelled`, `resync.required`. Each event's `data` is constrained per type, so a committed event without utterances fails validation. Event `id` is a durable sequence scoped to conversation and branch — monotonic within that scope, not globally — which is what makes `Last-Event-ID` resumption deterministic. An expired cursor produces `resync.required` with a bounded fetch instruction rather than an unbounded replay.

## Verification

Validated with ajv 8 in strict mode: 14 schemas compile, 58 fixtures across both manifests produce their expected outcomes (27 from RCE-003, 31 here). That run uses a scratch directory, because the repository still has no dependencies or test runner — so it remains authoring evidence rather than a passing repository test until RCE-061.

**The OpenAPI document is different: its check is committed and runs in CI.** `node scripts/build-openapi.mjs --check` regenerates the document from the endpoint table, fails if the committed file has drifted, and asserts structural invariants with no dependencies at all — every `$ref` resolves locally, no `urn:` identifier survived bundling, every operation has a success response and a 503, every authenticated operation has a 401 and a 429, every `If-Match` parameter has a matching 428 and vice versa, every `Idempotency-Key` has a 409, and every path template has a declared required parameter. It is wired into `spec-check.yml` beside the planning checks.

Meta-schema conformance was verified separately with `@seriousme/openapi-schema-validator` in a scratch directory; that part is not yet reproducible from a committed command.

## Unresolved

1. **Five gates — RESOLVED by the owner on RCE-001.** ADR-006 naming is canonical and there are five identifiers; real-user assurance lives inside `account_access`, which INV-030 defines as a fail-closed conjunction. Dependent controllers may adopt these field names.
2. **OpenAPI document — DELIVERED, with one honest gap.** `packages/contracts/openapi.json` covers 100 operations over 77 paths with 49 bundled component schemas, validated against the OpenAPI 3.1 meta-schema. The shapes from task 1 are now bound to routes, so "one explicit API" is a fact for the endpoints API.md enumerates.

   **The gap: 40 of the request bodies are typed only as `object`.** Task 1 defined the turn objects, gates, error model and envelopes; it did not define payloads like `ScenarioCreate`, `CorrectionInput` or `AccountPreferences`. Rather than invent those shapes, each untyped body carries a description saying so and naming the per-group work that owns it. Twelve operations are fully typed where a task-1 schema genuinely applies. An untyped body is a known hole, not an oversight, and no controller should treat `object` as permission to accept anything.
3. **Idempotency-key retention is stated but not modelled.** API.md sets 24 hours, and `client_message_id` covers duplication beyond that window. Neither appears in a schema, because both are storage and middleware concerns — RCE-073 and RCE-002 own them. Recorded so the gap is visible rather than assumed handled.
4. **`FRESHNESS_UNAVAILABLE` status — PROPOSAL, awaiting owner approval.** ADR-004 requires generation to pause with an explicit retryable dependency or freshness failure; API.md's status list predates that decision and has no code for the outcome, so this code is an addition rather than a transcription.

   **Proposed.** 503 with `retryable: true` and a `Retry-After` header. A client distinguishes it from `DEPENDENCY_UNAVAILABLE`, which shares the status, by `code` — which the error model already makes the stable discriminator rather than the status.

   **Rejected: 409.** A conflict tells the caller their state is wrong and that a different request would succeed. Here the request is correct and the server is temporarily behind its own projections, so retrying the identical request is exactly the right move.

   **Rejected: 425 Too Early.** Semantically close, but RFC 8470 ties it to TLS early data. Reusing it for projection lag would mislead every HTTP-aware intermediary between the client and the API.

   **Rejected: 202 with an async operation.** It reports a failure as a success and leaves the client polling with no indication of why, which is the opposite of the explicit typed failure ADR-004 asks for.
