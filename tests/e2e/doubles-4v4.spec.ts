import { test, expect, type Page, type BrowserContext } from "@playwright/test";

/**
 * Standard Doubles 4/4 regression.
 *
 * Verifies the fix from "Doubles Phase 2": once the fourth player joins,
 * the match must remain visible on Home and the match detail page for the
 * host and every joined partner, and must NOT appear anywhere for a user
 * who did not join.
 *
 * See tests/e2e/README.md for required env vars and how to run.
 */

type Creds = { email: string; password: string; label: string };

function creds(prefix: string, label: string): Creds | null {
  const email = process.env[`${prefix}_EMAIL`];
  const password = process.env[`${prefix}_PASSWORD`];
  if (!email || !password) return null;
  return { email, password, label };
}

const HOST = creds("E2E_HOST", "host");
const P1 = creds("E2E_P1", "partner-1");
const P2 = creds("E2E_P2", "partner-2");
const P3 = creds("E2E_P3", "partner-3");
const OUTSIDER = creds("E2E_OUTSIDER", "outsider");
const COURT = process.env.E2E_COURT_LABEL ?? "E2E Test Court";

const ALL = [HOST, P1, P2, P3, OUTSIDER];
const MISSING = ALL.some((c) => c === null);

test.describe("Standard Doubles 4/4 visibility", () => {
  test.skip(
    MISSING,
    "Set E2E_HOST_*, E2E_P1_*, E2E_P2_*, E2E_P3_*, E2E_OUTSIDER_* env vars — see tests/e2e/README.md",
  );

  test("host, joined partners, and non-participant see the correct state", async ({
    browser,
  }) => {
    // One isolated browser context per user so sessions never bleed.
    const hostCtx = await browser.newContext();
    const p1Ctx = await browser.newContext();
    const p2Ctx = await browser.newContext();
    const p3Ctx = await browser.newContext();
    const outsiderCtx = await browser.newContext();

    try {
      const hostPage = await signIn(hostCtx, HOST!);

      // 1. Host creates a Standard Doubles open invite.
      const matchId = await createStandardDoublesInvite(hostPage);
      const matchPath = `/matches/${matchId}`;

      // Host sees it as upcoming on Home.
      await hostPage.goto("/home");
      await expect(hostPage.getByText("doubles match").first()).toBeVisible();

      // 2. Partners 1..3 each join.
      for (const partner of [P1!, P2!, P3!]) {
        const ctx = partner === P1 ? p1Ctx : partner === P2 ? p2Ctx : p3Ctx;
        const page = await signIn(ctx, partner);

        // Invite visible on Find before joining (unless already full).
        await page.goto("/find");
        // The invite is inside "Open invites near your level" and links to the
        // match detail page. We navigate directly to keep the spec resilient
        // to rating-range filters on the partner's profile.
        await page.goto(matchPath);

        await expect(
          page.getByRole("button", { name: /Join match/i }),
        ).toBeVisible();
        await page.getByRole("button", { name: /Join match/i }).click();

        // Confirmation shown after joining.
        await expect(
          page.getByText(/You're in this match|Match confirmed/),
        ).toBeVisible();
      }

      // 3. Match is now 4/4 — assert full-match UI for every participant.
      for (const [ctx, who] of [
        [hostCtx, HOST!],
        [p1Ctx, P1!],
        [p2Ctx, P2!],
        [p3Ctx, P3!],
      ] as const) {
        const page = await ctx.newPage();
        try {
          await page.goto(matchPath);
          await expect(
            page.getByText("Match confirmed"),
            `${who.label} should see Match confirmed`,
          ).toBeVisible();
          await expect(
            page.getByText(/Doubles scoring coming next/i),
          ).toBeVisible();

          await page.goto("/home");
          await expect(
            page.getByText("doubles match").first(),
            `${who.label} should still see the match on Home`,
          ).toBeVisible();
          await expect(page.getByText(/Full\s*·\s*4\/4/).first()).toBeVisible();

          // Find should no longer list this invite (capacity reached).
          await page.goto("/find");
          const findLink = page.locator(`a[href="${matchPath}"]`);
          await expect(findLink).toHaveCount(0);
        } finally {
          await page.close();
        }
      }

      // 4. Outsider — must not see the match anywhere.
      const outsiderPage = await signIn(outsiderCtx, OUTSIDER!);

      await outsiderPage.goto("/home");
      await expect(
        outsiderPage.locator(`a[href="${matchPath}"]`),
      ).toHaveCount(0);

      await outsiderPage.goto("/find");
      await expect(
        outsiderPage.locator(`a[href="${matchPath}"]`),
      ).toHaveCount(0);

      await outsiderPage.goto(matchPath);
      await expect(
        outsiderPage.getByText(/Match not found or no longer visible/i),
      ).toBeVisible();
    } finally {
      await Promise.all(
        [hostCtx, p1Ctx, p2Ctx, p3Ctx, outsiderCtx].map((c) => c.close()),
      );
    }
  });
});

// --- helpers -------------------------------------------------------------

async function signIn(ctx: BrowserContext, user: Creds): Promise<Page> {
  const page = await ctx.newPage();
  await page.goto("/auth");
  await page.locator("#email").fill(user.email);
  await page.locator("#password").fill(user.password);
  await page.getByRole("button", { name: /^Sign in$/ }).click();
  // Auth gate redirects to /home (or intended path) on success.
  await page.waitForURL((url) => !url.pathname.startsWith("/auth"), {
    timeout: 20_000,
  });
  return page;
}

/**
 * Creates a Standard Doubles open invite from the currently signed-in
 * host page and returns the new match id (extracted from the URL after
 * the create redirect).
 */
async function createStandardDoublesInvite(page: Page): Promise<string> {
  await page.goto("/matches/new");

  await page.getByRole("button", { name: /Doubles · 2 vs 2/ }).click();
  // Standard Doubles is the default style, but click to be explicit.
  await page.getByRole("button", { name: /^Standard Doubles/ }).click();
  await page.getByRole("button", { name: /Find 3 players/ }).click();

  // Date & time — 2 hours from now, formatted for <input type="datetime-local">.
  const when = new Date(Date.now() + 2 * 60 * 60 * 1000);
  when.setSeconds(0, 0);
  const local = new Date(when.getTime() - when.getTimezoneOffset() * 60_000)
    .toISOString()
    .slice(0, 16);
  await page.locator('input[type="datetime-local"]').fill(local);

  // Custom court so the spec doesn't depend on the host's preferred courts.
  await page.getByText(/Add another court\/location/).click();
  await page
    .locator('input[placeholder*="Interlace"], input[placeholder*="condo"]')
    .fill(COURT);

  await page.getByRole("button", { name: /Post doubles invite/ }).click();

  // Redirect lands on /matches/<id>.
  await page.waitForURL(/\/matches\/[0-9a-f-]{36}/i, { timeout: 20_000 });
  const match = page.url().match(/\/matches\/([0-9a-f-]{36})/i);
  if (!match) throw new Error(`Could not extract match id from ${page.url()}`);
  return match[1];
}
