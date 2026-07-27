# ForgeBoard — Manufacturing Command Center

A fast, no-friction task and team board built for manufacturing managers
(process engineering, maintenance, production, automation). It skips the
heavy setup of tools like Microsoft Planner/Project — no wizards, no
mandatory fields — while still giving you a control-tower view of
everything your team is doing.

## Why it's different

- **One-line smart add.** Type a task the way you'd say it out loud:
  `Fix Line 3 conveyor @Mehmet #maintenance !urgent tomorrow` and
  ForgeBoard parses out the assignee, area, priority, and due date for you.
  No forms unless you want one.
- **Today's Focus.** Automatically surfaces what's overdue, due today, or
  urgent — so you always know the top 3-5 things that actually matter,
  without hunting through a backlog.
- **Kanban board with drag-and-drop**, grouped by To Do / In Progress /
  Blocked / Done, filterable by area or team member.
- **Team workload view** — see each person's open/done tasks and
  completion rate at a glance.
- **Live KPIs** — open tasks, in-progress, overdue, completed this week,
  and an overall completion ring.
- **Quick templates** for recurring manufacturing work: machine breakdown,
  preventive maintenance, 5S audit, root cause analysis, changeover,
  calibration, safety inspection, spare part requests.
- **Activity timeline** — an automatic log of what changed and when.
- **Dark/light theme**, fully responsive, keyboard shortcut (`n`) to jump
  straight to quick-add.

## Using it

Just open `index.html` in a browser — no build step, no server, no
dependencies. Data is saved locally in your browser (`localStorage`).

To host it (e.g. GitHub Pages): enable Pages on this repo pointed at the
root of the default branch, and it's live.

Use the export/import buttons in the top bar to back up or move your data
between devices.

## Stack

Plain HTML, CSS, and JavaScript — no frameworks, no build tools, nothing
to install or go out of date.
