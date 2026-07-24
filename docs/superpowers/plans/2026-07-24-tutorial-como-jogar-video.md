# Tutorial “Como Jogar” Video Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the current tutorial with a clear 60–70 second vertical video whose mobile UI is legible and whose coral/cyan phone frames identify Ana and Bruno.

**Architecture:** Record two deterministic Playwright sessions at a real mobile CSS viewport (360 × 640 with density 3), store participant-aware markers, and assemble only action-focused clips. Keep visual composition in a focused FFmpeg helper: it places recordings inside large colored phone frames, adds player labels and instruction cards, and validates the final artifact.

**Tech Stack:** Node.js ES modules, Playwright, FFmpeg/ffprobe, Bun test runner.

---

## File structure

- `scripts/tutorial-video.mjs` — shared constants, participant metadata, marker validation, and FFmpeg filter builders.
- `scripts/tutorial-video.test.mjs` — unit coverage for scale, participant identity, required markers, and output constraints.
- `scripts/record-tutorial.mjs` — deterministic two-player capture and participant-aware markers.
- `scripts/assemble-tutorial.mjs` — concise timeline, coral/cyan phone compositions, titles, sound mix, and final encode.
- `scripts/validate-tutorial.mjs` — metadata, duration, frozen-frame, and contact-sheet checks.
- `outputs/tutorial-como-jogar.mp4` — regenerated user-facing video.
- `outputs/tutorial-como-jogar-contact-sheet.jpg` — visual QA artifact.
- `outputs/README.md` — reproduction and validation instructions.

### Task 1: Add reusable video rules and tests

**Files:**
- Create: `scripts/tutorial-video.mjs`
- Create: `scripts/tutorial-video.test.mjs`

- [ ] **Step 1: Write the failing unit tests**

Create tests that import `PLAYERS`, `CAPTURE`, `assertRequiredMarkers`, and `buildPhoneFilter`. Assert:

```js
import { describe, expect, test } from "bun:test";
import {
  CAPTURE,
  PLAYERS,
  assertRequiredMarkers,
  buildPhoneFilter,
} from "./tutorial-video.mjs";

describe("tutorial video rules", () => {
  test("captures a 360px mobile layout at 3x density", () => {
    expect(CAPTURE).toEqual({
      cssWidth: 360,
      cssHeight: 640,
      deviceScaleFactor: 3,
      outputWidth: 1080,
      outputHeight: 1920,
      fps: 30,
    });
  });

  test("assigns stable contrasting identities", () => {
    expect(PLAYERS.ana).toMatchObject({ label: "ANA • JOGADOR 1", color: "EC5B78" });
    expect(PLAYERS.bruno).toMatchObject({ label: "BRUNO • JOGADOR 2", color: "18AFC7" });
  });

  test("rejects an incomplete participant timeline", () => {
    expect(() => assertRequiredMarkers({ ana: [{ label: "home_ready", sec: 1 }], bruno: [] }))
      .toThrow("Missing tutorial marker");
  });

  test("builds a large phone viewport instead of shrinking the app", () => {
    const filter = buildPhoneFilter({ player: "ana", inputLabel: "0:v", outputLabel: "phone" });
    expect(filter).toContain("scale=920:1636");
    expect(filter).toContain("ANA");
    expect(filter).toContain("EC5B78");
  });
});
```

- [ ] **Step 2: Run the tests and verify failure**

Run: `bun test scripts/tutorial-video.test.mjs`

Expected: FAIL because `scripts/tutorial-video.mjs` does not exist.

- [ ] **Step 3: Implement the shared rules**

Create `scripts/tutorial-video.mjs` with:

