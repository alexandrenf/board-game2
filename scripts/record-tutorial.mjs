import { chromium } from 'playwright';
import { mkdir, writeFile, rename } from 'node:fs/promises';
import path from 'node:path';

const BASE_URL = process.env.BASE_URL || 'https://jogo.juventude.pro';
const OUT_DIR = process.env.OUT_DIR || '/workspace/tmp/tutorial';
const VIEWPORT = { width: 1080, height: 1920 };

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function waitForHome(page) {
  await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' });
  await page.getByTestId('screen-game').waitFor({ state: 'visible', timeout: 90000 });
  await page.getByTestId('launch-3d-button').waitFor({ state: 'visible', timeout: 90000 });
}

async function openMultiplayer(page) {
  await page.getByTestId('btn-menu-multiplayer').click();
  await page.getByTestId('btn-create-room').waitFor({ state: 'visible', timeout: 30000 });
}

async function setPlayerName(page, name) {
  await page.getByTestId('input-player-name').fill(name);
}

async function customizeInLobby(page, pickColorName) {
  const openBtn = page.getByTestId('lobby-customization-button');
  if (await openBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
    await openBtn.click();
    await page.getByTestId('btn-save-customization').waitFor({ state: 'visible', timeout: 15000 });
    if (pickColorName) await page.getByText(pickColorName, { exact: true }).click();
    await page.getByTestId('btn-save-customization').click();
    await page.getByTestId('lobby-customization-button').waitFor({ state: 'visible', timeout: 20000 });
  }
}

async function markReady(page) {
  const readyBtn = page.getByTestId('btn-ready');
  await readyBtn.waitFor({ state: 'visible', timeout: 30000 });
  for (let i = 0; i < 20; i++) {
    if (await readyBtn.isEnabled().catch(() => false)) {
      const text = await readyBtn.innerText();
      if (text.includes('Marcar pronto')) await readyBtn.click();
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
    await rollBtn.click();
    const quiz = await roller.getByTestId('overlay-quiz-modal').waitFor({ state: 'visible', timeout: 45000 }).then(() => true).catch(() => false);
    if (quiz) {
      await roller.waitForTimeout(2500);
      return roller;
    }
    await roller.waitForTimeout(3000);
  }
  throw new Error('Quiz did not appear');
}

async function answerQuiz(page) {
  await page.getByTestId('overlay-quiz-modal').waitFor({ state: 'visible', timeout: 30000 });
  await page.waitForTimeout(2000);
  const allButtons = page.locator('[role="button"]');
  const labels = await allButtons.evaluateAll((els) => els.map((e) => e.getAttribute('aria-label') || ''));
  const quizIndex = labels.findIndex((label) => /^[A-D],/.test(label));
  if (quizIndex >= 0) await allButtons.nth(quizIndex).click({ force: true });
  await page.getByTestId('overlay-educational-modal').waitFor({ state: 'visible', timeout: 90000 });
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
  const markers = { host: [], guest: [] };
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
    recordVideo: { dir: OUT_DIR, size: VIEWPORT },
    locale: 'pt-BR',
    isMobile: true,
    hasTouch: true,
  });
  const guest = await browser.newContext({
    viewport: VIEWPORT,
    recordVideo: { dir: OUT_DIR, size: VIEWPORT },
    locale: 'pt-BR',
    isMobile: true,
    hasTouch: true,
  });

  const hostPage = await host.newPage();
  const guestPage = await guest.newPage();

  try {
    mark('host', 'start');
    await waitForHome(hostPage);
    mark('host', 'home_ready');
    await sleep(2500);

    mark('host', 'multiplayer_open');
    await openMultiplayer(hostPage);
    await sleep(2000);

    mark('host', 'create_room_begin');
    await setPlayerName(hostPage, 'Ana');
    await sleep(800);
    await hostPage.getByTestId('btn-create-room').click();
    await hostPage.getByTestId('btn-ready').waitFor({ state: 'visible', timeout: 45000 });
    const roomCode = await getRoomCode(hostPage);
    mark('host', 'room_created');
    await sleep(2000);

    mark('guest', 'start');
    await waitForHome(guestPage);
    mark('guest', 'home_ready');
    await sleep(1000);

    mark('guest', 'multiplayer_open');
    await openMultiplayer(guestPage);
    await sleep(1500);

    mark('guest', 'join_begin');
    await setPlayerName(guestPage, 'Bruno');
    await sleep(800);
    await guestPage.getByTestId('input-join-code').fill(roomCode);
    await sleep(1000);
    await guestPage.getByTestId('btn-join-room').click();
    await guestPage.getByTestId('btn-ready').waitFor({ state: 'visible', timeout: 45000 });
    mark('guest', 'joined_lobby');
    await sleep(2000);

    mark('host', 'lobby_customize_host');
    await customizeInLobby(hostPage, 'Coral');
    await sleep(1200);
    await markReady(hostPage);
    mark('host', 'host_ready');
    await sleep(1500);

    mark('guest', 'lobby_customize_guest');
    await customizeInLobby(guestPage, 'Ciano');
    await sleep(1200);
    await markReady(guestPage);
    mark('guest', 'guest_ready');
    await sleep(2000);

    mark('host', 'start_game');
    await hostPage.getByTestId('btn-start-multiplayer-game').click();
    await hostPage.getByTestId('btn-roll-multiplayer-turn').waitFor({ state: 'visible', timeout: 120000 });
    await waitForGameplayReady(hostPage, guestPage);
    mark('host', 'gameplay_ready');
    await sleep(2000);

    mark('host', 'roll_dice');
    const quizPage = await rollUntilQuiz(hostPage, guestPage);
    mark('host', 'dice_rolled');
    await sleep(3500);
    mark('host', 'quiz_visible');
    await sleep(2000);

    mark('host', 'quiz_answer');
    await answerQuiz(quizPage);
    mark('host', 'quiz_feedback');
    await sleep(3500);

    mark('host', 'closing');
    await hostPage.getByTestId('btn-close-educational-modal').click({ timeout: 5000 }).catch(() => {});
    await sleep(2500);
    mark('host', 'end');
  } catch (error) {
    console.error('Recording failed:', error);
    process.exitCode = 1;
  } finally {
    const hostVideo = await saveVideo(host, 'host-raw.webm');
    const guestVideo = await saveVideo(guest, 'guest-raw.webm');
    await browser.close();
    await writeFile(path.join(OUT_DIR, 'markers.json'), JSON.stringify({ markers, hostVideo, guestVideo, viewport: VIEWPORT }, null, 2));
    console.log('Saved markers and raw videos to', OUT_DIR);
  }
}

main();
