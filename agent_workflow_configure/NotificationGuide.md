# Notification Guide

This is the one exception that stays in its own root markdown file.
Agents should read this file before sending completion notifications.
Use it for every finished reply, task, or team pass.

## Scripts

Use:

- `SendReviewTeamNotification.sh`
- `SendReviewTeamNotification.ps1`
- `SendTestTeamNotification.sh`
- `SendTestTeamNotification.ps1`
- `SendImplementationTeamNotification.sh`
- `SendImplementationTeamNotification.ps1`

Keep these shared scripts for setup or manual fallback only:

- `SendCompletionNotification.sh`
- `SendCompletionNotification.ps1`

## Topic File

The notification topic must be stored in:

- `agent_local/NotificationTopic.md`

That file should contain:

```md
# Notification Topic
topic: YOUR_NTFY_TOPIC_NAME
```

When an agent is configuring notifications or trying to send the first notification:

1. check whether `agent_local/NotificationTopic.md` already exists and has a real topic value
2. if it is missing or still unset, ask the user for the topic name
3. write the topic into `agent_local/NotificationTopic.md`
4. assume the saved topic is valid from then on

## Timing Rule

Send the notification immediately when the current work is done.

That means:

- send it when a user-facing reply is complete
- send it when an assigned task is complete
- send it when a team pass or handoff is complete

Do not wait for:

- a later lead summary
- a bigger batch of work
- a long idle checkpoint such as ten minutes later

If work takes more than about 45 seconds, send the notification as soon as the current reply or task finishes.

## Team Label Rule

Notifications are team-based, not role-based.
Each team should use its own dedicated notification script.

Even if one role or one lead did the work, the notification label must use the team name:

- `Review team`
- `Test team`
- `Implementation team`

Use the setup-only label below when configuring notifications for the first time:

- `NotificationSetup`

Do not use:

- role names such as `PlanningLead`, `TestLead`, or `ImplementationLead`
- generic assistant names such as `Codex`

## Fixed Message Format

The notification message format is fixed.
Agents should not invent message text.

The only allowed message shape is:

`TeamName task finished`

Examples:

```sh
./agent_workflow_configure/SendReviewTeamNotification.sh
```

```powershell
.\agent_workflow_configure\SendImplementationTeamNotification.ps1
```

## One-Time Permission Setup

After `agent_local/NotificationTopic.md` is set for the first time, run the notification command once so the same command path can be approved for later reuse.

Recommended one-time setup commands:

```sh
./agent_workflow_configure/SendCompletionNotification.sh NotificationSetup
```

```powershell
.\agent_workflow_configure\SendCompletionNotification.ps1 -TeamName NotificationSetup
```

That first send approves the shared transport path.
After setup, teams should use the dedicated team scripts above instead of passing labels by hand.
