import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { spawnSync } from "node:child_process";
import {
  CAPTURE,
  PLAYERS,
  SCENES,
  assertRequiredMarkers,
  markerTime,
  totalSceneDuration,
} from "./tutorial-video.mjs";

const TMP = process.env.TMP_DIR || "/workspace/tmp/tutorial";
const OUTPUT =
  process.env.OUTPUT || "/workspace/outputs/tutorial-como-jogar.mp4";
const MUSIC = path.join(TMP, "bg-music.mp3");
const WIDTH = CAPTURE.outputWidth;
const HEIGHT = CAPTURE.outputHeight;
const PHONE_WIDTH = 944;
const PHONE_HEIGHT = 1660;
const PHONE_X = Math.round((WIDTH - PHONE_WIDTH) / 2);
const PHONE_Y = 82;
const FONT = "DejaVu Sans";
const NEUTRAL_BG = "F4EEE4";
const INK = "171717";
const ORANGE = "F7931E";

const COPY = Object.freeze({
  opening: ["JOGO DA PREVENÇÃO", "Aprender, jogar e prevenir"],
  "ana-create": ["ANA CRIA A SALA", "E compartilha o código"],
  handoff: ["UM CÓDIGO", "DOIS JOGADORES"],
  "bruno-join": ["BRUNO ENTRA", "Usando o mesmo código"],
  ready: ["PERSONALIZE E MARQUE PRONTO", "A partida já vai começar"],
  gameplay: ["ROLE O DADO", "E avance pelo tabuleiro"],
  quiz: ["RESPONDA E APRENDA", "Cada rodada traz informação"],
  closing: ["JOGUE JUNTO. APRENDA JUNTO.", "Jogo da Prevenção"],
});

function run(cmd, args) {
  const result = spawnSync(cmd, args, { encoding: "utf8" });
  if (result.status !== 0) {
    throw new Error(result.stderr || result.stdout || `${cmd} failed`);
  }
  return result.stdout.trim();
}

function escapeDrawtext(text) {
  return text
    .replaceAll("\\", "\\\\")
    .replaceAll(":", "\\:")
    .replaceAll("'", "’")
    .replaceAll("%", "\\%");
}

function wrapText(text, maxCharacters = 31, maxLines = 3) {
  const words = text.trim().split(/\s+/);
  const lines = [];
  let current = "";
  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (candidate.length > maxCharacters && current) {
      lines.push(current);
      current = word;
    } else {
      current = candidate;
    }
  }
  if (current) lines.push(current);
  if (lines.length <= maxLines) return lines;
  return [
    ...lines.slice(0, maxLines - 1),
    lines.slice(maxLines - 1).join(" "),
  ];
}

function drawText({
  text,
  size,
  color = "white",
  x = "(w-text_w)/2",
  y,
  box = false,
  boxColor = "black@0.8",
  boxBorder = 18,
}) {
  return [
    `drawtext=font='${FONT}'`,
    `text='${escapeDrawtext(text)}'`,
    `fontsize=${size}`,
    `fontcolor=${color}`,
    `x=${x}`,
    `y=${y}`,
    box ? "box=1" : "box=0",
    box ? `boxcolor=${boxColor}` : "",
    box ? `boxborderw=${boxBorder}` : "",
  ]
    .filter(Boolean)
    .join(":");
}

function sceneDuration(id) {
  const scene = SCENES.find((entry) => entry.id === id);
  if (!scene) throw new Error(`Unknown scene: ${id}`);
  return scene.duration;
}

