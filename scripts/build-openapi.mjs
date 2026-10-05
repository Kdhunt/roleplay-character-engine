import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * RCE-053 task 2: build the executable OpenAPI 3.1 document from one endpoint table.
 *
 * Generated rather than hand-written on purpose. The surface is ~85 operations that share a
 * strict error matrix, idempotency rules and precondition rules from API.md; copying those into
 * every operation by hand is how a spec acquires 85 slightly different error sets. The table
 * below is the reviewable artifact, and `--check` proves the committed document still matches it.
 *
 * Component schemas are BUNDLED from packages/contracts/schema so there is one source of truth:
 * the urn: identifiers those files use are rewritten to local component pointers, because a URN
 * does not resolve for OpenAPI tooling.
 */

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const SCHEMA_DIR = join(ROOT, 'packages/contracts/schema');
const OUT = join(ROOT, 'packages/contracts/openapi.json');

// ---------------------------------------------------------------- flags used by the endpoint table
// pub      no session required
// admin    separate role plus strong authentication
// body     accepts a request body
// idem     creates a resource or work: requires Idempotency-Key (API.md)
// precond  versioned state: requires If-Match, 428 when absent, 409 when stale
// page     cursor-paginated list
// async    returns an operation resource rather than the finished thing
// sse      text/event-stream
// id:NAME  path parameter
// req:N    request body bound to component N  (req:[]N for an array of N)
// res:N    success payload bound to component N

const E = (method, path, operationId, tag, summary, flags = '') =>
  ({ method, path, operationId, tag, summary, flags: flags.split(/\s+/).filter(Boolean) });

