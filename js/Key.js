import { AppLogger } from '../../shared/AppLogger/javascript/AppLogger.js';

export class Key {
  #element;
  #label;
  #secondary;
  #disabled;

  constructor({ label, secondary = '', cssClass = 'key-dark', disabled = false }) {
    this.#label     = label;
    this.#secondary = secondary;
    this.#disabled  = disabled;

    const btn = document.createElement('button');
    btn.className = `key ${cssClass}${disabled ? ' key-disabled' : ''}`;
    btn.setAttribute('type', 'button');
    btn.setAttribute('aria-label', label);
    if (disabled) btn.setAttribute('aria-disabled', 'true');

    if (secondary) {
      const sec = document.createElement('span');
      sec.className = 'key-secondary';
      sec.textContent = secondary;
      btn.appendChild(sec);
    }

    const lbl = document.createElement('span');
    lbl.className = 'key-label';
    lbl.innerHTML = label; // allow HTML entities in labels (e.g. x²)
    btn.appendChild(lbl);

    if (!disabled) {
      btn.addEventListener('click', () => this.onPress());
    }

    this.#element = btn;
  }

  get element()  { return this.#element; }
  get label()    { return this.#label; }
  get disabled() { return this.#disabled; }

  onPress() {} // override in subclasses
}

// ── Subclasses ──────────────────────────────────────────────────────────

export class InputKey extends Key {
  #char;
  #calculator;

  constructor(options, char, calculator) {
    super(options);
    this.#char       = char;
    this.#calculator = calculator;
  }

  onPress() {
    const log = AppLogger.enter('InputKey.onPress');
    try {
      this.#calculator.input(this.#char);
    } catch (err) {
      log.log('ERROR', err.message);
      throw err;
    } finally {
      log.complete();
    }
  }
}

export class ActionKey extends Key {
  #action;

  constructor(options, action) {
    super(options);
    this.#action = action;
  }

  onPress() {
    const log = AppLogger.enter('ActionKey.onPress');
    try {
      this.#action();
    } catch (err) {
      log.log('ERROR', err.message);
      throw err;
    } finally {
      log.complete();
    }
  }
}

export class DisabledKey extends Key {
  constructor(options) {
    super({ ...options, disabled: true, cssClass: 'key-disabled' });
  }
  onPress() {}
}

export class ModeKey extends Key {
  #modeName;

  constructor(options, modeName) {
    super({ ...options, cssClass: 'key-blue' });
    this.#modeName = modeName;
  }

  onPress() {
    const log = AppLogger.enter('ModeKey.onPress');
    try {
      log.log('INFO', `Mode key pressed: ${this.#modeName} (Phase 2 stub)`);
    } finally {
      log.complete();
    }
  }
}