function singlePhoneFilter(player, title, subtitle) {
  const identity = PLAYERS[player];
  return [
    `crop=${CAPTURE.cssWidth}:${CAPTURE.cssHeight}:0:0`,
    `scale=920:1636:force_original_aspect_ratio=decrease:flags=lanczos`,
    "unsharp=5:5:0.35:5:5:0",
    `pad=${PHONE_WIDTH}:${PHONE_HEIGHT}:(ow-iw)/2:(oh-ih)/2:color=0x${identity.color}`,
    `drawbox=x=0:y=0:w=iw:h=ih:color=0x${identity.color}:t=12`,
    `pad=${WIDTH}:${HEIGHT}:${PHONE_X}:${PHONE_Y}:color=0x${NEUTRAL_BG}`,
    drawText({
      text: identity.label,
      size: 48,
      y: 38,
      box: true,
      boxColor: `0x${identity.color}@0.98`,
      boxBorder: 16,
    }),
    `drawbox=x=50:y=1730:w=980:h=150:color=0x${INK}@0.96:t=fill`,
    drawText({ text: title, size: 48, y: 1750 }),
    drawText({ text: subtitle, size: 40, y: 1812, color: "0xF6EBDD" }),
    drawText({
      text: ".",
      size: 54,
      color: `0x${identity.color}`,
      x: "70+(w-140)*mod(t\\,2.5)/2.5",
      y: 1850,
    }),
    `fps=${CAPTURE.fps}`,
    "format=yuv420p",
  ].join(",");
}

function renderSingle({
  input,
  start,
  duration,
  player,
  scene,
  output,
}) {
  const [title, subtitle] = COPY[scene];
  run("ffmpeg", [
    "-y",
    "-ss",
    String(Math.max(0, start)),
    "-i",
    input,
    "-t",
    String(duration),
    "-vf",
    singlePhoneFilter(player, title, subtitle),
    "-an",
    "-c:v",
    "libx264",
    "-preset",
    "fast",
    "-crf",
    "18",
    "-pix_fmt",
    "yuv420p",
    output,
  ]);
}

function renderHandoff({ anaInput, brunoInput, anaStart, brunoStart, output }) {
  const duration = sceneDuration("handoff");
  const [title, subtitle] = COPY.handoff;
  const filter = [
    `[0:v]crop=${CAPTURE.cssWidth}:${CAPTURE.cssHeight}:0:0,`,
    `scale=486:864:force_original_aspect_ratio=decrease:flags=lanczos,`,
    `pad=502:880:(ow-iw)/2:(oh-ih)/2:color=0x${PLAYERS.ana.color},`,
    `drawbox=x=0:y=0:w=iw:h=ih:color=0x${PLAYERS.ana.color}:t=8[ana];`,
    `[1:v]crop=${CAPTURE.cssWidth}:${CAPTURE.cssHeight}:0:0,`,
    `scale=486:864:force_original_aspect_ratio=decrease:flags=lanczos,`,
    `pad=502:880:(ow-iw)/2:(oh-ih)/2:color=0x${PLAYERS.bruno.color},`,
    `drawbox=x=0:y=0:w=iw:h=ih:color=0x${PLAYERS.bruno.color}:t=8[bruno];`,
    `color=c=0x${NEUTRAL_BG}:s=${WIDTH}x${HEIGHT}:r=${CAPTURE.fps}:d=${duration}[bg];`,
    "[bg][ana]overlay=x=24:y=300[tmp1];",
    "[tmp1][bruno]overlay=x=554:y=300[tmp2];",
    `[tmp2]${drawText({
      text: PLAYERS.ana.label,
      size: 48,
      x: 56,
      y: 220,
      box: true,
      boxColor: `0x${PLAYERS.ana.color}@0.98`,
      boxBorder: 14,
    })},${drawText({
      text: PLAYERS.bruno.label,
      size: 48,
      x: 586,
      y: 220,
      box: true,
      boxColor: `0x${PLAYERS.bruno.color}@0.98`,
      boxBorder: 14,
    })},`,
    `drawbox=x=50:y=1460:w=980:h=220:color=0x${INK}@0.96:t=fill,`,
    `${drawText({ text: title, size: 64, y: 1495 })},`,
    `${drawText({ text: subtitle, size: 48, y: 1585, color: "0xF6EBDD" })},`,
    `${drawText({
      text: ".",
      size: 54,
      color: `0x${ORANGE}`,
      x: "70+(w-140)*mod(t\\,2.5)/2.5",
      y: 1665,
    })},`,
    `fps=${CAPTURE.fps},format=yuv420p[out]`,
  ].join("");

  run("ffmpeg", [
    "-y",
    "-ss",
    String(Math.max(0, anaStart)),
    "-i",
    anaInput,
    "-ss",
    String(Math.max(0, brunoStart)),
    "-i",
    brunoInput,
    "-filter_complex",
    filter,
    "-map",
    "[out]",
    "-t",
    String(duration),
    "-an",
    "-c:v",
    "libx264",
    "-preset",
    "fast",
    "-crf",
    "18",
    "-pix_fmt",
    "yuv420p",
    output,
  ]);
}

