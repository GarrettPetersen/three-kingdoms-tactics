# Setting Walkmasks

Narrative settings can have a paired walkability mask in:

```text
public/assets/settings/walkmasks/<setting>_walkmask.png
```

Each mask must be the same size as the setting image and use only these colors:

```text
#000000 = unwalkable
#00ff00 = walkable, actor draws in front of foreground
#0000ff = walkable, actor draws behind foreground or inside an occluding doorway
```

Use no antialiasing. Aseprite edits should stay in indexed/flat-color style.

## AI Draft Workflow

Generate img2img prompts:

```bash
make walkmask-prompts WALKMASKS="village_inn urban_street"
```

Feed the setting image and the generated prompt into an img2img model, then save
the result in a draft folder as one of:

```text
<setting>.png
<setting>_walkmask.png
<setting>_walkmask_ai.png
```

Clean the AI output into the exact palette:

```bash
make walkmasks WALKMASKS="village_inn urban_street" AI_DRAFT_DIR=path/to/drafts
```

If no AI draft is present, the tool writes a conservative local first-pass mask
for editing.

## Validation

`npm run validate:design` verifies that every existing walkmask:

- matches its setting image dimensions
- uses only black, green, blue, or transparent pixels
- contains at least one walkable pixel

Future scripted-walk validation should sample authored actor paths against these
masks. A scripted foreground switch should happen on or near a green/blue
boundary.
