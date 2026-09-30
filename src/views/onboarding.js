/**
 * views/onboarding.js — three short screens, no account, no friction.
 */
import { h, fill } from '../util.js';
import { icon } from '../icons.js';
import { button, sheet } from '../ui.js';
import { setSetting } from '../settings.js';

const SCREENS = [
  { icon: 'recipes', heading: 'Save recipes without the copy-and-paste work.', text: 'Collect the recipes you love from around the web into one calm, searchable library.' },
  { icon: 'link', heading: 'Paste a recipe link and we’ll organize it for you.', text: 'We pull out the ingredients and steps, you review them, and save. That’s it.' },
  { icon: 'shield', heading: 'Your recipes stay in your personal library on this device.', text: 'No account. Works offline once installed. Back up to a file whenever you like.' },
];

export function showOnboarding() {
  return new Promise((resolve) => {
    let i = 0;
    const body = h('div', { class: 'onboarding-body' });
    const dots = h('div', { class: 'onboarding-dots', 'aria-hidden': 'true' });
    const backBtn = button({ label: 'Back', variant: 'ghost', onClick: () => { i = Math.max(0, i - 1); paint(); } });
    const nextBtn = button({ label: 'Next', variant: 'primary', className: 'btn-lg', onClick: () => { if (i === SCREENS.length - 1) done(); else { i++; paint(); } } });
    const skipBtn = button({ label: 'Skip', variant: 'ghost', onClick: () => done() });

    async function done() {
      await setSetting('onboarded', true);
      s.close(true);
    }

    function paint() {
      const sc = SCREENS[i];
      fill(body, 
        h('div', { class: 'onboarding-icon' }, icon(sc.icon, { size: 40 })),
        h('p', { class: 'onboarding-step' }, `${i + 1} of ${SCREENS.length}`),
        h('h3', { class: 'onboarding-heading', 'aria-live': 'polite' }, sc.heading),
        h('p', { class: 'onboarding-text' }, sc.text));
      fill(dots, ...SCREENS.map((_, k) => h('span', { class: `dot${k === i ? ' is-on' : ''}` })));
      backBtn.hidden = i === 0;
      skipBtn.hidden = i === SCREENS.length - 1;
      fill(nextBtn, h('span', { class: 'btn-label' }, i === SCREENS.length - 1 ? 'Start My Recipe Library' : 'Next'));
    }

    const s = sheet({
      title: 'Welcome to Recipe Library Studio', size: 'md', dismissible: false, className: 'onboarding',
      content: h('div', { class: 'stack-lg' }, body, dots),
      footer: [backBtn, skipBtn, nextBtn],
    });
    paint();
    s.closed.then(resolve);
  });
}
