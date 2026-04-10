# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: playwright_test\test-1.spec.ts >> test
- Location: playwright_test\test-1.spec.ts:3:1

# Error details

```
Test timeout of 30000ms exceeded.
```

```
Error: locator.click: Test timeout of 30000ms exceeded.
Call log:
  - waiting for getByRole('button', { name: 'dew_point' })

```

# Page snapshot

```yaml
- generic [ref=e1]:
  - generic [ref=e3]:
    - navigation [ref=e4]:
      - generic [ref=e5]:
        - button "EXPLORER" [ref=e7] [cursor=pointer]:
          - img [ref=e10]
        - button "DBEXPLORER" [ref=e13] [cursor=pointer]:
          - img [ref=e16]
        - button "SHELL" [ref=e19] [cursor=pointer]:
          - img [ref=e22]
        - button "BRIDGE" [ref=e26] [cursor=pointer]:
          - img [ref=e29]
        - button "TIMER" [ref=e32] [cursor=pointer]:
          - img [ref=e35]
        - button "KEY" [ref=e38] [cursor=pointer]:
          - img [ref=e41]
        - button "REFERENCE" [ref=e44] [cursor=pointer]:
          - img [ref=e47]
      - button "Settings" [ref=e53] [cursor=pointer]:
        - img [ref=e56]
    - generic [ref=e59]:
      - generic [ref=e61]:
        - generic [ref=e63]: Machbase-neo v8.0.74
        - generic [ref=e65]:
          - generic [ref=e67]:
            - generic [ref=e68] [cursor=pointer]:
              - img [ref=e70]
              - generic [ref=e73]: OPEN EDITORS
            - generic [ref=e76] [cursor=pointer]:
              - img [ref=e78]
              - generic [ref=e80]: TAG ANALYZER
          - generic [ref=e84]:
            - generic [ref=e85] [cursor=pointer]:
              - img [ref=e87]
              - generic [ref=e89]:
                - generic [ref=e90]: EXPLORER
                - generic [ref=e91]:
                  - button [ref=e92]:
                    - img [ref=e95]
                  - button [ref=e98]:
                    - img [ref=e101]
                  - button [ref=e103]:
                    - img [ref=e106]
                  - button [ref=e109]:
                    - img [ref=e112]
            - generic [ref=e117]:
              - generic [ref=e120]:
                - img [ref=e122]
                - generic [ref=e126]: education
              - generic [ref=e129]:
                - img [ref=e131]
                - generic [ref=e133]: machbase-neo-v8.0.74-windows-amd64
              - generic [ref=e136]:
                - img [ref=e138]
                - generic [ref=e142]: neo-apps
              - generic [ref=e145]:
                - img [ref=e147]
                - generic [ref=e151]: neo-tutorials
              - generic [ref=e154]:
                - img [ref=e156]
                - generic [ref=e158]: TAG ANALYZER.taz
      - generic [ref=e164]:
        - generic [ref=e167]:
          - generic [ref=e168]:
            - button "TAG ANALYZER" [ref=e170] [cursor=pointer]:
              - generic [ref=e171]:
                - generic [ref=e172]:
                  - img [ref=e174]
                  - generic [ref=e177]: TAG ANALYZER
                - img [ref=e180]
            - button [ref=e183] [cursor=pointer]:
              - img [ref=e185]
          - generic [ref=e190]:
            - generic [ref=e193]:
              - button "Time range not set" [ref=e194] [cursor=pointer]:
                - generic [ref=e195]:
                  - img [ref=e196]
                  - text: Time range not set
              - button [ref=e198] [cursor=pointer]:
                - img [ref=e201]
              - button [ref=e203] [cursor=pointer]:
                - img [ref=e206]
              - button [ref=e209] [cursor=pointer]:
                - img [ref=e212]
              - button [ref=e215] [cursor=pointer]:
                - img [ref=e218]
              - button [disabled] [ref=e221] [cursor=pointer]:
                - img [ref=e224]
            - button [active] [ref=e231] [cursor=pointer]:
              - img [ref=e233]
        - generic [ref=e237]:
          - generic [ref=e238]:
            - generic [ref=e241]: Console
            - generic [ref=e244]:
              - button "Open shell" [ref=e247] [cursor=pointer]:
                - generic [ref=e249]:
                  - img [ref=e250]
                  - img [ref=e252]
              - button "Clear" [ref=e254] [cursor=pointer]:
                - img [ref=e257]
              - button [ref=e261] [cursor=pointer]:
                - img [ref=e263]
          - generic [ref=e268]:
            - generic [ref=e269]: 2026-04-10 17:42:27.286
            - generic [ref=e270]: Connection established
  - dialog [ref=e278]:
    - generic [ref=e279]:
      - generic [ref=e280]:
        - img [ref=e281]
        - text: New Chart
      - button "Close modal" [ref=e283] [cursor=pointer]:
        - img [ref=e284]
    - generic [ref=e286]:
      - generic [ref=e287]:
        - generic [ref=e288]: Chart
        - generic [ref=e289]:
          - button "Zone Chart" [ref=e290] [cursor=pointer]:
            - img "Zone Chart" [ref=e292]
          - button "Scatter Chart" [ref=e293] [cursor=pointer]:
            - img "Scatter Chart" [ref=e295]
          - button "Line Chart" [ref=e296] [cursor=pointer]:
            - img "Line Chart" [ref=e298]
      - generic [ref=e300]:
        - generic [ref=e301]: Table
        - button "TAG" [ref=e303] [cursor=pointer]:
          - generic [ref=e304]: TAG
          - img [ref=e305]
      - generic [ref=e309]:
        - generic [ref=e310]: Tag (48)
        - generic [ref=e311]:
          - textbox "Tag (48)" [ref=e312]
          - button "Search tags" [ref=e314] [cursor=pointer]:
            - img [ref=e316]
      - generic [ref=e319]:
        - generic [ref=e321]:
          - generic [ref=e323]:
            - button "TAG-Barn [kW]" [ref=e324] [cursor=pointer]:
              - generic [ref=e325]: TAG-Barn [kW]
            - button "TAG-Dishwasher [kW]" [ref=e326] [cursor=pointer]:
              - generic [ref=e327]: TAG-Dishwasher [kW]
            - button "TAG-Fridge [kW]" [ref=e328] [cursor=pointer]:
              - generic [ref=e329]: TAG-Fridge [kW]
            - button "TAG-Furnace 1 [kW]" [ref=e330] [cursor=pointer]:
              - generic [ref=e331]: TAG-Furnace 1 [kW]
            - button "TAG-Furnace 2 [kW]" [ref=e332] [cursor=pointer]:
              - generic [ref=e333]: TAG-Furnace 2 [kW]
            - button "TAG-Garage door [kW]" [ref=e334] [cursor=pointer]:
              - generic [ref=e335]: TAG-Garage door [kW]
            - button "TAG-Home office [kW]" [ref=e336] [cursor=pointer]:
              - generic [ref=e337]: TAG-Home office [kW]
            - button "TAG-House overall [kW]" [ref=e338] [cursor=pointer]:
              - generic [ref=e339]: TAG-House overall [kW]
            - button "TAG-Kitchen 12 [kW]" [ref=e340] [cursor=pointer]:
              - generic [ref=e341]: TAG-Kitchen 12 [kW]
            - button "TAG-Kitchen 14 [kW]" [ref=e342] [cursor=pointer]:
              - generic [ref=e343]: TAG-Kitchen 14 [kW]
          - generic [ref=e344]:
            - button "First page" [disabled] [ref=e345] [cursor=pointer]:
              - img [ref=e347]
            - button "Previous page" [disabled] [ref=e351] [cursor=pointer]:
              - img [ref=e353]
            - textbox "Current page number" [ref=e359]:
              - /placeholder: Page
              - text: "1"
            - button "Next page" [ref=e360] [cursor=pointer]:
              - img [ref=e362]
            - button "Last page" [ref=e365] [cursor=pointer]:
              - img [ref=e367]
        - generic [ref=e371]:
          - generic [ref=e373]: no-data
          - generic [ref=e374]: "Select: 0 / 12"
    - generic [ref=e375]:
      - button "Apply" [ref=e376] [cursor=pointer]:
        - generic [ref=e377]: Apply
      - button "Cancel" [ref=e378] [cursor=pointer]:
        - generic [ref=e379]: Cancel
```

