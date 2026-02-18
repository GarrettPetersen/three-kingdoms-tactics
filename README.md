# Three Kingdoms: Stratagem

A tactical roguelike game set in the Three Kingdoms era, built with Vanilla JS, HTML5 Canvas, and Capacitor.

## Code Conventions

### 1. Pixel-Perfect Rendering
- **Scale**: The game uses a 1:1 internal pixel resolution. A global scale (configured in `main.js`) is applied for display.
- **Coordinates**: Always use `Math.floor()` for drawing coordinates and dimensions to prevent sub-pixel blur.
- **Smoothing**: `ctx.imageSmoothingEnabled` must always be `false`.
- **Text**: Use the `drawPixelText` method in `BaseScene` for all text rendering to ensure alignment with the pixel grid.

### 2. Unified Animation System
- **Definition**: All character animation frame ranges must be defined in `src/core/Constants.js` under the `ANIMATIONS` object.
- **Rendering**: Use the `drawCharacter(ctx, img, action, frame, x, y, flip)` method from `BaseScene`.
- **Sprites**: Standard character spritesheets consist of 72x72 pixel frames. The `drawCharacter` method handles multi-row frame calculations and standard vertical offsets.

### 3. Scene-Based Architecture
- **Structure**: Every game state (Title, Map, Narrative, Combat) is a separate class inheriting from `BaseScene`.
- **Management**: The `SceneManager` in `src/core/SceneManager.js` handles scene transitions, updates, and input routing.
- **Persistence**: Use the `params` object in `switchTo(sceneName, params)` to pass data between scenes.

### 4. Typography Hierarchy
- **Titles/Headers**: 8px `Silkscreen` (force uppercase).
- **Dialogue/Body**: 8px `Dogica` (mixed case).
- **Small UI/Prompts**: 8px `Tiny5`.

### 5. Narrative Scripting
- **Commands**: `NarrativeScene` sequences are driven by a script array of commands:
    - `addActor`, `removeActor`, `clearActors`: Manage character presence.
    - `move`, `flip`, `animate`: Control character behavior.
    - `wait`, `fade`: Control timing and cinematic transitions.
- **Parallelism**: Use `wait: false` on `move` or `fade` commands to allow multiple actions to occur simultaneously.
- **Word Wrap**: Dialogue text is dynamically wrapped and chunked into 2-line boxes.

### 6. Asset Management
- All images and fonts must be loaded via the `AssetLoader` (`src/core/AssetLoader.js`).
- Register new assets in the `init()` function of `src/main.js`.

### 7. Coordinate Systems
- **World Space**: Coordinates are relative to the specific scene background (e.g., the 256x256 noticeboard).
- **Screen Space**: The `SceneManager` handles centering backgrounds and clipping actors to the visible play area.

## Testing & Debugging

### Cheat Codes
Type these words on your keyboard during gameplay to jump to specific scenes:

| Cheat Code | Destination Scene |
| :--- | :--- |
| `title` | Main Title Screen |
| `camp` | Campaign/Character Selection |
| `map` | World Map |
| `brief` | Briefing at Magistrate's HQ |
| `battle` | Tactics Battle Map |
| `story` | Narrative/Dialogue Test |
| `screenshot` | Take 1920x1080 screenshots (three 16:9 crops + letterboxed version) |


