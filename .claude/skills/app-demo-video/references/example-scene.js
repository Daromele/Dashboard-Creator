/* A worked scene file, from a real single-file budgeting app.
 *
 * Copy this next to your project, change the selectors, and delete the
 * beats that do not apply. The shape is more useful than the specifics:
 * stage the app, rest on the promise, interact, show the differentiator,
 * end on a payoff.
 */
module.exports = {
  url: 'file:///abs/path/to/app.html',
  size: { width: 1080, height: 1080 },
  out: './video',
  settle: 1400,

  prepare: async (page) => {
    await page.evaluate(() => {
      loadDemo();                 // sample data — never record an empty app
      closeTour();                // onboarding modal
      hideToast();

      // Stage away anything that nags. A promo should show the app as it
      // looks once someone has settled in, not on day one.
      linked.state = 'linked';
      linked.name  = 'my-plan.json';
      linked.lastSaved = Date.now();

      tab = 'today';
      render();
    });
  },

  scenes: [
    { note: 'the promise, held',        hold: 1200 },

    { note: 'log something real',       moveTo: '#qa-input', click: true },
    { type: { selector: '#qa-input', text: 'coffee 4.50', cps: 15 } },
    { hold: 450 },
    { moveTo: '#qa-go', click: true,    hold: 1500, note: 'headline number counts down' },

    { note: 'the differentiator',       moveTo: '[data-sheet=afford]', click: true, hold: 900 },
    { type: { selector: '#sheet input[name=amount]', text: '640', cps: 9 } },
    { hold: 500 },
    { moveTo: '#sheet button[type=submit]', click: true, hold: 2000, note: 'verdict' },
    { run: async p => { await p.click('#sheet [data-close]'); } },
    { hold: 500 },

    { note: 'a chart drawing itself',   moveTo: '[data-go=outlook]', click: true, hold: 2200 },
    { note: 'and the breakdown',        moveTo: '[data-go=insights]', click: true, hold: 2300 },
    { note: 'back to the promise',      moveTo: '[data-go=today]',    click: true, hold: 1500 }
  ]
};
