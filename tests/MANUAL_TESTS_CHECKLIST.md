# Manual Tests Checklist — GCalc

> Tests that cannot be automated — UI behavior, OS-level interactions, visual output,
> installation flows, and anything requiring human eyes or hands.
> Add items here whenever Claude identifies something it cannot verify programmatically.
> Check items off during manual QA before a release. Reset checkboxes after each release.

---

## Pre-Release Checklist

### Phase 1 — Layout & Visual
- [ ] App opens in browser without console errors
- [ ] Two-column layout renders: keypad left, screens right
- [ ] Graph screen header shows red CLR GRAPH button and GRAPH label
- [ ] History screen header shows red CLR HIST button and HISTORY label
- [ ] Graph canvas renders dark background with faint grid lines
- [ ] All 10 rows of keys render; disabled keys appear visually muted
- [ ] Calculator body has silver-gray rounded-corner casing

### Phase 1 — Keypad Interaction
- [ ] Digit keys (0-9) append to the live input line
- [ ] Operator keys (+, −, ×, ÷) append correct symbols to live input
- [ ] `(` and `)` append to live input
- [ ] `(-)` key appends negation and displays as `(-)` in live input
- [ ] `^` key appends to live input
- [ ] DEL removes last character from live input
- [ ] DEL after a result clears the live input entirely
- [ ] CLEAR clears the live input without affecting history
- [ ] ENTER evaluates and pushes expression+result to history log
- [ ] ENTER on empty input does nothing

### Phase 1 — Arithmetic Results
- [ ] Basic arithmetic: 2+3 → 5, 10-4 → 6, 3×4 → 12, 8÷2 → 4
- [ ] Order of operations: 2+3×4 → 14
- [ ] Parentheses: (2+3)×4 → 20
- [ ] Chained: 1+2+3+4 → 10
- [ ] Negation: (-) 5 → -5; 10+(-) 3 → 7
- [ ] Division by zero → ERR:DIV/0 shown in live input and history (red)
- [ ] Malformed expression → ERR:SYNTAX

### Phase 1 — History Behavior
- [ ] Each ENTER appends an entry showing expression on top line, result below right-aligned
- [ ] Error entries show in red
- [ ] History scrolls to bottom on each new entry
- [ ] Clicking a result entry copies the numeric value to live input
- [ ] Clicking an expression entry copies the expression to live input
- [ ] CLR HIST wipes all history entries; live input is unaffected
- [ ] After clicking to copy, pressing ENTER re-evaluates the copied value

### Phase 1 — Keyboard Support
- [ ] Digit keys on physical keyboard append digits
- [ ] +, -, *, / keys on physical keyboard work
- [ ] ( and ) keys on physical keyboard work
- [ ] Enter key evaluates (same as ENTER button)
- [ ] Backspace removes last character (same as DEL button)
- [ ] Escape clears the live input (same as CLEAR button)

### Phase 1 — Graph Screen
- [ ] CLR GRAPH button clears the graph canvas (resets to dark + grid)
- [ ] Graph canvas resizes correctly when browser window is resized


## Notes
[Record anything ambiguous, flaky, or environment-specific about manual tests here.]
