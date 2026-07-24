import { chromium } from 'playwright';
import { mkdir, writeFile, rename } from 'node:fs/promises';
import path from 'node:path';
import {
  CAPTURE,
  PLAYERS,
  assertRequiredMarkers,
} from './tutorial-video.mjs';

const BASE_URL = process.env.BASE_URL || 'https://jogo.juventude.pro';
const OUT_DIR = process.env.OUT_DIR || '/workspace/tmp/tutorial';
const VIEWPORT = { width: CAPTURE.cssWidth, height: CAPTURE.cssHeight };

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const domClick = (locator) => locator.evaluate((element) => element.click());

async function waitForHome(page) {
  await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' });
  await page.getByTestId('screen-game').waitFor({ state: 'visible', timeout: 90000 });
  await page.getByTestId('launch-3d-button').waitFor({ state: 'visible', timeout: 90000 });
}

async function openMultiplayer(page) {
  await domClick(page.getByTestId('btn-menu-multiplayer'));
  await page.getByTestId('btn-create-room').waitFor({ state: 'visible', timeout: 30000 });
}

async function setPlayerName(page, name) {
  await page.getByTestId('input-player-name').fill(name);
}

async function customizeInLobby(page, pickColorName) {
  const openBtn = page.getByTestId('lobby-customization-button');
  if (await openBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
    await domClick(openBtn);
    const saveButton = page.getByTestId('btn-save-customization');
    const opened = await saveButton
      .waitFor({ state: 'visible', timeout: 8000 })
      .then(() => true)
      .catch(() => false);
    if (!opened) return;
    if (pickColorName) await domClick(page.getByText(pickColorName, { exact: true }));
    await domClick(saveButton);
    await page.getByTestId('lobby-customization-button').waitFor({ state: 'visible', timeout: 20000 });
  }
}

async function markReady(page) {
  const readyBtn = page.getByTestId('btn-ready');
  await readyBtn.waitFor({ state: 'visible', timeout: 30000 });
  for (let i = 0; i < 20; i++) {
    if (await readyBtn.isEnabled().catch(() => false)) {
      const text = await readyBtn.innerText();
      if (text.includes('Marcar pronto')) await domClick(readyBtn);
      return;
    }
    await page.waitForTimeout(500);
  }
  throw new Error('Ready button stayed disabled');
}

async function getRoomCode(page) {
  const bodyText = await page.locator('body').innerText();
  const match = bodyText.match(/\b([A-Z]{3})\b/);
  if (!match?.[1]) throw new Error('Room code not found');
  return match[1];
}

async function waitForGameplayReady(hostPage, guestPage, timeout = 120000) {
  const start = Date.now();
  while (Date.now() - start < timeout) {
    const hostEnabled = await hostPage.getByTestId('btn-roll-multiplayer-turn').isEnabled().catch(() => false);
    const guestEnabled = await guestPage.getByTestId('btn-roll-multiplayer-turn').isEnabled().catch(() => false);
    if (hostEnabled || guestEnabled) return;
    await hostPage.waitForTimeout(1000);
  }
  throw new Error('Gameplay never became ready');
}

async function getActiveRoller(hostPage, guestPage) {
  if (await hostPage.getByTestId('btn-roll-multiplayer-turn').isEnabled().catch(() => false)) return hostPage;
  if (await guestPage.getByTestId('btn-roll-multiplayer-turn').isEnabled().catch(() => false)) return guestPage;
  return hostPage;
}

async function waitUntilEnabled(locator, timeout = 60000) {
  const start = Date.now();
  while (Date.now() - start < timeout) {
    if (await locator.isEnabled().catch(() => false)) return;
    await locator.page().waitForTimeout(500);
  }
  throw new Error('Element stayed disabled');
}

