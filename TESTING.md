# Playwright Testing

Playwright tests cover user workflows that require a browser, Vite, and seeded Machbase Neo data. Keep them in `playwright_test` and group them by feature and behavior, such as `tagAnalyzer/range` or `tagAnalyzer/editor`. Schemas, CSV data, and lifecycle scripts belong in `test_runner`.

## Commands

```powershell
# Full isolated Playwright run
.\test_runner\run-playwright-tests.ps1
```

To prepare Neo, seed data, and Vite once, keep this running in terminal 1:

```powershell
.\test_runner\run-playwright-tests.ps1 -KeepEnvironmentReady
```

Then use terminal 2 for a file, source line, named test, or debugger:

```powershell
npx playwright test playwright_test/tagAnalyzer/range/boardRange.spec.ts
npx playwright test playwright_test/tagAnalyzer/range/boardRange.spec.ts:5
npx playwright test -g "switches the range type"
npx playwright test playwright_test/tagAnalyzer/range/boardRange.spec.ts:5 --debug
```

Press Enter in terminal 1 when finished so the services and temporary database are removed. Only one prepared environment can run at a time.
