# HTTP and adapter contract

This is the implementation baseline for RCE-053. That story must deliver executable OpenAPI 3.1, shared runtime schemas, generated client types and contract tests before dependent controllers are called complete. Endpoint names below are normative for v1; a change requires updating the story and consumers together.

## Transport and security

Use /v1 JSON APIs behind HTTPS. Browser UI and API are same-origin. Browser authentication uses an opaque Secure HttpOnly SameSite=Lax session cookie and CSRF protection on unsafe methods. OIDC tokens remain server-side. A later native client uses an approved public-client authorization-code + PKCE flow and secure device storage; never reuse browser cookie assumptions blindly.

Every protected request derives Principal from verified credentials. Request payload owner_id is not authority. Public catalog access, if enabled, uses a redacted safe preview only; private library, explicit detail and all chat operations require authenticated authorized scope. Pagination uses opaque cursor, limit default 20 and maximum 100. Reject invalid or scope-mismatched cursors. Resource IDs are UUIDs; dates UTC RFC3339; revisions nonnegative integers.

GET resource responses contain data and meta (request_id, revision where relevant). Lists contain data array and page (next_cursor, has_more). Write endpoints return committed resource/version or an asynchronous operation resource. PATCH/DELETE of versioned state requires If-Match with current quoted revision; missing precondition is 428 and stale revision is 409 with a stable code. Domain proposals separately carry expected_scene_revision. Server never exposes another owner's current revision in an error.

POST commands that create resources or work require Idempotency-Key, scoped to owner+route+key and request hash. Repeating identical input returns the same result; a different payload under the same key returns 409 IDEMPOTENCY_CONFLICT. Default retention is 24 hours for request keys; durable client_message_id uniqueness still prevents chat duplication beyond key retention.

Errors: {error:{code,message,request_id,retryable,details}}. details contains safe field/constraint diagnostics, not stack traces or secret canonical facts. Statuses: 400 malformed; 401 unauthenticated; 403 permitted-to-know but forbidden; 404 missing or undiscoverable; 409 stale/state conflict; 413 size; 422 schema/domain rejection; 428 missing version; 429 quota; 503 dependency unavailable. A model refusal is a typed failed/refused turn outcome, not an HTTP authentication error. Avoid automatically retrying non-idempotent unknown outcomes.

## Identity and account endpoints

GET /auth/login: redirect to approved OIDC authorization endpoint with state/nonce/PKCE. GET /auth/callback: validate response and create/rotate session. POST /auth/logout: revoke local session and provider session as supported. Registration, verification, recovery and credential changes use identity-provider flows with allowlisted return routes.

GET /v1/me: AccountView containing id, display profile, status, verification and onboarding state, never credentials. GET/PATCH /v1/me/preferences: AccountPreferences. GET /v1/me/sessions and DELETE /v1/me/sessions/{id}: list/revoke owned devices. GET /v1/me/eligibility: EligibilityView. POST /v1/me/age-assurance: initiate approved assurance; authenticated server callback completes it. POST /v1/me/content-consents and DELETE /v1/me/content-consents/{id}: scoped opt-in/revocation. GET /v1/me/usage: measured/estimated quota ledger summary.

POST /v1/me/exports returns 202 ExportJob. GET /v1/me/exports/{id} returns status and short-lived authorized download when complete. DELETE /v1/me returns 202 ErasureJob after fresh authentication and confirmation, immediately revoking sessions and pending generation access. GET /v1/operations/{id} is available through a narrowly scoped deletion receipt where account revocation otherwise removes access; it reveals status only and expires. Raw receipt secrets are not logged.

## Character and catalog endpoints

GET /v1/catalog/characters: approved preview search with q, tags, cursor and limit. GET /v1/catalog/characters/{id}: approved CharacterPreview/allowed details. GET/POST /v1/characters: list/create owned core. GET/PATCH/DELETE /v1/characters/{id}: versioned owned draft/archive behavior. POST /v1/characters/{id}/releases: validate and publish immutable private release. POST /v1/characters/{id}/clones: authorized copy with fresh IDs and attribution. PUT/DELETE /v1/me/favorites/{characterId}: idempotent favorite toggle.

POST /v1/character-imports: validation/preview by default; commit requires preview token/hash and explicit mode create/clone/update. GET /v1/characters/{id}/export returns CharacterPackage or export job if large. No memories by default. GET/POST/PATCH /v1/archetypes and /v1/anatomy-presets operate on authorized authored registry entries; immutable release endpoints pin versions. GET /v1/characters/{id}/anatomy resolves an authorized definition, not a catalog public leak.

## Scenario, persona, world and state endpoints

GET/POST /v1/personas; GET/PATCH/DELETE /v1/personas/{id}: owned fictional personas. GET/POST /v1/scenarios; GET/PATCH /v1/scenarios/{id}: ScenarioCreate/ScenarioView. POST /v1/scenarios/{id}/conversations: create conversation with idempotency. ScenarioCreate includes title, persona_id, character release references and explicit instance overrides, world/environment references, content mode and lifetime policy. Limit one player plus four AI instances. Creation is atomic and validates access/adult gates before instantiation.