function renderClosing(output) {
  const duration = sceneDuration("closing");
  const [title, subtitle] = COPY.closing;
  const filter = [
    `color=c=0x${ORANGE}:s=${WIDTH}x${HEIGHT}:r=${CAPTURE.fps}:d=${duration}`,
    `drawbox=x=72:y=235:w=936:h=1450:color=0x${NEUTRAL_BG}:t=fill`,
    drawText({ text: "JOGO DA", size: 78, color: `0x${INK}`, y: 480 }),
    drawText({ text: "PREVENÇÃO", size: 108, color: `0x${INK}`, y: 570 }),
    `drawbox=x=164:y=820:w=330:h=510:color=0x${PLAYERS.ana.color}:t=18`,
    `drawbox=x=586:y=820:w=330:h=510:color=0x${PLAYERS.bruno.color}:t=18`,
    drawText({
      text: "ANA",
      size: 58,
      color: `0x${PLAYERS.ana.color}`,
      x: 264,
      y: 1020,
    }),
    drawText({
      text: "BRUNO",
      size: 58,
      color: `0x${PLAYERS.bruno.color}`,
      x: 648,
      y: 1020,
    }),
    drawText({ text: title, size: 54, color: `0x${INK}`, y: 1430 }),
    drawText({ text: subtitle, size: 46, color: `0x${INK}`, y: 1510 }),
    drawText({
      text: ".",
      size: 60,
      color: `0x${INK}`,
      x: "100+(w-200)*t/7",
      y: 1710,
    }),
    "format=yuv420p",
  ].join(",");

  run("ffmpeg", [
    "-y",
    "-f",
    "lavfi",
    "-i",
    filter,
    "-t",
    String(duration),
    "-an",
    "-c:v",
    "libx264",
    "-preset",
    "fast",
    "-crf",
    "18",
    "-pix_fmt",
    "yuv420p",
    output,
  ]);
}

function renderOpening(output) {
  const duration = sceneDuration("opening");
  const filter = [
    `color=c=0x${ORANGE}:s=${WIDTH}x${HEIGHT}:r=${CAPTURE.fps}:d=${duration}`,
    `drawbox=x=72:y=190:w=936:h=1540:color=0x${NEUTRAL_BG}:t=fill`,
    drawText({ text: "JOGO DA", size: 78, color: `0x${INK}`, y: 390 }),
    drawText({ text: "PREVENÇÃO", size: 108, color: `0x${INK}`, y: 485 }),
    `drawbox=x=145:y=760:w=350:h=590:color=0x${PLAYERS.ana.color}:t=18`,
    `drawbox=x=585:y=760:w=350:h=590:color=0x${PLAYERS.bruno.color}:t=18`,
    drawText({
      text: "ANA",
      size: 58,
      color: `0x${PLAYERS.ana.color}`,
      x: 260,
      y: 1010,
    }),
    drawText({
      text: "BRUNO",
      size: 58,
      color: `0x${PLAYERS.bruno.color}`,
      x: 650,
      y: 1010,
    }),
    drawText({
      text: "Aprender, jogar e prevenir",
      size: 52,
      color: `0x${INK}`,
      y: 1480,
    }),
    drawText({
      text: ".",
      size: 60,
      color: `0x${INK}`,
      x: "100+(w-200)*t/4",
      y: 1660,
    }),
    "format=yuv420p",
  ].join(",");

  run("ffmpeg", [
    "-y",
    "-f",
    "lavfi",
    "-i",
    filter,
    "-t",
    String(duration),
    "-an",
    "-c:v",
    "libx264",
    "-preset",
    "fast",
    "-crf",
    "18",
    "-pix_fmt",
    "yuv420p",
    output,
  ]);
}

