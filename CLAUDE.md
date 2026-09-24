# Working in this repo

This repo holds JPS Digital Pages products sold on Etsy: single-file HTML apps
(see `monthly-plan/`), plus everything needed to list them.

## Use the project skills without being asked

Load the matching skill before starting, whenever the task fits it — the user
does not need to name the skill:

- **Listing images, mockups, product photos, carousel slides, "Etsy images"**
  for any product → `html-mockup-decks` (for an HTML app, its Family C
  pipeline in `.claude/skills/html-mockup-decks/family-c/`).
- **A free demo, trial, lite, sample or try-before-you-buy version** of a
  product → `html-app-demo`. Never use it on the paid product itself.

## House rules

- Generate demos from the paid file with `make_demo.py`; never hand-edit a demo.
- Verify in a real browser (Playwright) before calling anything done. Seed test
  data through the app's UI or its `validate()`, not hand-written state objects.
- Never deploy the repo root anywhere public: it contains the paid apps.
- Keep the user's preference: straight to the point, and give a contrasting
  view only when a real one exists.