GET /v1/scenarios/{id}/state: authorized SceneSnapshot. GET /v1/scenarios/{id}/instances/{instanceId}: resolved instance view with field provenance. PATCH same path: explicit scoped definition override under version/authority checks. POST /v1/scenarios/{id}/actions/validate: dry-run ordered ActionProposal batch with snapshot version. POST /v1/scenarios/{id}/actions/commit: trusted authorized domain command only, never a generic JSON patch into all state. Validation token binds payload hash, principal, policy revision and snapshot; commit rechecks current state. Chat generated turns commit through RCE-018, not an unauthenticated shortcut.

GET/POST /v1/worlds; GET/PATCH /v1/worlds/{id}; authorized /v1/worlds/{id}/locations and lore subresources. GET /v1/environment-templates: allowed template releases. POST /v1/scenarios/{id}/scenes: begin scene. POST /v1/scenes/{id}/end and /reset: explicit scope, preview hash and expected revision. GET/PATCH /v1/scenarios/{id}/focus: scoped pins/proposals.

## Memory, relationships and corrections

GET /v1/scenarios/{id}/instances/{instanceId}/memories: authorized filtered retrieval with cursor. GET matching /knowledge, /relationships and /goals resources returns only allowed view. Author inspection and character-perspective reads are distinct modes with explicit authorization; never hand omniscient truth to an in-fiction speaker.

POST /v1/scenarios/{id}/corrections: CorrectionInput {target_layer,target_id,source_message_id,reason,proposed_change,mode}. Default mode evidence; mode explicit_canon requires authority. Response is ChangeProposal with pending/applied/rejected state and provenance. POST /v1/change-proposals/{id}/approve or /reject requires owner, version and current scope. Correction approval does not globally modify archetypes or other users.

POST /v1/memories/{id}/suppress or /correct and DELETE /v1/memories/{id} have distinct documented semantics. History retcon is a branch operation, not a silent memory rewrite. Retrieval and search always filter owner, continuity, branch, instance visibility, suppression and erasure before ranking.

## Conversation and turn endpoints

GET/POST /v1/conversations; GET/PATCH/DELETE /v1/conversations/{id}; GET /v1/conversations/{id}/messages with cursor. POST /v1/conversations/{id}/turns accepts TurnInput {client_message_id,text,persona_id,addressee_instance_ids,expected_scene_revision,content_mode} and returns 202 TurnView. Reject more than configured 16 KiB UTF-8 input for the baseline; document adjustable limits. User message is persisted once as input. GET /v1/turns/{id} returns durable state.

Turn states: queued -> generating -> validating -> committed. Terminal alternatives failed or cancelled; failed includes provider_refused, invalid_candidate, unresolved_reference, dependency_failure and exhausted_attempts codes. A repair is another bounded attempt against the same uncommitted turn. CandidateTurn has utterances[{speaker_instance_id,addressees,kind,text}], actions[], claims[], unresolved_references[], model_revision and usage. A narrator utterance uses explicit kind rather than impersonating a player.

POST /v1/turns/{id}/cancel is idempotent. POST /v1/turns/{id}/retry creates a permitted attempt, not a duplicate input. POST /v1/messages/{id}/revisions accepts replacement text or regenerate intent and creates a child branch from pre-turn state. Successful replacement activates that branch atomically. Failure preserves the existing active history.

GET /v1/conversations/{id}/events uses authenticated SSE; event id is a durable sequence scoped to the conversation/branch. Event types turn.status, turn.committed, turn.failed, turn.cancelled and resync.required. Recheck access on connection/reconnect and periodically during long streams. Never put bearer tokens in URLs. Last-Event-ID resumes retained events; expired cursor produces resync instruction with bounded canonical fetch. Committed event contains turn_id, scene_revision, message IDs and validated utterances. No unvalidated model token event exists in v1. Polling GET turn is fallback.

GET /v1/turns/{id}/trace: owner-scoped explainability view with model/rule/context revisions and memory references. Standard telemetry does not capture content. GET /v1/scenarios/{id}/context compiles a bounded role-specific bundle; server chooses visibility and cannot be tricked into unauthorized omniscient mode.

## Media and administration

POST /v1/media/uploads initiates bounded portrait upload. POST /v1/media/{id}/complete validates/quarantines. GET/DELETE /v1/media/{id} authorizes read/erase. Images only PNG/JPEG/WebP; default upload maximum 5 MiB and decoded pixel maximum 16 million, both enforced server-side. No external URL fetch proxy.

POST /v1/reports accepts reason plus explicitly selected evidence. Admin endpoints /v1/admin/catalog/releases/{id}/approve or /withdraw, /v1/admin/reports, /v1/admin/accounts/{id}/suspend and /v1/admin/runtime/kill-switch require separate roles and strong authentication. No generic admin transcript browser is introduced.

## MCP adapter

Expose read resources and typed tools over the same permission-aware services and contracts. Tool annotations are hints, not enforcement. API principal, ownership, branch visibility, adult gates and idempotency apply equally. Do not expose a raw arbitrary-state write tool. Pin and test the selected MCP protocol/SDK version during implementation; do not rely on unverified earlier claims about a 2026 protocol change. Remote HTTP authorization follows the official applicable MCP specification, including resource/audience validation. STDIO uses explicitly configured local credentials and scope, never shared implicit omniscience.
