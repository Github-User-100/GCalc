# Plan: APPLOGGER_JS — Browser-Native JavaScript AppLogger

## Goal
Build a browser-native JavaScript version of AppLogger for the shared library at
`C:\Temp\ClaudeStuff\shared\AppLogger\javascript\AppLogger.js`. It must match the
interface and behavior of the existing TypeScript and Python versions so that any
project can use AppLogger regardless of language. GCalc is the first consumer.

**Context-reset note:** Check off each task with `- [x]` immediately upon completion.
On context reset, read this file, find the first unchecked item, and resume there.

## Why a New Version Is Needed
The TypeScript version uses `import * as fs from 'fs'`, `process.stdout.write()`, and
`process.pid` — all Node.js APIs that do not exist in the browser. It also requires
TypeScript compilation, which GCalc deliberately avoids. A self-contained `.js` file
with no imports, no build step, and browser-native APIs is required.

## Behavior Spec (derived from TypeScript + Python versions)

### Log Levels (match Python — adds AUDIT vs TypeScript)
| Level | Priority | Console method |
|-------|----------|----------------|
| DEBUG | 0 | console.debug |
| INFO  | 1 | console.log   |
| AUDIT | 2 | console.log   |
| WARN  | 3 | console.warn  |
| ERROR | 4 | console.error |

### Log Format (identical across all versions)
```
*** LOG: LEVEL * 2026-01-01T00:00:00.000Z * ClassName.methodName ***  message here
```

### Enter / Exit Behavior (match Python — logs at DEBUG, not INFO like TypeScript)
- `AppLogger.enter(scope)` → logs `Entering [scope]...` at DEBUG
- `log.complete()` → logs `Exiting [scope].` at DEBUG (normal exit)
- `log.complete(err)` → logs `Exiting [scope] with exception: [err.message]` at ERROR

### No File Logging
Browser cannot write to the filesystem. File logging is omitted entirely.
The `onLogLine` callback (from TypeScript version) IS included — it allows consumers
to stream log lines to a UI panel, DevTools extension, or any other sink.

### Runtime Level Control
Equivalent to Python's live registry read: `AppLogger.setLevel('DEBUG')` static method
allows changing the minimum log level at runtime without reloading. Useful in DevTools.

### Correlation ID
Default: `crypto.randomUUID()` with `Date.now().toString()` fallback for older browsers.

## API Surface

### Static Methods
| Method | Signature | Description |
|--------|-----------|-------------|
| `configure` | `(appName, minLevel = 'INFO')` | One-time setup — sets app name and minimum level |
| `setLevel` | `(level)` | Change minimum level at runtime (e.g. from DevTools) |
| `setLogLineCallback` | `(cb)` | Register callback invoked for every line written; pass null to clear |
| `enter` | `(scope, correlationId?, minLevel?)` | Factory — returns a logger instance, logs enter at DEBUG |

### Instance Methods
| Method | Signature | Description |
|--------|-----------|-------------|
| `log` | `(level, message)` | Emit a log line at the given level |
| `complete` | `(err?)` | Log scope exit (DEBUG normally, ERROR if err passed) |
| `[Symbol.dispose]` | `()` | Calls complete() — included for future `using` keyword compat |

### Standard Usage Pattern (JavaScript try/finally)
```javascript
someMethod() {
  const log = AppLogger.enter('ClassName.someMethod');
  try {
    log.log('DEBUG', 'doing work');
    // ...
  } catch (err) {
    log.log('ERROR', `Failed: ${err.message}`);
    throw err;
  } finally {
    log.complete();
  }
}
```

## Tasks

### Implementation
- [x] Create directory: shared\AppLogger\javascript\
- [x] Create AppLogger.js:
  - [x] Level constants object: DEBUG=0, INFO=1, AUDIT=2, WARN=3, ERROR=4
  - [x] Static #config (private): appName, minLevel, logLineCallback
  - [x] Static configure(appName, minLevel='INFO'): set app name and minimum level
  - [x] Static setLevel(level): update minimum level at runtime
  - [x] Static setLogLineCallback(cb): register/clear the line callback
  - [x] Static enter(scope, correlationId, minLevel): factory; returns new AppLogger instance
  - [x] Constructor (private): store scope/correlationId/minLevel, call #write('DEBUG', 'Entering...')
  - [x] log(level, message): public instance method; calls #write
  - [x] complete(err): if err → #write ERROR with exception message; else → #write DEBUG 'Exiting...'
  - [x] [Symbol.dispose](): calls complete() for future `using` keyword support
  - [x] #write(level, message) private method:
        - Skip if level priority < effective minLevel priority
        - Build timestamp: new Date().toISOString()
        - Build line: `*** LOG: ${level} * ${timestamp} * ${scope} ***  ${message}`
        - Route to console.debug / console.log / console.warn / console.error by level
        - If logLineCallback set: invoke it with the line (swallow errors)
  - [x] correlationId default: crypto.randomUUID?.() ?? Date.now().toString()

### Tests
- [x] Create shared\AppLogger\javascript\tests\logger.test.js (16 tests, all passing)
  - [x] Test: enter() emits "Entering [scope]..." at DEBUG level
  - [x] Test: complete() emits "Exiting [scope]." at DEBUG level
  - [x] Test: complete(err) emits "Exiting [scope] with exception: ..." at ERROR level
  - [x] Test: log() respects minLevel — messages below threshold are suppressed
  - [x] Test: log() passes through messages at or above minLevel
  - [x] Test: setLevel() changes effective level at runtime
  - [x] Test: onLogLine callback receives every line that passes the level filter
  - [x] Test: onLogLine errors do not propagate to caller
  - [x] Test: log format matches spec (*** LOG: LEVEL * timestamp * scope ***  message)
  - [x] Test: level priority order (DEBUG < INFO < AUDIT < WARN < ERROR)
  - [x] Test: configure() sets app name and minimum level correctly
  - [x] Test: Symbol.dispose calls complete()

### Documentation & Integration
- [x] Update shared\AppLogger\AppLogger.md — add JavaScript section matching TS/Python format:
      API table, usage pattern (try/finally), browser notes, no-file-logging note
- [x] Read shared\REUSABLES.md, append JavaScript row to AppLogger entry
- [x] Update GCalc\CLAUDE.md Shared Dependencies table: remove "(pending)" note
- [ ] Add AppLogger.js <script> tag to GCalc index.html (when HTML is built)
- [ ] Add AppLogger loading task to GCALC_OG_PLAN.md HTML section

## Notes
- Single self-contained file — no imports, no dependencies, no build step.
  Must work loaded via a plain `<script src="...">` tag.
- Private class fields (#) used throughout for true encapsulation.
- The `using` keyword / Symbol.dispose is included for forward compatibility but
  try/finally is the documented and tested pattern — do not rely on `using`.
- AUDIT level is included to match Python. TypeScript version does not have it —
  this is intentional, matching the more complete Python spec.
- File logging is intentionally omitted. The onLogLine callback covers the same
  use case for browser contexts (stream to a UI, send to a server, etc.).
- After creation, add a javascript\ row to AppLogger.md's Languages Available table.
