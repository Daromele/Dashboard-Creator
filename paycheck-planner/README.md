# Paycheck to Paycheck Planner (v2, engine edition)

Built on the same engine as Money Autopilot, so both apps share one look, one Settings & backup
page, sample mode, Quick log, tables and themes.

- `engine/MoneyAutopilot.html`: the engine (Money Autopilot's built file). Replace it to pick up engine updates.
- `pack.js`: this edition's product, nav, labels, welcome tour, guide and sample household.
- `payday.js`: the Today and Until payday screens, setup, balance, cushion and "Can I afford this?".
- `payday.css`: the few styles the engine's kit doesn't have.

Build: `python3 paycheck-planner/build.py` writes `PaycheckToPaycheckPlanner.html` at the repo root.

Data: pay and bills are the engine's repeat schedules; spending is its transactions;
`state.payday = {balance, buffer, asOf, excl}` holds the balance the buyer typed.
Storage key `jps-paycheck-planner` (v1's `payday-plan-v3` data is not carried over).
