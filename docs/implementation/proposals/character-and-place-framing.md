# Proposal: character and place framing

**Status: PROPOSAL, tracked by RCE-091** (https://trello.com/c/1vIbbwo0, Backlog). The card exists so the work is visible; it does not mean the design is settled. This is a design note, not a contract — nothing here is normative, and `proposals/` is deliberately outside the contract set. Supersedes the earlier `social-frame.md`, which is axis 2 below.

Snapshot 2026-10-05.

## Problem

Four requests that turn out to be one design:

1. Language and behavior should follow from a character's upbringing, education, sense of self, environment, attitudes in the moment, and the truths they believe they know.
2. A location carries expectations about behavior that are social, unspoken and contextual.
3. The same place should read differently to different characters — their terms for it, what they notice, how they speak there.
4. A character should always have tags describing them to the reader, to themself, and to other characters.

Today none of this is modelled, so the only place it can live is inside a model's weights: unversioned, unauditable, unexplainable, and unconstrained by any invariant. The four axes below are one mechanism viewed from four sides, and they share a single discipline.

## The shared discipline

Every axis obeys the same three rules. They are stated once here and not repeated.

**Derived, never canon — enforced structurally, not by authority rank.** None of these artifacts is a `FactEnvelope`, and none has a write path into scene or character state. No accepted event may cite one as the source of a committed fact, and ADR-004's required effect set does not admit one.

This correction matters and is easy to get wrong: an earlier draft claimed `authority: "default"` was sufficient. It is not. INV-002 uses authority only to order *replacements*, INV-001 makes structured state canonical regardless of rank, and the schemas already admit structured facts carrying `default` authority — so a framing artifact written as a fact would be canon, merely the weakest canon. Non-canonicity comes from having no way in.

**Observer-scoped.** Anything a character knows, notices or believes is reachable only through an Observation that instance could perceive (INV-041), and is a belief with its own confidence rather than world truth (INV-008). This includes word choice — see axis 1.

**Never a gate.** No framing artifact may satisfy any of the five checks. INV-031 as restated on 2026-10-05 already covers this: tags, traits, archetype, reputation, dress, presentation, setting, location, environment, world lore and prior scene content are all named descriptive facts, and a descriptive fact may deny or invalidate an affirmed scope but may never satisfy a gate it does not define. **No part of this proposal needs a new invariant for that**, which is the clearest sign the audit was done at the right time.

---

## Axis 1 — the derivation chain

The generative layer. The other three axes are its consumers, and without it they are an authoring burden rather than a feature.

Rather than authoring vocabulary, salience, stance and register per character per setting, author **the person** and derive the rest.

| Input | Lifetime | Supplies |
| --- | --- | --- |
| upbringing — origin, class, region, family | release | register, dialect, what is unremarkable to them |
| education — literacy, domain training | release | which vocabularies and registers they have at all |
| sense of self | instance belief | stance, what they defend, what they overclaim |
| environment — location, social frame, place view | scene | available referents, expected register |
| attitudes and mood in the moment | scene | intensity, restraint, what they reach for |
| **the truths they think they know** | instance belief | **everything presupposed by their word choice** |

**Word choice is knowledge-bearing, and this is the load-bearing constraint.** "The late king" and "the king" differ by one fact. If the derivation reads world truth rather than the instance's belief set, every character becomes quietly omniscient *in their vocabulary* — describing rooms with facts they never perceived, presupposing deaths they never heard of. That is a knowledge leak through language rather than through retrieval, which INV-041 covers in principle and nothing currently tests. It is also exactly the leak a context-compilation optimisation would reopen without anyone noticing.

**Education bounds vocabulary upward; upbringing bounds it sideways.** You cannot use a term you never learned, and you do use the register you were raised in. Both sit one step from caricature, which makes RCE-046's cliché and drift detection a dependency rather than a nicety.

**The derivation must be explainable or it is worse than authoring.** You trade authoring burden for modelling burden, and an opaque derivation cannot be corrected. So the projection carries per-field provenance in the pattern `resolved-character` already uses with `supplied_by`: *she said "the den" because upbringing supplied the lexicon.* Authored overrides always win, under INV-002 and INV-003. That provenance also feeds RCE-038's per-turn record and the trace endpoint for free.

---

## Axis 2 — social frames for locations

World-level: what a place expects of anyone. Formerly `social-frame.md`.

`EnvironmentTemplate` already models **physical** affordance — openable, supports, contains, wearable, light source. This is its missing sibling.

```
SocialFrame (immutable release, pinned, versioned)
  setting_id          bedroom | clinic | kitchen | ...
  territoriality      primary | secondary | public
  default_proxemics   intimate | personal | social | public   (qualitative)
  observability       who can perceive events occurring here
  roles[]             occupant | guest | intruder | clinician | ...
  expectations[]      { behavior, role, modality, salience, provenance }
                      modality: expected | acceptable | unexpected | forbidden
  entry_conditions    what crossing the threshold means
```

**Consumption.** Context compilation (RCE-017, RCE-037) selects salient expectations under the existing token budget. Validation (RCE-019) treats a violated `forbidden` expectation as `needs_clarification`, **not** `rejected` — norms are defeasible, geometry is not. A character may knowingly transgress; that is a narrative event. Physical impossibility still rejects.

**The hard part.** A single `bedroom` frame is wrong. Expectations are a function of setting, participant relationship and authored culture — a shared bedroom, a stranger's, a sibling's and a hotel room are four frames wearing one label. `relationship_config` and `WorldRelease` give the hooks, so a frame is parameterized rather than a lookup, and that parameter space is the cost. DOMAIN.md's discipline transfers exactly: *"a template does not claim every real bedroom contains a dresser"* — likewise a frame must not claim every bedroom implies any behavior.

---

## Axis 3 — place views

Per-character: the same room through one character's eyes and mouth. Four layers, three of which already exist.

| Layer | What it is | Status |
| --- | --- | --- |
| **Lexicon** | how they name things | `terminology.preferred_terms` exists but maps only to `canonical_structure_id`; extend to places and objects |
| **Register** | how they say it | `VoiceProfile` exists; add setting-selected modifiers |
| **Stance** | how they stand toward the place | derive from ownership, relationships and prior Observations; builds on axis 2's territoriality |
| **Salience** | what they notice | new — and derived from tags (axis 4) |

Salience weights the `EnvironmentTemplate` capability vocabulary already in use — openable, supports, contains, wearable, light source — plus object kinds. No new taxonomy.

```
PlaceView (derived; per instance, location revision, pinned rule versions)
  location_ref, their_term, stance, register_selected
  salient[]    { entity_ref, why_salient, confidence }
  unresolved[] { what they cannot make out, and why }
```

**The invariant that matters: salience governs mention, not existence.** A low-salience object is still there. If a character "doesn't notice" the watch and the engine stops tracking it, the vanishing-watch counterexample has been rebuilt inside the perception layer — and it will be harder to see, because it looks like characterisation. Two characters in one room must produce descriptions that are **non-identical but non-contradictory** over a single shared canonical state. That is the first fixture to write.

**The lexicon must round-trip.** Their term resolves back to the canonical id, or referent resolution forks the world into "the den" and "the living room" as separate places. DOMAIN.md already requires this for structures; it extends unchanged.

**Why this is not decoration.** Salience is the ranking function for *what to say about the room*. RCE-010 calls for "adaptive detail" and RCE-037 enforces a context budget, but nothing currently answers *which* details. A per-character salience ordering is a principled answer rather than truncation, which makes this load-bearing for context compilation.

---

## Axis 4 — tags, from three vantages

The request was that a character always has tags describing them to the reader, to themself, and to other characters. The honest version is that **those three need not agree**, and a single `tags` field would destroy exactly that information.

| Vantage | What it is | Home | Authority | Scope |
| --- | --- | --- | --- | --- |
| To the reader | authored description | `CharacterRelease.traits`/`values`; `CharacterPreview.tags` | `explicit_author` | release, with a redacted public subset |
| To themself | self-concept, and it can be **wrong** | a `Belief` about their own instance | `derived`, confidence-bearing | owner + continuity + branch + instance |
| To other characters | directional impression | `Relationship` dimensions and labels | `derived`, evidence-bearing | per observer → subject pair |

A character authored as cruel, who believes themself kind, and who reads to others as unpredictable is **well-formed**. INV-008 already licenses this: *source authority and belief confidence are separate fields.* Collapsing them is what makes characters flat.

"To the reader" splits in two, as INV-022 already enforces: the owner sees authored truth including secrets; the catalog sees a strict redacted subset.

**"Always" means something different per vantage:**

- **Reader tags: always present.** This is a schema change — `traits`, `values` and `CharacterPreview.tags` are all currently optional, so a valid release can have none today. Making one required changes the minimal valid fixture too.
- **Self tags: always present, seeded at instantiation** from the release, then diverging through play. Divergence is the feature.
- **Other-character tags: absent until perception.** At first meeting there is no impression, and `absent` is not `unknown` — the three-state fact model already draws that line, and the absence is meaningful rather than an empty array.

**Controlled vocabulary, not free text.** Free-text tags drift into synonym soup and become useless for retrieval or validation. The repository already has the pattern: versioned authored registries, as in archetypes and anatomy presets under RCE-051. Tags are ids from a pinned **tag registry release** with display labels, so `cruel` means one thing across characters and relabelling does not rewrite every character. Keep a free-text escape hatch, marked explicitly uncontrolled and excluded from retrieval and validation the way `x_ext` is inert — otherwise it quietly becomes load-bearing.

**A tag is a label over facts, never a fact.** Tagging someone `wounded` must not create an injury; the injury is state. Without that rule tags become a side door into state mutation.

**Other-tags evolve, and unconstrained evolution means re-tagging every turn.** They need the significance and promotion discipline memory already has (RCE-028), and RCE-039 — approve evidence-backed character development — is literally the card for controlled trait change. Other-tags move through that mechanism, not freely.

---

## Prior art

Named rather than reinvented.

- **Space vs place** — Harrison and Dourish, *Re-Place-ing Space* (1996). Space is geometry; place is the socially constructed sense of what behavior belongs. Axis 2 implements exactly this distinction.
- **Behavior settings** — Barker's ecological psychology. A standing pattern of behavior bound to a place, with roles and a program.
- **Scripts** — Schank and Abelson (1977). Locations activate expected action sequences.
- **Territoriality** — Altman's primary, secondary and public territory. One variable, substantial explanatory power: a bedroom is primary territory, which is why unbidden entry is meaningful.
- **Proxemics** — Hall's intimate, personal, social and public bands, culturally variable. These map onto the qualitative proximity DOMAIN.md already requires, never onto metres.

## Data sources

| Source | What it gives |
| --- | --- |
| NormBank (Ziems et al., ACL 2023) | situational social norms over setting, roles, attributes and behaviors, labelled roughly expected / okay / unexpected |
| Social-Chem-101 (Forbes et al., 2020) | social rules-of-thumb with normative judgments |
| Charades, Home Action Genome, Ego4D | empirical P(behavior given setting) from activity in homes — frequency priors, not norms |
| Places365 | scene classification over 365 categories, bedroom among them |
| ConceptNet | `AtLocation`, `UsedFor`, `CapableOf` for cheap object–place–action association |

**The pipeline must be mine → human review → authored versioned release.** Never runtime inference against a corpus. Mined norms carry their source corpus's cultural assumptions, and an authored release is the only form that is versionable, auditable and overridable. **Frequency is not normativity:** that a behavior is common in a setting says nothing about whether it is expected of a role there.

## Measurement

Turns "does it feel right" into numbers.

- Hold out human expected/unexpected judgments; check frames predict them above chance.
- Report inter-annotator agreement on the curated set, so disagreement about a norm stays visible rather than averaged away.
- Assert two characters in one scene produce non-identical, non-contradictory descriptions over identical canonical state, with no view asserting anything absent from state.
- Assert word choice cannot presuppose a fact the speaking instance has not perceived.
- Track continuity-validation outcomes with and without framing in context, under RCE-083.

## Already landed

Nothing in this proposal is implemented, but one thing it would have needed is already in place: **INV-031 was restated from its generating principle on 2026-10-05** (#12), so tags, traits, archetype, reputation, dress, presentation, setting, location, environment, world lore and prior scene content are all named descriptive facts that may deny a gate but never satisfy one they do not define. No axis here requires a new gate invariant.

## The card

**RCE-091**, in Backlog, carrying a checklist of the four tasks below plus a closing gate. Backlog rather than Ready for Design because QUALITY.md defines Backlog as defined but dependency-blocked or unscheduled: this depends on RCE-048 and RCE-087, which are themselves Backlog, and open question 2 cannot be settled until those models exist. Drafted against epic RCE-042 — see open question 4, which the card does not close.

> **Character and place framing: derive language and perception from the person**
>
> Goal: represent how a character names, notices and speaks about the world, derived from their upbringing, education, self-concept, beliefs and present circumstances, as versioned authored data and explainable projections rather than model-resident assumption. Epic RCE-042. Depends on RCE-001, RCE-003, RCE-045, RCE-048, RCE-051, RCE-087.
>
> **Task 1 — tags.** Three-vantage tag model with a pinned tag registry release. Reader tags required on a release; self tags seeded at instantiation; other-character tags absent until perception. Controlled ids with an inert free-text escape hatch.
>
> **Task 2 — derivation chain.** The projection function from upbringing, education, self-concept, environment, mood and believed truths to lexicon, register, stance and salience, carrying per-field provenance. Authored overrides win.
>
> **Task 3 — social frames.** `SocialFrame` release schema: setting, territoriality, qualitative proxemics, observability, roles, typed expectations with modality and provenance. Parameterized by participant relationship and authored culture.
>
> **Task 4 — place views.** Per-instance `PlaceView` over a shared canonical state.
>
> Acceptance: no framing artifact is a `FactEnvelope` or has a write path into state; none satisfies any gate; salience governs mention and never existence; a lexicon term round-trips to its canonical id; word choice presupposes nothing the instance has not perceived; projections are reproducible from instance revision, location revision and pinned rule versions.
>
> Tests: two instances in one scene produce non-identical, non-contradictory descriptions over identical state; a low-salience object remains tracked and retrievable; a character with no perception of a convention does not act on it; a violated norm yields clarification rather than rejection; an authored tag beats a derived one; a self-tag may contradict an authored tag without either being corrupted; word choice cannot leak an unperceived fact.
>
> Done: reviewed schemas, fixtures and a curated seed set with inter-annotator agreement reported. A mined corpus is not a frame, and a derivation without provenance is not explainable.

**Task order.** Task 1 first, because task 2 derives salience from tags and task 4 consumes both. Tasks 2 and 3 are independent of each other. Task 4 is last.

## Open questions

1. **Is `modality` four values or a scalar?** Four discrete values are auditable; a salience scalar ranks better under a context budget. The draft carries both, which is probably one too many.
2. **Where does a frame resolve — location, environment template, or both?** RCE-048 and RCE-087 own those models and are unbuilt, so this cannot be settled here.
3. **Do frames ever affect physical validation?** Proposed answer: no. Proxemics expectations inform generation, never the geometry engine, or the two will disagree.
4. **Epic placement.** RCE-091 is filed under RCE-042 (character integrity and behavioral intelligence) because the centre of gravity is the character, but axes 2 and 3 are arguably RCE-043 runtime world state. Filing it somewhere was necessary to create the card; it is not a decision, and moving it costs one field.
5. **If a framing artifact can never be a fact, what reads it?** Context compilation and validation only — which means framing needs its own retrieval path rather than riding the memory ranking RCE-036 owns. Whether that is a separate service or a branch inside the context compiler is unsettled, and it affects RCE-017's shape.
6. **How much derivation is too much?** Deriving everything moves all the difficulty into one function. The mitigation is per-field provenance plus authored overrides, but there is no principled answer yet to *which* fields should default to derived versus authored, and getting that split wrong is the most likely way this feature becomes unusable.

## Deferred, by decision

A **perception endpoint** — `GET /v1/scenarios/{id}/instances/{instanceId}/perception`, returning the non-verbal cues one instance registers about a scene: place, posture, proximity, dress, apparent register, and how others address someone — was specified in conversation and deliberately deferred until this proposal is settled, because it consumes axes 1 and 3.

One decision about it is already fixed and should survive into that contract: the response carries **no gender, anatomy, orientation or willingness field at all**. Not filtered — unrepresentable, so no implementation can populate one and no prompt can coax one out. Identity, gender, anatomy and orientation are independent axes under INV-014 and none is observable from the others; `address_terms_used` is the honest encoding, since an observer perceives how others address someone rather than what someone is. The inference from dress to availability is the one that does damage in this product, and a missing field is a stronger guarantee than a rule.