const ENDPOINTS = [
  // ---- auth (outside /v1; browser redirect flow, no JSON body)
  E('get', '/auth/login', 'authLogin', 'auth', 'Redirect to the approved OIDC authorization endpoint with state, nonce and PKCE.', 'pub'),
  E('get', '/auth/callback', 'authCallback', 'auth', 'Validate the provider response and create or rotate the session.', 'pub'),
  E('post', '/auth/logout', 'authLogout', 'auth', 'Revoke the local session, and the provider session where supported.', ''),

  // ---- identity and account
  E('get', '/v1/me', 'getAccount', 'account', 'Account view. Never contains credentials.'),
  E('get', '/v1/me/preferences', 'getPreferences', 'account', 'Account preferences.'),
  E('patch', '/v1/me/preferences', 'updatePreferences', 'account', 'Update account preferences.', 'body precond'),
  E('get', '/v1/me/sessions', 'listSessions', 'account', 'List owned device sessions.', 'page'),
  E('delete', '/v1/me/sessions/{id}', 'revokeSession', 'account', 'Revoke one owned device session.', 'id:id'),
  E('get', '/v1/me/eligibility', 'getEligibility', 'account', 'Real-user assurance state. Identity documents are never stored or returned.'),
  E('post', '/v1/me/age-assurance', 'startAgeAssurance', 'account', 'Initiate approved age assurance; an authenticated server callback completes it.', 'body idem async'),
  E('post', '/v1/me/content-consents', 'grantContentConsent', 'account', 'Grant a scoped content opt-in.', 'body idem'),
  E('delete', '/v1/me/content-consents/{id}', 'revokeContentConsent', 'account', 'Revoke a scoped content opt-in.', 'id:id'),
  E('get', '/v1/me/usage', 'getUsage', 'account', 'Measured and estimated quota ledger summary.'),
  E('post', '/v1/me/exports', 'createExport', 'account', 'Request a full account export.', 'body idem async'),
  E('get', '/v1/me/exports/{id}', 'getExport', 'account', 'Export status, with a short-lived authorized download when complete.', 'id:id'),
  E('delete', '/v1/me', 'deleteAccount', 'account', 'Erase the account after fresh authentication and confirmation. Revokes sessions immediately.', 'body idem async'),
  E('get', '/v1/operations/{id}', 'getOperation', 'account', 'Status of an asynchronous operation. Reveals status only and expires.', 'id:id receipt'),

  // ---- catalog and characters
  E('get', '/v1/catalog/characters', 'searchCatalog', 'catalog', 'Search approved catalog previews. Redacted view only.', 'page search'),
  E('get', '/v1/catalog/characters/{id}', 'getCatalogCharacter', 'catalog', 'Approved catalog preview for one character.', 'id:id res:character-preview'),
  E('get', '/v1/characters', 'listCharacters', 'characters', 'List owned character cores.', 'page'),
  E('post', '/v1/characters', 'createCharacter', 'characters', 'Create an owned character core with an empty draft.', 'body idem'),
  E('get', '/v1/characters/{id}', 'getCharacter', 'characters', 'Owned character core, including its editable draft.', 'id:id res:character-core'),
  E('patch', '/v1/characters/{id}', 'updateCharacterDraft', 'characters', 'Update the editable draft of an owned core.', 'id:id body precond req:character-draft res:character-core'),
  E('delete', '/v1/characters/{id}', 'archiveCharacter', 'characters', 'Archive an owned character core.', 'id:id precond'),
  E('post', '/v1/characters/{id}/releases', 'publishRelease', 'characters', 'Validate and publish an immutable private release from the draft.', 'id:id body idem res:character-release'),
  E('post', '/v1/characters/{id}/clones', 'cloneCharacter', 'characters', 'Authorized copy with fresh identifiers and attribution.', 'id:id body idem'),
  E('put', '/v1/me/favorites/{characterId}', 'addFavorite', 'catalog', 'Idempotent favorite.', 'id:characterId'),
  E('delete', '/v1/me/favorites/{characterId}', 'removeFavorite', 'catalog', 'Idempotent unfavorite.', 'id:characterId'),
  E('post', '/v1/character-imports', 'importCharacter', 'characters', 'Validate and preview an import; committing requires the preview token and hash.', 'body idem async'),
  E('get', '/v1/characters/{id}/export', 'exportCharacter', 'characters', 'Character package, or an export job when large. No memories by default.', 'id:id'),
  E('get', '/v1/characters/{id}/anatomy', 'getCharacterAnatomy', 'characters', 'Resolved authorized anatomy. Not a catalog-visible view.', 'id:id'),
  E('get', '/v1/archetypes', 'listArchetypes', 'registries', 'Authorized archetype registry entries.', 'page'),
  E('post', '/v1/archetypes', 'createArchetype', 'registries', 'Create an authored archetype entry.', 'body idem'),
  E('patch', '/v1/archetypes/{id}', 'updateArchetype', 'registries', 'Update an authored archetype entry.', 'id:id body precond'),
  E('get', '/v1/anatomy-presets', 'listAnatomyPresets', 'registries', 'Authorized anatomy preset releases.', 'page'),
  E('post', '/v1/anatomy-presets', 'createAnatomyPreset', 'registries', 'Create an authored anatomy preset entry.', 'body idem'),
  E('patch', '/v1/anatomy-presets/{id}', 'updateAnatomyPreset', 'registries', 'Update an authored anatomy preset entry.', 'id:id body precond'),

  // ---- personas, scenarios, world, state
  E('get', '/v1/personas', 'listPersonas', 'scenarios', 'List owned personas.', 'page'),
  E('post', '/v1/personas', 'createPersona', 'scenarios', 'Create an owned persona. Not a real identity record.', 'body idem req:persona res:persona'),
  E('get', '/v1/personas/{id}', 'getPersona', 'scenarios', 'One owned persona.', 'id:id res:persona'),
  E('patch', '/v1/personas/{id}', 'updatePersona', 'scenarios', 'Update an owned persona.', 'id:id body precond'),
  E('delete', '/v1/personas/{id}', 'deletePersona', 'scenarios', 'Delete an owned persona.', 'id:id precond'),
  E('get', '/v1/scenarios', 'listScenarios', 'scenarios', 'List owned scenarios.', 'page'),
  E('post', '/v1/scenarios', 'createScenario', 'scenarios', 'Create a scenario. One player persona plus one to four AI instances; gates are checked before instantiation.', 'body idem'),
  E('get', '/v1/scenarios/{id}', 'getScenario', 'scenarios', 'One owned scenario.', 'id:id'),
  E('patch', '/v1/scenarios/{id}', 'updateScenario', 'scenarios', 'Update an owned scenario.', 'id:id body precond'),
  E('post', '/v1/scenarios/{id}/conversations', 'createConversation', 'conversations', 'Create a conversation in a scenario.', 'id:id body idem'),
  E('get', '/v1/scenarios/{id}/state', 'getSceneSnapshot', 'state', 'Authorized scene snapshot.', 'id:id'),
  E('get', '/v1/scenarios/{id}/instances/{instanceId}', 'getResolvedInstance', 'state', 'Resolved instance view with per-field provenance.', 'id:id id:instanceId res:resolved-character'),
  E('patch', '/v1/scenarios/{id}/instances/{instanceId}', 'overrideInstance', 'state', 'Explicit scoped definition override under version and authority checks.', 'id:id id:instanceId body precond req:character-instance res:resolved-character'),
  E('post', '/v1/scenarios/{id}/actions/validate', 'validateActions', 'state', 'Dry-run an ordered action batch against a snapshot revision.', 'id:id body req:turn.ActionBatchRequest res:turn.ActionValidationResponse'),
  E('post', '/v1/scenarios/{id}/actions/commit', 'commitActions', 'state', 'Commit an authorized domain command. Never a generic state patch.', 'id:id body idem precond req:turn.ActionCommitRequest'),
  E('get', '/v1/worlds', 'listWorlds', 'world', 'List authorized worlds.', 'page'),
  E('post', '/v1/worlds', 'createWorld', 'world', 'Create an authored world.', 'body idem'),
  E('get', '/v1/worlds/{id}', 'getWorld', 'world', 'One authorized world.', 'id:id'),
  E('patch', '/v1/worlds/{id}', 'updateWorld', 'world', 'Update an authored world.', 'id:id body precond'),
  E('get', '/v1/worlds/{id}/locations', 'listLocations', 'world', 'Authorized location hierarchy for a world.', 'id:id page'),
  E('post', '/v1/worlds/{id}/locations', 'createLocation', 'world', 'Create a location in an authored world.', 'id:id body idem'),
  E('get', '/v1/worlds/{id}/lore', 'listLore', 'world', 'Authorized lore entries for a world.', 'id:id page'),
  E('post', '/v1/worlds/{id}/lore', 'createLore', 'world', 'Create a lore entry in an authored world.', 'id:id body idem'),
  E('get', '/v1/environment-templates', 'listEnvironmentTemplates', 'world', 'Allowed environment template releases.', 'page'),
  E('post', '/v1/scenarios/{id}/scenes', 'beginScene', 'state', 'Begin a scene.', 'id:id body idem'),
  E('post', '/v1/scenes/{id}/end', 'endScene', 'state', 'End a scene with explicit scope, preview hash and expected revision.', 'id:id body idem precond'),
  E('post', '/v1/scenes/{id}/reset', 'resetScene', 'state', 'Reset a scene with explicit scope, preview hash and expected revision.', 'id:id body idem precond'),
  E('get', '/v1/scenarios/{id}/focus', 'getFocus', 'state', 'Scoped focus pins and proposals.', 'id:id'),
  E('patch', '/v1/scenarios/{id}/focus', 'updateFocus', 'state', 'Update scoped focus pins.', 'id:id body precond'),

  // ---- memory, knowledge, corrections
  E('get', '/v1/scenarios/{id}/instances/{instanceId}/memories', 'listMemories', 'memory', 'Authorized filtered memory retrieval. Author and character-perspective modes are distinct.', 'id:id id:instanceId page'),
  E('get', '/v1/scenarios/{id}/instances/{instanceId}/knowledge', 'listKnowledge', 'memory', 'Authorized knowledge view. Never omniscient truth for an in-fiction speaker.', 'id:id id:instanceId page'),
  E('get', '/v1/scenarios/{id}/instances/{instanceId}/relationships', 'listRelationships', 'memory', 'Authorized directional relationship view.', 'id:id id:instanceId page'),
  E('get', '/v1/scenarios/{id}/instances/{instanceId}/goals', 'listGoals', 'memory', 'Authorized goal view, filtered by visibility.', 'id:id id:instanceId page'),
  E('post', '/v1/scenarios/{id}/corrections', 'createCorrection', 'memory', 'Propose a correction. Default mode is evidence; explicit_canon requires authority.', 'id:id body idem'),
  E('post', '/v1/change-proposals/{id}/approve', 'approveChangeProposal', 'memory', 'Approve a change proposal. Never modifies archetypes or another account.', 'id:id body idem precond'),
  E('post', '/v1/change-proposals/{id}/reject', 'rejectChangeProposal', 'memory', 'Reject a change proposal.', 'id:id body idem precond'),
  E('post', '/v1/memories/{id}/suppress', 'suppressMemory', 'memory', 'Suppress a memory. Distinct from correction and erasure.', 'id:id body idem'),
  E('post', '/v1/memories/{id}/correct', 'correctMemory', 'memory', 'Correct a memory. Distinct from suppression and erasure.', 'id:id body idem'),
  E('delete', '/v1/memories/{id}', 'eraseMemory', 'memory', 'Erase a memory and its derivatives. History retcon is a branch operation, not this.', 'id:id precond'),

  // ---- conversations and turns
  E('get', '/v1/conversations', 'listConversations', 'conversations', 'List owned conversations.', 'page'),
  E('post', '/v1/conversations', 'createConversationDirect', 'conversations', 'Create a conversation.', 'body idem'),
  E('get', '/v1/conversations/{id}', 'getConversation', 'conversations', 'One owned conversation.', 'id:id'),
  E('patch', '/v1/conversations/{id}', 'updateConversation', 'conversations', 'Update an owned conversation.', 'id:id body precond'),
  E('delete', '/v1/conversations/{id}', 'deleteConversation', 'conversations', 'Delete an owned conversation.', 'id:id precond'),
  E('get', '/v1/conversations/{id}/messages', 'listMessages', 'conversations', 'Branch-filtered message history.', 'id:id page'),
  E('post', '/v1/conversations/{id}/turns', 'createTurn', 'turns', 'Submit durable input and queue a turn. Returns 202 with the durable turn view.', 'id:id body idem async req:turn.TurnInput res:turn.TurnView'),
  E('get', '/v1/turns/{id}', 'getTurn', 'turns', 'Durable turn state. Carries no unvalidated model output.', 'id:id res:turn.TurnView'),
  E('post', '/v1/turns/{id}/cancel', 'cancelTurn', 'turns', 'Cancel a turn. Idempotent; returns committed if the commit already won.', 'id:id idem'),
  E('post', '/v1/turns/{id}/retry', 'retryTurn', 'turns', 'Create a permitted further attempt against the same durable input.', 'id:id idem'),
  E('post', '/v1/messages/{id}/revisions', 'reviseMessage', 'turns', 'Replace or regenerate, creating a child branch from the pre-turn state.', 'id:id body idem async'),
  E('get', '/v1/conversations/{id}/events', 'streamConversation', 'turns', 'Authenticated SSE stream of durable status and committed output.', 'id:id sse'),
  E('get', '/v1/turns/{id}/trace', 'getTurnTrace', 'turns', 'Owner-scoped explainability view with model, rule and context revisions.', 'id:id'),
  E('get', '/v1/scenarios/{id}/context', 'getContextBundle', 'turns', 'Compiled bounded role-specific context. The server chooses visibility.', 'id:id'),

  // ---- media, reports, administration
  E('post', '/v1/media/uploads', 'initiateMediaUpload', 'media', 'Initiate a bounded portrait upload. PNG, JPEG or WebP only.', 'body idem'),
  E('post', '/v1/media/{id}/complete', 'completeMediaUpload', 'media', 'Validate or quarantine an uploaded object.', 'id:id body idem'),
  E('get', '/v1/media/{id}', 'getMedia', 'media', 'Authorized read of a media object.', 'id:id'),
  E('delete', '/v1/media/{id}', 'deleteMedia', 'media', 'Erase a media object and its derivatives.', 'id:id'),
  E('post', '/v1/reports', 'createReport', 'media', 'Report content with a reason and explicitly selected evidence.', 'body idem'),
  E('post', '/v1/admin/catalog/releases/{id}/approve', 'adminApproveRelease', 'admin', 'Approve a release for the curated catalog.', 'admin id:id body idem precond'),
  E('post', '/v1/admin/catalog/releases/{id}/withdraw', 'adminWithdrawRelease', 'admin', 'Withdraw a release from the curated catalog.', 'admin id:id body idem precond'),
  E('get', '/v1/admin/reports', 'adminListReports', 'admin', 'Review submitted reports. No generic transcript browser.', 'admin page'),
  E('post', '/v1/admin/accounts/{id}/suspend', 'adminSuspendAccount', 'admin', 'Suspend an account.', 'admin id:id body idem'),
  E('post', '/v1/admin/runtime/kill-switch', 'adminKillSwitch', 'admin', 'Engage or release the runtime kill switch.', 'admin body idem'),
];

