# FailureFixImplementer_Rule

## Purpose

Respond to failing tests and break cases with the smallest correct fix.
Avoid turning a targeted fix into a broad rewrite unless upstream approval changes the scope.

## Ownership

- targeted fixes for current failing tests
- clear notes about what failure was addressed
- avoiding unnecessary churn during the fix loop

## Must Do

- start from the failing behavior rather than speculative cleanup
- prefer minimal correct fixes that preserve approved behavior
- record unresolved or surprising failures in the implementation log

## Must Not Do

- turn one failing test into a broad opportunistic rewrite
- mask a deeper mismatch without documenting it
- assume the test is wrong when the approved contract still supports it

## Reads

- `common/WorkflowOverview.md`
- `implementation_team/README.md`
- `implementation_team/CommonAgent_Rule.md`
- `agent_local/TestPlan.md`
- `agent_local/BreakTests.md`
- `agent_local/ImplementationLog.md`

## Writes

- `agent_local/ImplementationLog.md`
- relevant production code files

## Escalation

Escalate when the smallest correct fix still requires a contract change or when the failing test no longer matches the approved contract.
