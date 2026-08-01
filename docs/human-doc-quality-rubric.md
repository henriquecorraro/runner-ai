# Human Doc Quality Rubric

Use this rubric during ecosystem bootstrap when a repository already has, or is expected to have, human-facing documentation about modules, business rules, contracts, or architecture.

The goal is not to judge prose style. The goal is to measure whether a human can understand the repository well enough to change it safely.

Human documentation belongs in the corresponding repository. The ecosystem runner only stores the baseline assessment and the tasks that request doc work.

## Scoring Model

Score each dimension from `0` to `2`.

- `0`: missing or unusable
- `1`: partial, shallow, outdated-looking, or hard to navigate
- `2`: clear, actionable, and aligned with the repository structure

Maximum score: `10`.

## Dimensions

### 1. Orientation And Entry Point

Check whether the repository has an obvious human-doc entry point that explains:

- what the project is
- where the human docs live
- how to start reading them

Examples:

- the main `README.md` links to the human-doc area
- the docs index explains where to start
- the docs folder provides a recommended reading order

### 2. Architecture And Boundaries

Check whether the docs explain the main building blocks and boundaries:

- modules, domains, or features
- runtime flow
- integration boundaries
- important cross-cutting rules

The reader should understand how the codebase is divided before reading individual modules.

### 3. Coverage Of Main Modules Or Features

Check whether the main business areas have dedicated docs and whether those docs are discoverable from an index.

Good signs:

- one doc per module or feature
- links gathered in a README or index
- naming that matches the codebase

Weak signs:

- only a single generic README
- major modules exist in code but not in docs

### 4. Business Rules And Behavioral Detail

Check whether the docs go beyond file locations and explain behavior such as:

- business rules
- user flows
- routes or service endpoints
- persistence or data ownership rules
- validation constraints
- important edge cases

This is the most important dimension. A human doc without behavioral detail is usually not enough.

### 5. Maintenance Signals

Check whether the docs make it clear how to keep them useful over time:

- update rules
- when to create a new doc vs update an existing one
- validation or operational notes
- links between doc structure and implementation responsibilities

## Interpretation

- `8-10`: good baseline
- `5-7`: usable but incomplete
- `0-4`: insufficient baseline

Apply these extra gates:

- If dimension `4` scores `0`, treat the repository as below baseline even if the total is higher.
- If both dimensions `2` and `3` are `0`, treat the repository as below baseline even if there is a README.

## Bootstrap Output Contract

When this rubric is used during `workspace-bootstrap`, the result should include:

- one scorecard per repository
- the evidence files used
- a short list of missing areas
- a recommendation:
  - `docs-ready`
  - `docs-partial`
  - `docs-gap`

If one or more repositories are `docs-gap` or materially `docs-partial`, do not create tasks automatically.

Instead, suggest a next-step option to create an initial ecosystem task dedicated to improving the human docs in the affected repositories.
