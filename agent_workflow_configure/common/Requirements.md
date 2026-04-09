# Requirements

These rules apply to shared documentation and code produced through this workflow.

## Code Standards

- Prefer clean, explicit, testable code over clever code.
- Prefer declarative and functional boundaries when the cost is reasonable and the result improves clarity or testability.
- Do not push dogmatic rewrites that create large churn for small gain.
- Avoid low-impact cosmetic edits unless they directly support an approved change.
- Keep names concrete and descriptive.
- Write comments mainly for reasons, constraints, or non-obvious tradeoffs.
- Keep side effects close to boundaries and keep core logic easy to test.
- Do not widen scope during implementation without routing the change back through Planning/Review.

## Markdown Writing Standards

- Use short headings and direct language.
- Separate facts, decisions, open questions, and future ideas.
- Write exact file paths or clear path targets when naming code locations.
- Use explicit statuses such as `proposed`, `approved`, `rejected`, `blocked`, or `done`.
- Keep each work item small enough that another team can execute it without guessing.
- Mark assumptions clearly instead of hiding them inside recommendations.

## Required Content For Non-Trivial Work Items

Each non-trivial item should include:

- an ID or stable label
- the owning team
- the current status
- the target files or modules
- the required outcome
- acceptance or verification notes

## Decision Note Standard

If a change or recommendation is not obvious, the owning team should record:

- the reason for the change
- the alternative that was considered and rejected

If the choice is obvious and low-risk, that note can be skipped.