function renderFeedbackCard(player, quiz, output) {
  const identity = PLAYERS[player];
  const duration = 7;
  const questionLines = wrapText(quiz.question, 31, 3);
  const answerLines = wrapText(quiz.correctOption, 27, 3);
  const questionFilters = questionLines.map((line, index) =>
    drawText({
      text: line,
      size: 50,
      color: `0x${INK}`,
      y: 570 + index * 68,
    }),
  );
  const answerFilters = answerLines.map((line, index) =>
    drawText({
      text: line,
      size: 60,
      color: `0x${INK}`,
      y: 870 + index * 78,
    }),
  );
  const filter = [
    `color=c=0x${NEUTRAL_BG}:s=${WIDTH}x${HEIGHT}:r=${CAPTURE.fps}:d=${duration}`,
    `drawbox=x=56:y=70:w=968:h=1780:color=0x${identity.color}:t=14`,
    drawText({
      text: identity.label,
      size: 48,
      y: 50,
      box: true,
      boxColor: `0x${identity.color}@0.98`,
      boxBorder: 16,
    }),
    `drawbox=x=130:y=250:w=820:h=220:color=0x009444@0.96:t=fill`,
    drawText({ text: "RESPOSTA CORRETA", size: 64, y: 315 }),
    ...questionFilters,
    `drawbox=x=110:y=820:w=860:h=300:color=0x${identity.color}@0.14:t=fill`,
    ...answerFilters,
    drawText({
      text: "Informação também previne.",
      size: 48,
      color: `0x${INK}`,
      y: 1330,
    }),
    drawText({
      text: "JOGO DA PREVENÇÃO",
      size: 42,
      color: `0x${ORANGE}`,
      y: 1610,
    }),
    drawText({
      text: ".",
      size: 60,
      color: `0x${identity.color}`,
      x: "100+(w-200)*t/7",
      y: 1750,
    }),
    "format=yuv420p",
  ].join(",");

  run("ffmpeg", [
    "-y",
    "-f",
    "lavfi",
    "-i",
    filter,
    "-t",
    String(duration),
    "-an",
    "-c:v",
    "libx264",
    "-preset",
    "fast",
    "-crf",
    "18",
    "-pix_fmt",
    "yuv420p",
    output,
  ]);
}

async function concatScenes(files, output) {
  const listPath = path.join(TMP, "tutorial-scenes.txt");
  await writeFile(
    listPath,
    files.map((file) => `file '${file.replaceAll("'", "'\\''")}'`).join("\n"),
  );
  run("ffmpeg", [
    "-y",
    "-f",
    "concat",
    "-safe",
    "0",
    "-i",
    listPath,
    "-c",
    "copy",
    output,
  ]);
}

function transitionScenes(files, output) {
  const transition = 0.35;
  const args = ["-y"];
  for (const file of files) args.push("-i", file);

  const chains = [];
  let cumulativeDuration = SCENES[0].duration;
  for (let index = 1; index < files.length; index += 1) {
    const previous = index === 1 ? "0:v" : `v${index - 1}`;
    const next = `${index}:v`;
    const outputLabel = `v${index}`;
    const offset = cumulativeDuration - transition * index;
    chains.push(
      `[${previous}][${next}]xfade=transition=slideleft:duration=${transition}:offset=${offset.toFixed(2)}[${outputLabel}]`,
    );
    cumulativeDuration += SCENES[index].duration;
  }

  run("ffmpeg", [
    ...args,
    "-filter_complex",
    chains.join(";"),
    "-map",
    `[v${files.length - 1}]`,
    "-an",
    "-c:v",
    "libx264",
    "-preset",
    "fast",
    "-crf",
    "18",
    "-pix_fmt",
    "yuv420p",
    output,
  ]);
}

