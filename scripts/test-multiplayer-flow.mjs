import { chromium } from 'playwright';

const BASE_URL = process.env.BASE_URL || 'https://jogo.juventude.pro';

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
    if (pickColorName) {
      await page.getByText(pickColorName, { exact: true }).click();
    }
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
      if (text.includes('Marcar pronto')) {
        await readyBtn.click();
      }
      return;
    }
    await page.waitForTimeout(500);
  }
  throw new Error('Ready button stayed disabled');
}

async function getRoomCode(page) {
  const codeEl = page.locator('[data-testid="btn-ready"]').locator('xpath=ancestor::body//div').locator('text=/^[A-Z]{3}$/').first();
  const bodyText = await page.locator('body').innerText();
  const match = bodyText.match(/\b([A-Z]{3})\b/);
  const code = match?.[1];
  if (!code) throw new Error('Room code not found');
  return code;
}

async function waitForRollButton(page, timeout = 120000) {
  await page.getByTestId('btn-roll-multiplayer-turn').waitFor({ state: 'visible', timeout });
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
  const modal = page.getByTestId('overlay-quiz-modal');
  await modal.waitFor({ state: 'visible', timeout: 30000 });
  await page.waitForTimeout(2000);
  const question = page.locator('text=/\\?$/').first();
  await question.waitFor({ state: 'visible', timeout: 30000 }).catch(() => {});
  const allButtons = page.locator('[role="button"]');
  const labels = await allButtons.evaluateAll((els) => els.map((e) => e.getAttribute('aria-label') || ''));
  const quizIndex = labels.findIndex((label) => /^[A-D],/.test(label));
  if (quizIndex >= 0) {
    await allButtons.nth(quizIndex).click({ force: true });
  } else {
    await page.locator('div').filter({ hasText: /^A$/ }).last().click({ force: true });
  }
  await page.getByTestId('overlay-educational-modal').waitFor({ state: 'visible', timeout: 90000 });
}

async function main() {
  const browser = await chromium.launch({ headless: true });
  const host = await browser.newContext({ viewport: { width: 1920, height: 1080 } });
  const guest = await browser.newContext({ viewport: { width: 1920, height: 1080 } });
  const hostPage = await host.newPage();
  const guestPage = await guest.newPage();

  try {
    console.log('1. Home + create room');
    await waitForHome(hostPage);
    await openMultiplayer(hostPage);
    await setPlayerName(hostPage, 'Ana');
    await hostPage.getByTestId('btn-create-room').click();
    await hostPage.getByTestId('btn-ready').waitFor({ state: 'visible', timeout: 45000 });
    const roomCode = await getRoomCode(hostPage);
    console.log('Room:', roomCode);

    await customizeInLobby(hostPage, 'Coral');
    await markReady(hostPage);

    console.log('2. Guest join');
    await waitForHome(guestPage);
    await openMultiplayer(guestPage);
    await setPlayerName(guestPage, 'Bruno');
    await guestPage.getByTestId('input-join-code').fill(roomCode);
    await guestPage.getByTestId('btn-join-room').click();
    await guestPage.getByTestId('btn-ready').waitFor({ state: 'visible', timeout: 45000 });
    await customizeInLobby(guestPage, 'Ciano');
    await markReady(guestPage);

    console.log('3. Start game');
    await hostPage.getByTestId('btn-start-multiplayer-game').click();
    await waitForRollButton(hostPage);
    await waitForGameplayReady(hostPage, guestPage);

    console.log('4. Roll until quiz');
    const quizPage = await rollUntilQuiz(hostPage, guestPage);
    console.log('5. Answer quiz');
    await answerQuiz(quizPage);
    console.log('Flow OK');
  } catch (error) {
    console.error('FAILED:', error);
    process.exitCode = 1;
  } finally {
    await browser.close();
  }
}

main();
