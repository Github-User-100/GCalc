# Plan: GCALC_OG — Phase 1 & 2 Roadmap

## Goal
Build a web-based graphing calculator emulating the TI-82, extended with modern
browser capabilities. Phase 1 delivers a working layout with basic arithmetic so
the visual design can be evaluated. Phase 2a adds 2D graphing. Phase 2b adds full
3D surface plotting with mouse rotation, zoom, and per-axis scale controls.

**Context-reset note:** Check off each task with `- [x]` immediately upon completion.
On context reset, read this file, find the first unchecked item, and resume there.

## Tasks — Phase 1: Layout & Arithmetic

### Setup
- [x] Download Three.js — pinned to r185 (three.module.min.js ES module build);
      saved to lib/three.module.min.js; version recorded in archive/DESIGN_DECISIONS.md

### HTML Structure (index.html)
- [x] Create index.html with two-column outer layout (keypad left, screens right)
- [x] Add graph screen section with header bar and CLR GRAPH button (upper-left)
- [x] Add history screen section with header bar and CLR HIST button (upper-left)
- [x] Add canvas element inside graph screen
- [x] Add scrollable history div and live input line inside history screen
- [x] Add keypad section with placeholder divs for key groups

### CSS (style.css)
- [x] Page layout: two-column flex, full viewport height
- [x] Graph screen header: CLR GRAPH button prominent (colored, text-labeled)
- [x] History screen header: CLR HIST button prominent (colored, text-labeled)
- [x] Graph canvas: dark background, fills screen area
- [x] Faint grid lines on graph canvas (drawn via Three.js GridHelper)
- [x] History display: dark bg, green-tinted monospace font, scrollable overflow
- [x] Live input line: subtle top divider separating it from history area
- [x] TI-82 calculator body: silver-gray casing, rounded corners
- [x] Key groups: correct spacing and proportions per TI-82 layout
- [x] Individual keys: dark/black, labeled, hover state
- [x] Disabled keys: muted appearance, no cursor pointer

### JavaScript — Calculator State Machine (calculator.js)
- [x] Calculator class with state machine: INPUT | RESULT | ERROR
- [x] input(char): append char in INPUT state; start fresh in RESULT/ERROR state
- [x] delete(): remove last char from expression buffer
- [x] evaluate(): call ExpressionParser, transition to RESULT or ERROR
- [x] clearLiveInput(): reset buffer to empty, return to INPUT state

### JavaScript — ExpressionParser
- [x] ExpressionParser static class with evaluate(expr) → number or Error
- [x] Handle: +  −  ×  ÷  decimal point  parentheses  negative numbers
- [x] Return ERR:DIV/0 for division by zero
- [x] Return ERR:SYNTAX for malformed expressions
- [x] No raw eval() — safe recursive descent or equivalent

### JavaScript — Key Classes
- [x] Key base class: DOM element reference, label, disabled flag, click binding
- [x] InputKey extends Key: onPress() calls calculator.input(this.char)
- [x] ActionKey extends Key: onPress() calls a named calculator method
- [x] DisabledKey extends Key: onPress() is a no-op
- [x] ModeKey extends Key: Phase 2 stub — renders, logs on click for now

### JavaScript — KeyRegistry
- [x] KeyRegistry data structure: full TI-82 layout as declarative key definitions
- [x] Factory: instantiates correct Key subclass for each definition
- [x] Renders all keys into the DOM keypad section

### JavaScript — HistoryDisplay
- [x] HistoryDisplay class owns the history div and live input element
- [x] appendEntry(expression, result): adds expression/result pair, scrolls to bottom
- [x] updateLiveInput(buffer): reflects current expression buffer in the live line
- [x] Click-to-copy: clicking any history line copies text to live input
      (result lines copy numeric value only, no "=" prefix)
- [x] clearHistory(): wipes all history entries, live input unaffected

### JavaScript — GraphDisplay
- [x] GraphDisplay class initializes Three.js scene on the canvas element
- [x] Phase 1: render faint grid on dark background
- [x] clearGraph(): resets canvas to blank dark state

### Wiring
- [x] Wire all InputKey instances to calculator.input(char)
- [x] Wire ENTER ActionKey to calculator.evaluate()
- [x] Wire DEL ActionKey to calculator.delete()
- [x] Wire CLR HIST button to historyDisplay.clearHistory()
- [x] Wire CLR GRAPH button to graphDisplay.clearGraph()
- [x] Keyboard support: digits/operators → calculator.input(); Enter → evaluate();
      Backspace → calculator.delete(); Escape → clearLiveInput()
- [x] Calculator notifies HistoryDisplay on every state change via onChange callback

### Testing & Documentation
- [x] Create tests/calculator.test.js — Vitest, 57 tests all passing
- [x] Tests: basic arithmetic — add, subtract, multiply, divide
- [x] Tests: chained operations and order of operations
- [x] Tests: decimal handling
- [x] Tests: divide by zero → ERR:DIV/0
- [x] Tests: malformed input → ERR:SYNTAX
- [x] Tests: Calculator state transitions (INPUT→RESULT, RESULT→INPUT on digit,
      ERROR→INPUT on digit)
- [x] Update tests/MANUAL_TESTS_CHECKLIST.md with Phase 1 visual/interaction items
- [x] Append test framework decision to archive/DESIGN_DECISIONS.md

## Tasks — Phase 2a: 2D Graphing
- [ ] Extend ExpressionParser: handle x as a variable → evaluate as y = f(x)
- [ ] Formula detection in Calculator: input containing x → graph route
- [ ] GraphDisplay: render 2D function plots (line across x range, mapped to canvas)
- [ ] History entries for graphed formulas show "→ graphed" instead of numeric result
- [ ] Y= screen: input up to 10 function definitions
- [ ] WINDOW screen: set xMin, xMax, yMin, yMax, xScl, yScl
- [ ] TRACE mode: highlight point on curve, display (x, y) coords
- [ ] Wire scientific keys: SIN, COS, TAN, LOG, LN, x², √, x⁻¹, ^
- [ ] 2nd-key toggle: ModeKey shifts secondary labels on applicable keys
- [ ] ZOOM presets: ZStandard, ZSquare, ZDecimal
- [ ] Multiple functions on same graph in different colors

## Tasks — Phase 2b: 3D Graphing
- [ ] Extend ExpressionParser: handle x and y as variables → z = f(x, y)
- [ ] 3D mode detection: input containing both x and y → 3D graph route
- [ ] GraphDisplay: build surface mesh (evaluate z on x,y grid → BufferGeometry)
- [ ] Apply Three.js material with shading to surface mesh
- [ ] Mouse/touch drag to rotate view (Three.js OrbitControls)
- [ ] Scroll/pinch to zoom
- [ ] Per-axis scale controls: xScale, yScale, zScale (sliders or input fields)
- [ ] WINDOW screen extended: add zMin, zMax, zScl for 3D mode
- [ ] Render axes and grid in 3D space
- [ ] Multiple 3D surfaces on same graph in different colors

## Notes
- Three.js is isolated entirely within GraphDisplay. No other class references it.
- CLR buttons must be visually prominent — colored, text-labeled. Not subtle icons.
- ENTER (keypad) and physical keyboard Enter both commit the live input.
- Screen split: ~60% graph / 40% history. Fixed for now — review after Phase 1.
- KeyRegistry keeps layout as data. Adding/changing a key = editing one data row.
- Phase 2a validates the parser and 2D pipeline before committing to 3D (Phase 2b).
- No localStorage, no cookies. History is session-only.