```js
export const CAPTURE = Object.freeze({
  cssWidth: 360,
  cssHeight: 640,
  deviceScaleFactor: 3,
  outputWidth: 1080,
  outputHeight: 1920,
  fps: 30,
});

export const PLAYERS = Object.freeze({
  ana: Object.freeze({ key: "ana", name: "Ana", label: "ANA • JOGADOR 1", color: "EC5B78" }),
  bruno: Object.freeze({ key: "bruno", name: "Bruno", label: "BRUNO • JOGADOR 2", color: "18AFC7" }),
});

export const REQUIRED_MARKERS = Object.freeze({
  ana: ["home_ready", "room_created", "ready", "game_started", "roll_started", "quiz_visible", "feedback_visible", "end"],
  bruno: ["home_ready", "join_started", "joined", "ready", "end"],
});

export function assertRequiredMarkers(markers) {
  for (const [player, labels] of Object.entries(REQUIRED_MARKERS)) {
    const actual = new Set((markers[player] ?? []).map(({ label }) => label));
    for (const label of labels) {
      if (!actual.has(label)) throw new Error(`Missing tutorial marker: ${player}.${label}`);
    }
  }
}

export function buildPhoneFilter({ player, inputLabel, outputLabel }) {
  const identity = PLAYERS[player];
  if (!identity) throw new Error(`Unknown tutorial player: ${player}`);
  return [
    `[${inputLabel}]scale=920:1636:force_original_aspect_ratio=decrease,`,
    `pad=944:1660:12:12:color=0x${identity.color},`,
    `drawbox=x=0:y=0:w=iw:h=ih:color=0x${identity.color}:t=12,`,
    `drawtext=text='${identity.label}':fontcolor=white:fontsize=48:`,
    `box=1:boxcolor=0x${identity.color}@0.96:boxborderw=18:x=(w-text_w)/2:y=34`,
    `[${outputLabel}]`,
  ].join("");
}
```

- [ ] **Step 4: Run the tests**

Run: `bun test scripts/tutorial-video.test.mjs`

Expected: 4 tests pass.

- [ ] **Step 5: Commit**

```bash
git add scripts/tutorial-video.mjs scripts/tutorial-video.test.mjs
git commit -m "test: define tutorial video composition rules"
```

### Task 2: Make the recording mobile-scale and deterministic

**Files:**
- Modify: `scripts/record-tutorial.mjs`
- Test: `scripts/tutorial-video.test.mjs`

- [ ] **Step 1: Extend the tests for participant-aware markers**

Add a test that passes complete separate Ana and Bruno marker arrays to `assertRequiredMarkers` and expects no exception. Include every label in `REQUIRED_MARKERS`.

- [ ] **Step 2: Run the focused tests**

Run: `bun test scripts/tutorial-video.test.mjs`

Expected: PASS before the recorder refactor, establishing the marker contract.

- [ ] **Step 3: Replace the capture dimensions**

Import `CAPTURE`, `PLAYERS`, and `assertRequiredMarkers`. Configure both browser contexts with:

```js
viewport: { width: CAPTURE.cssWidth, height: CAPTURE.cssHeight },
deviceScaleFactor: CAPTURE.deviceScaleFactor,
recordVideo: {
  dir: OUT_DIR,
  size: { width: CAPTURE.outputWidth, height: CAPTURE.outputHeight },
},
locale: "pt-BR",
isMobile: true,
hasTouch: true,
```

Use `markers = { ana: [], bruno: [] }`; pass the participant key to every marker call.

- [ ] **Step 4: Make the demonstrated turn deterministic**

After both players are ready, inspect which page has the enabled roll button and persist that participant key as `activePlayer`. Record quiz and feedback markers on that participant instead of assuming the host. If Bruno is active, swap the player identity used by the gameplay segment rather than extracting Ana’s spectator footage.

Select a known alternative by its exact accessible label, then wait for non-empty feedback:

```js
const feedback = page.getByTestId("overlay-educational-modal");
await feedback.waitFor({ state: "visible", timeout: 30_000 });
await expect.poll(async () => (await feedback.innerText()).trim().length).toBeGreaterThan(40);
```

Write `activePlayer` alongside `markers`, `hostVideo`, `guestVideo`, and `capture` in `markers.json`. Call `assertRequiredMarkers(markers)` before saving success.

- [ ] **Step 5: Run static verification**

Run: `bun run typecheck`

Expected: TypeScript completes without errors.

Run: `node --check scripts/record-tutorial.mjs`

Expected: exit code 0.

- [ ] **Step 6: Commit**

