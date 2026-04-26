# AGENT.md

This file provides layout guardrails for coding agents working in this repository.

## Renderer Layout Rules

- Build the renderer as a desktop workstation that stays inside the viewport on desktop screens.
- Do not ship layouts that make the whole document taller than the screen just to reveal footer actions or lower panels.
- Keep page-level vertical scrolling disabled on desktop; use internal scrolling inside side panels for overflow.
- The viewer, playback controls, scopes, status, and primary action row should remain reachable on common laptop heights without page scrolling.
- When adding controls, first reduce vertical chrome or group controls horizontally before stacking new full-width sections.
- Validate shell changes with an automated check that the desktop app height matches the viewport and the document does not become vertically scrollable.