async function rollUntilQuiz(hostPage, guestPage, maxRolls = 8) {
  for (let i = 0; i < maxRolls; i++) {
    const roller = await getActiveRoller(hostPage, guestPage);
    const rollBtn = roller.getByTestId('btn-roll-multiplayer-turn');
    await waitUntilEnabled(rollBtn, 90000);
    await domClick(rollBtn);
    const quiz = await roller.getByTestId('overlay-quiz-modal').waitFor({ state: 'visible', timeout: 45000 }).then(() => true).catch(() => false);
    if (quiz) {
      await roller.waitForTimeout(2500);
      return {
        page: roller,
        player: roller === hostPage ? PLAYERS.ana.key : PLAYERS.bruno.key,
      };
    }
    await roller.waitForTimeout(3000);
  }
  throw new Error('Quiz did not appear');
}

async function submitQuizAnswer(page) {
  const quizModal = page.getByTestId('overlay-quiz-modal');
  await quizModal.waitFor({ state: 'visible', timeout: 30000 });
  await page.waitForTimeout(800);
  const modalText = await page.locator('body').innerText();
  const question = modalText
    .split('\n')
    .map((line) => line.trim())
    .find((line) => line.endsWith('?'));
  if (!question) throw new Error('Tutorial quiz question not found');
  const allButtons = page.locator('[role="button"]');
  const labels = await allButtons.evaluateAll((els) => els.map((e) => e.getAttribute('aria-label') || ''));
  const quizIndex = labels.findIndex((label) => /^[A-D],/.test(label));
  if (quizIndex < 0) throw new Error('No deterministic quiz option found');
  const selectedOption = labels[quizIndex]
    .replace(/^[A-D],\s*/, '')
    .replace(/,\s*(não\s+)?selecionada$/i, '')
    .trim();
  await domClick(allButtons.nth(quizIndex));
  return { question, selectedOption };
}

async function waitForQuizFeedback(page) {
  const feedback = page.getByTestId('overlay-educational-modal');
  await feedback.waitFor({ state: 'visible', timeout: 30000 });
  await page.waitForTimeout(2000);
}

async function readCorrectQuizOption(page) {
  const labels = await page
    .locator('[role="button"]')
    .evaluateAll((elements) =>
      elements.map((element) => element.getAttribute('aria-label') || ''),
    );
  const correctLabel = labels.find((label) => /,\s*Correta$/i.test(label));
  if (!correctLabel) throw new Error('Correct quiz option not found in review');
  return correctLabel
    .replace(/^[A-D],\s*/, '')
    .replace(/,\s*Correta$/i, '')
    .trim();
}

async function saveVideo(context, targetName) {
  const page = context.pages()[0];
  const video = page.video();
  await context.close();
  if (!video) return null;
  const webmPath = await video.path();
  const target = path.join(OUT_DIR, targetName);
  await rename(webmPath, target);
  return target;
}