function mixMusic(video, output) {
  const duration = Number(
    run("ffprobe", [
      "-v",
      "error",
      "-show_entries",
      "format=duration",
      "-of",
      "default=noprint_wrappers=1:nokey=1",
      video,
    ]),
  );
  const click = path.resolve("assets/Sounds/click-a.m4a");
  run("ffmpeg", [
    "-y",
    "-i",
    video,
    "-stream_loop",
    "-1",
    "-i",
    MUSIC,
    "-i",
    click,
    "-filter_complex",
    [
      `[1:a]volume=0.18,afade=t=in:st=0:d=1,afade=t=out:st=${duration - 2}:d=2[music]`,
      "[2:a]asplit=5[e1][e2][e3][e4][e5]",
      "[e1]volume=0.55,adelay=4000|4000[d1]",
      "[e2]volume=0.55,adelay=14000|14000[d2]",
      "[e3]volume=0.55,adelay=27000|27000[d3]",
      "[e4]volume=0.55,adelay=40000|40000[d4]",
      "[e5]volume=0.55,adelay=52000|52000[d5]",
      "[music][d1][d2][d3][d4][d5]amix=inputs=6:duration=longest:normalize=0[a]",
    ].join(";"),
    "-map",
    "0:v",
    "-map",
    "[a]",
    "-t",
    String(duration),
    "-c:v",
    "copy",
    "-c:a",
    "aac",
    "-b:a",
    "192k",
    "-movflags",
    "+faststart",
    output,
  ]);
}

async function main() {
  await mkdir(TMP, { recursive: true });
  await mkdir(path.dirname(OUTPUT), { recursive: true });
  const data = JSON.parse(
    await readFile(path.join(TMP, "markers.json"), "utf8"),
  );
  const { markers, activePlayer, quiz } = data;
  assertRequiredMarkers(markers, activePlayer);
  if (!quiz?.question || !quiz?.correctOption) {
    throw new Error("Tutorial quiz metadata is missing");
  }

  const videos = {
    ana: path.join(TMP, "ana-raw.webm"),
    bruno: path.join(TMP, "bruno-raw.webm"),
  };
  const sceneFiles = Object.fromEntries(
    SCENES.map(({ id }) => [id, path.join(TMP, `scene-${id}.mp4`)]),
  );

  renderOpening(sceneFiles.opening);
  renderSingle({
    input: videos.ana,
    start: markerTime(markers, "ana", "create_room_begin") - 4,
    duration: sceneDuration("ana-create"),
    player: "ana",
    scene: "ana-create",
    output: sceneFiles["ana-create"],
  });
  renderHandoff({
    anaInput: videos.ana,
    brunoInput: videos.bruno,
    anaStart: markerTime(markers, "ana", "room_created"),
    brunoStart: markerTime(markers, "bruno", "join_started"),
    output: sceneFiles.handoff,
  });
  renderSingle({
    input: videos.bruno,
    start: markerTime(markers, "bruno", "join_started") - 2,
    duration: sceneDuration("bruno-join"),
    player: "bruno",
    scene: "bruno-join",
    output: sceneFiles["bruno-join"],
  });
  renderSingle({
    input: videos.ana,
    start: markerTime(markers, "ana", "lobby_customize"),
    duration: sceneDuration("ready"),
    player: "ana",
    scene: "ready",
    output: sceneFiles.ready,
  });
  const gameplayStart = Math.max(
    markerTime(markers, "ana", "game_started"),
    markerTime(markers, activePlayer, "quiz_visible") -
      sceneDuration("gameplay"),
  );
  renderSingle({
    input: videos[activePlayer],
    start: gameplayStart,
    duration: sceneDuration("gameplay"),
    player: activePlayer,
    scene: "gameplay",
    output: sceneFiles.gameplay,
  });
  const quizQuestion = path.join(TMP, "scene-quiz-question.mp4");
  const quizFeedback = path.join(TMP, "scene-quiz-feedback.mp4");
  renderSingle({
    input: videos[activePlayer],
    start: markerTime(markers, activePlayer, "answer_selected") - 5,
    duration: 9,
    player: activePlayer,
    scene: "quiz",
    output: quizQuestion,
  });
  renderFeedbackCard(activePlayer, quiz, quizFeedback);
  await concatScenes([quizQuestion, quizFeedback], sceneFiles.quiz);
  renderClosing(sceneFiles.closing);

  const silentVideo = path.join(TMP, "tutorial-silent.mp4");
  transitionScenes(SCENES.map(({ id }) => sceneFiles[id]), silentVideo);
  mixMusic(silentVideo, OUTPUT);

  console.log(`Final video: ${OUTPUT}`);
  console.log(`Duration: ${totalSceneDuration()}s`);
  console.log(`Resolution: ${WIDTH}x${HEIGHT}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
