# Tutorial video assets

## Final deliverable
- `tutorial-como-jogar.mp4` — portrait (1080×1920), 60–70 seconds, no narration
- `tutorial-como-jogar-contact-sheet.jpg` — frames sampled every five seconds for visual QA

## Player identities

- Ana / Jogador 1 — coral phone frame
- Bruno / Jogador 2 — cyan phone frame

The colors identify participants only. They are unrelated to avatar appearance.

## Background music
- Title: Piano Reflections
- Artist: Ahjay Stelino
- Source: Mixkit Stock Music Free License
- License page: https://mixkit.co/license/#musicFree
- Attribution: not required (optional)
- Local source used during assembly: `/workspace/tmp/tutorial/bg-music.mp3`

## Reproduction

```bash
BASE_URL=https://jogo.juventude.pro OUT_DIR=/tmp/tutorial bun scripts/record-tutorial.mjs
TMP_DIR=/tmp/tutorial OUTPUT=outputs/tutorial-como-jogar.mp4 bun scripts/assemble-tutorial.mjs
bun scripts/validate-tutorial.mjs outputs/tutorial-como-jogar.mp4
```
