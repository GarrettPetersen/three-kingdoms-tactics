# Canvas 455x256 Refactor Plan

## Goal
Move the game from a `256x256` internal canvas to `455x256` so the game naturally fits 16:9 displays (no square-era letterboxing), while preserving pixel-perfect rendering and existing gameplay behavior.

## Current State (Audit Notes)
- `src/main.js` hardcodes `virtualWidth: 256` and `virtualHeight: 256`.
- Screenshot/export logic in `src/main.js` assumes `256x256` source and 16:9 crops from that square.
- `src/core/ActionRecorder.js` and UI hint text still describe recording as `256x256`.
- Scene backgrounds are loaded from `public/assets/settings/*` in `src/main.js`.
- Background art is currently square-era (`256x256`) and should remain centered for now while art is reworked.
- `src/scenes/MapScene.js` still has a fixed-resolution input assumption (`mx = 0; // Fixed 256x256 resolution`).
- Narrative and map content data are heavily coordinate-based (`src/data/NarrativeScripts.js`, `src/scenes/MapScene.js` location constants), so x-position migration is a key risk.

## Migration Strategy
Use staged rollout with a temporary compatibility layer, then clean up data.

## Phase 1: Resolution Config + Feature Flag
- [x] Add explicit constants in `src/main.js` for:
  - `TARGET_CANVAS_WIDTH = 455`
  - `TARGET_CANVAS_HEIGHT = 256`
  - `LEGACY_CANVAS_WIDTH = 256`
  - `LEGACY_X_OFFSET = Math.floor((455 - 256) / 2)` (99)
- [x] Add a temporary feature flag (`USE_WIDE_CANVAS`) so we can toggle between old and new behavior during migration.
- [x] Update `setupCanvas()` to use target constants (no hidden `256` literals).

Definition of done:
- Game boots and runs with no runtime errors in both flag states.
- Render remains pixel-perfect (`imageSmoothingEnabled = false` preserved).

## Phase 2: Centered Legacy Backgrounds (Interim)
- [ ] Keep loading from `assets/settings/*` and ensure all scene backgrounds render centered on the `455x256` canvas.
- [ ] Audit scene logic for any implicit `mx=0/my=0` assumptions so render origin and input/hit testing use the same computed background origin.
- [ ] Keep tactical terrain/character assets unchanged in this phase.

Definition of done:
- Narrative/map/title scenes show centered 256px art with intentional side space (no stretching).
- Input/click regions align with the centered background origin.

## Phase 3: Coordinate Compatibility Layer (High Risk)
- [ ] Implement a temporary x-offset adapter for legacy-authored coordinates when a wide outpainted background is active.
- [ ] Apply adapter to:
  - Narrative actor placement/movement (`src/scenes/NarrativeScene.js`)
  - Narrative clickable regions (`src/scenes/NarrativeScene.js`)
  - World map location markers and party position (`src/scenes/MapScene.js`)
- [ ] Remove fixed-resolution input assumptions in `MapScene` and use the same computed map origin for render and hit testing.

Definition of done:
- Existing story staging still lines up with art after switching to wide backgrounds.
- Click targets match visual positions.

## Phase 4: Scene Layout Pass
- [ ] Review and retune scene-specific UI/layout constants for wider framing:
  - `src/scenes/TitleScene.js`
  - `src/scenes/CampaignSelectionScene.js`
  - `src/scenes/CustomBattleMenuScene.js`
  - `src/scenes/BattleSummaryScene.js`
  - `src/scenes/RecoveryScene.js`
  - `src/scenes/LevelUpScene.js`
- [ ] Keep most UI anchored to `canvas.width`/`canvas.height`; only adjust hardcoded placements that look too centered/too sparse.

Definition of done:
- Menus and overlays feel intentionally placed at 16:9, not just stretched from square assumptions.

## Phase 5: Tactics Scene Validation
- [ ] Validate battle map framing at `455x256` (current hex map remains centered with extra side space).
- [ ] Decide one of:
  - Keep current map dimensions and use side space for UI breathing room, or
  - Expand map dimensions (`mapWidth`) and rebalance battle scripts/spawns.
- [ ] If map dimensions change, separately plan battle-data rebalance (`src/data/Battles.js`, scripted spawn/goal assumptions).

Definition of done:
- Combat remains readable and mechanically unchanged unless explicit rebalance is chosen.

## Phase 6: Capture/Tooling/Docs
- [ ] Update screenshot pipeline in `src/main.js`:
  - remove square-only assumptions
  - support direct 16:9 export path from `455x256`
- [ ] Update recording copy in UI and comments (`src/main.js`, `src/core/ActionRecorder.js`).
- [ ] Update docs (`README.md`) to describe `455x256` world-space assumptions.

Definition of done:
- Tooling output naming/behavior matches new canvas.
- No stale `256x256` references in player-facing text for runtime systems.

## Phase 7: Cleanup + Hardening
- [ ] Remove temporary feature flag and compatibility hacks once validated.
- [ ] Replace runtime coordinate adapter with baked data updates where appropriate.
- [ ] Run a final `rg` audit for stale hardcoded resolution assumptions:
  - `rg -n "\\b256\\b|256x256|256×256|letterbox|SOURCE_WIDTH|SOURCE_HEIGHT" src docs README.md`

Definition of done:
- Single-source-of-truth resolution values.
- No hidden square-canvas assumptions in runtime-critical code.

## QA Checklist (Each Phase)
- [ ] Title screen animation and menu navigation
- [ ] Campaign select + map interactions
- [ ] Narrative scripts with clickable hotspots (especially noticeboard/inn chains)
- [ ] One full tactical battle, including victory/defeat flows
- [ ] Screenshot and clip recording commands
- [ ] Mouse + keyboard/controller navigation alignment

## Suggested Execution Order For Next Sessions
1. Phase 1 (config + flag)
2. Phase 2 (wide asset routing)
3. Phase 3 (coordinate adapter + map input fix)
4. Phase 4 (scene layout polish)
5. Phase 6 (tooling/docs)
6. Phase 7 (cleanup)
7. Phase 5 map-size expansion only if we decide to rebalance battles
