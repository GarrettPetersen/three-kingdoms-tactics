# Three Kingdoms: Stratagem Agent Notes

This repo has custom story, RPG, battle, audio, and voice pipelines. Before changing those systems, read `docs/AGENT_PLAYBOOK.md`.

Key rules:

- Use the story graph deliberately. Story progress belongs in routes, cursors, milestones, and choices, not ad hoc scene flags.
- Keep RPG progression in force state. Shared force data lives in `world.forceState`, not individual battle rows.
- Liu Bei's force is shared by `liubei` and `chapter2_oath`. Cao Cao's force is separate.
- Persistent unit facts such as XP, class, level-up state, party attachment, and traits belong in force state.
- Battle data places units for a scenario. It should not hardcode persistent progression or traits for force units.
- Use normal battle flow whenever possible. Avoid special code for tutorials when existing AI/movement/telegraph rules can demonstrate the behavior.
- New dialogue should include English, Chinese, and a `voiceId` unless there is a clear reason it should never be voiced.
- After changing story/RPG/battle wiring, run `npm run validate:design` and `npm run build`.