// ---------------------------------------------------------------- bundle component schemas
function bundleSchemas() {
  const components = {};
  const files = readdirSync(SCHEMA_DIR).filter(f => f.endsWith('.schema.json')).sort();
  const rewrite = (node) => {
    if (!node || typeof node !== 'object') return node;
    if (Array.isArray(node)) return node.map(rewrite);
    const out = {};
    for (const [k, v] of Object.entries(node)) {
      if (k === '$ref' && typeof v === 'string' && v.startsWith('urn:rce:schema:')) {
        const body = v.slice('urn:rce:schema:'.length);
        const [name, pointer] = body.split('#');
        out.$ref = pointer && pointer.startsWith('/$defs/')
          ? `#/components/schemas/${name}.${pointer.slice('/$defs/'.length)}`
          : `#/components/schemas/${name}`;
      } else if (k === '$schema' || k === '$id') {
        // dropped: a bundled component carries neither a dialect nor an identifier
      } else {
        out[k] = rewrite(v);
      }
    }
    return out;
  };
  for (const file of files) {
    const name = file.replace('.schema.json', '');
    const raw = JSON.parse(readFileSync(join(SCHEMA_DIR, file), 'utf8'));
    const { $defs, ...root } = raw;
    if ($defs) for (const [defName, def] of Object.entries($defs)) components[`${name}.${defName}`] = rewrite(def);
    if (root.type || root.properties || root.allOf || root.anyOf || root.oneOf) components[name] = rewrite(root);
  }
  return components;
}

