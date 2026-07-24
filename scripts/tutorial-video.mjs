export const CAPTURE = Object.freeze({
  cssWidth: 360,
  cssHeight: 640,
  deviceScaleFactor: 3,
  outputWidth: 1080,
  outputHeight: 1920,
  fps: 30,
});

export const PLAYERS = Object.freeze({
  ana: Object.freeze({
    key: "ana",
    name: "Ana",
    label: "ANA • JOGADOR 1",
    color: "EC5B78",
  }),
  bruno: Object.freeze({
    key: "bruno",
    name: "Bruno",
    label: "BRUNO • JOGADOR 2",
    color: "18AFC7",
  }),
});

export const REQUIRED_MARKERS = Object.freeze({
  ana: [
    "home_ready",
    "room_created",
    "ready",
    "game_started",
    "end",
  ],
  bruno: ["home_ready", "join_started", "joined", "ready", "end"],
});

export const REQUIRED_GAMEPLAY_MARKERS = Object.freeze([
  "roll_started",
  "quiz_visible",
  "answer_selected",
  "feedback_visible",
]);

export const SCENES = Object.freeze([
  { id: "opening", duration: 4 },
  { id: "ana-create", duration: 10 },
  { id: "handoff", duration: 4 },
  { id: "bruno-join", duration: 10 },
  { id: "ready", duration: 8 },
  { id: "gameplay", duration: 6 },
  { id: "quiz", duration: 16 },
  { id: "closing", duration: 7 },
]);

export function assertRequiredMarkers(markers, activePlayer = "ana") {
  for (const [player, labels] of Object.entries(REQUIRED_MARKERS)) {
    const actual = new Set((markers[player] ?? []).map(({ label }) => label));
    for (const label of labels) {
      if (!actual.has(label)) {
        throw new Error(`Missing tutorial marker: ${player}.${label}`);
      }
    }
  }

  const gameplayLabels = new Set(
    (markers[activePlayer] ?? []).map(({ label }) => label),
  );
  for (const label of REQUIRED_GAMEPLAY_MARKERS) {
    if (!gameplayLabels.has(label)) {
      throw new Error(`Missing tutorial marker: ${activePlayer}.${label}`);
    }
  }
}

export function markerTime(markers, player, label) {
  const marker = markers[player]?.find((entry) => entry.label === label);
  if (!marker) throw new Error(`Missing tutorial marker: ${player}.${label}`);
  return marker.sec;
}

export function totalSceneDuration(scenes = SCENES) {
  return scenes.reduce((sum, scene) => sum + scene.duration, 0);
}

export function buildPhoneFilter({ player, inputLabel, outputLabel }) {
  const identity = PLAYERS[player];
  if (!identity) throw new Error(`Unknown tutorial player: ${player}`);

  return [
    `[${inputLabel}]`,
    "scale=920:1636:force_original_aspect_ratio=decrease,",
    `pad=944:1660:12:12:color=0x${identity.color},`,
    `drawbox=x=0:y=0:w=iw:h=ih:color=0x${identity.color}:t=12,`,
    `drawtext=text='${identity.label}':fontcolor=white:fontsize=48:`,
    `box=1:boxcolor=0x${identity.color}@0.96:boxborderw=18:`,
    "x=(w-text_w)/2:y=34",
    `[${outputLabel}]`,
  ].join("");
}
