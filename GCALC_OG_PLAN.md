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

## Tasks — Phase 1 Extended: Scientific Functions

### ExpressionParser Extensions
- [ ] Add function-call parsing: sin(), cos(), tan(), asin(), acos(), atan()
- [ ] Add: ln(), log() (base 10), sqrt(), abs()
- [ ] Add: exp() or e^x (Euler's number raised to power)
- [ ] Add constants: π (Math.PI) and e (Math.E) as named tokens
- [ ] Preserve all existing arithmetic — no regressions

### Key Enablement
- [ ] SIN → InputKey, sends `sin(`
- [ ] COS → InputKey, sends `cos(`
- [ ] TAN → InputKey, sends `tan(`
- [ ] LN  → InputKey, sends `ln(`
- [ ] LOG → InputKey, sends `log(`
- [ ] √   → InputKey, sends `sqrt(`
- [ ] x²  → InputKey, sends `^2`  (postfix — appends to current expression)
- [ ] x⁻¹ → InputKey, sends `^(-1)`
- [ ] π   → InputKey, sends `π` token (parser converts to Math.PI value)
- [ ] e   → InputKey, sends `e` token (parser converts to Math.E value) [if key available]

### Testing
- [ ] Expand calculator.test.js: sin/cos/tan/ln/log/sqrt/π/e cases
- [ ] Test: nested expressions e.g. sin(π/2), log(sqrt(100))
- [ ] Test: error cases e.g. sqrt(-1), ln(0)

## Tasks — Phase 2a: 2D Graphing

**Mode entry:** "2D GRAPH" button (Row 2, col 5) activates GRAPH_2D state.
Live line prefix changes to `f(x) =`. Only `x` is valid as a free variable.
CLEAR exits graphing mode. WINDOW, TRACE, ZOOM keypad buttons remain disabled —
their functions are mouse-driven (see Notes).

### Core graphing loop (do first)
- [ ] KeyRegistry: Row 2 col 5 → 2D GRAPH ActionKey; Row 3 col 5 → 3D GRAPH stub
- [ ] Calculator: add GRAPH_2D state; enterGraphMode('2d') transitions to it
- [ ] Calculator: allow `x` character in buffer only in GRAPH_2D state
- [ ] Live line: show `f(x) =` prefix in GRAPH_2D state
- [ ] ExpressionParser: add evaluateAt(expr, x) — substitutes x and evaluates
- [ ] GraphDisplay: renderFunction2D(expr, window) — samples f(x) across range,
      renders as a Three.js line in the graph canvas
- [ ] History: graphed formula adds entry showing formula + "→ graphed"
- [ ] Multiple functions stack — each ENTER adds to graph and history; CLR clears both

### Mouse interaction (after core loop works)
- [ ] Mouse wheel on graph canvas → zoom in/out (adjust window range, re-render)
- [ ] Mouseover graph canvas → show live (x, y) tooltip at cursor position
- [ ] Click on graph canvas → open settings panel (xMin, xMax, yMin, yMax)

### Enhancements
- [ ] Multiple functions in different colors (auto-cycle color per entry)
- [ ] Axes and tick marks rendered on graph
- [ ] 2nd-key toggle (deferred — no graphing dependency)

## Tasks — Phase 2b: 3D Graphing

**Mode entry:** "3D GRAPH" button (Row 3, col 5) activates GRAPH_3D state.
Live line prefix changes to `f(x,y) =`. Both `x` and `y` are valid as free variables.
Result is z = f(x, y) surface mesh.

- [ ] Calculator: add GRAPH_3D state; 3D GRAPH key transitions to it
- [ ] Calculator: allow `x` and `y` characters only in GRAPH_3D state
- [ ] Live line: show `f(x,y) =` prefix in GRAPH_3D state
- [ ] ExpressionParser: add evaluateAt(expr, x, y) — substitutes both variables
- [ ] GraphDisplay: renderFunction3D(expr, window) — evaluates z on x,y grid,
      builds BufferGeometry surface mesh
- [ ] Three.js material with shading applied to surface mesh
- [ ] Click and drag on canvas → OrbitControls camera rotation
- [ ] Mouse wheel → zoom (OrbitControls)
- [ ] Click on canvas → settings panel extended with zMin, zMax, zScl
- [ ] Multiple 3D surfaces on same graph in different colors
- [ ] Axes and grid rendered in 3D space

## Notes
- Three.js is isolated entirely within GraphDisplay. No other class references it.
- CLR buttons must be visually prominent — colored, text-labeled. Not subtle icons.
- ENTER (keypad) and physical keyboard Enter both commit the live input.
- Screen split: ~60% graph / 40% history. Fixed for now — review after Phase 1.
- KeyRegistry keeps layout as data. Adding/changing a key = editing one data row.
- Phase 2a validates the parser and 2D pipeline before committing to 3D (Phase 2b).
- No localStorage, no cookies. History is session-only.
- Mode character restrictions: calc mode (no variables), 2D mode (x only), 3D mode (x,y).
- WINDOW/TRACE/ZOOM buttons remain disabled — mouse replaces them entirely.
- Graph settings (window range) exposed via click on graph canvas, not a separate screen.
- Mouseover → trace tooltip. Mouse wheel → zoom. Click+drag (3D) → orbit rotation.
