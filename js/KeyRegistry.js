import { AppLogger } from '../../shared/AppLogger/javascript/AppLogger.js';
import { InputKey, ActionKey, DisabledKey, ModeKey } from './Key.js';

/**
 * Full TI-82-inspired key layout as declarative data.
 * type:
 *   'input'    → InputKey (appends char to calculator)
 *   'action'   → ActionKey (calls a calculator or display method)
 *   'mode'     → ModeKey  (Phase 2 stub — logs and does nothing)
 *   'disabled' → DisabledKey
 *   'gap'      → empty spacer cell in the grid
 */
const KEY_DEFS = [
  // ── Row 1: Graphing function keys ──────────────────────────────────
  { type: 'mode',     label: 'Y=',      mode: 'y-equals',  secondary: 'STAT PLT' },
  { type: 'mode',     label: 'WINDOW',  mode: 'window',    secondary: 'TBLSET'   },
  { type: 'mode',     label: 'ZOOM',    mode: 'zoom'                             },
  { type: 'mode',     label: 'TRACE',   mode: 'trace',     secondary: 'CALC'     },
  { type: 'mode',     label: 'GRAPH',   mode: 'graph',     secondary: 'TABLE'    },

  // ── Row 2: Mode / control — col 5: 2D GRAPH mode entry ────────────────
  { type: 'disabled', label: '2nd'                                },
  { type: 'disabled', label: 'MODE', secondary: 'QUIT'           },
  { type: 'action',   label: 'DEL',  action: 'delete', secondary: 'INS', cssClass: 'key-action' },
  { type: 'disabled', label: ''                                   },
  { type: 'action',   label: '2D<br>GRAPH', action: 'graph2d',   cssClass: 'key-blue' },

  // ── Row 3: Alpha / stat — col 5: 3D GRAPH mode entry ───────────────────
  { type: 'disabled', label: 'ALPHA',   secondary: 'A-LOCK'      },
  { type: 'input',    label: 'x,T,θ',   char: 'x', secondary: 'LINK' },
  { type: 'disabled', label: 'STAT',    secondary: 'LIST'         },
  { type: 'disabled', label: ''                                   },
  { type: 'action',   label: '3D<br>GRAPH', action: 'graph3d',   cssClass: 'key-blue' },

  // ── Row 4: Math / program ───────────────────────────────────────────
  { type: 'disabled', label: 'MATH',   secondary: 'TEST'  },
  { type: 'disabled', label: 'MATRX',  secondary: 'ANGLE' },
  { type: 'disabled', label: 'PRGM',   secondary: 'DRAW'  },
  { type: 'disabled', label: 'VARS',   secondary: 'Y-VARS' },
  { type: 'action',   label: 'CLEAR',  action: 'clearLiveInput', cssClass: 'key-action' },

  // ── Row 5: Scientific functions ─────────────────────────────────────
  { type: 'input',    label: 'x⁻¹',   char: '^(-1)', secondary: 'ABS'   },
  { type: 'input',    label: 'SIN',   char: 'sin(',  secondary: 'SIN⁻¹' },
  { type: 'input',    label: 'COS',   char: 'cos(',  secondary: 'COS⁻¹' },
  { type: 'input',    label: 'TAN',   char: 'tan(',  secondary: 'TAN⁻¹' },
  { type: 'input',    label: '^',     char: '^',     secondary: 'π'      },

  // ── Row 6: x² / comma / parens / divide ────────────────────────────
  { type: 'input',    label: 'x²',    char: '^2',    secondary: '√'      },
  { type: 'disabled', label: ',',     secondary: 'EE'                    },
  { type: 'input',    label: '(',      char: '(',  secondary: '{' },
  { type: 'input',    label: ')',      char: ')',  secondary: '}' },
  { type: 'input',    label: '÷',      char: '/',  cssClass: 'key-dark' },

  // ── Row 7: Digits 7–9 + multiply ────────────────────────────────────
  { type: 'input',    label: 'LOG',   char: 'log(',  secondary: '10ˣ'  },
  { type: 'input',    label: '7',      char: '7'            },
  { type: 'input',    label: '8',      char: '8'            },
  { type: 'input',    label: '9',      char: '9'            },
  { type: 'input',    label: '×',      char: '*',  cssClass: 'key-dark' },

  // ── Row 8   ───────────────────────────────────
  { type: 'input',    label: 'LN',    char: 'ln(',   secondary: 'eˣ'   },
  { type: 'input',    label: '4',      char: '4'            },
  { type: 'input',    label: '5',      char: '5'            },
  { type: 'input',    label: '6',      char: '6'            },
  { type: 'input',    label: '−',      char: '-',  cssClass: 'key-dark' },

  // ── Row 9   ─────────────────────────
  { type: 'disabled', label: 'STO→',   secondary: 'RCL'    },
  { type: 'input',    label: '1',      char: '1'            },
  { type: 'input',    label: '2',      char: '2'            },
  { type: 'input',    label: '3',      char: '3'            },
  { type: 'input',    label: '+',      char: '+',  cssClass: 'key-dark' },

  // ── Row 10: STO→ + digits 1–3 + add ────────────────────────────────
  { type: 'disabled', label: 'ON',     secondary: "OFF"   },
  { type: 'input',    label: '0',      char: '0'            },
  { type: 'input',    label: '.',      char: '.'            },
  { type: 'input',    label: '(-)',    char: '~',  secondary: 'ANS'   },
  { type: 'action',   label: 'ENTER',  action: 'evaluate',  secondary: 'ENTRY', cssClass: 'key-enter' },

];

export class KeyRegistry {
  #keys      = [];
  #charMap   = new Map();
  #actionMap = new Map();

  build(calculator, container) {
    const log = AppLogger.enter('KeyRegistry.build');
    try {
      for (const def of KEY_DEFS) {
        const key = this.#createKey(def, calculator);
        this.#keys.push(key);
        container.appendChild(key.element);
        if (def.type === 'input')  this.#charMap.set(def.char, key);
        if (def.type === 'action') this.#actionMap.set(def.action, key);
      }
      log.log('INFO', `Rendered ${this.#keys.length} keys`);
    } catch (err) {
      log.log('ERROR', err.message);
      throw err;
    } finally {
      log.complete();
    }
  }

  #createKey(def, calculator) {
    const opts = {
      label:    def.label,
      secondary: def.secondary ?? '',
      cssClass:  def.cssClass  ?? 'key-dark',
    };

    switch (def.type) {
      case 'input':
        return new InputKey(opts, def.char, calculator);

      case 'action': {
        const action = () => {
          if      (def.action === 'evaluate')        calculator.evaluate();
          else if (def.action === 'delete')          calculator.delete();
          else if (def.action === 'clearLiveInput')  calculator.clearLiveInput();
          else if (def.action === 'graph2d')         calculator.enterGraphMode('2d');
          else if (def.action === 'graph3d')         calculator.enterGraphMode('3d');
        };
        return new ActionKey(opts, action);
      }

      case 'mode':
        return new ModeKey(opts, def.mode);

      default:
        return new DisabledKey(opts);
    }
  }

  pressChar(char) {
    this.#charMap.get(char)?.simulatePress();
  }

  pressAction(actionName) {
    this.#actionMap.get(actionName)?.simulatePress();
  }
}
