# FocusPath — Student Study Planner

A responsive, browser-based study planner built with HTML, CSS, and vanilla JavaScript.

## Features
- Task management: create, complete, search, filter, and delete tasks
- Subjects, deadlines, priority, estimated duration, and notes
- Pomodoro-style focus timer with focus, short-break, and long-break modes
- Completed focus sessions recorded in study history
- Dashboard with task completion, focus time, streak, weekly goal, and weekly chart
- Insights by subject and recent study sessions
- Light/dark theme
- JSON export and import for backups
- Responsive layout for desktop and mobile
- Local-first storage using browser Local Storage

## Run the app
1. Download and extract the project.
2. Open `index.html` in a modern browser.
3. No installation, server, or account is required.

The Google Fonts import is optional; the app falls back to system fonts if unavailable.

## Data and privacy
FocusPath stores its data in Local Storage in the browser being used. It does not have accounts, a cloud database, or cross-device synchronization. Export a JSON backup before clearing browser data or switching devices.

## Tech stack
- HTML5
- CSS3
- JavaScript (ES6+)
- Local Storage
- Blob/File APIs for JSON backup import/export

## Suggested project development process
This is a starter implementation. To make it genuinely yours:
1. Run every feature and note any bugs.
2. Change the interface or add a feature based on a real need you identify.
3. Ask a few classmates to try it, with their permission.
4. Record what they found confusing and what you changed.
5. Keep a short development log with dates, decisions, bugs, and lessons.
6. Publish the code in your own GitHub repository if you want a public portfolio link.

## Limitations
- Data is stored locally in one browser/device.
- Focus sessions are recorded when the timer reaches zero; pausing or resetting does not create a session.
- The timer is a simple browser timer and is not designed to run reliably after the browser is closed or a device sleeps.
- No reminders, accounts, server, or cloud sync are included.

## Common App honesty note
Do not claim that you founded a company, served users, improved grades, or ran user testing unless those things actually happened. Describe only work you personally completed, the features you understand, and any real testing or feedback you collected.
