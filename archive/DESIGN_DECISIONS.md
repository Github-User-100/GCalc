# Design Decisions — GCalc

> ⚠ APPEND ONLY. NEVER overwrite, truncate, or delete entries.
> Use Edit tool to append at the bottom. Never use Write tool on this file.
> Records architectural choices, tech selections, and the reasoning behind them.
> Format: ## YYYY-MM-DD HH:MM TZ — Title

---

## 2026-07-03 07:54 CST — Project initialized
Initial scaffold created. Design session followed immediately — see entry below.

---

## 2026-07-03 08:30 CST — Full Initial Design Session

**Attribution note:** These decisions emerged from a collaborative session between RJ
and Claude. Each section is marked to show who drove the decision. This matters —
the record should reflect actual thinking, not just conclusions.
  [RJ] = my direction, idea, or correction
  [Claude] = Claude's suggestion
  [Both] = emerged from back-and-forth

---

### What GCalc Is
[RJ] I came in knowing I wanted a TI-82 emulator for the web, but my goal from the
start was to use the TI-82 as a *starting point*, not a ceiling. I've used that
calculator enough to know exactly where its hardware constraints created artificial
limitations. The session mapped out how to go further in phases rather than trying
to do everything at once.

---

### Tech Stack: Vanilla HTML/CSS/JS
[Claude] Recommended vanilla HTML/CSS/JS — no framework, no build step, opens
directly in browser. I agreed immediately. There's no ecosystem need here and a
build step adds friction for zero benefit in Phase 1. React and Vite+TypeScript
were offered; I declined. Canvas API handles graphing natively.

**Open question:** Phase 2 may add math.js for expression parsing. Not decided yet —
evaluate when we get there and see how complex the parser gets.

---

### Layout: Two Columns, Two Screens
[Both] I specified keypad-left, large-screen-right from the start — already a
departure from the TI-82's portrait layout. Mid-session I asked: *"Do we need two
screens on the right — a graphing screen on top and a display on the bottom?"*
That was the inflection point. The TI-82 forces you to toggle between calculation
and graph views — a hardware constraint, not a feature. On the web we can show
both simultaneously. Claude confirmed it was an improvement; I drove the question.

**Open question:** Screen split is fixed at roughly 60% graph / 40% history. That
ratio is a guess. The Phase 1 visual review will tell us if it needs to change.

---

### History Display: Windows Calculator Style, Not Two-Line LCD
[RJ] Claude's initial plan had a standard two-line LCD — expression on line 1,
result on line 2. I pushed back directly: *"I don't think the bottom screen should
just be two lines... it should have a history built into it, kinda like the Windows
calculator does now."* That reframed the entire bottom screen from a static display
into a scrollable record of work. The live input line anchored at the bottom came
out of that — commit to history on ENTER, fresh line immediately.

[RJ] **Click-to-copy:** I pushed to have this in Phase 1, not deferred. Clicking
any history line copies it to the live input with cursor at end. Result lines copy
the numeric value only, stripping the "=" prefix. Having this in Phase 1 makes the
layout review actually useful for testing the feel of the calculator.

[RJ] **No Clear button for the live line:** DEL and Backspace handle it. Once
click-to-copy was in the design, a separate Clear button for the live line was
redundant.

[RJ] **CLR button prominence:** Claude's first instinct was small icon buttons. I
caught it: *"make them noticeable enough that people don't miss them — you're a bit
subtle sometimes."* The buttons are prominent colored text labels in the upper-left
of each screen header.

**History persistence:** Session-only. I explicitly ruled out localStorage and
cookies — not needed for what this is.

---

### Key Hierarchy: Behavior-Based, Not Data-Type-Based
[Both] I mentioned that every programmer dreams of building a calculator and goes
through the mental exercise of how to class it out — NumberKey, OperatorKey, etc.
Claude reframed the axis: organize by what pressing a key *does*, not what it
*represents*. The false start here was exactly the instinct I described: building
classes by data type. The right structure collapsed it:

```
Key (base)
├── InputKey    — appends a character (digits AND operators — same class)
├── ActionKey   — calls a Calculator method (ENTER, DEL)
├── ModeKey     — switches mode (Phase 2)
└── DisabledKey — renders, does nothing
```

The key insight: DigitKey and OperatorKey are the same class. Both append a
character to the buffer. The only difference is *which character* — a constructor
argument, not a class distinction. I recognized this as right immediately once
Claude articulated it.

[Claude] **KeyRegistry:** A declarative data table maps all key definitions to Key
instances. The TI-82 layout is data, not 50+ imperative constructor calls. I
accepted this without hesitation — it's the obviously clean approach.

