# Agent Playbook

This document captures repo-specific rules for coding agents and humans working on Three Kingdoms: Stratagem.

## Story Graph Wiring

Story progress should flow through `src/data/StoryGraph.js`, route state, and scene transitions.

- A playable branch should have a route ID.
- Route progress should use `setStoryCursor`, `hasReachedStoryNode`, and milestones.
- Branch decisions should use route-scoped story choices unless they need to be visible globally.
- Chapter transitions should not copy scene state. They should move to the next route and rely on shared systems for things that persist.
- Defeat should send the player through the standardized retry flow, preserving RPG losses and XP changes.

## RPG Force Structure

Persistent combat identity belongs to a force, not to a chapter or one battle.

- Shared force state lives under `world.forceState`.
- Force state owns `unitXP`, `unitClasses`, `unitLevelsSeen`, `allyParties`, and `unitTraits`.
- Liu Bei's force is shared by the `liubei` and `chapter2_oath` routes.
- Cao Cao's force is separate from Liu Bei's force.
- Ally party assignment is explicit. Current defaults:
  - Liu Bei: `ally1`
  - Guan Yu: `ally2`
  - Zhang Fei: `ally3`
  - Cao Cao: `rider1`, `rider2`, `rider3`
- Only POV/playable route leaders own ally parties. Cao Ren is a player unit in Cao Cao's route, but he is not a POV owner yet.
- Persistent traits belong in `unitTraits`. For example, rider2's white horse is a Cao Cao force trait, not a battle-row `horseType`.

## Battle Data Rules

Battle definitions should describe scenario placement and scenario-only facts.

- Use canonical unit templates whenever possible.
- Do not hardcode persistent XP, class, level-up choices, party ownership, or traits in battle rows.
- It is fine for battle rows to set scenario placement, facing, mounted state, and one-off immortality or cutscene behavior.
- Tutorials should use normal units and normal AI flow unless a teaching goal truly requires a special case.
- Prop/tutorial-only units can have special templates, such as training dummies that break into a different sprite.

## Narrative And Voice Rules

Dialogue is content, localization, and audio input at the same time.

- New dialogue should include `text.en`, `text.zh`, and `voiceId`.
- Split long tutorial lines into shorter beats.
- Use existing speakers, portraits, and dialogue systems rather than custom overlays when possible.
- After adding lines, run voice extraction or the normal voice workflow so caches stay current.

## Programmatic Checks

`npm run validate:design` runs repo-specific invariants. `npm run build` runs it first.

Checks should stay fast and focused. Use them for structural rules that are easy to break accidentally:

- force state defaults and route sharing
- persistent traits not hardcoded in battle rows
- story battle unit rows using canonical progression paths
- tutorial battle data staying on normal battle flow

When a rule is too nuanced for a static check, document it here instead of forcing brittle validation.
