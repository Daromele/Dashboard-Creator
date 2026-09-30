import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const css = fs.readFileSync(new URL('../css/styles.css', import.meta.url), 'utf8');

function vars(block) {
  return Object.fromEntries([...block.matchAll(/--([\w-]+):\s*(#[0-9a-fA-F]{6})/g)].map((m) => [m[1], m[2]]));
}
const root = vars(css.match(/:root \{([\s\S]*?)\n\}/)[1]);
const themes = { mono: vars(css.match(/:root, \[data-theme='mono'\] \{([\s\S]*?)\n\}/)[1]) };
for (const t of ['sage', 'blush', 'cream', 'blue']) themes[t] = vars(css.match(new RegExp(`\\[data-theme='${t}'\\] \\{([\\s\\S]*?)\\n\\}`))[1]);

const lum = (hex) => {
  const c = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
};
const ratio = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };

for (const [name, t] of Object.entries(themes)) {
  test(`theme ${name}: text pairs meet WCAG AA (4.5:1)`, () => {
    const pairs = [
      ['text', 'bg'], ['text', 'surface'], ['text', 'surface-2'], ['text', 'accent-soft'],
      ['muted', 'bg'], ['muted', 'surface'], ['muted', 'surface-2'],
      ['accent-fg', 'accent'], ['accent-fg', 'accent-strong'], ['accent', 'surface'], ['accent', 'bg'],
    ];
    for (const [fg, bg] of pairs) {
      const r = ratio(t[fg], t[bg]);
      assert.ok(r >= 4.5, `${name}: ${fg} on ${bg} = ${r.toFixed(2)}`);
    }
  });
}
test('semantic colours are readable on light surfaces', () => {
  assert.ok(ratio(root.danger, '#ffffff') >= 4.5);
  assert.ok(ratio(root.danger, root['danger-soft']) >= 4.5);
  assert.ok(ratio(root['warn-text'], root['warn-soft']) >= 4.5);
  assert.ok(ratio(root.success, '#ffffff') >= 4.5);
});
test('Mono is the default theme and listed first', () => {
  const settings = fs.readFileSync(new URL('../src/settings.js', import.meta.url), 'utf8');
  assert.match(settings, /THEMES = \[\s*(\/\/[^\n]*\n\s*)?\{ id: 'mono'/);
  assert.match(settings, /theme: 'mono'/);
});