// ---------------------------------------------------------------- the error matrix, applied uniformly
// The normative status-to-code mapping from API.md. This is the ONLY place it lives, and it is
// emitted as per-status schemas so the matrix is executable: a 401 carrying NOT_FOUND must fail
// validation, not merely contradict a description.
const STATUS_CODES = {
  400: ['MALFORMED_REQUEST'],
  401: ['UNAUTHENTICATED'],
  403: ['FORBIDDEN'],
  404: ['NOT_FOUND'],
  409: ['STALE_REVISION', 'IDEMPOTENCY_CONFLICT', 'STATE_CONFLICT'],
  413: ['PAYLOAD_TOO_LARGE'],
  422: ['SCHEMA_REJECTED', 'DOMAIN_REJECTED'],
  428: ['PRECONDITION_REQUIRED'],
  429: ['QUOTA_EXCEEDED'],
  503: ['DEPENDENCY_UNAVAILABLE', 'FRESHNESS_UNAVAILABLE'],
};
const errorResponse = (status) => ({
  description: STATUS_CODES[status].join(' or '),
  content: { 'application/json': { schema: { $ref: `#/components/schemas/api-error.${status}` } } },
});
function statusErrorComponents() {
  const out = {};
  for (const [status, codes] of Object.entries(STATUS_CODES)) {
    out[`api-error.${status}`] = {
      description: `An error response for HTTP ${status}. The code is constrained to what API.md maps to this status.`,
      allOf: [
        { $ref: '#/components/schemas/api-error' },
        { type: 'object', properties: { error: { type: 'object', properties: { code: { enum: codes } }, required: ['code'] } }, required: ['error'] },
      ],
    };
  }
  return out;
}

