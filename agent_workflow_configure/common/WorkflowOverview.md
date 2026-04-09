# Workflow Overview

This workflow is a document-first delivery loop with three teams.
The official source of truth is the current markdown in `agent_local/`, not chat memory.

## Pipeline

1. Planning/Review team studies the request, current code, cost, risk, impact, and any needed top-level facade direction.
2. Planning/Review team writes or updates the approved plan, including the declarative contract, file ownership, function behavior spec, and any approved facade intent, and rejects low-value churn.
3. Test team writes the first required tests from the approved Planning/Review packet.
4. Implementation team writes the minimum clean code needed to satisfy the approved contract and tests.
5. Test team adds harder edge cases, regressions, and break tests after the first green pass.
6. Implementation team fixes failures and tightens the implementation.
7. Planning/Review team signs off or records unresolved items for later review.

## Gate Rules

- Implementation should not start before Planning/Review approves scope.
- Test writing should not depend on implementation details.
- Planning/Review should describe behavior and boundaries declaratively, not step-by-step algorithms, unless the algorithm is itself part of the requirement.
- If Test or Implementation believes the approved scope or contract is wrong, they should send a documented change request back to Planning/Review.
- If Planning/Review cannot confidently approve a disputed change, move it to a future-change document in `agent_local/` for user review.

## Handoff Rule

Each team should publish one official handoff document in `agent_local/`.
Helpers can discuss ideas internally, but the next team should rely on the official handoff file, not private side discussion.

## Notification Rule

- the owning team should send the root notification immediately when its current reply, pass, or assigned task is done
- use the dedicated team script from `agent_workflow_configure/NotificationGuide.md`
- do not use role names, lead names, or generic assistant names in the notification label
- do not delay a finished notification for a later batch summary or long checkpoint
