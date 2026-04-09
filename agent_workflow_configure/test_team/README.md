# Test Team

Read this file first.
It is the single team guide for the Test team.

## Purpose

This team turns the approved Planning/Review contract into enforceable checks.
It writes the first required tests, then comes back later to add stronger edge cases, regression cases, and break tests.

## Workflow Position

This team starts after Planning/Review publishes the approved contract.
It first creates the required proof of behavior, then returns after implementation to harden the work with break tests and edge cases.

## Folder Structure

- `README.md`: the one team guide this team should read first
- `CommonAgent_Rule.md`: rules shared by every Test agent
- `TestLead_Rule.md`: lead owner of the official test handoff
- `UnitTestAuthor_Rule.md`: focused unit-test authoring
- `IntegrationTestAuthor_Rule.md`: cross-boundary behavior testing
- `EdgeCaseTester_Rule.md`: empty, invalid, and boundary-case testing
- `RegressionTester_Rule.md`: regression protection for fixed behavior
- `FailureModeTester_Rule.md`: error-path and degraded-state testing

## What This Team Produces

This team should update the project-local test planning files in `agent_local/`.
Its output should define required tests, harder second-pass tests, and documented test gaps or risks.

## Required Local Files

- `agent_local/TestPlan.md`: the primary required test plan for the approved contract
- `agent_local/BreakTests.md`: second-pass break tests, edge cases, and harder regression pressure
- `agent_local/ReportToUser.md`: short user-facing summary when testing reveals important scope or quality information

If a project uses different local filenames, the same responsibilities should still be mapped clearly before work starts.

## Required Read Order

1. `agent_workflow_configure/common/README.md`
2. `agent_workflow_configure/common/WorkflowOverview.md`
3. `agent_workflow_configure/common/Requirements.md`
4. `agent_workflow_configure/planning_review_team/README.md`
5. this `README.md`
6. the current agent's assigned `*_Rule.md` file

## Team Rules

- test behavior rather than implementation structure
- cover success, failure, and edge cases where relevant
- do not silently encode ambiguous behavior
- make failing tests easy to understand and act on
- keep first-pass required tests separate from second-pass break pressure

## Coverage Standard

The first test pass should prove:

- core happy-path behavior
- required failure behavior
- contract-important edge cases

The second test pass should challenge:

- hidden assumptions in the implementation
- fragile or recently fixed behavior
- empty, malformed, or unusual inputs that still matter to the approved contract

## Rule Files In This Folder

- `CommonAgent_Rule.md`
- `TestLead_Rule.md`
- `UnitTestAuthor_Rule.md`
- `IntegrationTestAuthor_Rule.md`
- `EdgeCaseTester_Rule.md`
- `RegressionTester_Rule.md`
- `FailureModeTester_Rule.md`

Use the common rule for team-wide behavior and the six role rules for specific agent behavior.

## Handoff Rule

The official handoff to Implementation should live in `agent_local/TestPlan.md`, with harder second-pass cases collected in `agent_local/BreakTests.md`.
That handoff should include:

- what behavior the test proves
- which cases are required before implementation can claim completion
- which second-pass cases are meant to challenge a first implementation

When this team finishes a pass or sends its final user-facing reply for that pass, it should update the relevant local files and immediately send the root completion notification using `SendTestTeamNotification`.