function errorsFor(f) {
  const has = (x) => f.includes(x);
  const codes = new Set([503, 400]);
  if (!has('pub')) { codes.add(401); codes.add(429); }
  if (has('id:id') || has('id:instanceId') || has('id:characterId')) { codes.add(404); codes.add(403); }
  if (has('body')) { codes.add(413); codes.add(422); }
  if (has('idem') || has('precond')) codes.add(409);
  if (has('precond')) codes.add(428);
  if (has('admin')) codes.add(403);
  return [...codes].sort((a, b) => a - b);
}

function build() {
  const components = { ...bundleSchemas(), ...statusErrorComponents() };
  const paths = {};

  for (const ep of ENDPOINTS) {
    const f = ep.flags;
    const has = (x) => f.includes(x);
    const op = { operationId: ep.operationId, tags: [ep.tag], summary: ep.summary, responses: {} };

    const bound = (prefix) => {
      const flag = f.find((x) => x.startsWith(prefix));
      if (!flag) return null;
      const name = flag.slice(prefix.length);
      return name.startsWith('[]')
        ? { type: 'array', maxItems: 100, items: { $ref: '#/components/schemas/' + name.slice(2) } }
        : { $ref: '#/components/schemas/' + name };
    };
    const params = [];
    for (const flag of f) {
      if (flag.startsWith('id:')) {
        params.push({ name: flag.slice(3), in: 'path', required: true, schema: { $ref: '#/components/schemas/common.Uuid' } });
      }
    }
    if (has('page')) {
      params.push({ name: 'cursor', in: 'query', required: false, description: 'Opaque, scope-bound. A cursor from another scope is rejected.', schema: { type: 'string', minLength: 1, maxLength: 512 } });
      params.push({ name: 'limit', in: 'query', required: false, schema: { type: 'integer', minimum: 1, maximum: 100, default: 20 } });
    }
    if (has('idem')) {
      params.push({ name: 'Idempotency-Key', in: 'header', required: true, description: 'Scoped to owner, endpoint, key and canonical request hash. Reuse with a different payload is 409 IDEMPOTENCY_CONFLICT.', schema: { type: 'string', minLength: 8, maxLength: 200 } });
    }
    if (has('precond')) {
      params.push({ name: 'If-Match', in: 'header', required: true, description: 'Current revision, quoted. Absent is 428; stale is 409 STALE_REVISION.', schema: { type: 'string', minLength: 1, maxLength: 64 } });
    }
    if (has('receipt')) {
      params.push({ name: 'X-Deletion-Receipt', in: 'header', required: false, description: 'Narrowly scoped, expiring receipt issued by account erasure. Accepted INSTEAD of a session, because erasure revokes sessions immediately and the requester still needs to read status. Reveals status only. Raw receipt secrets are never logged (API.md).', schema: { type: 'string', minLength: 16, maxLength: 512 } });
    }
    if (has('search')) {
      params.push({ name: 'q', in: 'query', required: false, description: 'Free-text search over approved previews only.', schema: { type: 'string', minLength: 1, maxLength: 200 } });
      params.push({ name: 'tags', in: 'query', required: false, explode: true, style: 'form', description: 'Filter by catalog tag. Repeatable.', schema: { type: 'array', maxItems: 16, items: { type: 'string', minLength: 1, maxLength: 40 } } });
    }
    if (params.length) op.parameters = params;

    if (has('body')) {
      const schema = bound('req:');
      op.requestBody = schema
        ? { required: true, content: { 'application/json': { schema } } }
        : {
            required: true,
            description: 'Not yet typed. Task 1 does not define this payload, so its DTO arrives with the per-group work for this tag. Deliberately unconstrained rather than guessed at.',
            content: { 'application/json': { schema: { type: 'object' } } },
          };
    }

    const okCode = has('async') ? '202' : (ep.method === 'delete' && !has('async') ? '204' : '200');
    if (has('sse')) {
      op.responses['200'] = {
        description: 'Durable status and committed output. No unvalidated model token event exists in v1.',
        content: { 'text/event-stream': { schema: { $ref: '#/components/schemas/sse-event' } } },
      };
      op.parameters = [...(op.parameters ?? []), { name: 'Last-Event-ID', in: 'header', required: false, description: 'Resumes retained events. An expired cursor yields resync.required.', schema: { type: 'string', maxLength: 64 } }];
    } else if (okCode === '204') {
      op.responses['204'] = { description: 'Deleted.' };
    } else if (okCode === '202') {
      const payload = bound('res:');
      op.responses['202'] = payload
        ? { description: 'Accepted. Returns the durable resource whose work continues; poll it rather than an operation wrapper.', content: { 'application/json': { schema: { type: 'object', properties: { data: payload, meta: { $ref: '#/components/schemas/api-envelope.Meta' } }, required: ['data', 'meta'], additionalProperties: false } } } }
        : { description: 'Accepted. Returns an asynchronous operation resource.', content: { 'application/json': { schema: { $ref: '#/components/schemas/api-envelope.AsyncOperation' } } } };
    } else if (has('page')) {
      op.responses['200'] = { description: 'Paginated list.', content: { 'application/json': { schema: { $ref: '#/components/schemas/api-envelope.ListResponse' } } } };
    } else if (has('pub') && ep.tag === 'auth') {
      op.responses['302'] = { description: 'Redirect to the identity provider or an allowlisted return route.' };
    } else {
      const payload = bound('res:');
      op.responses['200'] = payload
        ? {
            description: 'Resource.',
            content: { 'application/json': { schema: {
              type: 'object',
              properties: { data: payload, meta: { $ref: '#/components/schemas/api-envelope.Meta' } },
              required: ['data', 'meta'],
              additionalProperties: false,
            } } },
          }
        : { description: 'Resource. The data payload is not yet typed; its DTO arrives with the per-group work for this tag.', content: { 'application/json': { schema: { $ref: '#/components/schemas/api-envelope.ResourceResponse' } } } };
    }

    for (const status of errorsFor(f)) op.responses[String(status)] = errorResponse(status);
    if (has('pub')) op.security = [];
    else if (has('admin')) op.security = [{ sessionCookie: [], adminRole: [] }];
    else if (has('receipt')) op.security = [{ sessionCookie: [] }, { deletionReceipt: [] }];
    else op.security = [{ sessionCookie: [] }];

    paths[ep.path] = paths[ep.path] ?? {};
    paths[ep.path][ep.method] = op;
  }

  return {
    openapi: '3.1.0',
    info: {
      title: 'Roleplay Character Engine API',
      version: '0.1.0',
      summary: 'One explicit API implemented by web, future native clients, workers and the MCP adapter.',
      description: [
        'RCE-053 task 2. Generated by scripts/build-openapi.mjs from a single endpoint table; run with --check to prove this document still matches it.',
        '',
        'Owner is always derived from the verified principal and never from a payload. Request payload owner_id is not authority.',
        'A model refusal is NOT an HTTP error: it is a typed failed turn outcome carrying provider_refused.',
        'There is no arbitrary raw-state write endpoint. Definition edits and proposed narrative actions are distinct operations.',
      ].join('\n'),
    },
    servers: [{ url: '/', description: 'Same-origin. The browser UI and API share an origin.' }],
    tags: [
      { name: 'auth', description: 'OIDC authorization-code with PKCE. Tokens stay server-side.' },
      { name: 'account', description: 'Account, eligibility, consent, usage, export and erasure.' },
      { name: 'catalog', description: 'Curated catalog. Redacted previews only.' },
      { name: 'characters', description: 'Owned cores, drafts, releases, imports and exports.' },
      { name: 'registries', description: 'Authored archetype and anatomy preset registries.' },
      { name: 'scenarios', description: 'Personas and scenarios.' },
      { name: 'state', description: 'Scene state, resolved instances and authorized domain commands.' },
      { name: 'world', description: 'Worlds, locations, lore and environment templates.' },
      { name: 'memory', description: 'Scoped memory, knowledge, relationships and corrections.' },
      { name: 'conversations', description: 'Conversations and message history.' },
      { name: 'turns', description: 'Turn lifecycle, SSE, traces and context compilation.' },
      { name: 'media', description: 'Bounded portrait pipeline and reporting.' },
      { name: 'admin', description: 'Separate roles and strong authentication. No generic transcript browser.' },
    ],
    paths,
    components: {
      schemas: components,
      securitySchemes: {
        sessionCookie: { type: 'apiKey', in: 'cookie', name: 'rce_session', description: 'Opaque Secure HttpOnly SameSite=Lax session cookie. CSRF protection applies on unsafe methods.' },
        adminRole: { type: 'apiKey', in: 'cookie', name: 'rce_session', description: 'The same session, additionally carrying an administration role granted by trusted administration only.' },
        deletionReceipt: { type: 'apiKey', in: 'header', name: 'X-Deletion-Receipt', description: 'Narrowly scoped expiring receipt from account erasure. Grants status reads only, after the session it replaced was revoked.' },
      },
    },
  };
}