# Test source

```ts
  1  | import { test, expect } from '@playwright/test';
  2  | 
  3  | test('test', async ({ page }) => {
  4  |   await page.goto('http://127.0.0.1:7777/web/ui/login');
  5  |   await page.getByRole('textbox', { name: 'User' }).click();
  6  |   await page.getByRole('textbox', { name: 'User' }).fill('sys');
  7  |   await page.getByRole('textbox', { name: 'User' }).press('Tab');
  8  |   await page.getByRole('textbox', { name: 'Password' }).fill('Manager');
  9  |   await page.getByRole('textbox', { name: 'Password' }).press('Enter');
  10 | 
  11 |   await page.locator('div').filter({ hasText: /^TAG ANALYZER$/ }).nth(1).click();
  12 |   await page.locator('._button_uwue7_10._button--secondary_uwue7_357').click();
> 13 |   await page.getByRole('button', { name: 'dew_point' }).click();
     |                                                         ^ Error: locator.click: Test timeout of 30000ms exceeded.
  14 |   await page.getByRole('button', { name: 'Apply' }).click();
  15 |   await expect(page.locator('canvas')).toBeVisible();
  16 |   await expect(page.getByText('New chart2024-03-01 10:33:20')).toBeVisible();
  17 |   await expect(page.locator('div').filter({ hasText: /^Time range not set$/ }).first()).toBeVisible();
  18 |   await expect(page.locator('._button_uwue7_10._button--secondary_uwue7_357._button--md_uwue7_440._button--full-width_uwue7_471')).toBeVisible();
  19 |   await page.locator('._button_uwue7_10._button--secondary_uwue7_357').first().click();
  20 |   await page.locator('._button_uwue7_10._button--secondary_uwue7_357').first().click();
  21 |   await page.locator('canvas').click({
  22 |     position: {
  23 |       x: 555,
  24 |       y: 136
  25 |     }
  26 |   });
  27 |   await expect(page.locator('#root')).toMatchAriaSnapshot(`- text: "/\\\\d+-\\\\d+-\\\\d+ \\\\d+:\\\\d+:\\\\d+ ~ \\\\d+-\\\\d+-\\\\d+ \\\\d+:\\\\d+:\\\\d+ \\\\( interval : 5min \\\\)/"`);
  28 |   await page.locator('.chart > button:nth-child(3)').click();
  29 |   await page.locator('.chart > button:nth-child(3)').click();
  30 |   await expect(page.locator('#root')).toMatchAriaSnapshot(`- text: "/\\\\d+-\\\\d+-\\\\d+ \\\\d+:\\\\d+:\\\\d+ ~ \\\\d+-\\\\d+-\\\\d+ \\\\d+:\\\\d+:\\\\d+ \\\\( interval : 5min \\\\)/"`);
  31 | });
```