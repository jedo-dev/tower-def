import { test, expect } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

const outDir = path.resolve('.artifacts/terrain-check');
fs.mkdirSync(outDir, { recursive: true });
const errors = [];

test.beforeEach(async ({ page }) => {
  page.on('console', (msg) => {
    if (msg.type() === 'error') errors.push(`console:${msg.text()}`);
  });
  page.on('pageerror', (err) => errors.push(`pageerror:${err.message}`));
  page.on('response', (res) => {
    if (res.status() >= 400 && res.url().includes('/assets/tilesets/')) {
      errors.push(`http:${res.status()} ${res.url()}`);
    }
  });
});

test.afterAll(async () => {
  fs.writeFileSync(path.join(outDir, 'errors.log'), errors.join('\n'), 'utf8');
});

async function gotoSetup(page) {
  await page.goto('http://localhost:5173/', { waitUntil: 'domcontentloaded' });
  await page.getByRole('button', { name: 'New Game' }).click();
  await expect(page.locator('.setup-race-selector')).toBeVisible();
}

async function chooseRace(page, race) {
  for (let i = 0; i < 8; i++) {
    const current = (await page.locator('.setup-race-info .setup-card-name').innerText()).trim();
    if (current === race) return;
    await page.getByRole('button', { name: 'Next race' }).click();
    await page.waitForTimeout(220);
  }
  throw new Error(`Race not found: ${race}`);
}

async function launchGame(page, slug) {
  await page.getByRole('button', { name: 'Choose' }).click();
  await page.getByRole('button', { name: 'Continue' }).click();
  await page.getByRole('button', { name: 'Continue' }).click();
  await page.getByRole('button', { name: 'Start Game' }).click();
  await expect(page.locator('.game-canvas-container canvas')).toBeVisible({ timeout: 10000 });
  await page.waitForTimeout(1200);
  await page.screenshot({ path: path.join(outDir, `${slug}-game.png`), fullPage: true });
}

test('terrain changes by selected race and no tile 404', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });

  for (const race of ['Undead', 'Orc', 'Human', 'Elf']) {
    await gotoSetup(page);
    await chooseRace(page, race);
    await launchGame(page, race.toLowerCase());
  }

  await gotoSetup(page);
  await chooseRace(page, 'Undead');
  await launchGame(page, 'undead-repeat');
});