// ---------------------------------------------------------------- structural checks (no dependencies)
function structuralErrors(doc) {
  const errors = [];
  const names = new Set(Object.keys(doc.components.schemas));
  const seenRefs = new Set();
  const walk = (node) => {
    if (!node || typeof node !== 'object') return;
    if (Array.isArray(node)) return node.forEach(walk);
    for (const [k, v] of Object.entries(node)) {
      if (k === '$ref' && typeof v === 'string') {
        seenRefs.add(v);
        if (v.startsWith('#/components/schemas/')) {
          const target = v.slice('#/components/schemas/'.length);
          if (!names.has(target)) errors.push(`unresolved $ref: ${v}`);
        } else if (!v.startsWith('#')) {
          errors.push(`non-local $ref survived bundling: ${v}`);
        }
      } else walk(v);
    }
  };
  walk(doc.paths);
  walk(doc.components.schemas);

  const ids = new Set();
  for (const [p, item] of Object.entries(doc.paths)) {
    for (const [method, op] of Object.entries(item)) {
      const where = `${method.toUpperCase()} ${p}`;
      if (!op.operationId) errors.push(`${where}: missing operationId`);
      else if (ids.has(op.operationId)) errors.push(`${where}: duplicate operationId ${op.operationId}`);
      else ids.add(op.operationId);
      if (!op.responses || !Object.keys(op.responses).length) errors.push(`${where}: no responses`);
      const codes = Object.keys(op.responses ?? {});
      if (!codes.some(c => c.startsWith('2') || c === '302')) errors.push(`${where}: no success response`);
      if (!codes.includes('503')) errors.push(`${where}: missing 503`);
      const authed = (op.security ?? []).length > 0;
      if (authed && !codes.includes('401')) errors.push(`${where}: authenticated but no 401`);
      if (authed && !codes.includes('429')) errors.push(`${where}: authenticated but no 429`);
      const params = op.parameters ?? [];
      const header = (n) => params.some(x => x.name === n && x.in === 'header');
      if (codes.includes('428') && !header('If-Match')) errors.push(`${where}: 428 declared without an If-Match parameter`);
      if (header('If-Match') && !codes.includes('428')) errors.push(`${where}: If-Match declared without a 428 response`);
      if (header('Idempotency-Key') && !codes.includes('409')) errors.push(`${where}: Idempotency-Key declared without a 409 response`);
      for (const prm of params) {
        if (prm.in === 'path' && !prm.required) errors.push(`${where}: path parameter ${prm.name} must be required`);
      }
      for (const [code, res] of Object.entries(op.responses ?? {})) {
        if (!/^[45]/.test(code)) continue;
        const ref = res.content?.['application/json']?.schema?.$ref ?? '';
        if (ref !== `#/components/schemas/api-error.${code}`) {
          errors.push(`${where}: ${code} must reference api-error.${code} so its code set is constrained, got ${ref || 'no $ref'}`);
        }
      }
      const declared = new Set(params.filter(x => x.in === 'path').map(x => x.name));
      for (const m of p.matchAll(/\{([^}]+)\}/g)) {
        if (!declared.has(m[1])) errors.push(`${where}: path template {${m[1]}} has no declared parameter`);
      }
    }
  }
  // every declared ErrorCode must be reachable from exactly one status, and no status may
  // invent a code outside the enum. Catches the matrix and the enum drifting apart.
  const enumCodes = doc.components.schemas['api-error']?.$defs?.ErrorCode?.enum
    ?? doc.components.schemas['api-error.ErrorCode']?.enum ?? [];
  const mapped = new Map();
  for (const [name, schema] of Object.entries(doc.components.schemas)) {
    const m = /^api-error\.(\d{3})$/.exec(name);
    if (!m) continue;
    const codes = schema.allOf?.[1]?.properties?.error?.properties?.code?.enum ?? [];
    for (const c of codes) {
      if (mapped.has(c)) errors.push(`error code ${c} is mapped to both ${mapped.get(c)} and ${m[1]}`);
      mapped.set(c, m[1]);
      if (enumCodes.length && !enumCodes.includes(c)) errors.push(`status ${m[1]} maps code ${c}, which is not in ErrorCode`);
    }
  }
  for (const c of enumCodes) if (!mapped.has(c)) errors.push(`ErrorCode ${c} is not reachable from any HTTP status`);

  return errors;
}