---

### Calculator as State Machine
[Claude] Three explicit states: INPUT, RESULT, ERROR. Without them, "what happens
when you press 5 after seeing a result" is ambiguous — do you get 425 or a fresh 5?
The state machine makes it unambiguous. This is a bug that bites every calculator
implementation that skips it. I recognized the pattern immediately from experience.

---

### No Display Base Class — Two False Starts Killed
[RJ] I asked directly: *"Do we need classes that extend Display? One for graphing
and one for results/history?"* Claude's answer: a Display base class would contain
almost nothing — an element reference and a clear() stub that both subclasses would
immediately override. Not enough to justify the layer.

[RJ] I followed up: *"Do we need the Display class with both of those classes
present?"* Answer: no. Drop it entirely. GraphDisplay and HistoryDisplay are
independent siblings. Two questions, two abstractions killed. I kept pushing until
the design was as flat as it could be.

---

### ExpressionParser: Isolated and Swappable
[Claude] Static class, completely isolated. evaluate(expr) returns a number or
Error. The isolation is intentional: Phase 1 arithmetic only, Phase 2a adds x as
a variable, Phase 2b adds x and y. Each upgrade touches only the parser. I saw the
value immediately — this is standard separation of concerns applied deliberately.

No raw eval() — security risk and no meaningful control over execution.

---

### 3D Graphing: Going Beyond the TI-82
[RJ] I raised this mid-session: *"What if we make this a full LCD type screen with
3D graphing capabilities and that you can rotate around or change x/y/z scales once
graphed? How much does that ramp the difficulty up?"* The TI-82 framing was always
a starting point. Modern browsers have WebGL and hardware-accelerated 3D that the
physical device couldn't touch. Claude confirmed significant difficulty increase but
manageable with the right library, and suggested splitting Phase 2 into 2a (2D first)
and 2b (3D) to validate the pipeline before committing to the surface renderer.
That sequencing made sense to me — don't build 3D until 2D is proven.

---

### Three.js: Selected, Vendored, Isolated
[Claude] Recommended Three.js for 3D — industry standard, 100k+ GitHub stars, in
production since 2010, used by Google/NASA/NYT. OrbitControls handles mouse-drag
rotation out of the box. Rolling a 3D projection and rotation system from scratch
would be a significant undertaking with no payoff.

[RJ] I had the supply chain question before agreeing: *"Is it common? Used by many?
Any issues with security or news articles about it being hacked?"* This wasn't
theoretical — my organization had been directly affected by supply chain attacks on
popular packages recently (April/May 2026, unrelated packages). Three.js itself was
clean, but the concern was real and current.

[Both] **Vendored in lib/, not CDN:** A CDN-loaded library can change without notice
if the upstream repo or CDN is compromised. A local copy in `lib/three.min.js` is
pinned to a specific vetted version at adoption time and never changes unless I
explicitly upgrade it. Works offline, no runtime external dependency. My real-world
experience with supply chain incidents drove this requirement; Claude provided the
technical framing for why vendoring addresses it.

Three.js is isolated entirely within GraphDisplay. No other class references it.
Swapping it out requires touching exactly one class.

---

## 2026-07-04 07:15 CDT — Phase 1 Implementation Decisions

### Three.js r185 — Build File Change
Three.js r185 no longer ships `three.min.js`. The build directory now contains:
- `three.core.min.js` — core-only bundle
- `three.module.min.js` — full ES module bundle (what we use)
- `three.webgpu.min.js` — WebGPU renderer variant

**Decision:** Vendor `three.module.min.js` (ES module build) to `lib/three.module.min.js`.
Installed via `npm install three@0.185.0` for package integrity verification, then copied
the build file into lib/. The plan's `lib/three.min.js` reference is superseded by this
filename. All imports use: `import * as THREE from '../lib/three.module.min.js'`

### Test Framework: Vitest
[Claude] Vitest selected for `tests/calculator.test.js`. Consistent with the shared
library test setup. GCalc has its own `package.json` with `"type": "module"` (required for
ES module source files) and Vitest as a dev dependency.

### Negation Key: Separate (−) Token
[RJ] Confirmed the TI-82 behavior: a dedicated `(-)` key for unary negation, distinct
from the `−` subtraction operator. The ExpressionParser receives `~` internally as the
negation token (the keypad sends `~`, the parser treats it as unary minus). The display
renders it as `(-)` in the live input. Keyboard input: the physical `-` key at the start
of an expression (or after an operator/open-paren) is treated as negation.

