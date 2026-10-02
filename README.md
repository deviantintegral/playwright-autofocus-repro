# Playwright focus change during `locator.fill()`

This standalone repro isolates a login flake in Playwright 1.63.0. The original page has a Username input with native HTML `autofocus`. In WebKit, focus can arrive after `page.goto()` resolves at the `load` event. If it arrives while Playwright fills Password, the password can land in Username instead.

The two tests serve one HTML page from a local Node HTTP server:

- **Native autofocus** repeats navigation and field filling, reports how often autofocus was delayed, and fails if text goes into the wrong field. The full failure is timing dependent.
- **Controlled focus change** uses a `focus` listener to move focus to Username between Playwright's focus and text input phases. It fails consistently and demonstrates the mechanism; the listener is an artificial stand-in for delayed autofocus.

## Run

```sh
npm ci
npx playwright install webkit
npm test
```

On a Linux machine without browser libraries, install them with `npx playwright install --with-deps webkit` instead. A failing test is the expected reproduction result; Playwright saves a trace under `test-results/`.

For a longer native stress run:

```sh
REPEATS=2000 npm test -- --grep 'native autofocus'
```

The native test uses only HTML autofocus. The controlled test intentionally changes focus, so it should be described as a mechanism repro when reporting upstream, not as proof that WebKit autofocus always does so. Related report: [microsoft/playwright#26349](https://github.com/microsoft/playwright/issues/26349).

One earlier WebKit run failed on native attempt 226 of 300: Username became `secretalice` and Password remained empty after the two `fill()` calls. Another 1,000 navigation run passed, showing the timing dependence.

[`UPSTREAM-REPORT.md`](UPSTREAM-REPORT.md) is a draft issue body with the observed result and environment.
