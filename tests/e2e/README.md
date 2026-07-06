# End-to-end regression tests

Playwright specs that drive the running dev server (default `http://localhost:8080`).

## Standard Doubles 4/4 flow (`doubles-4v4.spec.ts`)

Covers the regression fixed after "Doubles Phase 2": once four players
occupy the match, the host and every joined partner must still see the
match on Home and on the match detail page, while non-participants must
not.

### Required test accounts

The spec is skipped automatically unless all of these env vars are set.
Create five pre-confirmed accounts (email/password) in your test
environment first — the spec does not create accounts, so `Email not
confirmed` will fail the run.

| Env var | Role |
| --- | --- |
| `E2E_HOST_EMAIL` / `E2E_HOST_PASSWORD` | Match creator |
| `E2E_P1_EMAIL` / `E2E_P1_PASSWORD` | First joiner (partner) |
| `E2E_P2_EMAIL` / `E2E_P2_PASSWORD` | Second joiner |
| `E2E_P3_EMAIL` / `E2E_P3_PASSWORD` | Third joiner — makes the match 4/4 |
| `E2E_OUTSIDER_EMAIL` / `E2E_OUTSIDER_PASSWORD` | Non-participant control |

Optional overrides:

- `E2E_BASE_URL` — defaults to `http://localhost:8080`.
- `E2E_COURT_LABEL` — free-text court name entered under "Add another
  court/location". Defaults to `E2E Test Court`.

### Running

```bash
bun run dev &                      # if not already running
bunx playwright install chromium   # first run only, outside the sandbox
bunx playwright test tests/e2e/doubles-4v4.spec.ts
```

Inside the Lovable sandbox the dev server is already up and Chromium is
pre-installed, so only the last command is needed.

### What the spec asserts

1. **Host** creates a Standard Doubles open invite (Find 3 players).
2. **P1, P2, P3** each sign in, open the invite from Find, click **Join
   match**, and see the "You're in this match" confirmation.
3. After P3 joins, the match is 4/4:
   - Match detail shows **Match confirmed** and the "Doubles scoring
     coming next" note for every participant.
   - Home shows the match under upcoming for host + P1 + P2 + P3 with
     the `Full · 4/4` label.
   - Find no longer lists the invite for anyone (it is at capacity).
4. **Outsider** signs in and:
   - Does not see the match on Home.
   - Does not see the invite on Find.
   - Cannot open the match detail page (renders "Match not found or no
     longer visible.").