### ES Modules Throughout
All GCalc JS files use `export class` / `export function`. Single entry point:
`<script type="module" src="js/main.js">` in index.html. AppLogger is imported directly
in each file that uses it via relative path to the shared library.

---

## 2026-07-04 07:30 CDT — Phase 1 Build Session: Toolchain, Security, and Design Q&A

---

### Supply Chain Discipline: How We Actually Got Three.js

This is worth documenting in full because it shows the right way to approach third-party
libraries when working with AI tooling.

[Claude] When downloading Three.js, I first attempted jsDelivr (CDN, returned 404), then
switched to unpkg.com without explaining what it was.

[RJ] I stopped it immediately: *"I'm not sure about grabbing random libraries from random
websites. That's a huge security risk. Why can't we get it straight from GitHub?"* This
wasn't ignorance — it was the correct instinct applied to an unfamiliar tool. I knew my
organization's supply chain history. I didn't know what unpkg was. That's the right time
to push back.

[RJ] I followed up by asking directly: *"What is unpkg.com then? Why were you pulling from
there?"* This is a pattern worth noting: when an AI uses a tool or service you don't
recognize, ask before allowing it. Claude explained that unpkg serves files directly from
the npm registry — same content as `npm install`, just through a CDN intermediary. That
context changed the risk profile.

[Both] **Final decision: `npm install three@0.185.0`, copy build file to lib/.**
The reasoning: npm performs package integrity hash verification automatically. No CDN is in
the chain. The file in lib/ is pinned, auditable, and offline-capable — the same logic that
drove the vendoring decision in the original design session. `npm audit` returned zero
vulnerabilities. That is the bar.

**The broader principle I applied here:** AI assistants default to convenience (CDN URLs are
shorter and faster to type). Security requirements are context the AI doesn't have unless
you supply it. Supplying that context — and stopping the process when something looks wrong
— is part of the job when directing AI development.

---

### Pre-Implementation Design Questions: What to Ask Before Writing Code

[RJ] Before a single line of Phase 1 code was written, I required Claude to surface its
open questions and held it to that before allowing implementation to begin. The three
questions that came back were exactly the ones that would have caused rework mid-build if
left unasked:

1. **Key layout completeness** — Full TI-82 grid from day one (all 50 keys, non-Phase-1
   keys as DisabledKeys), not a minimal set to be filled in later. *My reasoning: the
   visual review is the point of Phase 1. A half-populated keypad can't be reviewed.*

2. **Visual fidelity** — TI-82-inspired, not a faithful clone. Modern readability over
   pixel-accuracy. *My reasoning: faithful clones require reference measurements and are
   harder to maintain. The TI-82 is a starting point, not a specification.*

3. **Negation key behavior** — Confirmed the TI-82's separate `(-)` key for unary negation,
   distinct from the `-` subtraction key. The parser receives `~` internally; the display
   renders it as `(-)`. *My reasoning: this is a behavioral contract. Getting it wrong in
   Phase 1 means rewriting the parser and the expression buffer display in Phase 2.*

[RJ] These three questions took five minutes. They prevented at minimum three mid-session
redirections. This is a repeatable pattern: before implementation, identify the decisions
that would be expensive to revisit and resolve them first. AI will write code confidently
on assumptions it hasn't declared — surfacing those assumptions is the developer's job.

---

### Toolchain Hygiene: Node and npm Versioning

[Claude] While resolving a Vite 7 / Vitest 3 ESM compatibility issue (vitest's CJS loader
trying to `require()` a Vite 7 module that is now ESM-only), I noted the issue and applied
a workaround: renaming `vitest.config.ts` to `vitest.config.mts` forces Node to load it via
the ESM loader, bypassing the CJS conflict. This restored the test runner without touching
the TypeScript configuration.

[RJ] Rather than accepting just the workaround, I asked the broader question: *"Do we need
a newer version of npm or node? It's probably time to update anyway."* The answer: Node was
already at v24.18.0 (current). npm was at 10.2.5; latest was 11.18.0.

[RJ] **Kept both changes.** The `.mts` workaround is the structurally correct fix for
mixed CJS/ESM projects on Vitest 3 + Vite 7. The npm upgrade to 11.18.0 is independent
maintenance that would have been needed regardless. Neither was rolled back in favor of the
other. The AppCache test failure (previously hidden by the broken runner) was also resolved
by Node 24's built-in `node:sqlite` module.

**The principle:** version debt compounds. When a tool issue surfaces, check whether the
root cause is environment age, not just the immediate symptom. One question prevented
multiple future incidents.

