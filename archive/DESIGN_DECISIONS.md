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