```bash
git add scripts/record-tutorial.mjs scripts/tutorial-video.test.mjs
git commit -m "fix: record tutorial at real mobile scale"
```

### Task 3: Rebuild the timeline and player composition

**Files:**
- Modify: `scripts/assemble-tutorial.mjs`
- Modify: `scripts/tutorial-video.mjs`
- Test: `scripts/tutorial-video.test.mjs`

- [ ] **Step 1: Add timeline duration tests**

Export `SCENES` from `scripts/tutorial-video.mjs`. Define the intended timeline:

```js
export const SCENES = Object.freeze([
  { id: "opening", duration: 4.5 },
  { id: "ana-create", duration: 11 },
  { id: "handoff", duration: 4 },
  { id: "bruno-join", duration: 11 },
  { id: "ready", duration: 9 },
  { id: "gameplay", duration: 12 },
  { id: "quiz", duration: 10 },
  { id: "closing", duration: 7 },
]);
```

Test that total duration is between 60 and 70 seconds and that `handoff` exists between Ana and Bruno.

- [ ] **Step 2: Run the new tests and verify failure**

Run: `bun test scripts/tutorial-video.test.mjs`

Expected: FAIL until `SCENES` is exported.

- [ ] **Step 3: Implement the concise timeline**

Remove the branches that slow the entire video or freeze its final frame. Build eight fixed-purpose scenes from action markers. Each scene must use the recording belonging to its participant.

Use `buildPhoneFilter` for single-participant scenes. The phone output must be 944 × 1660 and centered on the 1080 × 1920 canvas, leaving room for an instruction card without shrinking the game UI below the specified size.

For the handoff scene, place two cropped phone views side by side with the room code connected visually:

```text
ANA • JOGADOR 1  →  CÓDIGO DA SALA  →  BRUNO • JOGADOR 2
```

Use these instruction cards, one at a time:

```js
const COPY = {
  opening: ["JOGO DA PREVENÇÃO", "Aprender, jogar e prevenir"],
  "ana-create": ["ANA CRIA A SALA", "E compartilha o código"],
  handoff: ["UM CÓDIGO", "DOIS JOGADORES"],
  "bruno-join": ["BRUNO ENTRA", "Usando o mesmo código"],
  ready: ["PERSONALIZE E MARQUE PRONTO", "A partida já vai começar"],
  gameplay: ["ROLE O DADO", "E avance pelo tabuleiro"],
  quiz: ["RESPONDA E APRENDA", "Cada rodada traz informação"],
  closing: ["JOGUE JUNTO. APRENDA JUNTO.", "Jogo da Prevenção"],
};
```

Text cards must use solid backgrounds, at least 40px body text, and at least 48px player labels. Use coral only for Ana, cyan only for Bruno, and the existing orange/cream/black brand palette for neutral cards.

- [ ] **Step 4: Add audio accents without narration**

Mix the existing background track at a low level and reuse the repository’s click/tap assets for:

- phone/player change;
- creating/joining the room;
- dice roll;
- quiz answer reveal.

Do not add voice tracks.

- [ ] **Step 5: Run unit and syntax checks**

Run: `bun test scripts/tutorial-video.test.mjs`

Expected: all tests pass.

Run: `node --check scripts/assemble-tutorial.mjs`

Expected: exit code 0.

- [ ] **Step 6: Commit**

```bash
git add scripts/tutorial-video.mjs scripts/tutorial-video.test.mjs scripts/assemble-tutorial.mjs
git commit -m "feat: compose player-aware tutorial video"
```

### Task 4: Add artifact-level visual validation

**Files:**
- Create: `scripts/validate-tutorial.mjs`
- Modify: `outputs/README.md`

- [ ] **Step 1: Implement metadata validation**

Use `ffprobe` JSON output and fail unless:

```js
if (video.width !== 1080 || video.height !== 1920) throw new Error("Expected 1080x1920");
if (duration < 60 || duration > 70) throw new Error("Expected duration between 60 and 70 seconds");
if (Math.abs(frameRate - 30) > 0.01) throw new Error("Expected constant 30 fps");
if (!audioStream) throw new Error("Expected an audio stream");
```

