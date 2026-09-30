/**
 * sample-data.js — fictional sample recipes for demos and development.
 * Written for this project (not copied from any website). Every sample recipe
 * carries `sample: true`, which the UI labels "Sample Recipe", and can be
 * removed in one click with "Clear Sample Data".
 */
import { createBlankRecipe, saveManyRecipes, allRecipes, deleteRecipes, getRecipe } from './recipes.js';
import { deleteImage } from './images.js';

const DAY = 86_400_000;

const SAMPLES = [
  {
    key: 'tomato-pasta',
    title: 'Sample: Weeknight Tomato Basil Pasta',
    description: 'A fictional pantry pasta with a quick garlicky tomato sauce.',
    servings: '4', prepTimeMinutes: 10, cookTimeMinutes: 20, totalTimeMinutes: 30,
    categories: ['Dinner'], cuisine: ['Italian'], tags: ['pasta', 'vegetarian', 'weeknight'],
    ingredients: ['12 oz spaghetti', '2 tablespoons olive oil', '3 cloves garlic, minced', '1 (14 oz) can crushed tomatoes', '1/2 teaspoon salt', '1/4 cup chopped fresh basil', 'Grated parmesan, to serve'],
    sections: [{ section: 'Main', steps: ['Bring a large pot of salted water to a boil and cook the spaghetti for 10 minutes until al dente.', 'Meanwhile, warm the olive oil in a wide pan over medium heat. Add the garlic and cook for 1 minute.', 'Add the tomatoes and salt. Simmer for 15 minutes, stirring now and then.', 'Drain the pasta, toss it with the sauce and basil, and serve with parmesan.'] }],
    favorite: true, rating: 4, made: 3,
  },
  {
    key: 'overnight-oats',
    title: 'Sample: Blueberry Overnight Oats',
    description: 'Make-ahead breakfast jars that are ready when you wake up.',
    servings: '2', prepTimeMinutes: 5, cookTimeMinutes: null, totalTimeMinutes: 485,
    categories: ['Breakfast'], cuisine: [], tags: ['make-ahead', 'no-cook'],
    ingredients: ['1 cup rolled oats', '1 cup milk of your choice', '1/2 cup plain yogurt', '2 tablespoons honey', '1 cup blueberries', 'Pinch of cinnamon'],
    sections: [{ section: 'Main', steps: ['Stir the oats, milk, yogurt, honey and cinnamon together in a bowl.', 'Divide between two jars and top with blueberries.', 'Cover and refrigerate overnight, or at least 8 hours.', 'Stir and enjoy cold, or warm in the microwave for 90 seconds.'] }],
    favorite: false, rating: 5, made: 1,
  },
  {
    key: 'chickpeas',
    title: 'Sample: Lemon Garlic Roasted Chickpeas',
    description: 'Crunchy, salty, and easy to make by the tray.',
    servings: '4 servings', prepTimeMinutes: 5, cookTimeMinutes: 30, totalTimeMinutes: 35,
    categories: ['Snacks'], cuisine: ['Mediterranean'], tags: ['snack', 'vegan', 'air fryer'],
    ingredients: ['2 (15 oz) cans chickpeas, drained and dried', '2 tablespoons olive oil', '1 teaspoon garlic powder', '1 lemon, zested', '3/4 teaspoon salt'],
    sections: [{ section: 'Main', steps: ['Heat the oven to 400°F (200°C).', 'Toss the chickpeas with olive oil, garlic powder and salt on a baking tray.', 'Roast for 30 minutes, shaking the tray halfway through, until crisp.', 'Toss with the lemon zest while warm.'] }],
    favorite: false, rating: null, made: 0,
  },
  {
    key: 'sheet-pan',
    title: 'Sample: Sheet-Pan Chicken and Vegetables',
    description: 'One tray, minimal cleanup, plenty of leftovers.',
    servings: '4', prepTimeMinutes: 15, cookTimeMinutes: 35, totalTimeMinutes: 50,
    categories: ['Dinner'], cuisine: ['American'], tags: ['one-pan', 'meal prep'],
    ingredients: ['1.5 lb boneless chicken thighs', '2 cups baby potatoes, halved', '2 carrots, sliced', '1 red onion, cut in wedges', '3 tablespoons olive oil', '1 teaspoon paprika', '1 teaspoon salt', '1/2 teaspoon black pepper'],
    sections: [{ section: 'Prep', steps: ['Heat the oven to 425°F (220°C) and line a large baking tray.', 'Toss the potatoes, carrots and onion with half of the oil, salt and pepper. Spread on the tray.'] }, { section: 'Bake', steps: ['Rub the chicken with the remaining oil and the paprika, then nestle it among the vegetables.', 'Roast for 35 minutes until the chicken reaches 165°F (74°C) and the potatoes are golden.', 'Rest for 5 minutes before serving.'] }],
    favorite: true, rating: 4, made: 2,
  },
  {
    key: 'oat-cookies',
    title: 'Sample: Banana Oat Cookies',
    description: 'Soft, lightly sweet cookies with just a few ingredients.',
    servings: '12 cookies', prepTimeMinutes: 10, cookTimeMinutes: 15, totalTimeMinutes: 25,
    categories: ['Desserts'], cuisine: [], tags: ['baking', 'kid-friendly'],
    ingredients: ['2 ripe bananas, mashed', '1 1/2 cups rolled oats', '1/3 cup dark chocolate chips', '1/2 teaspoon vanilla extract', '1/4 teaspoon cinnamon'],
    sections: [{ section: 'Main', steps: ['Heat the oven to 350°F (175°C) and line a tray with parchment.', 'Mix all ingredients until evenly combined and let the batter sit for 5 minutes.', 'Drop 12 spoonfuls onto the tray and flatten slightly.', 'Bake for 15 minutes until golden at the edges. Cool on the tray for 10 minutes.'] }],
    favorite: false, rating: 3, made: 1,
  },
  {
    key: 'tomato-rice',
    title: 'Sample: Smoky Tomato Rice',
    description: 'A fictional one-pot tomato rice with warm spices.',
    servings: '6', prepTimeMinutes: 15, cookTimeMinutes: 40, totalTimeMinutes: 55,
    categories: ['Dinner'], cuisine: ['West African'], tags: ['one-pot', 'vegetarian', 'party'],
    ingredients: ['2 cups long-grain rice, rinsed', '3 tablespoons vegetable oil', '1 large onion, diced', '1 (14 oz) can chopped tomatoes', '2 tablespoons tomato paste', '1 teaspoon smoked paprika', '1 teaspoon curry powder', '2 1/2 cups vegetable broth', 'Salt to taste'],
    sections: [{ section: 'Sauce', steps: ['Warm the oil in a heavy pot and cook the onion for 8 minutes until soft.', 'Stir in the tomato paste, paprika and curry powder and fry for 3 minutes.', 'Add the chopped tomatoes and simmer for 10 minutes until thick.'] }, { section: 'Rice', steps: ['Add the rice and broth and stir once. Season with salt.', 'Cover tightly and cook on the lowest heat for 25 minutes.', 'Rest covered for 10 minutes, then fluff with a fork.'] }],
    favorite: false, rating: null, made: 0,
  },
];

