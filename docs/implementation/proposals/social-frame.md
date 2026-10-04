# Proposal: social frames for locations

**Status: PROPOSAL. No card exists yet.** This is a design note, not a contract. Nothing here is normative, and `proposals/` is deliberately outside the contract set. The one exception is the INV-031 extension described under "What lands now", which stands on its own and is included in the same change.

Snapshot 2026-10-04.

## Problem

A location carries expectations about behavior that are social, unspoken and contextual. A bedroom is not merely a room containing a bed; entering one unbidden means something, and the meaning is not derivable from geometry.

`EnvironmentTemplate` already models **physical** affordance — openable, supports, contains, wearable, light source. It has no sibling for social affordance, so today the only place that knowledge can live is inside a model's weights, where it is unversioned, unauditable and unconstrained by any invariant.

## Prior art

The distinction is established and worth naming rather than reinventing.

- **Space vs place** — Harrison and Dourish, *Re-Place-ing Space* (1996). Space is geometry; place is the socially constructed sense of what behavior belongs. This is the exact distinction this proposal implements.
- **Behavior settings** — Barker's ecological psychology. A standing pattern of behavior bound to a place, with roles and a program.
- **Scripts** — Schank and Abelson (1977). Locations activate expected action sequences.
- **Territoriality** — Altman's primary, secondary and public territory. A bedroom is primary territory, which is why unbidden entry is meaningful. One variable, substantial explanatory power.
- **Proxemics** — Hall's intimate, personal, social and public distance bands, culturally variable. These map onto the qualitative proximity DOMAIN.md already requires, not onto metres.

## Proposed model

A versioned authored release, sibling to `PresetRelease` and `EnvironmentTemplate`:

```
SocialFrame (immutable release, pinned, versioned)
  setting_id          bedroom | clinic | kitchen | ...
  territoriality      primary | secondary | public
  default_proxemics   intimate | personal | social | public    (qualitative)
  observability       who can perceive events occurring here
  roles[]             occupant | guest | intruder | clinician | ...
  expectations[]      { behavior, role, modality, salience, provenance }
                      modality: expected | acceptable | unexpected | forbidden
  entry_conditions    what crossing the threshold means
```

A `Location` or `EnvironmentTemplate` references a pinned `SocialFrame` release. Resolution is reproducible on the same terms as a character release (INV-013).

## How it enters the system

**Expectations are not facts, and that is the mechanism.** An earlier draft of this note claimed `authority: "default"` was sufficient to keep a frame non-canonical. It is not: INV-002 uses authority only to order *replacements*, INV-001 makes structured state canonical regardless of rank, and the schemas already admit structured facts carrying `default` authority. A frame written as a `FactEnvelope` would therefore be canon — merely the weakest canon — which is exactly the outcome to avoid.

So a frame expectation is **never a `FactEnvelope` and never enters scene or character state**. It is a read-only input to two consumers and nothing else, and it has no write path into the fact system at all. No accepted event may cite a frame expectation as the source of a committed fact, and ADR-004's required effect set does not admit one. Non-canonicity comes from having no way in, not from losing a ranking contest.

**Context compilation** (RCE-017, RCE-037) selects salient expectations into the `ContextBundle` under the existing token budget, scoped and ranked like any other optional recall.

**Validation** (RCE-019) treats a violated `forbidden` expectation as `needs_clarification`, not `rejected`. This asymmetry is deliberate: norms are defeasible, geometry is not. Physical impossibility stays a hard rejection; a social transgression is a narrative event, and a character may knowingly commit one.

## The three constraints, and the one that matters most

1. **A frame can never satisfy a gate.** This is the whole safety story. Expectation and authorization are different axes, and a product supporting explicit adult content is exactly where conflating them does damage — a bedroom frame must be structurally incapable of contributing to `character_current_willingness`. INV-031 already forbids deriving a gate from preference, orientation, relationship status, history, bodily response, repeated past action or silence. Setting and location were missing from that list. See "What lands now".

2. **Never canon, enforced structurally rather than by rank.** A frame expectation is not a `FactEnvelope` and has no write path into scene or character state; no accepted event may cite one as the source of a committed fact, and ADR-004's required effect set does not admit one. Authority rank is the wrong instrument here — `default` would still be canon, just the weakest canon.

