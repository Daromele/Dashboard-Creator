// Stages the app for the listing screenshots from a real backup (window.__BACKUP, loaded from userdata.js,
// which is kept out of git). Tidies imported category names the way a user would in Categories & tags,
// adds believable cooking history, collections and a planned week, then opens the dashboard.
window.__stage = async () => {
  document.querySelector('#welcome')?.close?.();
  localStorage.setItem(CONFIG.storageKey + '-welcome-v1', '1');
  localStorage.setItem(CONFIG.storageKey + '-manual-backup', String(Date.now()));
  const s = Logic.validate(window.__BACKUP.data);
  const CAT = { 'main course': 'Dinner', 'main dish': 'Dinner', main: 'Dinner', mains: 'Dinner', entree: 'Dinner', meal: 'Dinner', dinner: 'Dinner',
    dessert: 'Dessert', desserts: 'Dessert', cookies: 'Dessert', snack: 'Snacks', snacks: 'Snacks', appetizer: 'Snacks', soup: 'Soup',
    lunch: 'Lunch', 'side dish': 'Side dish', brunch: 'Breakfast', breakfast: 'Breakfast', salad: 'Salad' };
  const TAGS = new Set(['dairy-free', 'gluten-free', 'one-pot-meals']);
  s.recipes.forEach(r => {
    const t = r.categories.filter(c => TAGS.has(c.toLowerCase()));
    r.tags = [...new Set([...r.tags, ...t.map(x => x.replace(/-/g, ' '))])];
    r.categories = [...new Set(r.categories.filter(c => !TAGS.has(c.toLowerCase())).map(c => CAT[c.toLowerCase()] || c))];
  });
  const day = n => addDays(today(), -n);
  s.recipes.forEach((r, i) => {
    if (i % 4 === 0 || r.favorite) {
      const k = 1 + (i * 7) % 5;
      r.made = [...new Set([...r.made, ...Array.from({ length: k }, (_, j) => day(3 + j * 9 + (i % 6)))])].sort();
      if (!r.rating) r.rating = 4 + (i % 2);
    }
  });
  const notes = ['Added extra garlic and a squeeze of lemon. Make it like this again.', 'Kids asked for seconds. Doubled the sauce next time.', 'Used chicken thighs instead; 5 more minutes in the oven.'];
  s.recipes.filter(r => r.made.length >= 3).slice(0, 3).forEach((r, i) => { r.cooklog = [{ date: r.made.at(-1), note: notes[i] }, { date: r.made.at(-2), note: 'Halved the chili for the kids.' }]; });
  s.collections = [{ id: 'c1', name: 'Weeknight dinners' }, { id: 'c2', name: 'Sweet treats' }, { id: 'c3', name: 'Soups & comfort' }];
  s.recipes.forEach(r => {
    const c = r.categories.join(' ');
    if (/Dinner/.test(c) && (r.total || 99) <= 40) r.collections.push('c1');
    if (/Dessert/.test(c)) r.collections.push('c2');
    if (/Soup/.test(c) || /soup|stew|chili/i.test(r.title)) r.collections.push('c3');
    r.collections = [...new Set(r.collections)];
  });
  state = s;
  const w = Logic.weekStart(today());
  s.plans = Logic.suggestWeek(s, w);
  const brk = s.recipes.find(r => r.categories.includes('Breakfast'));
  if (brk) s.plans.push({ id: uid(), date: addDays(w, 5), slot: 'Breakfast', recipeId: brk.id, servings: '' });
  const lun = s.recipes.find(r => r.categories.includes('Soup'));
  if (lun) s.plans.push({ id: uid(), date: addDays(w, 2), slot: 'Lunch', recipeId: lun.id, servings: '4' });
  const st = document.createElement('style'); st.textContent = '.banner,#toast{display:none!important}'; document.head.appendChild(st);
  lib.view = 'grid'; save(); go('dashboard');
};
// handy finders for the capture config
window.__pick = re => (state.recipes.find(r => re.test(r.title)) || state.recipes[0]).id;