---

### ES Modules and the Dev Server Requirement

[Claude] After Phase 1 was complete, I documented that the app needed to be served from
`C:\Temp\ClaudeStuff\` as the root — not opened directly from the filesystem.

[RJ] Pushed back immediately: *"Why do we need a server? It's just HTML/CSS/JS."* This is
a fair challenge. The answer: ES module `import` statements using `../../shared/...` paths
are treated as cross-origin requests under the `file://` protocol. Browsers block them. An
HTTP server eliminates the origin restriction.

[RJ] Accepted the server requirement but asked for clear, actionable steps — not just
"serve from the parent directory." This is the right response: when AI gives a requirement
that adds friction, demand the friction be reduced to its minimum. The result was a
`npm run dev` script in `package.json` that serves from the correct root with a single
command, plus documented VS Code Live Server instructions for the IDE workflow.

**The alternative not taken:** vendoring AppLogger.js into `GCalc/lib/` (same as Three.js)
would eliminate the server requirement entirely. This is a live architectural tradeoff:
server keeps the shared library live-linked; vendoring enables offline double-click usage.
Deferred for now — if the server friction becomes significant during Phase 2 development,
vendoring AppLogger is the resolution.

---

## 2026-07-04 13:00 CDT — Phase 1 Visual Build: Layout, History, and UI Decisions

---

### History Display: Spacer-Push Architecture

[Both] The history log needed entries to appear anchored to the bottom — the most recent
entry should always be visible at the bottom of the pane, with older entries scrolling up
behind it, exactly like a terminal or modern calculator. The naive approach would be to
programmatically scroll to the bottom after every `appendChild` call.

The CSS-native solution is cleaner: a `<div class="history-spacer">` with `flex: 1` as
the first child of the flexbox scroll container. The spacer absorbs all available vertical
space, pushing entries toward the bottom. As entries accumulate and overflow the container,
the spacer compresses to zero and the scroll container takes over naturally. No JavaScript
scroll management required.

```
#history-log (display: flex; flex-direction: column; overflow-y: auto)
  ├── .history-spacer (flex: 1)   ← pushes entries to bottom
  ├── .history-entry
  ├── .history-entry
  └── .history-entry              ← always visible at bottom
```

The `clearHistory()` method removes only `.history-entry` elements, preserving the spacer.
One DOM query, no index management.

---

### Live Input Line: Anchored Footer, Not Inline

[RJ] My initial direction: the live input should behave like a terminal prompt — always
visible at the bottom of the screen, not scrolling with the history. Early implementation
had the live input inside the scroll container, which caused it to scroll out of view.

**Decision:** Live input lives outside `#history-log` entirely, as a fixed footer below it.
The history area is a two-part flex column: `#history-log` (flex: 1, scrollable) and
`.live-input-row` (flex-shrink: 0, always visible). The live input has a permanent
`min-height` so it doesn't collapse when empty — a blank live line and a populated one
occupy the same vertical space.

[RJ] **Blank after ENTER:** After evaluation, the live input clears immediately rather
than showing the result. The result is already visible in the history panel directly above.
Showing it twice serves no purpose and creates momentary confusion about whether the
expression was evaluated or just echoed. This is a departure from the TI-82 (which shows
the result on the live line), justified by the simultaneous history display.

---

### TI-82 Key Layout: Fidelity vs. Rectangular Grid Constraints

[RJ] I provided a TI-82 reference image and required the layout to match it — key
positions, labels, and secondary (2nd-function) labels. Several layout decisions resulted:

**A-LOCK placement:** On the physical TI-82, A-LOCK is the 2nd-function of the ALPHA key
— shown as yellow text above ALPHA, not as a separate key. An early implementation had
A-LOCK as its own key. This was wrong and immediately recognizable to any TI-82 user.
Fixed: `{ label: 'ALPHA', secondary: 'A-LOCK' }`.

**Navigation cluster:** The TI-82 has a cross-shaped directional pad. A rectangular CSS
grid cannot represent a cross shape without spanning cells, which would require manual
`grid-column` and `grid-row` placement on every key — a significant complexity increase
for keys that are non-functional in Phase 1. Decision: blank the four navigation positions
(`label: ''`, type: `disabled`) rather than misrepresent the layout with incorrectly
positioned arrows. The blank cells are visually honest about the constraint.

**Secondary labels left-aligned:** Secondary labels (yellow 2nd-function labels) are
`position: absolute` inside each key, offset to the top-left. Centered secondary labels
collided visually with primary labels on shorter key text. Left-alignment with a 4px inset
gives each label its own visual zone.

