const http = require('node:http');
const { test, expect } = require('@playwright/test');

// A normal login form. There are no frameworks, assets, or external services.
const html = `<!doctype html>
<html lang="en">
<meta charset="utf-8">
<title>Autofocus login repro</title>
<script>
  window.focusEvents = [];
  addEventListener('load', () => window.focusEvents.push('load'));
  addEventListener('focusin', event => window.focusEvents.push(event.target.id), true);
</script>
<label>Username <input id="username" autocomplete="username" autofocus></label>
<label>Password <input id="password" type="password" autocomplete="current-password"></label>
<script>
  if (location.pathname === '/controlled') {
    // Model a late autofocus event exactly between Playwright's focus and
    // keyboard input phases. This makes the wrong-field behavior repeatable.
    const usernameInput = document.getElementById('username');
    const passwordInput = document.getElementById('password');
    passwordInput.addEventListener('focus', () => queueMicrotask(() => usernameInput.focus()), { once: true });
  }
</script>
</html>`;

let server;
let baseURL;

test.beforeAll(async () => {
  server = http.createServer((_request, response) => {
    response.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
    response.end(html);
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  baseURL = `http://127.0.0.1:${server.address().port}`;
});

test.afterAll(async () => {
  await new Promise(resolve => server.close(resolve));
});

test('native autofocus with repeated navigations', async ({ page }) => {
  const repeats = Number(process.env.REPEATS || 300);
  test.setTimeout(Math.max(120_000, repeats * 500));
  let autofocusAfterLoad = 0;
  let unfocusedAtGoto = 0;

  for (let attempt = 1; attempt <= repeats; attempt++) {
    await page.goto(`${baseURL}/native`);
    const { active, events } = await page.evaluate(() => ({
      active: document.activeElement.id,
      events: window.focusEvents,
    }));
    if (events.indexOf('username') > events.indexOf('load')) autofocusAfterLoad++;
    if (active !== 'username') unfocusedAtGoto++;

    await page.getByLabel('Username').fill('alice');
    await page.getByLabel('Password').fill('secret');
    const state = await page.evaluate(() => ({
      username: document.querySelector('#username').value,
      password: document.querySelector('#password').value,
      active: document.activeElement.id,
      events: window.focusEvents,
    }));
    if (state.username !== 'alice' || state.password !== 'secret') {
      throw new Error(`Wrong-field fill on attempt ${attempt}: ${JSON.stringify({
        beforeFill: { active, events },
        afterFill: state,
      })}`);
    }
    if (attempt % 100 === 0) console.log(`Completed ${attempt}/${repeats} navigations`);
  }

  console.log(`Completed ${repeats} navigations; autofocus after load: ${autofocusAfterLoad}; not focused when goto returned: ${unfocusedAtGoto}`);
});

test('controlled focus change exposes wrong-field fill', async ({ page }) => {
  await page.goto(`${baseURL}/controlled`);
  await page.getByLabel('Username').fill('alice');
  await page.getByLabel('Password').fill('secret');
  await expect(page.getByLabel('Username')).toHaveValue('alice');
  await expect(page.getByLabel('Password')).toHaveValue('secret');
});
