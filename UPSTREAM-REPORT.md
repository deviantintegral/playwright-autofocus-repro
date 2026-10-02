# Draft upstream report

**Title:** WebKit `locator.fill()` can put text in the wrong input after native autofocus

**Playwright:** 1.63.0

**Browser:** bundled WebKit 26.6 (build 2359)

**Environment used to reproduce:** Debian GNU/Linux 13 (trixie), x86_64, headless

**Node.js:** 24.21.0

## Reproduce

```sh
npm ci
npx playwright install webkit
REPEATS=2000 npm test -- --grep 'native autofocus'
```

The test starts a local HTTP server, serves a plain HTML form with native `autofocus` on Username, and repeatedly runs:

```js
await page.goto(url);
await page.getByLabel('Username').fill('alice');
await page.getByLabel('Password').fill('secret');
```

There are no framework scripts, external resources, or form event listeners on this route. The test checks both input values after each fill. `REPEATS` controls the number of attempts because the failure is intermittent.

## Expected

Username is `alice` and Password is `secret` after each navigation.

## Actual

In one validation run, the native test failed on attempt 226 of 300. At `page.goto()` completion, the page's focus event log contained `load` but no Username focus event, and no input was focused. After the two `fill()` calls, Username was `secretalice` and Password was empty. A separate 1,000 navigation run passed, showing the timing dependence. The `controlled focus change` test in the same repo reproduces the wrong-field insertion deterministically by moving focus during Password's `focus` event; it isolates the mechanism and is not intended to model the application's exact behavior.

This looks related to [microsoft/playwright#26349](https://github.com/microsoft/playwright/issues/26349), which reports password text landing in Username but was closed without a standalone reproduction.