**Declarative layout maintenance:** All 55 keys are defined as plain objects in `KEY_DEFS`.
Correcting a label, adding a secondary, or changing a key's behavior is a one-line data
change, not a DOM or class refactor. This paid off repeatedly during the layout review
session — corrections took seconds each.

---

### CSS 3D Button Effect: Custom Property Shadow Architecture

[RJ] Direction: make the keys look like physical raised buttons, not flat rectangles.

The core challenge: each key variant (dark, action, enter) has a different shadow color
for its "side" — the solid-color bottom shadow that creates the illusion of button
thickness. A single `:active` rule that compresses that shadow needs to know which color
to compress to. With hardcoded shadow values, you'd need a per-variant `:active` rule.

**Solution: CSS custom properties as intra-cascade communication.**

Each variant declares `--key-shadow` on itself:
```css
.key-dark  { --key-shadow: #000; }
.key-enter { --key-shadow: #072010; }
```

The shared box-shadow declaration and the `:active` collapse rule both reference the
variable. The correct color resolves at paint time without duplication:
```css
.key-dark {
  box-shadow: 0 6px 0 var(--key-shadow), inset 0 1px 0 rgba(255,255,255,0.10);
}
.key:active:not(.key-disabled),
.key.key-pressed {
  transform: translateY(6px);
  box-shadow: 0 0 0 var(--key-shadow), inset 0 2px 4px rgba(0,0,0,0.4);
}
```

The button "presses in" 6px and the side shadow collapses to 0 — the visual effect is
the key physically descending into the calculator housing. One `:active` rule handles
all variants. Adding a new key color in the future requires only declaring the variable
on the new class — the press behavior inherits automatically.

---

### Keyboard-to-Button Routing: The simulatePress Pattern

[RJ] Direction: keyboard input should animate the corresponding on-screen button, not
just trigger the calculation silently. Additionally, the keyboard handler and the click
handler were two separate code paths calling the same calculator methods — a maintenance
liability.

**Decision: route all input through the key objects themselves.**

`Key.simulatePress()` is the single execution point for any key press, regardless of
input source:
1. Adds `.key-pressed` CSS class → triggers the 3D press animation
2. Calls `this.onPress()` → executes the key's action
3. Removes `.key-pressed` after 120ms via `setTimeout`

`KeyRegistry` builds two maps during `build()`:
- `#charMap: Map<char, Key>` — indexed by internal character token
- `#actionMap: Map<actionName, Key>` — indexed by action name

`pressChar(char)` and `pressAction(name)` are the public interface. The keyboard handler
calls only these:
```javascript
if (e.key === 'Enter')     { registry.pressAction('evaluate'); }
if (/^[0-9]$/.test(e.key)){ registry.pressChar(e.key); }
```

The keyboard handler contains zero calculator method calls. Adding a new key behavior
or remapping a keyboard shortcut is a single-location change. Keyboard and mouse inputs
are now guaranteed to be identical in behavior — they share the exact same execution path.

[RJ] The `.key-pressed` class shares its CSS declaration with `:active` via a grouped
selector:
```css
.key:active:not(.key-disabled),
.key.key-pressed { ... }
```
No duplicated style rules. The visual is authoritative in one place.

---

### Explicit State Design: Empty ENTER

[RJ] Principle stated directly: *"I prefer explicit design over hopeful design."*

`Calculator.evaluate()` has an explicit early return on empty buffer:
```javascript
if (!this.#buffer.trim()) return null;
```

The intercept in `main.js` checks `if (entry)` before appending to history. Both layers
are intentional. The behavior on empty ENTER is documented, not incidental.

This principle applied throughout Phase 1: disabled keys are `DisabledKey` instances
(not absent), blank navigation slots have explicit `label: ''` entries (not missing grid
cells), and `clearHistory()` uses a targeted query to preserve the spacer rather than
`innerHTML = ''`.

---

## 2026-07-04 13:30 CDT — Phase 1 Complete

Phase 1 declared complete. Verified working:
- Arithmetic (+, −, ×, ÷, ^, parentheses, negation via `(-)` key)
- History display with click-to-copy
- Live input line with keyboard and button input, both animating on-screen keys
- DEL (backspace), CLEAR (live line), CLR (history panel)
- 3D button visuals with press animation
- Empty ENTER handled explicitly (no-op)

Initial commit pushed to GitHub: `Github-User-100/GCalc`, branch `master`.
Phase 2a (2D graphing) is next.

