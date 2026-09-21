/* 9:16 for TikTok / YouTube Shorts.
 * The app runs inside the stage wrapper so it lays out as a phone and fills
 * the frame; captions live in the rail at the top, clear of both platforms'
 * UI (bottom ~20% caption/username, right ~15% action buttons).
 */
const cap = (page, text) => page.evaluate(t => window.setCaption(t), text);

module.exports = {
  url: 'file:///tmp/claude-0/-home-user-Dashboard-Creator/6cceb8b4-651c-5f7f-a0ac-893ec1858e1c/scratchpad/stage/vertical.html',
  frame: '#app',                                  // the app lives in this iframe
  size: { width: 1080, height: 1920 },
  out: './vertical',
  settle: 1800,
  cursorStart: { x: 300, y: 1750 },

  prepare: async (app, page) => {
    await app.evaluate(() => {
      loadDemo(); closeTour(); hideToast();
      linked.state = 'linked'; linked.name = 'my-plan.json'; linked.lastSaved = Date.now();
      /* the app's own insight strip competes with the caption rail */
      const s = document.createElement('style');
      s.textContent = '.banner{display:none!important}';
      document.head.appendChild(s);
      tab = 'today'; render();
    });
    await cap(page, 'What can I actually spend today?');
  },

  scenes: [
    { hold: 1800, note: 'the promise' },

    { run: (a, p) => cap(p, 'Log it in three words'), hold: 600 },
    { moveTo: '#qa-input', click: true },
    { type: { selector: '#qa-input', text: 'coffee 4.50', cps: 13 } },
    { hold: 450 },
    { moveTo: '#qa-go', click: true, hold: 1800, note: 'the number moves' },

    { run: (a, p) => cap(p, 'Can I afford this?'), hold: 700 },
    { moveTo: '[data-sheet=afford]', click: true, hold: 900 },
    { type: { selector: '#sheet input[name=amount]', text: '640', cps: 8 } },
    { hold: 450 },
    { moveTo: '#sheet button[type=submit]', click: true, hold: 2400, note: 'verdict' },
    { run: async (a) => { await a.evaluate(() => closeSheet()); }, hold: 500 },

    { run: async (a, p) => { await cap(p, 'Your next 90 days');
        await a.evaluate(() => { tab = 'outlook'; render(); }); }, hold: 2500 },

    { run: async (a, p) => { await cap(p, 'Where it actually went');
        await a.evaluate(() => { tab = 'insights'; render(); }); }, hold: 2500 },

    { run: async (a, p) => { await cap(p, 'One file. Yours forever.');
        await a.evaluate(() => { tab = 'today'; render(); }); }, hold: 2400 }
  ]
};
