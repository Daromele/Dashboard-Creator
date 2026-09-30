/**
 * state.js — small in-memory UI state shared between views (never persisted).
 * Survives in-app navigation, resets on reload.
 */
export const session = {
  /** Draft waiting in the Import Preview / Paste review screen. */
  importDraft: null,
  /** { mode: 'import'|'paste', imagePromise, replaceId, sourceResult } */
  importMeta: null,
  /** Library filter state, kept so "back" returns to the same list. */
  library: { text: '', quick: 'all', category: '', cuisine: '', collection: '', tag: '', sort: 'recent' },
  /** Ingredient checklist state per recipe (Set of ingredient indexes). */
  checked: new Map(),
  /** Chosen servings per recipe (number) for this session. */
  servings: new Map(),
  /** Chosen unit system for this session (null -> use the default setting). */
  unitSystem: null,
  /** Where "Back" should go from a recipe. */
  lastListHash: '#/recipes',
};

export function checkedSet(recipeId) {
  if (!session.checked.has(recipeId)) session.checked.set(recipeId, new Set());
  return session.checked.get(recipeId);
}
