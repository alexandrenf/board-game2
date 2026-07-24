import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const TMP = process.env.TMP_DIR || '/workspace/tmp/tutorial';
const OUTPUT = process.env.OUTPUT || '/workspace/outputs/tutorial-como-jogar.mp4';
const MUSIC = path.join(TMP, 'bg-music.mp3');
const WIDTH = 1080;
const HEIGHT = 1920;

function run(cmd, args) {
  const result = spawnSync(cmd, args, { encoding: 'utf8' });
  if (result.status !== 0) {
    console.error(result.stderr || result.stdout);
    throw new Error(`${cmd} failed`);
  }
  return result.stdout.trim();
}

function findMarker(markers, label) {
  const hit = markers.find((m) => m.label === label);
  if (!hit) throw new Error(`Marker not found: ${label}`);
  return hit.sec;
}

function clip(input, start, end, output, fps = 30) {
  const safeStart = Math.max(0, start);
  const dur = Math.max(0.5, end - safeStart);
  run('ffmpeg', [
    '-y', '-ss', String(safeStart), '-i', input,
    '-t', String(dur),
    '-vf', `fps=${fps},scale=${WIDTH}:${HEIGHT}:force_original_aspect_ratio=decrease,pad=${WIDTH}:${HEIGHT}:(ow-iw)/2:(oh-ih)/2`,
    '-an', '-c:v', 'libx264', '-preset', 'fast', '-crf', '20', '-pix_fmt', 'yuv420p',
    output,
  ]);
}

function concat(files, output) {
  const listPath = path.join(TMP, 'concat.txt');
  const list = files.map((f) => `file '${f}'`).join('\n');
  return writeFile(listPath, list).then(() => {
    run('ffmpeg', ['-y', '-f', 'concat', '-safe', '0', '-i', listPath, '-c', 'copy', output]);
  });
}

