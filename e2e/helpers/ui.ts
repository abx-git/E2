import type { Page } from "@playwright/test";

/** Dismiss first-run working-file setup when shown. */
export async function dismissWelcomeIfShown(page: Page): Promise<void> {
  const startWithout = page.getByRole("button", {
    name: /Ohne Datei starten|Start without file/i,
  });
  if (await startWithout.isVisible({ timeout: 4_000 }).catch(() => false)) {
    await startWithout.click();
  }
}

export async function joinRoomFromUrl(
  page: Page,
  roomCode: string,
  displayName?: string,
): Promise<void> {
  await page.goto(`/?room=${roomCode}`);
  await dismissWelcomeIfShown(page);

  const joinConfirm = page.getByRole("button", {
    name: /Raum laden|Join room|load room/i,
  });
  if (await joinConfirm.isVisible({ timeout: 2_000 }).catch(() => false)) {
    await joinConfirm.click();
  }

  const nameField = page.getByPlaceholder(/Dein Name|Your name/i);
  if (displayName && (await nameField.isVisible({ timeout: 1_000 }).catch(() => false))) {
    await nameField.fill(displayName);
  }

  await page.getByText(roomCode, { exact: true }).first().waitFor({ timeout: 45_000 });
  await page.getByText(/Live/i).first().waitFor({ timeout: 45_000 });
}