- [ ] **Step 2: Add frozen-frame detection**

Run FFmpeg’s `freezedetect=n=-50dB:d=1` against the final video. Ignore only an intentional hold shorter than 1.5 seconds on the closing card. Fail on any other reported freeze lasting longer than one second.

- [ ] **Step 3: Generate the QA contact sheet**

Extract one frame every five seconds and tile them into `outputs/tutorial-como-jogar-contact-sheet.jpg`. The command must overwrite the old sheet and return a nonzero exit code if FFmpeg fails.

- [ ] **Step 4: Document reproduction**

Update `outputs/README.md` with exact commands:

```bash
BASE_URL=https://jogo.juventude.pro OUT_DIR=/tmp/tutorial bun scripts/record-tutorial.mjs
TMP_DIR=/tmp/tutorial OUTPUT=outputs/tutorial-como-jogar.mp4 bun scripts/assemble-tutorial.mjs
bun scripts/validate-tutorial.mjs outputs/tutorial-como-jogar.mp4
```

- [ ] **Step 5: Run the validator against the current video and verify failure**

Run: `bun scripts/validate-tutorial.mjs outputs/tutorial-como-jogar.mp4`

Expected: FAIL because the existing artifact is 132.8 seconds and contains prolonged freezes.

- [ ] **Step 6: Commit**

```bash
git add scripts/validate-tutorial.mjs outputs/README.md
git commit -m "test: validate tutorial video artifact"
```

### Task 5: Record, assemble, inspect, and deliver

**Files:**
- Modify: `outputs/tutorial-como-jogar.mp4`
- Create: `outputs/tutorial-como-jogar-contact-sheet.jpg`

- [ ] **Step 1: Install exact dependencies**

Run: `bun install --frozen-lockfile`

Expected: dependencies install without lockfile changes.

- [ ] **Step 2: Build and serve the app or target the approved deployed URL**

Run: `bun run build:web`

Expected: Expo exports the web app and generates the service worker.

Run the existing local server in a separate process:

```bash
bun scripts/serve-dist.mjs
```

Expected: the app is available at the server URL reported by the script.

- [ ] **Step 3: Record deterministic source footage**

Run:

```bash
BASE_URL=http://127.0.0.1:4173 OUT_DIR=/tmp/tutorial bun scripts/record-tutorial.mjs
```

Expected: `host-raw.webm`, `guest-raw.webm`, and `markers.json` exist; all required markers validate.

- [ ] **Step 4: Assemble the final artifact**

Before replacing the old artifact, recover its already licensed background track:

```bash
ffmpeg -y -i outputs/tutorial-como-jogar.mp4 -vn -codec:a libmp3lame -q:a 2 /tmp/tutorial/bg-music.mp3
```

Then run:

```bash
TMP_DIR=/tmp/tutorial OUTPUT=outputs/tutorial-como-jogar.mp4 bun scripts/assemble-tutorial.mjs
```

Expected: the new MP4 is produced without padding or global slow-motion.

- [ ] **Step 5: Run automated validation**

Run:

```bash
bun scripts/validate-tutorial.mjs outputs/tutorial-como-jogar.mp4
```

Expected: resolution, duration, frame rate, audio, and freeze checks pass; the contact sheet is generated.

- [ ] **Step 6: Perform visual QA**

Inspect `outputs/tutorial-como-jogar-contact-sheet.jpg` and representative full-size frames. Confirm:

- Ana always uses coral and Bruno always uses cyan.
- The game UI is large relative to the screen.
- Text, buttons, room code, question, and explanation are legible.
- No loading or empty modal appears.
- No camera-motion or zoom requirement has been introduced.
- Closing card is intentional and complete.

- [ ] **Step 7: Run repository verification**

Run:

```bash
bun run typecheck
bun run lint
bun test scripts/tutorial-video.test.mjs
```

Expected: all commands pass.

- [ ] **Step 8: Commit the final artifact**

```bash
git add outputs/tutorial-como-jogar.mp4 outputs/tutorial-como-jogar-contact-sheet.jpg
git commit -m "feat: deliver redesigned how-to-play tutorial"
```
