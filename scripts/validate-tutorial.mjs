import { mkdir } from "node:fs/promises";
import path from "node:path";
import { spawnSync } from "node:child_process";

const input = process.argv[2] || "outputs/tutorial-como-jogar.mp4";
const outputDir = path.dirname(input);
const contactSheet = path.join(
  outputDir,
  "tutorial-como-jogar-contact-sheet.jpg",
);

function run(cmd, args, { allowFailure = false } = {}) {
  const result = spawnSync(cmd, args, { encoding: "utf8" });
  if (result.status !== 0 && !allowFailure) {
    throw new Error(result.stderr || result.stdout || `${cmd} failed`);
  }
  return {
    status: result.status,
    stdout: result.stdout,
    stderr: result.stderr,
  };
}

function parseRate(value) {
  const [numerator, denominator = "1"] = value.split("/").map(Number);
  return numerator / denominator;
}

async function main() {
  await mkdir(outputDir, { recursive: true });
  const probe = run("ffprobe", [
    "-v",
    "error",
    "-show_streams",
    "-show_format",
    "-of",
    "json",
    input,
  ]);
  const metadata = JSON.parse(probe.stdout);
  const video = metadata.streams.find(({ codec_type }) => codec_type === "video");
  const audio = metadata.streams.find(({ codec_type }) => codec_type === "audio");
  const duration = Number(metadata.format.duration);
  const frameRate = parseRate(video?.avg_frame_rate || "0/1");

  if (!video) throw new Error("Expected a video stream");
  if (video.width !== 1080 || video.height !== 1920) {
    throw new Error(
      `Expected 1080x1920, received ${video.width}x${video.height}`,
    );
  }
  if (duration < 60 || duration > 70) {
    throw new Error(
      `Expected duration between 60 and 70 seconds, received ${duration.toFixed(1)}`,
    );
  }
  if (Math.abs(frameRate - 30) > 0.01) {
    throw new Error(`Expected 30 fps, received ${frameRate.toFixed(2)}`);
  }
  if (!audio) throw new Error("Expected an audio stream");

  const freeze = run(
    "ffmpeg",
    [
      "-hide_banner",
      "-i",
      input,
      "-vf",
      "freezedetect=n=-50dB:d=1.5",
      "-an",
      "-f",
      "null",
      "-",
    ],
    { allowFailure: true },
  );
  const freezeDurations = [...freeze.stderr.matchAll(/freeze_duration: ([\d.]+)/g)]
    .map((match) => Number(match[1]))
    .filter((value) => value > 1.5);
  if (freezeDurations.some((value) => value > 7.1)) {
    throw new Error(
      `Unexpected frozen frame lasting ${Math.max(...freezeDurations).toFixed(1)}s`,
    );
  }

  run("ffmpeg", [
    "-y",
    "-i",
    input,
    "-vf",
    "fps=1/5,scale=270:480,tile=4x4:padding=8:margin=8",
    "-frames:v",
    "1",
    contactSheet,
  ]);

  console.log(`Validated: ${input}`);
  console.log(`Duration: ${duration.toFixed(1)}s`);
  console.log(`Resolution: ${video.width}x${video.height}`);
  console.log(`Frame rate: ${frameRate.toFixed(0)} fps`);
  console.log(`Contact sheet: ${contactSheet}`);
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});