3. **Awareness is observer-scoped.** A frame is world-level. Whether a given instance *knows* a local convention is that instance's own belief with its own confidence (INV-008), reachable only through perception (INV-041). A character raised elsewhere plausibly does not share the frame, and that is a feature.

## The hard part, stated honestly

**A single `bedroom` frame is wrong.** Expectations are a function of setting, the relationship between participants, and an authored culture. A shared bedroom, a stranger's, a sibling's and a hotel room are four different frames wearing one label. `relationship_config` and `WorldRelease` provide the hooks, but the frame is therefore parameterized rather than a lookup, and that parameter space is where the cost lives.

DOMAIN.md's existing discipline transfers directly: *"a template does not claim every real bedroom contains a dresser."* Likewise a frame must not claim every bedroom implies any behavior.

## Data sources

Populating frames empirically is feasible, with one hard rule about pipeline shape.

| Source | What it gives |
| --- | --- |
| NormBank (Ziems et al., ACL 2023) | Situational social norms over setting, roles, attributes and behaviors, labelled roughly expected / okay / unexpected. The closest existing artifact to this model. |
| Social-Chem-101 (Forbes et al., 2020) | Social rules-of-thumb with normative judgments. |
| Charades, Home Action Genome, Ego4D | Empirical P(behavior \| setting) from activity in homes — frequency priors, not norms. |
| Places365 | Scene classification over 365 categories, bedroom among them. |
| ConceptNet | `AtLocation`, `UsedFor`, `CapableOf` for cheap object–place–action association. |

**The pipeline must be mine → human review → authored versioned release.** Never runtime inference against a corpus. Mined norms carry their source corpus's cultural assumptions, and an authored release is the only form that is versionable, auditable and overridable. Frequency is not normativity: that a behavior is common in a setting says nothing about whether it is expected of a role there.

## Measurement

Turns "does it feel right" into a number:

- Hold out human expected/unexpected judgments and check the frame predicts them above chance.
- Report inter-annotator agreement on the curated set, so disagreement about a norm is visible rather than averaged away.
- Track continuity-validation outcomes with and without frames in context, under the RCE-083 regression journey.

## What lands now

One change, independently justified and not contingent on this proposal being accepted: **INV-031's exclusion list gains setting, location, environment and time of day.** Nothing today prevents a gate decision from being derived from where a scene takes place, and that hole exists whether or not `SocialFrame` is ever built.

## Proposed card

Draft text for Trello, not yet created:

> **Define social frames for locations and separate expectation from authorization**
>
> Goal: represent the social, unspoken expectations a location carries, as versioned authored data rather than model-resident assumption. Epic RCE-043. Depends on RCE-001, RCE-003, RCE-048, RCE-087.
>
> Deliver a `SocialFrame` release schema — setting, territoriality, qualitative default proxemics, observability, roles and typed expectations with modality and provenance — plus fixtures and a resolution contract pinning frame releases to locations.
>
> Acceptance: expectations are written with `authority: default` and are outranked by every other authority; a frame can never contribute to any of the five gates; a violated `forbidden` expectation yields `needs_clarification` rather than rejection, while physical impossibility still rejects; awareness of a frame is an observer-scoped belief, not world knowledge. Frames are parameterized by participant relationship and authored culture; a single setting label is not a frame.
>
> Tests: a frame cannot satisfy character willingness; a frame value loses to an authored fact; a character with no perception of a convention does not act on it; a violated norm produces a clarification rather than a rejection; two relationship configurations in the same setting resolve to different frames.
>
> Done: reviewed schema, fixtures and a curated seed set with inter-annotator agreement reported. A mined corpus is not a frame.

## Open questions

1. **Is `modality` four values or a scalar?** Four discrete values are auditable; a salience scalar ranks better under a context budget. The draft carries both, which may be one too many.
2. **Where does the frame resolve — location, environment template, or both?** RCE-048 and RCE-087 own those models and are unbuilt, so this cannot be settled here.
3. **Does a frame ever affect physical validation?** Proposed answer: no. Proxemics expectations inform generation, never the geometry engine, or the two will disagree.
4. **Epic placement.** RCE-043 (runtime world state) is the closest fit, but this is arguably character-integrity work under RCE-042. Owner's call.
5. **If a frame must never be a fact, what reads it?** Context compilation and validation only, per above — but that means frames need their own retrieval path rather than riding the memory ranking that RCE-036 owns. Whether that is a separate service or a branch inside the context compiler is unsettled, and it affects RCE-017's shape.