async function main() {
  await mkdir(OUT_DIR, { recursive: true });
  const markers = { ana: [], bruno: [] };
  const t0 = Date.now();
  const mark = (who, label) => {
    markers[who].push({ label, sec: (Date.now() - t0) / 1000 });
    console.log(`[${who}] ${label} @ ${((Date.now() - t0) / 1000).toFixed(1)}s`);
  };

  const browser = await chromium.launch({
    headless: true,
    args: ['--disable-dev-shm-usage', '--no-sandbox'],
  });

  const host = await browser.newContext({
    viewport: VIEWPORT,
    deviceScaleFactor: CAPTURE.deviceScaleFactor,
    recordVideo: {
      dir: OUT_DIR,
      size: { width: CAPTURE.outputWidth, height: CAPTURE.outputHeight },
    },
    locale: 'pt-BR',
    isMobile: true,
    hasTouch: true,
  });
  const guest = await browser.newContext({
    viewport: VIEWPORT,
    deviceScaleFactor: CAPTURE.deviceScaleFactor,
    recordVideo: {
      dir: OUT_DIR,
      size: { width: CAPTURE.outputWidth, height: CAPTURE.outputHeight },
    },
    locale: 'pt-BR',
    isMobile: true,
    hasTouch: true,
  });

  const hostPage = await host.newPage();
  const guestPage = await guest.newPage();
  let activePlayer = PLAYERS.ana.key;
  let quizDetails = null;

  try {
    mark('ana', 'start');
    await waitForHome(hostPage);
    mark('ana', 'home_ready');
    await sleep(2500);

    mark('ana', 'multiplayer_open');
    await openMultiplayer(hostPage);
    await sleep(2000);

    mark('ana', 'create_room_begin');
    await setPlayerName(hostPage, PLAYERS.ana.name);
    await sleep(800);
    await domClick(hostPage.getByTestId('btn-create-room'));
    await hostPage.getByTestId('btn-ready').waitFor({ state: 'visible', timeout: 45000 });
    const roomCode = await getRoomCode(hostPage);
    mark('ana', 'room_created');
    await sleep(2000);

    mark('bruno', 'start');
    await waitForHome(guestPage);
    mark('bruno', 'home_ready');
    await sleep(1000);

    mark('bruno', 'multiplayer_open');
    await openMultiplayer(guestPage);
    await sleep(1500);

    mark('bruno', 'join_started');
    await setPlayerName(guestPage, PLAYERS.bruno.name);
    await sleep(800);
    await guestPage.getByTestId('input-join-code').fill(roomCode);
    await sleep(1000);
    await domClick(guestPage.getByTestId('btn-join-room'));
    await guestPage.getByTestId('btn-ready').waitFor({ state: 'visible', timeout: 45000 });
    mark('bruno', 'joined');
    await sleep(2000);

    mark('ana', 'lobby_customize');
    await customizeInLobby(hostPage, 'Coral');
    await sleep(1200);
    await markReady(hostPage);
    mark('ana', 'ready');
    await sleep(1500);

    mark('bruno', 'lobby_customize');
    await customizeInLobby(guestPage, 'Ciano');
    await sleep(1200);
    await markReady(guestPage);
    mark('bruno', 'ready');
    await sleep(2000);

    mark('ana', 'game_started');
    await domClick(hostPage.getByTestId('btn-start-multiplayer-game'));
    await hostPage.getByTestId('btn-roll-multiplayer-turn').waitFor({ state: 'visible', timeout: 120000 });
    await waitForGameplayReady(hostPage, guestPage);
    mark('ana', 'gameplay_ready');
    await sleep(2000);

    const quizTurn = await rollUntilQuiz(hostPage, guestPage);
    activePlayer = quizTurn.player;
    mark(activePlayer, 'roll_started');
    mark(activePlayer, 'quiz_visible');
    await sleep(1200);

    const [anaQuiz, brunoQuiz] = await Promise.all([
      submitQuizAnswer(hostPage),
      submitQuizAnswer(guestPage),
    ]);
    quizDetails = activePlayer === PLAYERS.ana.key ? anaQuiz : brunoQuiz;
    mark(activePlayer, 'answer_selected');
    await waitForQuizFeedback(quizTurn.page);
    quizDetails = {
      ...quizDetails,
      correctOption: await readCorrectQuizOption(quizTurn.page),
    };
    mark(activePlayer, 'feedback_visible');
    await sleep(2200);

    await domClick(quizTurn.page.getByTestId('btn-close-educational-modal')).catch(() => {});
    await sleep(1000);
    mark('ana', 'end');
    mark('bruno', 'end');
    assertRequiredMarkers(markers, activePlayer);
  } catch (error) {
    console.error('Recording failed:', error);
    process.exitCode = 1;
  } finally {
    const hostVideo = await saveVideo(host, 'ana-raw.webm');
    const guestVideo = await saveVideo(guest, 'bruno-raw.webm');
    await browser.close();
    await writeFile(path.join(OUT_DIR, 'markers.json'), JSON.stringify({
      markers,
      activePlayer,
      quiz: quizDetails,
      videos: { ana: hostVideo, bruno: guestVideo },
      capture: CAPTURE,
    }, null, 2));
    console.log('Saved markers and raw videos to', OUT_DIR);
  }
}

main();
