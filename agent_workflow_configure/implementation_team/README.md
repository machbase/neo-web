# Implementation Team

Read this file first.
It is the single team guide for the Implementation team.

## Purpose

This team turns the approved Planning/Review contract and tests into working code.
It should produce the smallest clean implementation that satisfies the approved behavior and the evolving test suite.

## Workflow Position

This team starts after Planning/Review and Test publish the contract and initial proof expectations.
It delivers working code, then responds to the harder second-pass test pressure without turning the task into a broad refactor.

## Folder Structure

- `README.md`: the one team guide this team should read first
- `CommonAgent_Rule.md`: rules shared by every Implementation agent
- `ImplementationLead_Rule.md`: lead owner of the official implementation handoff
- `BehaviorImplementer_Rule.md`: core behavior implementation
- `BoundaryImplementer_Rule.md`: boundary and side-effect implementation
- `FailureFixImplementer_Rule.md`: targeted fixes for failing tests
- `IntegrationImplementer_Rule.md`: module and interface wiring
- `VerificationImplementer_Rule.md`: contract-versus-test verification

## What This Team Produces

This team should update the project-local implementation files in `agent_local/`.
Its output should record what changed, what passed, what failed, and which conflicts need upstream review.

## Required Local Files

- `agent_local/ImplementationLog.md`: the official implementation status log, including changed areas and verification state
- `agent_local/ReportToUser.md`: short user-facing summary of what shipped, what is blocked, and what still needs review

If a project uses different local filenames, the same responsibilities should still be mapped clearly before work starts.

## Required Read Order

1. `agent_workflow_configure/common/README.md`
2. `agent_workflow_configure/common/WorkflowOverview.md`
3. `agent_workflow_configure/common/Requirements.md`
4. `agent_workflow_configure/planning_review_team/README.md`
5. `agent_workflow_configure/test_team/README.md`
6. this `README.md`
7. the current agent's assigned `*_Rule.md` file

## Team Rules

- implement approved behavior without widening scope
- prefer focused, readable, testable code
- fix failures from harder tests with targeted changes
- escalate contract or planning conflicts instead of rewriting the spec in code
- keep implementation notes explicit about what is complete, incomplete, or still in conflict

## Delivery Standard

Good implementation passes should:

- satisfy the approved contract
- satisfy the required tests
- keep unrelated behavior stable
- document real blockers or mismatches explicitly

Weak implementation passes should be revised when they:

- hide unresolved failures
- broaden scope in the name of cleanup
- change contract behavior without upstream approval
- leave the local status unclear

## Rule Files In This Folder

- `CommonAgent_Rule.md`
- `ImplementationLead_Rule.md`
- `BehaviorImplementer_Rule.md`
- `BoundaryImplementer_Rule.md`
- `FailureFixImplementer_Rule.md`
- `IntegrationImplementer_Rule.md`
- `VerificationImplementer_Rule.md`

Use the common rule for team-wide behavior and the six role rules for specific agent behavior.

## Handoff Rule

The official handoff back to Test or Review should live in `agent_local/ImplementationLog.md`.
That handoff should include:

- what changed
- what passed
- what still fails or remains blocked
- whether the mismatch belongs to Planning/Review, Test, or Implementation

When this team finishes a pass or sends its final user-facing reply for that pass, it should update the implementation log, update `agent_local/ReportToUser.md`, and immediately send the root completion notification using `SendImplementationTeamNotification`.
