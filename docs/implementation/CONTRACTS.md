# Shared application contracts

Source: RCE-053 (https://trello.com/c/LOuL7U3K). Snapshot 2026-09-05. Depends on RCE-001 and RCE-003.

**This is task 1 of 3.** RCE-053 is a large story and QUALITY.md requires large stories to be split into contract, implementation and integration sections with their own acceptance evidence. This change delivers the shared contract foundation every endpoint depends on. It does **not** deliver the OpenAPI 3.1 document or the per-endpoint operations.

| Task | Contents | Status |
| --- | --- | --- |
| 1 — shared contracts | gate identifiers, error model and status matrix, response envelopes, turn objects, SSE events, fixtures | this change |
| 2 — OpenAPI document | every path in API.md as an operation, with parameters, request bodies, responses and the error matrix bound per operation | not started |
| 3 — generated client types and spec lint | typed client generation, `spec:check` wiring, drift regression | blocked on RCE-061 |

## Gate-name reconciliation

The RCE-053 card carries a checklist requiring a mapping from each legacy gate name to the canonical ADR-006 name and the final wire field. Here it is, with sources.

| Wire field | ADR-006 (canonical) | README.md:17 | QUALITY.md:23 | CLIENT.md |
| --- | --- | --- | --- | --- |
| `account_access` | Account access | *(absent)* | *(absent)* | *(absent)* |
| `real_user_assurance` | *(absent)* | real-user eligibility | Real-user eligibility | real-user eligibility (:9) |
| `fictional_adult_eligibility` | fictional adult eligibility | fictional adulthood | fictional age | — |
| `player_content_authorization` | player content authorization | content opt-in | player opt-in | content opt-in (:9) |
| `character_current_willingness` | character current willingness | current willingness | character willingness | current willingness (:17) |
| `provider_capability` | provider capability | provider permission | provider approval | — |

**The mapping is six rows, not five, and that is a finding rather than a preference.**

The card's checklist says "Preserve the five checks' meaning and enforcement; this is naming cleanup, not a policy redesign." Following that instruction is what surfaced the problem: rows 1 and 2 are not two spellings of one check.

- ADR-006 names **Account access** and has no entry for real-user age assurance.
- README.md and QUALITY.md both name **real-user eligibility** and have no entry for account access.
- DOMAIN.md backs them with two separate records: `UserAccount` (issuer+subject identity binding, display profile, status, settings) and `UserEligibility` (assurance status, method, result reference, issued/expiry/revoked times, policy version).
- RCE-089 states that the character-age gate and real-user assurance remain separate, treating assurance as a first-class concern with its own decision.

Mapping `real-user eligibility → account_access` would collapse "is this session authorized for this resource" into "has this human satisfied the age-assurance policy". That changes enforcement, which the checklist explicitly forbids. So `gates.schema.json` carries six identifiers, marked in the schema itself as a proposal pending owner confirmation.

**If the owner confirms five,** delete `real_user_assurance` from `GateId`, drop `minItems`/`maxItems` on `GateReport.evaluations` from 6 to 5, and remove the two fixtures that assert six. That is a small, contained reversal — which is why the finding is recorded as a proposal rather than argued further here.

The remaining checklist items — reconciling the README and API documentation, adding drift regression coverage, and linking implementation evidence — belong to tasks 2 and 3. The checklist stays incomplete.

## Error model

One shape for every `/v1` endpoint: `{error:{code, message, request_id, retryable, details}}`. `details` carries safe field and constraint diagnostics only — never stack traces, never secret canonical facts, never another owner's revision.

Fourteen stable codes map to the statuses API.md fixes: 400 `MALFORMED_REQUEST`; 401 `UNAUTHENTICATED`; 403 `FORBIDDEN`; 404 `NOT_FOUND`; 409 `STALE_REVISION`, `IDEMPOTENCY_CONFLICT`, `STATE_CONFLICT`; 413 `PAYLOAD_TOO_LARGE`; 422 `SCHEMA_REJECTED`, `DOMAIN_REJECTED`; 428 `PRECONDITION_REQUIRED`; 429 `QUOTA_EXCEEDED`; 503 `DEPENDENCY_UNAVAILABLE`, `FRESHNESS_UNAVAILABLE`.

`FRESHNESS_UNAVAILABLE` is new here. ADR-004 requires generation to pause with an explicit retryable dependency or freshness failure when required state or visibility cannot be reconstructed completely; that outcome had no code.

**A model refusal is never an HTTP error.** It is a typed failed turn outcome carrying `provider_refused`. Returning 403 for a refusal would conflate a provider decision with an authorization decision, and INV-034 forbids exactly that.

## Envelopes

A resource response carries `data` and `meta`; a list carries `data`, `page` and `meta`. `page.next_cursor` is absent whenever `has_more` is false — the schema rejects a cursor that contradicts the flag, because that combination is how a client ends up looping. `limit` defaults to 20 and caps at 100.

`AsyncOperation` covers write endpoints whose work outlives the response. A `succeeded` operation must reference a resource and must not carry an error; a `failed` one must carry an error and must not reference a resource. Neither combination is representable.

## Turn contracts

`TurnInput`, `TurnView`, `CandidateTurn`, `ActionProposal`, `Claim` and `ValidationResult`, per API.md and ADR-004/005. Three structural points worth naming:

- **A `Claim` has `authority: "derived"` as a constant.** An extracted claim cannot be minted as `canonical` or `explicit_author` at the wire level, so INV-004 is enforced by the type rather than by a validator someone has to run.
- **A character utterance must attribute a speaker; a narrator utterance declares itself.** There is no `player` utterance kind, because player input is durable input rather than generated output.
- **`ValidationResult` issues may cite an invariant** by `INV-###`. Citing rather than restating is the point of the register.

`TurnView` carries no unvalidated model output. A client that receives `turn.committed` is receiving output that is already canon.

## SSE events

Five types on `GET /v1/conversations/{id}/events`: `turn.status`, `turn.committed`, `turn.failed`, `turn.cancelled`, `resync.required`. Each event's `data` is constrained per type, so a committed event without utterances fails validation. Event `id` is a durable sequence scoped to conversation and branch — monotonic within that scope, not globally — which is what makes `Last-Event-ID` resumption deterministic. An expired cursor produces `resync.required` with a bounded fetch instruction rather than an unbounded replay.

## Verification

Validated with ajv 8 in strict mode during authoring: 13 schemas compile, 48 fixtures across both manifests produce their expected outcomes (22 from RCE-003, 26 added here).

As with RCE-003, that run used a scratch directory. **This repository still has no dependencies, lockfile or test runner, so no committed command reproduces it.** Task 3 wires it into `spec:check` once RCE-061 exists. Treat this as authoring evidence, not a passing repository test.

## Unresolved

1. **Five gates or six.** The blocking decision for this story. Evidence above; the schema carries six as a proposal. Dependent controllers must not adopt the field names until this is settled, which is precisely what the card's checklist warns about.
2. **No OpenAPI document yet.** Task 2. Until it exists, "one explicit API" is a goal rather than a fact, and the shapes here are not bound to any route.
3. **Idempotency-key retention is stated but not modelled.** API.md sets 24 hours, and `client_message_id` covers duplication beyond that window. Neither appears in a schema, because both are storage and middleware concerns — RCE-073 and RCE-002 own them. Recorded so the gap is visible rather than assumed handled.
4. **`FRESHNESS_UNAVAILABLE` is an addition, not a transcription.** ADR-004 requires the outcome; API.md's status list predates it and has no code for it. Mapped to 503 as the closest existing semantic. Confirm the status choice.