function burnCaptionsAndMusic(input, assPath, musicPath, output, duration) {
  const escaped = assPath.replace(/\\/g, '\\\\').replace(/:/g, '\\:').replace(/'/g, "\\'");
  const fadeOutStart = Math.max(0, duration - 2.5);

  run('ffmpeg', [
    '-y',
    '-i', input,
    '-stream_loop', '-1',
    '-i', musicPath,
    '-filter_complex',
    `[0:v]subtitles=${escaped}[v];[1:a]volume=0.16,afade=t=in:st=0:d=1.5,afade=t=out:st=${fadeOutStart}:d=2.5[a]`,
    '-map', '[v]',
    '-map', '[a]',
    '-t', String(duration),
    '-c:v', 'libx264', '-preset', 'fast', '-crf', '20', '-pix_fmt', 'yuv420p',
    '-c:a', 'aac', '-b:a', '160k',
    output,
  ]);
}

function toAssTime(sec) {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = Math.floor(sec % 60);
  const cs = Math.round((sec % 1) * 100);
  return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}.${String(cs).padStart(2, '0')}`;
}

function wrapCaption(text, maxChars = 36) {
  const words = text.split(/\s+/);
  const lines = [];
  let current = '';
  for (const word of words) {
    const next = current ? `${current} ${word}` : word;
    if (next.length > maxChars && current) {
      lines.push(current);
      current = word;
    } else {
      current = next;
    }
  }
  if (current) lines.push(current);
  if (lines.length <= 2) return lines.join('\\N');
  return `${lines[0]}\\N${lines.slice(1).join(' ')}`;
}

function buildAss(cues) {
  const header = `[Script Info]
ScriptType: v4.00+
PlayResX: 1080
PlayResY: 1920
WrapStyle: 2
ScaledBorderAndShadow: yes

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Caption,DejaVu Sans,28,&H00FFFFFF,&H000000FF,&H66000000,&H80000000,0,0,0,0,100,100,0.6,0,1,2,0,2,56,56,110,1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
`;
  const events = cues
    .map((cue) => `Dialogue: 0,${toAssTime(cue.start)},${toAssTime(cue.end)},Caption,,0,0,0,,${wrapCaption(cue.text)}`)
    .join('\n');
  return `${header}${events}\n`;
}

async function main() {
  const data = JSON.parse(await readFile(path.join(TMP, 'markers.json'), 'utf8'));
  const host = data.markers.host;
  const guest = data.markers.guest;
  const hostRaw = path.join(TMP, 'host-raw.webm');
  const guestRaw = path.join(TMP, 'guest-raw.webm');
  const segments = [];

  const seg = (name, input, markerList, startLabel, endLabel, padStart = 0, padEnd = 0) => {
    const start = findMarker(markerList, startLabel) + padStart;
    const end = findMarker(markerList, endLabel) - padEnd;
    const out = path.join(TMP, `${name}.mp4`);
    clip(input, start, end, out);
    segments.push({ file: out, name });
    return out;
  };

  const clipBetween = (name, input, markerList, startLabel, endLabel, extraEnd = 0) => {
    const start = findMarker(markerList, startLabel);
    const end = findMarker(markerList, endLabel) + extraEnd;
    const out = path.join(TMP, `${name}.mp4`);
    clip(input, start, end, out);
    segments.push({ file: out, name });
    return out;
  };

  // Prefer natural dwell over slow-mo: extend clips from surrounding markers
  seg('01-opening', hostRaw, host, 'home_ready', 'multiplayer_open', -0.8, -1.5);
  seg('02-multiplayer', hostRaw, host, 'multiplayer_open', 'create_room_begin', -0.5, 0.1);
  seg('03-create-room', hostRaw, host, 'create_room_begin', 'room_created', -0.3, -2.0);
  seg('04-join', guestRaw, guest, 'multiplayer_open', 'joined_lobby', -0.3, -1.5);
  seg('05-lobby', hostRaw, host, 'lobby_customize_host', 'start_game', -0.3, -1.5);
  clipBetween('05b-start', hostRaw, host, 'start_game', 'gameplay_ready', 1.5);
  seg('06-gameplay', hostRaw, host, 'gameplay_ready', 'quiz_visible', -0.3, 0.2);
  seg('07-quiz', hostRaw, host, 'quiz_visible', 'quiz_answer', -0.3, -3.0);
  {
    const start = findMarker(host, 'quiz_feedback') - 3;
    const end = findMarker(host, 'quiz_feedback') + 6;
    const out = path.join(TMP, '07b-quiz-feedback.mp4');
    clip(hostRaw, start, end, out);
    segments.push({ file: out, name: '07b-quiz-feedback' });
  }
  clipBetween('08-closing', hostRaw, host, 'closing', 'end', 0.5);

  const concatPath = path.join(TMP, 'concat-no-captions.mp4');
  await concat(segments.map((s) => s.file), concatPath);

  const segmentDurations = segments.map((s) => ({
    name: s.name,
    duration: Number(run('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'default=noprint_wrappers=1:nokey=1', s.file])),
  }));

  let timeline = 0;
  const captionTexts = {
    '01-opening': 'Jogo da Prevenção — multiplayer educativo sobre HIV, AIDS e ISTs.',
    '02-multiplayer': 'Toque em MULTIPLAYER para criar ou entrar em uma sala.',
    '03-create-room': 'Crie a sala e compartilhe o código de 3 letras.',
    '04-join': 'No segundo celular, digite o código e entre na sala.',
    '05-lobby': 'Personalize o avatar, marque pronto e inicie a partida.',
    '05b-start': 'A partida começa com a ordem dos jogadores.',
    '06-gameplay': 'Na sua vez, role o dado e avance no tabuleiro 3D.',
    '07-quiz': 'Responda às perguntas educativas durante a partida.',
    '07b-quiz-feedback': 'Veja a resposta correta e a explicação.',
    '08-closing': 'Continue jogando — vence quem completar o percurso aprendendo.',
  };

  const captions = segmentDurations.map((segInfo) => {
    const start = timeline + 0.35;
    const end = timeline + Math.max(1.2, segInfo.duration - 0.25);
    timeline += segInfo.duration;
    return { start, end, text: captionTexts[segInfo.name] };
  });

  let videoPath = concatPath;
  let concatDur = timeline;
  if (concatDur > 180) {
    const factor = 175 / concatDur;
    const scaled = path.join(TMP, 'scaled.mp4');
    run('ffmpeg', ['-y', '-i', concatPath, '-filter:v', `setpts=${factor.toFixed(4)}*PTS`, '-an', scaled]);
    const newDur = Number(run('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'default=noprint_wrappers=1:nokey=1', scaled]));
    captions.forEach((c) => {
      c.start = (c.start / concatDur) * newDur;
      c.end = (c.end / concatDur) * newDur;
    });
    videoPath = scaled;
    concatDur = newDur;
  } else if (concatDur < 120) {
    // Mild stretch only (avoid obvious slow-mo); pad with freeze if still short
    const mildFactor = Math.min(1.12, 125 / concatDur);
    let working = concatPath;
    let workingDur = concatDur;
    if (mildFactor > 1.01) {
      const scaled = path.join(TMP, 'scaled.mp4');
      run('ffmpeg', ['-y', '-i', concatPath, '-filter:v', `setpts=${mildFactor.toFixed(4)}*PTS`, '-an', scaled]);
      workingDur = Number(run('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'default=noprint_wrappers=1:nokey=1', scaled]));
      captions.forEach((c) => {
        c.start = (c.start / concatDur) * workingDur;
        c.end = (c.end / concatDur) * workingDur;
      });
      working = scaled;
      concatDur = workingDur;
    }
    if (workingDur < 120) {
      const pad = 122 - workingDur;
      const padded = path.join(TMP, 'padded.mp4');
      run('ffmpeg', [
        '-y', '-i', working,
        '-vf', `tpad=stop_mode=clone:stop_duration=${pad.toFixed(2)}`,
        '-an', '-c:v', 'libx264', '-preset', 'fast', '-crf', '20', '-pix_fmt', 'yuv420p',
        padded,
      ]);
      captions.push({
        start: workingDur + 0.2,
        end: workingDur + pad,
        text: 'Continue jogando — vence quem completar o percurso aprendendo.',
      });
      videoPath = padded;
      concatDur = Number(run('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'default=noprint_wrappers=1:nokey=1', padded]));
    } else {
      videoPath = working;
    }
  }

  await writeFile(path.join(TMP, 'captions.ass'), buildAss(captions));
  burnCaptionsAndMusic(videoPath, path.join(TMP, 'captions.ass'), MUSIC, OUTPUT, concatDur);

  const duration = run('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'default=noprint_wrappers=1:nokey=1', OUTPUT]);
  const resolution = run('ffprobe', ['-v', 'error', '-select_streams', 'v:0', '-show_entries', 'stream=width,height', '-of', 'csv=p=0:s=x', OUTPUT]);
  const hasAudio = run('ffprobe', ['-v', 'error', '-select_streams', 'a:0', '-show_entries', 'stream=codec_name', '-of', 'default=noprint_wrappers=1:nokey=1', OUTPUT]);
  console.log(`Final video: ${OUTPUT}`);
  console.log(`Duration: ${Number(duration).toFixed(1)}s`);
  console.log(`Resolution: ${resolution}`);
  console.log(`Audio: ${hasAudio || 'none'}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
