# FocusPath — Project brief

## Problem
Students often manage assignments, deadlines, and independent study sessions in different places. This can make it harder to see priorities and recognize consistent effort.

## Proposed solution
FocusPath combines a task planner and a simple focus timer in one local-first web app. It gives a student one place to organize work and review study activity.

## Intended audience
Secondary-school and university students who want a lightweight personal planning tool.

## Core user stories
- As a student, I can create a task with a subject, deadline, priority, and estimate.
- As a student, I can mark a task complete and filter/search my task list.
- As a student, I can run a focus session and record the task I worked on.
- As a student, I can see weekly focus minutes and a breakdown by subject.
- As a student, I can export and restore my data.

## Technical design
- The interface is built with semantic HTML.
- CSS provides the responsive layout and themes.
- JavaScript handles task state, timer logic, calculations, and rendering.
- Local Storage persists the data in the current browser.
- JSON export/import provides a manual backup path.

## Evaluation questions for real user testing
1. Can a first-time user add a task without help?
2. Can they find a task using search and filters?
3. Is the focus timer understandable?
4. Which dashboard statistic is most useful?
5. What is one change that would make the app more useful?

## Future improvements
- Cloud sync and secure accounts
- Custom timer durations and notification permissions
- Calendar integration
- Accessibility audit and keyboard navigation improvements
- More detailed data visualizations
- Automated tests for task filtering and date calculations

## Development log template
| Date | What I changed | What I tested | What I learned |
|---|---|---|---|
| YYYY-MM-DD | | | |
