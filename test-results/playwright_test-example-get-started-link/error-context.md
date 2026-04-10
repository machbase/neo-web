# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: playwright_test\example.spec.ts >> get started link
- Location: playwright_test\example.spec.ts:10:1

# Error details

```
Test timeout of 30000ms exceeded.
```

```
Error: locator.click: Test timeout of 30000ms exceeded.
Call log:
  - waiting for getByRole('link', { name: 'Get started' })

```

# Page snapshot

```yaml
- generic [ref=e3]:
  - img [ref=e4]
  - generic [ref=e10]:
    - textbox "User" [active] [ref=e16]
    - generic [ref=e20]:
      - textbox "Password" [ref=e21]
      - button "Show password" [ref=e23] [cursor=pointer]:
        - img [ref=e25]
    - generic [ref=e29] [cursor=pointer]:
      - checkbox "Remember User ID" [ref=e30]
      - img [ref=e32]
      - generic [ref=e34]: Remember User ID
    - button "SIGN IN" [ref=e38] [cursor=pointer]:
      - generic [ref=e39]: SIGN IN
```

# Test source

```ts
  1  | import { test, expect } from '@playwright/test';
  2  | 
  3  | test('has title', async ({ page }) => {
  4  |   await page.goto('http://127.0.0.1:5654/web/ui/');
  5  | 
  6  |   // Expect a title "to contain" a substring.
  7  |   await expect(page).toHaveTitle(/web/);
  8  | });
  9  | 
  10 | test('get started link', async ({ page }) => {
  11 |   await page.goto('http://127.0.0.1:5654/web/ui/');
  12 | 
  13 |   // Click the get started link.
> 14 |   await page.getByRole('link', { name: 'Get started' }).click();
     |                                                         ^ Error: locator.click: Test timeout of 30000ms exceeded.
  15 | 
  16 |   // Expects page to have a heading with the name of Installation.
  17 |   await expect(page.getByRole('heading', { name: 'Installation' })).toBeVisible();
  18 | });
  19 | 
  20 | 
```