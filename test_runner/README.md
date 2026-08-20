# Playwright Test Runner

Run these commands from the project root in PowerShell.

## First-time setup

```powershell
npm install
npx playwright install chromium
```

The scripts expect `machbase-neo.exe` and this repository at the paths configured near the top of `run-playwright-tests.ps1` and `initialize-test-database.ps1`. Make sure ports `5652`-`5656` and `7777` are free.

## Run all tests

```powershell
.\test_runner\run-playwright-tests.ps1
```

The runner automatically:

1. Checks that the required ports are free and removes old temporary test data.
2. Starts a temporary Machbase Neo server.
3. Creates the `TAG` and `DISTANCE_SENSOR` tables and imports the fixture CSV files.
4. Starts the Vite app at `http://127.0.0.1:7777`.
5. Runs the Playwright tests in `playwright_test`.
6. Stops both servers and deletes the temporary database, even if a test fails.

## Run one test

In terminal 1, prepare the environment and leave it running:

```powershell
.\test_runner\run-playwright-tests.ps1 -KeepEnvironmentReady
```

In terminal 2, run the test you need:

```powershell
npx playwright test path\to\test.spec.ts
```

When finished, return to terminal 1 and press Enter to clean up.
