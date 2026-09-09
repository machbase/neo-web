# Testing

Run commands from the project root. Choose the smallest suite that verifies the change.

| Suite | Location | What runs | Command |
| --- | --- | --- | --- |
| Unit and component | `src/**/*.test.ts`, `src/**/*.test.tsx` | Real functions, hooks, and React components in Jest; dependencies may be mocked. | `npm run test:unit` |
| Client integration | `tests/integration/client/` | Jest runs collaborating application modules; MSW intercepts their HTTP requests. | `npm run test:integration:client -- --runInBand` |
| Backend integration | `tests/integration/verification/` | Playwright API requests against the real configured backend, without a browser. | `npm run test:integration` |
| End to end | `tests/e2e/` | Playwright drives the real app in a browser. | `npm run test:e2e` |

Unit and component tests stay beside the implementation. A mocked API isolates a component; it does not replace the component being tested. Client integration checks exercise application modules together, backend integration checks exercise live backend contracts, and E2E checks exercise user workflows. Some E2E cases deliberately intercept responses to verify errors or loading states.

The [board-save client example](tests/integration/client/saveTazBoard.test.ts) calls the real `saveTazBoard`, serializer, repository, and Axios client. MSW supplies the HTTP response; the test checks the file endpoint, serialized panel title, and saved state. It needs no server, browser, or test-environment configuration.

The [request-chain walkthrough](tests/integration/REQUEST_CHAINS.md) shows runnable
request-race and FFT examples: how the real modules connect, how HTTP responses
are controlled, what each assertion proves, and the commands to run them.

The editor's parsing, field validation, and component rules run in focused Jest
tests. Playwright covers combined UI, chart, server, and persistence journeys:
edit, apply, interact with the chart, and verify the resulting state. Keep
related transitions in one journey instead of repeating browser setup for each
input combination. See the [editor coverage mapping](tests/e2e/tagAnalyzer/editor/component-coverage.md)
for responsibilities and focused run commands.

## Setup

Install dependencies once:

```powershell
npm install
```

Unit, component, and client integration tests need no running servers. For backend integration and E2E, check your platform's configuration under `test_config/`, then start the live test environment in terminal 1 (Windows):

```powershell
.\test_config\win\test_env_config_win.ps1
```

Wait for `[READY] Neo, fixtures, and Vite are ready.` Keep that terminal running. E2E also needs a browser installed once:

```powershell
npx playwright install chromium
```

Run the chosen suite in terminal 2. To select browser tests interactively:

```powershell
npm run test:e2e -- --ui
```

When finished, press Enter in terminal 1 to stop the servers and clean up temporary test data. See [environment setup](test_config/README.md) for configuration details.

## Focused runs

For Range logic and component changes, run the focused Jest suites without a
server:

```powershell
npm run test:unit -- --runInBand --coverage=false src/components/tagAnalyzer/panel/editor/PanelEditor.test.tsx src/components/tagAnalyzer/panel/editor/editorRangeExpressions.test.ts src/components/tagAnalyzer/panel/panelRuntime.test.tsx
```

The Range editor Playwright journeys connect embedded Main/Nav editing to
actual chart updates, server queries, navigation, automatic Reset, and
saved-board reopening, including a delayed-response journey that checks the
latest Apply wins. They complement the Jest rules rather than duplicate
every parsing or validation case. Run them against a server with the configured
`TAG` and `DISTANCE_SENSOR` fixtures:

```powershell
npm run test:e2e -- tests/e2e/tagAnalyzer/editor/editorMainRange.spec.ts --workers=1
```

```powershell
npm run test:unit -- --runInBand src/components/tagAnalyzer/panel/series/PanelSeriesEditor.test.tsx
npm run test:integration:client -- --runInBand
npm run test:integration -- --list
npm run test:e2e -- tests/e2e/tagAnalyzer/editor/editorAxes.spec.ts
npm run test:e2e -- --grep '@case:TAZ-EDITOR-AXES-009' --workers=1
```

`npm run test:playwright` runs the backend integration and E2E projects. The client suite uses [its own Jest configuration](tests/integration/jest.config.cjs). Playwright's `--list` only discovers tests and does not require the live environment. Shared Playwright helpers live in `tests/support/`; locator rules and browser debugging commands are in [tests/README.md](tests/README.md).

Backend integration targets the configured Neo HTTP port; E2E targets Vite. `PLAYWRIGHT_API_BASE_URL` overrides the backend integration endpoint. `PLAYWRIGHT_BASE_URL` overrides the browser endpoint and is also the API fallback when no API override is set.

The test runner and servers can run on different operating systems. If Neo and Vite are already running in WSL, keep that environment running and launch Playwright from Windows CMD:

```bat
set "PLAYWRIGHT_BASE_URL=http://127.0.0.1:7777"
set "PLAYWRIGHT_API_BASE_URL=http://127.0.0.1:5654"
npm run test:e2e -- --ui
```

Tests access saved files through Neo's HTTP API, so no Windows temporary storage directory is required. The WSL server still needs the fixture tables and users prepared by `bash ./test_config/linux/test_env_config_linux.sh`. The fixture definitions used by the runner must match those loaded on the server. Replace the URLs if the servers use another address or ports.

## Version control

The existing [.gitignore](.gitignore) policy keeps `tests/`, `test_config/`, and new source test files in a separate test repository. Already tracked source tests remain tracked. This reorganization preserves that policy; ignored files need to be versioned in the test repository to be shared.