const args = process.argv.slice(2);
const doc = build();
const serialized = JSON.stringify(doc, null, 2) + '\n';
const errors = structuralErrors(doc);
const opCount = Object.values(doc.paths).reduce((n, item) => n + Object.keys(item).length, 0);

if (errors.length) {
  console.error(`${errors.length} structural error(s):\n${errors.join('\n')}`);
  process.exitCode = 1;
} else if (args.includes('--check')) {
  let current = null;
  try { current = readFileSync(OUT, 'utf8'); } catch { /* missing */ }
  if (current === null) { console.error(`${OUT} is missing. Run without --check to generate it.`); process.exitCode = 1; }
  else if (current.split('\r\n').join('\n') !== serialized) {
    console.error('packages/contracts/openapi.json is out of date with the endpoint table. Re-run node scripts/build-openapi.mjs.');
    process.exitCode = 1;
  } else {
    console.log(`PASS: openapi.json matches the endpoint table; ${opCount} operations over ${Object.keys(doc.paths).length} paths, ${Object.keys(doc.components.schemas).length} component schemas, all $refs resolve. This is a specification check, not an application test.`);
  }
} else {
  writeFileSync(OUT, serialized);
  console.log(`wrote packages/contracts/openapi.json: ${opCount} operations over ${Object.keys(doc.paths).length} paths, ${Object.keys(doc.components.schemas).length} component schemas`);
}
