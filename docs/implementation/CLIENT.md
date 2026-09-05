# Client application contract

## Primary navigation and screens

Use a responsive Vue application with Library, Conversations, Create, Settings and Help navigation. At phone width use a compact navigation pattern and a single content pane; at desktop width allow a persistent side rail and conversation list. No horizontal page overflow at 360px. All controls have visible focus, accessible names, validation messages and minimum usable touch areas. Support 200% zoom, text scaling, reduced motion and keyboard navigation. Target WCAG 2.2 AA with manual checks, not an automated score alone.

/login: sign in, create account and recover access links through OIDC. Show safe errors without account enumeration. Preserve only allowlisted destination routes after authentication. Verification pending page supports resend through the identity provider and explains requirements.

/onboarding: separate real-user eligibility, content opt-in, privacy/provider disclosures, basic preferences and optional fictional persona setup. Never equate user age with persona age. Missing production assurance provider is a blocking unavailable state, not a pretend success checkbox.

/library: approved catalog and private library tabs; search, tags, pagination and favorite state. Empty owned library offers create/import; no search results offer clear filters. Restricted/private detail must not arrive in an unauthorized payload even if hidden by UI.

/characters/:id: authorized portrait, age, pronouns, authored description, archetype summary, visible traits and start-chat action. Do not reveal hidden story facts through public previews. Show source release/version and whether this is an owned draft or catalog release.

/characters/new and editor: sections for identity, appearance, anatomy presets/overrides, values, expressions/anti-expressions, voice, preferences, agency and background. Provide plain controls plus optional advanced schema view. Resolved preview labels defaults and explicit overrides. Dirty state, autosave status, explicit save/version conflict and unsaved navigation are handled. Imported data is previewed and validated before commit. Uploads use media quarantine workflow. Portrait is optional.

/scenarios/new: select one owned persona and 1-4 available AI releases; choose world/environment; define title, relationship assumptions, overrides, boundaries and content mode. Preview layer changes and age/permission failures before start. Distinguish orientation, relationship model and current willingness. Creation retry is idempotent and cannot create duplicate scenarios.

/chat/:id: history with explicit speaker attribution, narrator style and player-message distinction; progress state while buffering; multiline composer; send/cancel/retry; conversation title/archive; participant inspector; scenario settings; memory/fact inspection and correction; revision/regenerate controls. Markdown is sanitized and unsafe URL schemes are rejected. Do not send secrets through rendered links. Copy/export actions require explicit user action.

/settings: profile, identity-provider credential/security flows, devices/session revocation, content preferences, theme/text size, privacy/export/delete and usage. Fictional persona settings are not substituted for real account settings. Destructive actions show consequences and require confirmation plus appropriate reauthentication.

/help and report: describe AI-generated fiction, known limits, support/report workflow, privacy and provider behavior. Reports include only selected evidence by default. No manipulative retention prompts or dependency-inducing claims from the application shell.

## State and delivery behavior

Every view implements initial loading, empty, validation error, retryable network error, forbidden/expired access and success states. Disable only actions that cannot safely run twice; server idempotency remains mandatory. Distinguish user input saved, response generating, response validating and response committed. Never present a failed/cancelled candidate as a canonical reply.

V1 uses buffered validation before output. SSE conveys status and committed messages; client may animate committed text but cannot show speculative tokens. Reconnect by durable event ID and deduplicate messages by server IDs. If cursor expired, refetch canonical history. Poll turn state when streaming is unavailable. Expired authentication removes private UI state and returns to safe login without losing persisted input.

Mobile backgrounding and browser close do not end a scene. Resume restores conversation, branch, participants and physical state. Composer must remain visible above soft keyboard and safe areas. Do not force-scroll when the reader is looking at older messages; expose a new-message indicator. Default draft storage is in memory, cleared on logout; optional durable drafts require separate privacy approval.

## Inspection and correction

Owner can inspect their effective character definition with layer/provenance, current scene and memory references. Distinguish world truth from a character's beliefs. A correction form offers scene/instance/core scope and evidence/proposed-change/explicit-author-edit modes. Default is evidence for current instance. Show a before/after diff before permanent/global changes. Never silently push corrections to public archetypes or another scenario.

## PWA and native boundary

Provide manifest/icons and a static-shell service worker over HTTPS. Cache only public build assets, not authenticated API, transcripts, private portraits, tokens or exported packages. Offline screen explains lack of network/generation; do not fabricate replies. Notification previews contain no private scene content by default. No native app-store availability claim is made. Later native clients must retain all server-side authorization/consent/version contracts.