export const SAMPLE_COUNT = SAMPLES.length;

export function sampleRecipesLoaded() { return allRecipes().filter((r) => r.sample).length; }

/** Adds the sample recipes (idempotent: existing samples are left alone). */
export async function loadSampleData() {
  const now = Date.now();
  const toAdd = SAMPLES.filter((s) => !getRecipe(`sample-${s.key}`)).map((s, i) => createBlankRecipe({
    id: `sample-${s.key}`,
    title: s.title,
    description: s.description,
    servings: s.servings,
    prepTimeMinutes: s.prepTimeMinutes,
    cookTimeMinutes: s.cookTimeMinutes,
    totalTimeMinutes: s.totalTimeMinutes,
    categories: s.categories,
    cuisine: s.cuisine,
    tags: s.tags,
    ingredients: s.ingredients,
    instructionSections: s.sections,
    favorite: s.favorite,
    personalRating: s.rating,
    madeCount: s.made,
    lastMade: s.made ? new Date(now - (i + 2) * 3 * DAY).toISOString() : null,
    createdAt: new Date(now - i * DAY).toISOString(),
    updatedAt: new Date(now - i * DAY).toISOString(),
    sample: true,
    basedOn: null,
  }));
  if (toAdd.length) await saveManyRecipes(toAdd, { touch: false });
  return toAdd.length;
}

/** Removes every recipe flagged as a sample (and their photos, if any). */
export async function clearSampleData() {
  const ids = allRecipes().filter((r) => r.sample).map((r) => r.id);
  await deleteRecipes(ids, { imageCleanup: deleteImage });
  return ids.length;
}
