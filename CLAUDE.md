# Project: GCalc
> Created: 2026-07-03 07:54 CST
> See global CLAUDE.md for universal engineering principles.
> This file adds project-specific rules and overrides.

## Archive Rules — INVIOLABLE
The following files are APPEND-ONLY.
- NEVER use the Write tool on these files — only ever use Edit to append.
- Read the full file before appending to avoid duplicates.
- Every entry must begin with a timestamp: ## YYYY-MM-DD HH:MM TZ — Title
  Get the timestamp with: date "+%Y-%m-%d %H:%M %Z"

Protected files:
  - archive/HX_ISSUES.md
  - archive/DESIGN_DECISIONS.md
  - archive/CHANGELOG.md
  - archive/KNOWN_LIMITATIONS.md

## CURRENT_ISSUES.md Policy
- When the user reports a bug or requests a feature → add to CURRENT_ISSUES.md automatically.
- When Claude notices something tangential while working → ask before adding.
- When work is completed → move entry to archive/HX_ISSUES.md with timestamp and context.

## Plans Policy
- Active plans live at the project root — visible, front and center.
- When a plan is fully implemented → move it to archive/plans/
- Every plan must have a task checklist using `- [ ]` / `- [x]` format.
- Check off each task with `- [x]` AS IT IS COMPLETED — not at the end.
  This is how work survives a context reset: the next session reads the plan,
  sees what is checked, and picks up from the first unchecked item.
- Never mark a task done until the code is written, tests pass, and the change is verified.

### Plan File Format
Every plan created at the project root must follow this structure:

```
# Plan: [Name]

## Goal
[One paragraph describing what this plan accomplishes and why.]

## Tasks
- [ ] Task one
- [ ] Task two
- [ ] Task three

## Notes
[Optional: constraints, open questions, approach decisions.]
```

## Testing Policy
- Every new function must have a corresponding automated regression test in tests\.
- Tests must cover: happy path, edge cases, and known failure modes.
- Run the full test suite after EVERY code change before considering work complete.
- If a test fails after a change, fix it before moving on — do not leave broken tests.
- Automated test files are APPEND-ONLY. Never delete a test unless a code change
  directly invalidates it. Regression coverage must only grow, never shrink.
- The testing framework is chosen by Claude when the tech stack is established — record
  the decision in archive/DESIGN_DECISIONS.md.
- Things Claude cannot test (UI, user interaction, OS-level behavior) go in
  tests\MANUAL_TESTS_CHECKLIST.md. Add a checklist item any time such a scenario is identified.
- tests\MANUAL_TESTS_CHECKLIST.md is APPEND-ONLY under the same rule — never delete
  a manual test unless a code change directly invalidates it.
- Manual tests must not repeat automated tests. If a scenario is covered automatically,
  it does not belong in the manual checklist.

## Logging Policy
- Use AppLogger for ALL logging. No raw console.log calls anywhere.
- Every class method, function, and routine must create a logger instance at the top:
    const log = AppLogger.enter('ClassName.methodName');
- Always wrap with try/finally to guarantee log.complete() fires on exception:
    const log = AppLogger.enter('ClassName.methodName');
    try { ... } catch(err) { log.log('ERROR', err.message); throw err; }
    finally { log.complete(); }
- Use log levels appropriately and liberally:
    DEBUG  — entry/exit (automatic), detailed state, intermediate values
    INFO   — significant milestones, successful completions
    WARN   — unexpected but recoverable situations
    ERROR  — caught exceptions, failed operations
- More logging is better than less. Err on the side of DEBUG statements.
- AppLogger.js must be the first <script> loaded in index.html.

## Definition of Done
A feature or fix is not done until:
  - Code change is implemented
  - Automated tests written and passing
  - Manual checklist updated if applicable (tests\MANUAL_TESTS_CHECKLIST.md)
  - Entry added to archive/HX_ISSUES.md with timestamp
  - CURRENT_ISSUES.md updated
  - Plan moved to archive/plans/ if one existed

## Shared Dependencies
List every class consumed from `C:\Temp\ClaudeStuff\shared\` here as it is added.
Python projects: glob bootstrap already in entry point and tests\conftest.py.
TypeScript projects: @app-shared/core already in package.json.

| Class | Language | Purpose |
|-------|----------|---------|
| AppLogger | JavaScript | Structured logging for all classes and functions |

## Project-Specific Rules
- APPLOGGER_JS_PLAN.md must be completed before beginning GCALC_OG_PLAN.md Phase 1 —
  GCalc depends on AppLogger.js being present in the shared library first.
