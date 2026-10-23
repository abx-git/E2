import { test, expect } from "@playwright/test";

import {
  createCollabTestRoom,
  deleteCollabTestRoom,
  hasSupabaseCredentials,
} from "./helpers/collab-api";
import { dismissWelcomeIfShown, joinRoomFromUrl } from "./helpers/ui";

test.describe.configure({ mode: "serial" });

test.describe("Live collab (Supabase + Playwright)", () => {
  test.skip(
    !hasSupabaseCredentials(),
    "Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY (anon) to run live collab e2e",
  );

  let roomId = "";
  let roomCode = "";

  test.beforeAll(async () => {
    const room = await createCollabTestRoom("Playwright smoke");
    roomId = room.id;
    roomCode = room.code;
  });

  test.afterAll(async () => {
    if (roomId) {
      await deleteCollabTestRoom(roomId);
    }
  });

  test("API: anonymous auth and room bootstrap", async () => {
    expect(roomCode).toMatch(/^[A-Z0-9]{6}$/);
  });

  test("two browser contexts sync board title", async ({ browser }) => {
    const contextA = await browser.newContext();
    const contextB = await browser.newContext();
    const pageA = await contextA.newPage();
    const pageB = await contextB.newPage();

    await joinRoomFromUrl(pageA, roomCode, "Peer A");
    await joinRoomFromUrl(pageB, roomCode, "Peer B");

    const titleA = pageA.getByLabel("Board-Titel");
    const titleB = pageB.getByLabel("Board-Titel");

    const unique = `PW ${Date.now()}`;
    await titleA.fill(unique);
    await titleA.press("Tab");

    await expect(titleB).toHaveValue(unique, { timeout: 25_000 });

    await contextA.close();
    await contextB.close();
  });

  test("join via collab dialog after env-backed Supabase", async ({ page }) => {
    await page.goto("/");
    await dismissWelcomeIfShown(page);

    await page.getByTitle("Kollaborations-Raum").click();
    await page
      .locator(".mt-4.flex.gap-1")
      .getByRole("button", { name: /^Beitreten$/ })
      .click();
    await page.getByPlaceholder(/Dein Name/i).fill("Dialog Peer");
    await page.getByPlaceholder("ABC123").fill(roomCode);
    await page.locator("button.dock-control-active").filter({ hasText: "Beitreten" }).click();

    await expect(page.getByText(roomCode, { exact: true }).first()).toBeVisible();
    await expect(page.getByText(/Live/i).first()).toBeVisible();
  });
});
